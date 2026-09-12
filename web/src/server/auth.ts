import 'reflect-metadata'
import { createServerFn } from '@tanstack/react-start'
import crypto from 'node:crypto'
import { db } from './db'
import { authCredentials, authSettings, authChallenges } from './db/schema'
import { eq, lt } from 'drizzle-orm'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server'

import {
  isServerAuthenticated,
  setServerSessionCookie,
  clearServerSessionCookie,
  getServerSessionToken,
  getWebAuthnConfig,
  AUTH_COOKIE_NAME,
} from './auth.server'

export const SESSION_SECRET = process.env.STATION_AUTH_SECRET || 'station_m4_secure_local_key_2026'

/**
 * Interface status konfigurasi autentikasi sistem.
 */
export interface AuthStatus {
  /** Apakah proteksi autentikasi aktif (PIN sudah disetup) */
  isConfigured: boolean
  /** Apakah setidaknya satu kredensial Touch ID terdaftar */
  hasPasskey: boolean
  /** Apakah input PIN saat ini sedang dikunci karena percobaan berulang */
  isLocked?: boolean
  /** Sisa detik waktu penguncian jika terkunci */
  remainingLockSeconds?: number
  /** Jumlah kegagalan berturut-turut saat ini */
  failedAttempts?: number
  /** Daftar perangkat Touch ID / Passkey terdaftar */
  devices: Array<{ id: string; name: string; createdAt: number }>
}

/**
 * Interface hasil verifikasi autentikasi yang mengembalikan token sesi.
 */
export interface AuthVerifyResult {
  success: boolean
  message: string
  sessionToken?: string
  ttlSeconds?: number
}

/**
 * Menghasilkan hash SHA-256 untuk password / PIN dengan garam (salt).
 *
 * @param pin Teks sandi / PIN yang akan di-hash
 * @param salt Garam acak
 * @returns String heksadesimal hasil hash
 */
function hashPin(pin: string, salt: string): string {
  return crypto.scryptSync(pin, salt, 32).toString('hex')
}

/**
 * Membuat token sesi terenkripsi HMAC yang aman untuk disimpan pada browser client.
 *
 * @param ttlSeconds Masa aktif sesi dalam detik (default 7 hari)
 * @returns String token sesi bertanda tangan
 */
export function createSessionToken(ttlSeconds: number = 86400 * 7): string {
  const expiresAt = Date.now() + ttlSeconds * 1000
  const payload = `auth:admin:${expiresAt}`
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex')
  return `${Buffer.from(payload).toString('base64url')}.${hmac}`
}

/**
 * Memvalidasi apakah token sesi valid secara kriptografis dan belum kedaluwarsa.
 *
 * @param token Token sesi yang diperiksa
 * @returns Boolean valid atau tidak
 */
export function verifySessionToken(token?: string): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false

  const [encodedPayload, signature] = parts
  let payload: string
  try {
    payload = Buffer.from(encodedPayload, 'base64url').toString('utf8')
  } catch {
    return false
  }
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex')

  if (signature !== expectedSig) return false

  const [prefix, , expiresStr] = payload.split(':')
  if (prefix !== 'auth' || !expiresStr) return false

  const expiresAt = parseInt(expiresStr, 10)
  return Date.now() < expiresAt
}

/**
 * Server function untuk logout dari sisi server (menghapus cookie sesi).
 */
export const serverLogout = createServerFn({ method: 'POST' }).handler(async () => {
  clearServerSessionCookie()
  return { success: true }
})

/**
 * Server function untuk mengambil status konfigurasi autentikasi workstation.
 *
 * @returns Objek status konfigurasi dan ketersediaan passkey
 */
export const getAuthStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthStatus> => {
    // 1. Bersihkan challenge kedaluwarsa
    try {
      db.delete(authChallenges).where(lt(authChallenges.expiresAt, Date.now())).run()
    } catch {}

    const settings = db.select().from(authSettings).all()
    const credentials = db.select().from(authCredentials).all()

    const isConfigured = settings.length > 0
    const hasPasskey = credentials.length > 0

    let isLocked = false
    let remainingLockSeconds = 0
    let failedAttempts = 0

    if (isConfigured && settings[0]) {
      const config = settings[0]
      failedAttempts = config.failedAttempts
      if (config.lockedUntil > Date.now()) {
        isLocked = true
        remainingLockSeconds = Math.ceil((config.lockedUntil - Date.now()) / 1000)
      } else if (config.lockedUntil > 0 && config.lockedUntil <= Date.now()) {
        // Waktu penguncian telah usai, reset waktu kunci
        db.update(authSettings)
          .set({ lockedUntil: 0 })
          .where(eq(authSettings.id, config.id))
          .run()
      }
    }

    const devices = credentials.map((c) => ({
      id: c.credentialId,
      name: c.deviceName,
      createdAt: c.createdAt,
    }))

    return {
      isConfigured,
      hasPasskey,
      isLocked,
      remainingLockSeconds,
      failedAttempts,
      devices,
    }
  }
)

/**
 * Server function untuk mendaftarkan Master PIN pertama kali.
 *
 * @param input Objek PIN masukan
 * @returns Status keberhasilan dan token sesi awal
 */
export const setupMasterPin = createServerFn({ method: 'POST' })
  .validator((input: { pin: string }) => {
    if (!input?.pin || input.pin.length < 4) {
      throw new Error('Master PIN harus terdiri dari minimal 4 karakter.')
    }
    return { pin: input.pin }
  })
  .handler(async ({ data }): Promise<AuthVerifyResult> => {
    const existing = db.select().from(authSettings).all()
    if (existing.length > 0) {
      throw new Error('Master PIN sudah dikonfigurasi sebelumnya.')
    }

    const salt = crypto.randomBytes(16).toString('hex')
    const hash = hashPin(data.pin, salt)
    const ttlSeconds = 86400 * 7 // 7 hari

    db.insert(authSettings)
      .values({
        pinHash: hash,
        pinSalt: salt,
        isEnabled: 1,
        sessionTtlSeconds: ttlSeconds,
        failedAttempts: 0,
        lockedUntil: 0,
        updatedAt: Date.now(),
      })
      .run()

    const sessionToken = createSessionToken(ttlSeconds)
    setServerSessionCookie(sessionToken, ttlSeconds)
    return {
      success: true,
      message: 'Master PIN berhasil dikonfigurasi.',
      sessionToken,
      ttlSeconds,
    }
  })

/**
 * Server function untuk verifikasi login menggunakan Master PIN.
 * Dilengkapi proteksi anti-brute force:
 * - Constant delay (500ms) untuk mencegah serangan timing bot.
 * - Pembatasan 5 kali percobaan gagal berturut-turut.
 * - Penguncian eksponensial (1 menit -> 5 menit -> 15 menit).
 *
 * @param input Objek PIN masukan pengguna
 * @returns Status verifikasi dan token sesi
 */
export const verifyMasterPin = createServerFn({ method: 'POST' })
  .validator((input: { pin: string }) => {
    if (!input?.pin) throw new Error('PIN wajib diisi.')
    return { pin: input.pin }
  })
  .handler(async ({ data }): Promise<AuthVerifyResult> => {
    const settings = db.select().from(authSettings).all()
    if (settings.length === 0) {
      throw new Error('Master PIN belum dikonfigurasi.')
    }

    const config = settings[0]

    // 1. Cek apakah akun sedang dalam masa penguncian (lockout)
    if (config.lockedUntil > Date.now()) {
      const remainingSeconds = Math.ceil((config.lockedUntil - Date.now()) / 1000)
      throw new Error(
        `Terlalu banyak percobaan gagal. Input PIN dikunci selama ${remainingSeconds} detik lagi demi keamanan.`
      )
    }

    // 2. Artificial constant-time delay (500ms) untuk menggagalkan bot berkecepatan tinggi
    await new Promise((resolve) => setTimeout(resolve, 500))

    const testHash = hashPin(data.pin, config.pinSalt)

    // 3. Jika PIN salah, catat kegagalan dan tentukan tindakan penguncian
    if (testHash !== config.pinHash) {
      const newAttempts = config.failedAttempts + 1
      let newLockedUntil = 0
      let warningMsg = 'PIN yang Anda masukkan salah.'

      if (newAttempts >= 10) {
        // Percobaan gagal 10x -> kunci 15 menit
        newLockedUntil = Date.now() + 15 * 60 * 1000
        warningMsg = 'Terlalu banyak percobaan gagal (10x). Akses PIN dikunci selama 15 menit!'
      } else if (newAttempts >= 7) {
        // Percobaan gagal 7x -> kunci 5 menit
        newLockedUntil = Date.now() + 5 * 60 * 1000
        warningMsg = 'Terlalu banyak percobaan gagal (7x). Akses PIN dikunci selama 5 menit!'
      } else if (newAttempts >= 5) {
        // Percobaan gagal 5x -> kunci 1 menit
        newLockedUntil = Date.now() + 60 * 1000
        warningMsg = 'Terlalu banyak percobaan gagal (5x). Akses PIN dikunci selama 1 menit!'
      } else {
        const remaining = 5 - newAttempts
        warningMsg = `PIN yang Anda masukkan salah. Sisa ${remaining} kesempatan sebelum terkunci.`
      }

      db.update(authSettings)
        .set({
          failedAttempts: newAttempts,
          lockedUntil: newLockedUntil,
          updatedAt: Date.now(),
        })
        .where(eq(authSettings.id, config.id))
        .run()

      throw new Error(warningMsg)
    }

    // 4. Jika PIN BENAR, reset counter kegagalan dan waktu kunci ke 0
    if (config.failedAttempts > 0 || config.lockedUntil > 0) {
      db.update(authSettings)
        .set({
          failedAttempts: 0,
          lockedUntil: 0,
          updatedAt: Date.now(),
        })
        .where(eq(authSettings.id, config.id))
        .run()
    }

    const sessionToken = createSessionToken(config.sessionTtlSeconds)
    setServerSessionCookie(sessionToken, config.sessionTtlSeconds)
    return {
      success: true,
      message: 'Autentikasi PIN berhasil.',
      sessionToken,
      ttlSeconds: config.sessionTtlSeconds,
    }
  })

/**
 * Server function untuk membuat opsi pendaftaran WebAuthn (Touch ID Mac).
 *
 * @param input Token sesi aktif pengguna
 * @returns Opsi JSON pendaftaran WebAuthn dan ID challenge
 */
export const generateTouchIdRegistrationOptions = createServerFn({ method: 'POST' })
  .validator((input: { sessionToken?: string }) => input)
  .handler(async ({ data }) => {
    if (!verifySessionToken(data?.sessionToken)) {
      throw new Error('Sesi tidak valid. Harap login dengan PIN terlebih dahulu.')
    }

    const existingCreds = db.select().from(authCredentials).all()
    const { rpName, rpId } = getWebAuthnConfig()

    const options = await generateRegistrationOptions({
      rpName,
      rpID: rpId,
      userName: 'Mac Administrator',
      userDisplayName: 'Mac mini M4 Admin',
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Touch ID / Face ID platform
        userVerification: 'required',
        residentKey: 'preferred',
      },
      excludeCredentials: existingCreds.map((c) => ({
        id: c.credentialId,
        transports: c.transports ? JSON.parse(c.transports) : undefined,
      })),
    })

    const challengeId = crypto.randomUUID()
    db.insert(authChallenges)
      .values({
        id: challengeId,
        challenge: options.challenge,
        purpose: 'register',
        expiresAt: Date.now() + 5 * 60 * 1000,
      })
      .run()

    return {
      optionsJson: JSON.stringify(options),
      challengeId,
    }
  })

/**
 * Server function untuk memverifikasi respon pendaftaran Touch ID dari browser.
 *
 * @param input Data respon pendaftaran WebAuthn dan ID challenge
 * @returns Hasil verifikasi pendaftaran kredensial
 */
export const verifyTouchIdRegistration = createServerFn({ method: 'POST' })
  .validator((input: { response: any; challengeId: string; deviceName?: string }) => {
    if (!input?.response || !input?.challengeId) {
      throw new Error('Respon WebAuthn tidak valid.')
    }
    return input
  })
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    const challengeRow = db
      .select()
      .from(authChallenges)
      .where(eq(authChallenges.id, data.challengeId))
      .get()

    if (!challengeRow || challengeRow.purpose !== 'register' || Date.now() > challengeRow.expiresAt) {
      throw new Error('Challenge WebAuthn telah kedaluwarsa. Silakan ulangi sentuhan Touch ID.')
    }

    let verification: VerifiedRegistrationResponse
    const { rpId, origin } = getWebAuthnConfig()
    try {
      verification = await verifyRegistrationResponse({
        response: data.response,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserVerification: true,
      })
    } catch (err: any) {
      throw new Error(`Gagal memverifikasi Touch ID: ${err.message}`)
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error('Verifikasi Touch ID tidak berhasil disetujui.')
    }

    const { credential } = verification.registrationInfo

    // Simpan kredensial Touch ID ke database
    db.insert(authCredentials)
      .values({
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: credential.transports ? JSON.stringify(credential.transports) : null,
        deviceName: data.deviceName || 'Mac mini M4 Touch ID',
        createdAt: Date.now(),
      })
      .run()

    // Hapus challenge yang sudah dipakai
    db.delete(authChallenges).where(eq(authChallenges.id, data.challengeId)).run()

    return { success: true, message: 'Touch ID Mac berhasil didaftarkan sebagai metode autentikasi.' }
  })

/**
 * Server function untuk menghapus kredensial perangkat biometrik dari database.
 * 
 * @param input Objek berisi credentialId yang ingin dihapus
 * @returns Status keberhasilan penghapusan kredensial
 */
export const deleteCredential = createServerFn({ method: 'POST' })
  .validator((input: { credentialId: string }) => {
    if (!input?.credentialId) throw new Error('Credential ID wajib disertakan.')
    return input
  })
  .handler(async ({ data }) => {
    db.delete(authCredentials).where(eq(authCredentials.credentialId, data.credentialId)).run()
    return { success: true }
  })

/**
 * Server function untuk membuat opsi autentikasi login Touch ID.
 *
 * @returns Opsi JSON autentikasi dan ID challenge
 */
export const generateTouchIdAuthenticationOptions = createServerFn({ method: 'POST' }).handler(
  async () => {
    const credentials = db.select().from(authCredentials).all()
    if (credentials.length === 0) {
      throw new Error('Belum ada Touch ID yang terdaftar pada workstation ini.')
    }

    const { rpId, origin } = getWebAuthnConfig()

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: 'required',
      allowCredentials: credentials.map((c) => ({
        id: c.credentialId,
        transports: c.transports ? JSON.parse(c.transports) : undefined,
      })),
    })

    const challengeId = crypto.randomUUID()
    db.insert(authChallenges)
      .values({
        id: challengeId,
        challenge: options.challenge,
        purpose: 'authenticate',
        expiresAt: Date.now() + 5 * 60 * 1000,
      })
      .run()

    return {
      optionsJson: JSON.stringify(options),
      challengeId,
    }
  }
)

/**
 * Server function untuk memverifikasi autentikasi Touch ID Mac.
 *
 * @param input Respon autentikasi dari browser dan ID challenge
 * @returns Status keberhasilan verifikasi dan token sesi
 */
export const verifyTouchIdAuthentication = createServerFn({ method: 'POST' })
  .validator((input: { response: any; challengeId: string }) => {
    if (!input?.response || !input?.challengeId) {
      throw new Error('Payload autentikasi tidak lengkap.')
    }
    return input
  })
  .handler(async ({ data }): Promise<AuthVerifyResult> => {
    const challengeRow = db
      .select()
      .from(authChallenges)
      .where(eq(authChallenges.id, data.challengeId))
      .get()

    if (
      !challengeRow ||
      challengeRow.purpose !== 'authenticate' ||
      Date.now() > challengeRow.expiresAt
    ) {
      throw new Error('Sesi autentikasi telah kedaluwarsa. Silakan ulangi sentuhan Touch ID.')
    }

    const credentialId = data.response.id
    const credential = db
      .select()
      .from(authCredentials)
      .where(eq(authCredentials.credentialId, credentialId))
      .get()

    if (!credential) {
      throw new Error('Kredensial Touch ID tidak dikenali pada workstation ini.')
    }

    let verification: VerifiedAuthenticationResponse
    const { rpId, origin } = getWebAuthnConfig()
    try {
      verification = await verifyAuthenticationResponse({
        response: data.response,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        credential: {
          id: credential.credentialId,
          publicKey: Buffer.from(credential.publicKey, 'base64url'),
          counter: credential.counter,
          transports: credential.transports ? JSON.parse(credential.transports) : undefined,
        },
        requireUserVerification: true,
      })
    } catch (err: any) {
      throw new Error(`Verifikasi Touch ID gagal: ${err.message}`)
    }

    if (!verification.verified) {
      throw new Error('Sidik jari tidak cocok atau otentikasi ditolak.')
    }

    // Perbarui counter
    db.update(authCredentials)
      .set({ counter: verification.authenticationInfo.newCounter })
      .where(eq(authCredentials.credentialId, credentialId))
      .run()

    // Hapus challenge
    db.delete(authChallenges).where(eq(authChallenges.id, data.challengeId)).run()

    const settings = db.select().from(authSettings).all()
    const ttl = settings[0]?.sessionTtlSeconds || 86400 * 7
    const sessionToken = createSessionToken(ttl)
    setServerSessionCookie(sessionToken, ttl)

    return {
      success: true,
      message: 'Autentikasi Touch ID berhasil disetujui.',
      sessionToken,
      ttlSeconds: ttl,
    }
  })

/**
 * Server function untuk memverifikasi apakah token sesi tertentu masih valid.
 *
 * @param input Objek token yang akan diperiksa
 * @returns Status validitas
 */
export const checkSessionValid = createServerFn({ method: 'POST' })
  .validator((input: { token?: string }) => input)
  .handler(async ({ data }): Promise<{ isValid: boolean }> => {
    // 1. Cek token dari payload input
    if (data?.token && verifySessionToken(data.token)) {
      setServerSessionCookie(data.token)
      return { isValid: true }
    }
    // 2. Cek token dari cookie HTTP
    const cookieToken = getServerSessionToken()
    if (verifySessionToken(cookieToken)) {
      return { isValid: true }
    }
    return { isValid: false }
  })
