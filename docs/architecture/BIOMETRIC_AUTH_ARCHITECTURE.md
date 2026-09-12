# 🔐 Arsitektur Autentikasi Biometrik Workstation (WebAuthn / Passkey & Master PIN)

Dokumen ini menjelaskan implementasi teknis lengkap sistem autentikasi biometrik multi-perangkat pada **Workstation Mission Control** Mac mini M4. Arsitektur ini dirancang untuk memberikan perlindungan tingkat *enterprise*, bebas dari kebocoran data (*zero UI/data leakage*), mendukung biometrik lokal Apple Silicon (Touch ID) dan perangkat remote iOS/iPadOS (Face ID), serta dilengkapi sistem perlindungan brute force pada fallback PIN.

---

## 🏛️ Desain Arsitektur Keamanan (Security Model)

Sistem autentikasi mengadopsi model keamanan berlapis (*Defense-in-Depth*):

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           BROWSER CLIENT (REACT / TANSTACK)                       │
│                                                                                   │
│  [ useTouchIdAuth Hook ] ◄─────── LocalStorage Session Token (Fast Client Cache)   │
│            │                                                                      │
│            ├── WorkstationLockscreen (Anti-flicker gatekeeper & biometrics UI)     │
│            └── DeviceManagementModal (Pendaftaran Passkey iPhone / Mac baru)      │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │  HTTPS / Secure Context + Session Cookie
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                       SERVER LAYER (NITRO / TANSTACK START)                       │
│                                                                                   │
│  [ auth.server.ts ]                                                               │
│    ├── isServerAuthenticated() ─── Cek cookie `station_session` (HMAC-SHA256)     │
│    ├── getWebAuthnConfig() ────── Dinamisasi RP_ID & Origin (Multi-domain)        │
│    └── setServerSessionCookie() ── HttpOnly, SameSite=Lax, 7 Days TTL             │
│                                                                                   │
│  [ Server Functions Protection ]                                                  │
│    ├── getSystemTelemetry() ───── Return EMPTY_TELEMETRY jika unauthenticated     │
│    ├── getDevToolsStatus() ────── Return EMPTY_DEVTOOLS jika unauthenticated      │
│    └── getSystemProcesses() ───── Return [] jika unauthenticated                  │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE (SQLITE / DRIZZLE)                          │
│                                                                                   │
│  ├── `auth_settings`: Master PIN (Scrypt Hash + Salt), Lockout counter/expiry     │
│  ├── `auth_credentials`: Public Key WebAuthn, Credential ID, Transports, Device   │
│  └── `auth_challenges`: Random UUID Challenge (TTL 5 Menit)                      │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Komponen Inti & Alur Kerja (Core Components)

### 1. Zero UI & Data Leakage (Server-Side Guard)
- **Masalah Sebelumnya**: Pada Server-Side Rendering (SSR), route loader TanStack Start mengambil data telemetri real-time Mac mini M4 sebelum client memeriksa sesi. Akibatnya, payload awal `<script class="$tsr">` membocorkan data suhu, core M4, dan akun AI ke publik sebelum layar kunci muncul.
- **Solusi**:
  - `auth.server.ts` menyediakan `isServerAuthenticated()` yang dieksekusi di server untuk setiap request.
  - Jika sesi belum sah, server langsung me-return payload kosong (`EMPTY_TELEMETRY`) tanpa membaca sensor hardware atau database akun.
  - Di frontend, initial state `isAuthenticated` bernilai `false`, dan saat `isLoading === true`, ditampilkan splash loader minimalis tanpa membocorkan antarmuka dashboard.

### 2. Multi-Domain & Dinamisasi RP_ID (WebAuthn W3C)
- **Spesifikasi WebAuthn**: Browser mewajibkan `rpId` (Relaying Party ID) sama persis atau *suffix* dari hostname browser, dan harus berjalan di *Secure Context* (HTTPS atau `localhost`).
- **Implementasi**:
  - Fungsi `getWebAuthnConfig()` membaca request headers (`getRequestHost()` dan `getRequestProtocol()`) secara dinamis.
  - Jika diakses dari `localhost:3456`, `rpId = 'localhost'`.
  - Jika diakses dari domain produksi `https://mac.selco.id`, `rpId = 'mac.selco.id'`.
  - Hal ini memungkinkan Mac mini, iPhone, dan iPad mendaftarkan passkey pada domain yang sama tanpa error origin mismatch.

### 3. Penanganan Khusus iOS Safari (*The document is not focused* Solved)
- **Kebijakan Apple iOS Safari**: API `navigator.credentials.get` / `create` **dilarang keras dipanggil secara otomatis** saat halaman selesai dimuat (*unprompted auto-trigger*). Safari akan langsung melempar exception:
  `The document is not focused.`
- **Solusi**:
  - Pada `WorkstationLockscreen.tsx`, auto-trigger Touch ID dideteksi dengan User-Agent: dinonaktifkan khusus pada perangkat mobile (iOS / iPadOS / Android).
  - Pada iPhone, pengguna disajikan tombol interaktif **"Sentuh Touch ID / Face ID"** sehingga pemanggilan biometrik dipicu oleh sentuhan langsung (*explicit user gesture*).

### 4. Dukungan Multi-Perangkat (Device Management)
- Menggunakan komponen `DeviceManagementModal.tsx`:
  - Pengguna yang pertama kali login via iPhone dapat menggunakan **Master PIN**.
  - Setelah berada di dalam dashboard, pengguna cukup mengetuk menu **"Face ID"** pada bilah navigasi bawah (*bottom bar*).
  - Sistem akan mendaftarkan Secure Enclave milik iPhone tersebut ke tabel `auth_credentials`.
  - Pada login berikutnya di iPhone, iOS langsung memunculkan Face ID tanpa menampilkan prompt barcode / cross-device transport.

### 5. Proteksi Anti-Brute Force (Master PIN)
- **Constant Time Delay**: Delay artifisial 500ms pada setiap verifikasi PIN untuk menggagalkan bot otomatis berkecepatan tinggi.
- **Kriptografi Aman**: Menggunakan `crypto.scryptSync` dengan salt 16-byte unik per workstation.
- **Penguncian Bertingkat (*Exponential Lockout*)**:
  - 5x gagal berturut-turut: Penguncian akses selama 1 menit.
  - 7x gagal: Penguncian akses selama 5 menit.
  - 10x gagal: Penguncian akses selama 15 menit.

---

## 📂 Struktur File Terkait

| File | Peran & Tanggung Jawab |
| :--- | :--- |
| [`web/src/server/auth.ts`](file:///Volumes/MAC_EXTERNAL_SSD/Projects/MacMonitoring/web/src/server/auth.ts) | Server RPC functions (login PIN, WebAuthn challenge & verification, lockout logic) |
| [`web/src/server/auth.server.ts`](file:///Volumes/MAC_EXTERNAL_SSD/Projects/MacMonitoring/web/src/server/auth.server.ts) | Server-only cookie helpers, `isServerAuthenticated()`, dan `getWebAuthnConfig()` |
| [`web/src/hooks/useTouchIdAuth.ts`](file:///Volumes/MAC_EXTERNAL_SSD/Projects/MacMonitoring/web/src/hooks/useTouchIdAuth.ts) | Client hook manajemen status biometrik, hardware support, dan sesi lokal |
| [`web/src/components/auth/WorkstationLockscreen.tsx`](file:///Volumes/MAC_EXTERNAL_SSD/Projects/MacMonitoring/web/src/components/auth/WorkstationLockscreen.tsx) | Tampilan layar kunci, jam digital, tombol biometrik, dan formulir Master PIN |
| [`web/src/components/auth/DeviceManagementModal.tsx`](file:///Volumes/MAC_EXTERNAL_SSD/Projects/MacMonitoring/web/src/components/auth/DeviceManagementModal.tsx) | Dialog modal untuk mendaftarkan iPhone Face ID / Passkey baru |
| [`web/src/routes/__root.tsx`](file:///Volumes/MAC_EXTERNAL_SSD/Projects/MacMonitoring/web/src/routes/__root.tsx) | Gerbang utama dokumen, navigasi sidebar desktop, dan mobile bottom bar |

---

## 🛠️ Panduan Pemeliharaan & Troubleshooting

1. **Pengguna Melihat QR Barcode Saat Login di iPhone**:
   - **Penyebab**: Kredensial Face ID iPhone belum terdaftar di database; browser mencoba meminjam Touch ID Mac mini melalui *Hybrid Transport*.
   - **Solusi**: Minta pengguna masuk sekali menggunakan **Master PIN**, lalu buka menu **"Face ID"** di bilah bawah untuk mendaftarkan perangkat.

2. **Error "The document is not focused"**:
   - **Penyebab**: Fungsi autentikasi biometrik dipanggil tanpa interaksi sentuhan langsung dari pengguna di Safari.
   - **Solusi**: Jangan pernah menambahkan `useEffect` yang memanggil `authenticateWithTouchId()` secara otomatis di perangkat mobile.

3. **Reset Kredensial / PIN Melalui Terminal**:
   - Jika kredensial terkunci atau perlu di-reset secara manual:
     ```bash
     sqlite3 /Volumes/MAC_EXTERNAL_SSD/Projects/MacMonitoring/web/data/station.db "DELETE FROM auth_settings; DELETE FROM auth_credentials; DELETE FROM auth_challenges;"
     ```
     Setelah dibersihkan, buka kembali dashboard untuk melakukan inisialisasi Master PIN baru.
