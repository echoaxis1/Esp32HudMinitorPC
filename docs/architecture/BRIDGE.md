# 🔌 Host Bridge & Telemetry Guidelines — Python Daemon (`tools/` / `bridge/`)

Dokumen ini adalah panduan arsitektur dan standar implementasi untuk layanan host background **mac_monitor_bridge.py** yang berjalan di macOS.

---

## 1. Peran & Tanggung Jawab Utama

Daemon bridge bertindak sebagai **jantung pengumpul data telemetri sistem macOS** dan penghubung komunikasi dua arah antara host Mac dan perangkat keras eksternal:

1. **Pengumpulan Sensor Perangkat Keras**:
   - Beban kerja CPU total dan per-core (`psutil.cpu_percent(percpu=True)`).
   - Sensor temperatur CPU dan GPU Apple Silicon M4.
   - Kapasitas memori RAM fisik, wired, dan swap file.
   - Pemantauan multi-drive storage (Internal `Macintosh HD` dan SSD Eksternal).
   - Kecepatan transfer unduh/unggah jaringan (`psutil.net_io_counters()`).
2. **Pengambilan Kuota Mandiri Antigravity Cockpit (Headless 60s Worker)**:
   - Menjalankan background thread setiap 60 detik.
   - Membaca token terenkripsi AES-256-GCM dari `~/.antigravity_cockpit/accounts/*.json`.
   - Mengambil kuota Gemini & Claude/GPT langsung via API internal Google Cloud Code.
   - Memperbarui token OAuth kedaluwarsa secara otomatis via `refresh_token`.
3. **Penyaluran Data Multicast**:
   - Mengirim baris JSON newline-delimited via **USB Serial CDC (115200 baud)** ke board ESP32-S3.
   - Menyediakan antarmuka lokal (WebSocket / Local HTTP API) untuk konsumsi dashboard web TanStack Start.
4. **Eksekusi Aksi Switch Akun AI**:
   - Menerima sinyal touch `CMD:SWITCH_AGY:<id>` dari layar ESP32 atau API dashboard web.
   - Melakukan injeksi token langsung ke **macOS Keychain** (`gemini / antigravity`) dan menyelaraskan Protobuf `userStatus` di SQLite `state.vscdb`.

---

## 2. Struktur Kode & Modul Kunci

Berkas utama saat ini berada di [`tools/mac_monitor_bridge.py`](../../tools/mac_monitor_bridge.py):

| Fungsi / Komponen | Peran |
| :--- | :--- |
| `refresh_all_agy_quotas_background()` | Thread worker auto-refresh kuota seluruh akun setiap 60 detik tanpa buka GUI Cockpit. |
| `inject_account_to_keychain()` | Dekripsi token AES-256-GCM dan injeksi ke Keychain macOS (`go-keyring-base64`). |
| `switch_cockpit_account()` | Orkestrasi 5 langkah switch akun headless Antigravity. |
| `get_temperatures()` | Ekstraksi sensor suhu SoC M4 via CLI/powermetrics. |
| `is_macos_display_off()` | Deteksi status layar tidur/terkunci via CoreGraphics (`CGDisplayIsAsleep`). |
| `main()` loop | Serial stream 1 Hz, pembacaan incoming command, dan handshake `ACK:OK`. |

---

## 3. SOP Operasional & Port Locking

- **Manajemen Proses PM2**:
  - Daemon bridge dikelola secara permanen oleh PM2 dengan nama aplikasi `esp32hud`.
  - Cek status: `pm2 status esp32hud`
  - Cek log real-time: `pm2 logs esp32hud --lines 30`
  - Restart daemon: `pm2 restart esp32hud`
- **Aturan Mutlak Flashing Firmware ESP32**:
  - Port serial `/dev/cu.usbmodem*` di-lock secara eksklusif oleh Python serial CDC.
  - Sebelum menjalankan flashing `pio run -t upload`, **WAJIB** jalankan `pm2 stop esp32hud`.
  - Setelah flashing berhasil, nyalakan kembali dengan `pm2 start esp32hud`.
