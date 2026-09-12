import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const metricsHistory = sqliteTable('metrics_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: integer('timestamp').notNull(),
  cpuPercent: real('cpu_percent').notNull(),
  cpuTemp: real('cpu_temp').notNull(),
  gpuTemp: real('gpu_temp').notNull(),
  ramPercent: real('ram_percent').notNull(),
  ramUsedGb: real('ram_used_gb').notNull(),
  netDownKb: real('net_down_kb').notNull(),
  netUpKb: real('net_up_kb').notNull(),
})

export const devBookmarks = sqliteTable('dev_bookmarks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  category: text('category').notNull(),
  port: integer('port'),
  createdAt: integer('created_at').notNull(),
})

/**
 * Tabel untuk menyimpan kredensial WebAuthn Passkey (Touch ID Mac).
 */
export const authCredentials = sqliteTable('auth_credentials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** ID unik kredensial yang dihasilkan oleh Secure Enclave / WebAuthn Authenticator */
  credentialId: text('credential_id').notNull().unique(),
  /** Kunci publik dalam format Base64URL untuk verifikasi tanda tangan */
  publicKey: text('public_key').notNull(),
  /** Counter tanda tangan untuk mencegah serangan replay */
  counter: integer('counter').notNull().default(0),
  /** Tipe transport kredensial (internal / usb / ble / nfc) dalam JSON string */
  transports: text('transports'),
  /** Label nama perangkat atau keterangan passkey (misal: 'Mac mini Touch ID') */
  deviceName: text('device_name').notNull(),
  /** Timestamp pendaftaran kredensial */
  createdAt: integer('created_at').notNull(),
})

/**
 * Tabel konfigurasi autentikasi workstation (Master PIN & status keamanan).
 */
export const authSettings = sqliteTable('auth_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Hash Master PIN menggunakan salt terenkripsi */
  pinHash: text('pin_hash').notNull(),
  /** Garam (salt) pengacau untuk hashing PIN */
  pinSalt: text('pin_salt').notNull(),
  /** Flag apakah proteksi autentikasi aktif */
  isEnabled: integer('is_enabled').notNull().default(1),
  /** Durasi sesi login dalam satuan detik (default: 86400 / 24 jam) */
  sessionTtlSeconds: integer('session_ttl_seconds').notNull().default(86400),
  /** Jumlah kegagalan berturut-turut memasukkan PIN untuk proteksi anti-brute force */
  failedAttempts: integer('failed_attempts').notNull().default(0),
  /** Waktu timestamp (ms) sampai kapan input PIN dikunci jika melebihi batas percobaan */
  lockedUntil: integer('locked_until').notNull().default(0),
  /** Timestamp modifikasi terakhir */
  updatedAt: integer('updated_at').notNull(),
})

/**
 * Tabel penampung sementara untuk WebAuthn cryptographic challenge.
 */
export const authChallenges = sqliteTable('auth_challenges', {
  id: text('id').primaryKey(),
  /** Nilai challenge string yang dikirim ke browser */
  challenge: text('challenge').notNull(),
  /** Tujuan challenge ('register' atau 'authenticate') */
  purpose: text('purpose').notNull(),
  /** Waktu kedaluwarsa challenge dalam milidetik */
  expiresAt: integer('expires_at').notNull(),
})
