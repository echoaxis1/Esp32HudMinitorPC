import { getCookie, setCookie, deleteCookie, getRequestHost, getRequestProtocol } from '@tanstack/react-start/server'
import { db } from './db'
import { authSettings } from './db/schema'
import { verifySessionToken } from './auth'

export const AUTH_COOKIE_NAME = 'station_session'

/**
 * Mengambil informasi Relaying Party ID (RP_ID) dan Origin WebAuthn secara dinamis
 * berdasarkan hostname request saat ini (mendukung localhost, mac.selco.id, maupun domain Tailscale).
 *
 * @returns Objek berisi rpId dan origin yang valid untuk WebAuthn
 */
export function getWebAuthnConfig(): { rpId: string; origin: string; rpName: string } {
  let host = 'localhost'
  let protocol = 'http'

  try {
    const rawHost = getRequestHost()
    if (rawHost) {
      host = rawHost.split(':')[0]
    }
  } catch {
    // fallback
  }

  try {
    const rawProto = getRequestProtocol()
    if (rawProto) {
      protocol = rawProto
    }
  } catch {
    // fallback
  }

  // Jika diakses via domain resmi (misal mac.selco.id), origin adalah https://mac.selco.id
  // Jika localhost di port 3456, origin adalah http://localhost:3456
  const portSuffix = (host === 'localhost' || host === '127.0.0.1') ? ':3456' : ''
  const origin = `${protocol}://${host}${portSuffix}`

  return {
    rpId: host,
    origin,
    rpName: 'Mac Workstation Mission Control',
  }
}

/**
 * Mengambil token sesi dari cookie HTTP request saat ini.
 *
 * @returns String token sesi atau undefined jika tidak ada
 */
export function getServerSessionToken(): string | undefined {
  try {
    return getCookie(AUTH_COOKIE_NAME)
  } catch {
    return undefined
  }
}

/**
 * Memeriksa apakah request saat ini membawa sesi otentikasi server (Cookie) yang sah.
 * Digunakan untuk memproteksi server loaders (SSR) dan server functions agar tidak membocorkan data.
 *
 * @returns Boolean apakah user terautentikasi di sisi server
 */
export function isServerAuthenticated(): boolean {
  try {
    // 1. Jika autentikasi belum pernah dikonfigurasi sama sekali di database, izinkan setup
    const settings = db.select().from(authSettings).all()
    if (settings.length === 0) return true

    // 2. Ambil token dari cookie HTTP
    const token = getServerSessionToken()
    return verifySessionToken(token)
  } catch {
    return false
  }
}

/**
 * Menyetel session cookie di sisi server dengan atribut keamanan HTTP-only.
 *
 * @param token Token sesi yang telah ditandatangani HMAC
 * @param ttlSeconds Masa aktif token dalam detik
 */
export function setServerSessionCookie(token: string, ttlSeconds: number = 86400 * 7): void {
  try {
    setCookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ttlSeconds,
    })
  } catch (err) {
    console.error('Gagal menulis session cookie:', err)
  }
}

/**
 * Menghapus session cookie di sisi server saat logout.
 */
export function clearServerSessionCookie(): void {
  try {
    deleteCookie(AUTH_COOKIE_NAME, {
      path: '/',
    })
  } catch (err) {
    console.error('Gagal menghapus session cookie:', err)
  }
}
