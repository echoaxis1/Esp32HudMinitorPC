import { useState, useEffect, useCallback } from 'react'
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser'
import {
  getAuthStatus,
  setupMasterPin,
  verifyMasterPin,
  generateTouchIdRegistrationOptions,
  verifyTouchIdRegistration,
  generateTouchIdAuthenticationOptions,
  verifyTouchIdAuthentication,
  checkSessionValid,
  type AuthStatus,
} from '~/server/auth'

const STORAGE_KEY = 'station_session_token'

/**
 * Interface kembalian dari hook useTouchIdAuth.
 */
export interface UseTouchIdAuthReturn {
  /** Apakah browser dan Mac mendukung Touch ID / WebAuthn */
  isSupported: boolean
  /** Apakah konfigurasi autentikasi sudah ada di database */
  isConfigured: boolean
  /** Apakah setidaknya satu passkey Touch ID sudah didaftarkan */
  hasPasskey: boolean
  /** Apakah input PIN saat ini sedang dikunci karena percobaan berulang */
  isLocked: boolean
  /** Sisa detik waktu penguncian jika terkunci */
  remainingLockSeconds: number
  /** Jumlah percobaan gagal saat ini */
  failedAttempts: number
  /** Status apakah pengguna saat ini terautentikasi (sesi valid) */
  isAuthenticated: boolean
  /** Status sedang proses memverifikasi atau mendaftarkan */
  isLoading: boolean
  /** Pesan error terkini jika ada */
  errorMessage: string | null
  /** Fungsi untuk mendaftarkan Master PIN pertama kali */
  setupPin: (pin: string) => Promise<boolean>
  /** Fungsi untuk login dengan Master PIN */
  loginWithPin: (pin: string) => Promise<boolean>
  /** Fungsi untuk mendaftarkan Touch ID Mac ke sistem */
  registerTouchId: (deviceName?: string) => Promise<boolean>
  /** Fungsi untuk verifikasi login menggunakan Touch ID */
  authenticateWithTouchId: () => Promise<boolean>
  /** Fungsi serbaguna untuk meminta verifikasi Touch ID sebelum aksi sensitif */
  verifyTouchIdForAction: () => Promise<boolean>
  /** Fungsi untuk logout dan membatalkan sesi saat ini */
  logout: () => void
  /** Fungsi untuk memuat ulang status autentikasi dari server */
  refreshStatus: () => Promise<void>
}

/**
 * Hook reusable untuk manajemen autentikasi Touch ID (WebAuthn / Passkey)
 * dan fallback Master PIN pada Mac Workstation.
 *
 * @returns Kumpulan state autentikasi dan fungsi-fungsi eksekusi biometrik
 */
export function useTouchIdAuth(): UseTouchIdAuthReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isConfigured: false,
    hasPasskey: false,
    isLocked: false,
    remainingLockSeconds: 0,
    failedAttempts: 0,
    devices: [],
  })
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 1. Cek dukungan hardware & browser
  useEffect(() => {
    async function checkSupport() {
      const webauthnOk = browserSupportsWebAuthn()
      if (webauthnOk) {
        try {
          const platformOk = await platformAuthenticatorIsAvailable()
          setIsSupported(platformOk)
        } catch {
          setIsSupported(false)
        }
      } else {
        setIsSupported(false)
      }
    }
    checkSupport()
  }, [])

  // 2. Cek status sesi lokal & sinkronisasi dengan server
  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      const status = await getAuthStatus()
      if (status) {
        setAuthStatus(status)
      }

      if (!status?.isConfigured) {
        setIsAuthenticated(false)
        return
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      if (!token) {
        setIsAuthenticated(false)
        return
      }

      const check = await checkSessionValid({ data: { token } })
      if (check.isValid) {
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem(STORAGE_KEY)
        setIsAuthenticated(false)
      }
    } catch (err: any) {
      console.error('Gagal memeriksa status auth:', err)
      setErrorMessage(err.message || 'Gagal memuat status autentikasi.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  // 3. Setup Master PIN
  const setupPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      const res = await setupMasterPin({ data: { pin } })
      if (res.success && res.sessionToken) {
        localStorage.setItem(STORAGE_KEY, res.sessionToken)
        setIsAuthenticated(true)
        setAuthStatus((prev) => ({ ...prev, isConfigured: true }))
        return true
      }
      return false
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mendaftarkan Master PIN.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 4. Login dengan Master PIN
  const loginWithPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      const res = await verifyMasterPin({ data: { pin } })
      if (res.success && res.sessionToken) {
        localStorage.setItem(STORAGE_KEY, res.sessionToken)
        setIsAuthenticated(true)
        return true
      }
      return false
    } catch (err: any) {
      setErrorMessage(err.message || 'PIN yang dimasukkan salah.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 5. Daftarkan Touch ID Mac
  const registerTouchId = useCallback(async (deviceName?: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      const token = localStorage.getItem(STORAGE_KEY) || undefined
      const { optionsJson, challengeId } = await generateTouchIdRegistrationOptions({
        data: { sessionToken: token },
      })

      const options = JSON.parse(optionsJson)
      const attResp = await startRegistration({ optionsJSON: options })

      const res = await verifyTouchIdRegistration({
        data: {
          response: attResp,
          challengeId,
          deviceName: deviceName || 'Mac mini Touch ID',
        },
      })

      if (res.success) {
        setAuthStatus((prev) => ({ ...prev, hasPasskey: true }))
        return true
      }
      return false
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mendaftarkan Touch ID.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 6. Login / Autentikasi dengan Touch ID
  const authenticateWithTouchId = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      const { optionsJson, challengeId } = await generateTouchIdAuthenticationOptions()
      const options = JSON.parse(optionsJson)

      const asseResp = await startAuthentication({ optionsJSON: options })

      const res = await verifyTouchIdAuthentication({
        data: {
          response: asseResp,
          challengeId,
        },
      })

      if (res.success && res.sessionToken) {
        localStorage.setItem(STORAGE_KEY, res.sessionToken)
        setIsAuthenticated(true)
        return true
      }
      return false
    } catch (err: any) {
      setErrorMessage(err.message || 'Verifikasi Touch ID dibatalkan atau tidak cocok.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 7. Reusable Verification untuk Aksi Sensitif
  const verifyTouchIdForAction = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      const { optionsJson, challengeId } = await generateTouchIdAuthenticationOptions()
      const options = JSON.parse(optionsJson)

      const asseResp = await startAuthentication({ optionsJSON: options })
      const res = await verifyTouchIdAuthentication({
        data: {
          response: asseResp,
          challengeId,
        },
      })

      return !!res.success
    } catch (err: any) {
      setErrorMessage(err.message || 'Verifikasi sidik jari dibatalkan.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 8. Logout
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setIsAuthenticated(false)
  }, [])

  return {
    isSupported,
    isConfigured: authStatus.isConfigured,
    hasPasskey: authStatus.hasPasskey,
    isLocked: !!authStatus.isLocked,
    remainingLockSeconds: authStatus.remainingLockSeconds || 0,
    failedAttempts: authStatus.failedAttempts || 0,
    isAuthenticated,
    isLoading,
    errorMessage,
    setupPin,
    loginWithPin,
    registerTouchId,
    authenticateWithTouchId,
    verifyTouchIdForAction,
    logout,
    refreshStatus,
  }
}
