# 🧭 Workstation Mission Control — Master Orchestrator Guidelines (AGENTS.md)

Workspace ini adalah ekosistem pemantauan perangkat keras macOS (Mac mini M4), orkestrasi alat bantu kerja developer (*Workstation Mission Control*), serta pendamping desktop fisik (*Physical Desk HUD*).

---

## 🏛️ Arsitektur Tiga Pilar (Tri-Pillar Ecosystem)

Sistem ini terbagi menjadi 3 domain independen yang bekerja secara harmonis:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MASTER ORCHESTRATOR                                    │
│                                      (AGENTS.md)                                       │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
         ┌──────────────────────────────────┼──────────────────────────────────┐
         ▼                                  ▼                                  ▼
┌──────────────────┐              ┌──────────────────┐              ┌──────────────────┐
│  ESP32-S3 HUD    │              │   HOST BRIDGE    │              │  MAC DASHBOARD   │
│ (Physical Desk)  │              │ (Sensors/Serial) │              │ (Mission Control)│
│  `firmware/`     │              │    `bridge/`     │              │     `web/`       │
│  (C++ / LVGL)    │              │ (Python Daemon)  │              │ (TanStack Suite) │
│                  │              │                  │              │                  │
│ Sub-Guideline:   │              │ Sub-Guideline:   │              │ Sub-Guideline:   │
│ docs/architecture│              │ docs/architecture│              │ docs/architecture│
│ /FIRMWARE.md     │              │ /BRIDGE.md       │              │ /WEB_DASHBOARD.md│
└──────────────────┘              └──────────────────┘              └──────────────────┘
```

---

## 📚 Context Routing Table (Progressive Context Loading)

Setiap agen AI atau pengembang yang bekerja pada workspace ini **WAJIB membaca file rujukan spesifik** sesuai area yang akan dimodifikasi:

| Domain Pekerjaan | Cakupan & Masalah | File Rujukan Utama (Wajib Dibaca) |
| :--- | :--- | :--- |
| **Orkestrator & Global** | Standar umum, aturan repositori, arsitektur pilar | [`AGENTS.md`](AGENTS.md) & [`README.md`](README.md) |
| **Web Dashboard** | TanStack Start, Router, Query, Charts, Table, Store, Form | [`docs/architecture/WEB_DASHBOARD.md`](docs/architecture/WEB_DASHBOARD.md) |
| **Host Bridge & Telemetri** | Python daemon, PM2 `esp32hud`, sensor SoC M4, WebSocket/Serial | [`docs/architecture/BRIDGE.md`](docs/architecture/BRIDGE.md) |
| **Firmware ESP32-S3** | PlatformIO, C++, ST7262 RGB Panel, LVGL 8.3, Double Buffer | [`docs/architecture/FIRMWARE.md`](docs/architecture/FIRMWARE.md) |
| **AI Token & Switch Akun** | Autentikasi Cockpit, Keychain injection, Protobuf `userStatus` | [`docs/ANTIGRAVITY_ACCOUNT_SWITCH_ARCHITECTURE.md`](docs/ANTIGRAVITY_ACCOUNT_SWITCH_ARCHITECTURE.md) |
| **Autentikasi Biometrik** | WebAuthn/Passkey, Touch ID Mac, Face ID iPhone, Master PIN | [`docs/architecture/BIOMETRIC_AUTH_ARCHITECTURE.md`](docs/architecture/BIOMETRIC_AUTH_ARCHITECTURE.md) |
| **Stabilitas Display ESP32** | Tearing prevention, DMA starvation, alokasi IRAM/SRAM | [`docs/ESP32S3_RGB_TEARING_POSTMORTEM.md`](docs/ESP32S3_RGB_TEARING_POSTMORTEM.md) |

---

## ⛔ Core Security Guardrails & Development Rules

1. **Port Locking & Flashing Rule**:
   - Dilarang menjalankan `pio run -t upload` tanpa mematikan sementara daemon bridge (`pm2 stop esp32hud`). Setelah selesai flash, daemon wajib dinyalakan kembali (`pm2 start esp32hud`).
2. **Secret Scanning & GitHub Push Protection**:
   - Dilarang keras menaruh token, Client ID, atau Client Secret secara eksplisit (*hardcoded*) di dalam file kode sumber atau commit git.
   - Semua kredensial sistem lokal wajib diekstrak secara dinamis atau menggunakan file `.env` yang masuk `.gitignore`.
3. **Pemisahan Stack Bersih (*Clean Stack Isolation*)**:
   - Modifikasi pada aplikasi web (`web/`) tidak boleh merusak format payload serial yang dibutuhkan firmware ESP32 (`firmware/`).
   - Gunakan format serializer terpadu yang kompatibel ke belakang (*backward-compatible*).
4. **Kewajiban Dokumentasi Temuan Teknis (*Mandatory Discovery Logging*)**:
   - Setiap kali menemukan perilaku sistem khusus, perbedaan biner aplikasi (seperti perbedaan proses `Antigravity.app` vs `Antigravity IDE.app`), perubahan format token, atau perbaikan bug arsitektural:
     - **Agen WAJIB mendokumentasikannya ke dokumen arsitektur terkait** (seperti `docs/ANTIGRAVITY_ACCOUNT_SWITCH_ARCHITECTURE.md`) dan mencantumkan catatannya di `AGENTS.md`.
     - Tujuannya memastikan semua agen dan developer di masa mendatang memahami konteks dan tidak mengulang kesalahan implementasi.
5. **Gaya Komunikasi Profesional**:
   - Tidak menggunakan emoji dekoratif berlebihan. Sajian data lugas, bersih, dan profesional.
6. **Kewajiban Dokumentasi JSDoc Bahasa Indonesia**:
   - Setiap penulisan atau modifikasi fungsi, komponen UI, server function, tipe/interface, utilitas, atau hook pada kode JavaScript/TypeScript **WAJIB menyertakan dokumentasi JSDoc (`/** ... */`) dalam Bahasa Indonesia**.
   - Dokumentasi JSDoc wajib mendeskripsikan secara jelas: tujuan fungsi/komponen, penjelasan setiap parameter (`@param`), nilai kembalian (`@returns`), serta efek samping/catatan khusus jika ada.

---

## 💬 Action Shortcuts
- **"simpan perubahan"**:
  1. `git add .`
  2. `git commit -m "<pesan deskriptif Bahasa Indonesia>"`
  3. `git push origin main`
- **"update firmware esp32"**:
  1. `pm2 stop esp32hud`
  2. `pio run -t upload`
  3. `pm2 start esp32hud`
