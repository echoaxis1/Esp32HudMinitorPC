import * as React from 'react'
import { Fingerprint, KeyRound, Lock, Sparkles, ShieldCheck, ShieldAlert, Laptop } from 'lucide-react'
import { useTouchIdAuth } from '~/hooks/useTouchIdAuth'

/**
 * Komponen Lockscreen Station yang melindungi dashboard Workstation Mission Control.
 * Menyajikan interface login biometrik Apple Touch ID dengan opsi fallback Master PIN
 * serta panduan setup inisialisasi pertama kali.
 *
 * @param props Callback saat login berhasil
 * @returns Tampilan antarmuka layar kunci futuristik
 */
export interface WorkstationLockscreenProps {
  /** Callback saat login berhasil */
  onUnlock?: () => void
  /** Opsi meneruskan hasil useTouchIdAuth agar tidak dieksekusi ganda */
  auth?: ReturnType<typeof useTouchIdAuth>
}

export function WorkstationLockscreen({ onUnlock, auth }: WorkstationLockscreenProps) {
  const internalAuth = useTouchIdAuth()
  const {
    isSupported,
    isConfigured,
    hasPasskey,
    isLocked,
    remainingLockSeconds,
    isLoading,
    errorMessage,
    setupPin,
    loginWithPin,
    registerTouchId,
    authenticateWithTouchId,
  } = auth || internalAuth

  const [inputPin, setInputPin] = React.useState('')
  const [confirmPin, setConfirmPin] = React.useState('')
  const [usePinMode, setUsePinMode] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState('--:--')
  const [currentDate, setCurrentDate] = React.useState('--')
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [localError, setLocalError] = React.useState<string | null>(null)
  const [touchIdSuccessRegistered, setTouchIdSuccessRegistered] = React.useState(false)
  const hasAutoTriggeredRef = React.useRef(false)

  // Clock interval
  React.useEffect(() => {
    function updateClock() {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
      )
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      )
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-trigger Touch ID hanya pada Desktop Mac lokal (bukan di iOS/mobile).
  // Di iOS Safari, WebAuthn menolak pemanggilan tanpa explicit user click ("The document is not focused").
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

    // Di perangkat iOS/Mobile atau non-localhost, biarkan pengguna menekan tombol secara eksplisit
    if (isMobile) {
      return
    }

    if (isConfigured && hasPasskey && isSupported && !usePinMode && isLocalhost && !hasAutoTriggeredRef.current) {
      hasAutoTriggeredRef.current = true
      handleTouchIdLogin()
    } else if (!isSupported && hasPasskey) {
      // Jika diakses dari non-secure context, otomatis alihkan ke PIN
      setUsePinMode(true)
    }
  }, [isConfigured, hasPasskey, isSupported, usePinMode])

  /**
   * Eksekusi autentikasi via Touch ID.
   */
  async function handleTouchIdLogin() {
    setIsProcessing(true)
    setLocalError(null)
    try {
      const ok = await authenticateWithTouchId()
      if (ok && onUnlock) {
        onUnlock()
      } else {
        // Jika Touch ID gagal atau dibatalkan, jangan looping, biarkan user memilih PIN atau coba lagi manual
        setUsePinMode(true)
      }
    } catch (err: any) {
      setLocalError(err.message || 'Verifikasi Touch ID dibatalkan.')
      setUsePinMode(true)
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Eksekusi login via PIN.
   */
  async function handlePinLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!inputPin) return
    setIsProcessing(true)
    setLocalError(null)
    try {
      const ok = await loginWithPin(inputPin)
      if (ok && onUnlock) onUnlock()
    } catch (err: any) {
      setLocalError(err.message || 'PIN yang dimasukkan salah.')
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Eksekusi inisialisasi Master PIN pertama kali.
   */
  async function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (inputPin !== confirmPin) {
      setLocalError('Konfirmasi PIN tidak cocok.')
      return
    }
    setIsProcessing(true)
    setLocalError(null)
    try {
      const ok = await setupPin(inputPin)
      if (ok) {
        // Berhasil setup PIN -> tawarkan registrasi Touch ID langsung
        setInputPin('')
        setConfirmPin('')
      }
    } catch (err: any) {
      setLocalError(err.message || 'Gagal menyimpan Master PIN.')
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Mendaftarkan Touch ID setelah PIN disetup.
   */
  async function handleRegisterTouchId() {
    setIsProcessing(true)
    setLocalError(null)
    try {
      const ok = await registerTouchId('Mac mini M4 Touch ID')
      if (ok) {
        setTouchIdSuccessRegistered(true)
        setTimeout(() => {
          if (onUnlock) onUnlock()
        }, 1000)
      }
    } catch (err: any) {
      setLocalError(err.message || 'Gagal mendaftarkan Touch ID.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-8 bg-[#05070d] text-slate-100 overflow-hidden select-none">
      {/* Dynamic Cyberpunk Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar Status */}
      <div className="w-full max-w-5xl flex items-center justify-between text-xs font-mono text-slate-400 z-10">
        <div className="flex items-center gap-2">
          <Laptop className="h-4 w-4 text-cyan-400" />
          <span className="text-white font-bold tracking-wider">MAC MINI M4</span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-slate-400">Workstation Mission Control</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px]">
          <Lock className="h-3 w-3 text-cyan-400" />
          <span>Biometric Protection Active</span>
        </div>
      </div>

      {/* Center Clock & Authentication Form */}
      <div className="flex flex-col items-center max-w-sm w-full my-auto z-10 text-center">
        {/* Large Digital Clock */}
        <div className="font-mono text-7xl font-black text-white tracking-tighter drop-shadow-2xl">
          {currentTime}
        </div>
        <div className="font-mono text-sm text-slate-400 font-medium tracking-wide mt-1">
          {currentDate}
        </div>

        {/* Dynamic Card Container */}
        <div className="w-full mt-8 p-6 rounded-3xl bg-[#0a0e18]/90 border border-[#172338] shadow-2xl backdrop-blur-xl relative">
          {/* Error Notice */}
          {(localError || errorMessage) && (
            <div className="mb-4 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs font-mono text-left">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{localError || errorMessage}</span>
            </div>
          )}

          {/* Skenario 1: Belum Setup (First-time setup Master PIN) */}
          {!isConfigured ? (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Inisialisasi Master PIN
                </h2>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Buat Master PIN untuk mengamankan workstation ini sebelum mengaktifkan Touch ID.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="password"
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value)}
                  placeholder="Buat PIN Baru (min. 4 digit)"
                  className="w-full px-3 py-2.5 bg-[#05070d] border border-[#1b273b] rounded-xl text-center text-sm font-mono tracking-widest text-white focus:outline-hidden focus:border-cyan-500"
                  required
                />
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Konfirmasi PIN Baru"
                  className="w-full px-3 py-2.5 bg-[#05070d] border border-[#1b273b] rounded-xl text-center text-sm font-mono tracking-widest text-white focus:outline-hidden focus:border-cyan-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing || !inputPin}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50"
              >
                {isProcessing ? 'Menyimpan...' : 'Simpan Master PIN'}
              </button>
            </form>
          ) : !hasPasskey && isSupported ? (
            /* Skenario 2: PIN sudah ada, tawarkan daftarkan Touch ID */
            <div className="space-y-4 flex flex-col items-center">
              <button
                onClick={handleRegisterTouchId}
                disabled={isProcessing}
                className="group relative w-20 h-20 rounded-3xl bg-[#121a29] border border-cyan-500/40 flex items-center justify-center text-cyan-400 hover:border-cyan-400 transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Fingerprint className="h-10 w-10 group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 rounded-3xl border-2 border-cyan-400/50 animate-ping pointer-events-none opacity-40" />
              </button>

              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center justify-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  Daftarkan Touch ID Mac
                </h2>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  Sentuh sensor sidik jari Touch ID untuk pendaftaran passkey di Apple Secure Enclave.
                </p>
              </div>

              {touchIdSuccessRegistered ? (
                <div className="text-emerald-400 text-xs font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Touch ID Berhasil Didaftarkan! Membuka...</span>
                </div>
              ) : (
                <button
                  onClick={handleRegisterTouchId}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                >
                  {isProcessing ? 'Mendaftarkan...' : 'Aktifkan Touch ID'}
                </button>
              )}
            </div>
          ) : !usePinMode && hasPasskey ? (
            /* Skenario 3: Login Utama via Touch ID */
            <div className="space-y-4 flex flex-col items-center">
              <button
                onClick={handleTouchIdLogin}
                disabled={isProcessing}
                className="group relative w-20 h-20 rounded-3xl bg-[#121a29] border border-cyan-500/40 flex items-center justify-center text-cyan-400 hover:border-cyan-400 transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                title="Sentuh Touch ID"
              >
                <Fingerprint className="h-10 w-10 group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 rounded-3xl border-2 border-cyan-400/50 animate-ping pointer-events-none opacity-40" />
              </button>

              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Autentikasi Touch ID
                </h2>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  Sentuh sensor Touch ID Mac Anda untuk membuka dashboard workstation.
                </p>
              </div>

              <div className="w-full pt-2 flex flex-col gap-2">
                <button
                  onClick={handleTouchIdLogin}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                >
                  {isProcessing ? 'Menunggu Sidik Jari...' : 'Sentuh Touch ID'}
                </button>

                <button
                  type="button"
                  onClick={() => setUsePinMode(true)}
                  className="text-[11px] font-mono text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  Gunakan Master PIN &gt;
                </button>
              </div>
            </div>
          ) : (
            /* Skenario 4: Login Fallback via PIN (Anti-Brute Force Protected) */
            <form onSubmit={handlePinLogin} className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Masukkan Master PIN
                </h2>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Fallback autentikasi saat biometrik Touch ID tidak digunakan.
                </p>
              </div>

              {/* Status lockout jika akun terkunci */}
              {isLocked ? (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono text-center">
                  <span className="font-bold">AKSES PIN DIKUNCI</span>
                  <div className="text-[11px] mt-1 text-slate-300">
                    Sisa waktu penguncian: {remainingLockSeconds} detik
                  </div>
                </div>
              ) : (
                <input
                  type="password"
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value)}
                  placeholder="••••••"
                  autoFocus
                  disabled={isLocked}
                  className="w-full px-3 py-2.5 bg-[#05070d] border border-[#1b273b] rounded-xl text-center text-base font-mono tracking-widest text-white focus:outline-hidden focus:border-cyan-500 disabled:opacity-40"
                />
              )}

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={isProcessing || !inputPin || isLocked}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                >
                  {isProcessing ? 'Memverifikasi...' : isLocked ? 'Terkunci Sementara' : 'Buka Kunci'}
                </button>

                {hasPasskey && isSupported && (
                  <button
                    type="button"
                    onClick={() => setUsePinMode(false)}
                    className="w-full text-[11px] font-mono text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    Kembali ke Touch ID &gt;
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-[11px] font-mono text-slate-500 text-center z-10">
        Apple Silicon Secure Enclave &bull; FIDO2 WebAuthn &bull; Encrypted Station Session
      </div>
    </div>
  )
}
