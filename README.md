# ESP32-S3 Mac System Monitor (PC Hardware HUD)

Sistem hardware monitoring desktop real-time mandiri (*Desk HUD Monitor*) untuk macOS berbasis board pengembang **Waveshare ESP32-S3-Touch-LCD-4.3"** (layar 800×480 RGB Parallel TFT, driver ST7262, 8MB Octal PSRAM, dan 16MB Flash).

Proyek ini menampilkan telemetri beban kerja CPU, temperatur inti (CPU/GPU), penggunaan RAM, sisa kapasitas SSD, serta kecepatan transfer unduh/unggah jaringan secara langsung dan presisi melalui koneksi USB Serial CDC berkecepatan tinggi dengan antarmuka grafis modern bergaya *Dark Cyberpunk*.

---

## 1. Tumpukan Teknologi & Komponen (Tech Stack)

| Kategori | Teknologi / Pustaka | Keterangan |
| :--- | :--- | :--- |
| **Microcontroller** | ESP32-S3-WROOM-1-N16R8 | Dual-Core Xtensa LX7 @ 240 MHz, 16MB Flash, 8MB Octal PSRAM |
| **Display Panel** | Waveshare 4.3" TFT LCD (800×480) | 16-bit Parallel RGB (5-6-5), PCLK 16 MHz, ST7262 Driver IC |
| **I/O Expander** | CH422G (I2C Bus) | Mengontrol Backlight LCD, Reset LCD, dan Reset Touchscreen |
| **Touchscreen** | Goodix GT911 (I2C Bus) | Kapasitif multitouch (tersedia driver, di-bypass saat mode HUD) |
| **GUI Framework** | LVGL v8.3.11 | Render grafis berbasis widget arc, bar, label, dan palet warna kustom |
| **JSON Parser** | ArduinoJson v7.4.3 | Zero-allocation deserialization untuk parsing metrik tanpa alokasi heap |
| **Firmware Framework**| Arduino Core ESP32 (v2.0.17 / ESP-IDF 4.4 backend) | Manajemen clock, FreeRTOS multitask, dan antarmuka USB Serial/JTAG |
| **Build System** | PlatformIO Core | Toolchain otomasi build, manajemen dependensi, dan flashing firmware |
| **Host Bridge** | Python 3 (pyserial, psutil) | Daemon latar belakang macOS pengumpul metrik sistem via sysctl & ioreg |

---

## 2. Struktur Direktori & Penjelasan Kode

```text
Esp32HudMonitorPC/
├── platformio.ini                  # Konfigurasi board, OPI PSRAM, QIO Flash 80MHz, -O2
├── default_16MB.csv                # Skema partisi Flash 16MB (App 6.25MB, SPIFFS 9.6MB)
├── requirements.txt                # Dependensi pustaka Python host (pyserial, psutil)
├── .gitignore                      # Filter berkas artefak build (.pio, .venv, pycache)
├── README.md                       # Dokumentasi utama proyek
├── docs/
│   ├── ESP32S3_RGB_TEARING_POSTMORTEM.md       # Dokumentasi mendalam analisis error glitch/tearing
│   └── ANTIGRAVITY_ACCOUNT_SWITCH_ARCHITECTURE.md # Arsitektur autentikasi & switch akun AGY via HUD
├── include/
│   ├── board_config.h              # Definisi pinout ST7262 RGB, I2C CH422G, dan GT911
│   └── lv_conf.h                   # Konfigurasi engine grafis LVGL & custom font montserrat
├── src/
│   ├── main.cpp                    # Entry point firmware, loop LVGL, dan parser serial
│   ├── hardware/
│   │   ├── ch422g.h / .cpp         # Driver kontroler CH422G IO expander via I2C
│   │   └── display.h / .cpp        # Inisialisasi panel RGB ST7262 & double buffer LVGL
│   ├── ui/
│   │   ├── ui_mac_monitor.h / .cpp # Dashboard Mac Monitor Cyberpunk & Screen Coordinator
│   │   ├── ui_screen_agy_cockpit.h / .cpp # Modul UI Layar Pool Akun AGY & Switch Event (SRP)
│   │   ├── ui_theme.h              # Token warna dan shared component helper
│   │   └── ui_avatar.h / .cpp      # Template UI avatar robotik pendamping terminal
│   └── network/
│       └── wifi_manager.h / .cpp   # Modul opsional komunikasi nirkabel (Wi-Fi/WebSockets)
└── tools/
    ├── mac_monitor_bridge.py       # Daemon pengumpul metrik, enkripsi/keychain injector & serial
    └── agy_bridge.py               # Daemon alternatif untuk integrasi Antigravity CLI
```

### Rincian Peran Tiap Berkas Kunci
- **[`platformio.ini`](platformio.ini)**: Menentukan arsitektur memori `qio_opi` (Quad Flash + Octal PSRAM) dan frekuensi 80 MHz, alokasi partisi 16MB, optimasi `-O2`, serta dependensi pustaka.
- **[`include/board_config.h`](include/board_config.h)**: Berisi pemetaan 16 pin data RGB (D0–D15), sinyal sinkronisasi (HSYNC, VSYNC, DE, PCLK), alamat I2C CH422G (`0x24`), dan alamat Touch GT911 (`0x5D` / `0x14`).
- **[`src/hardware/display.cpp`](src/hardware/display.cpp)**: 
  - Mengonfigurasi kontroler RGB panel ESP32-S3 dengan timing ST7262 resmi (PCLK 16 MHz, HBP=88, HPW=48, HFP=40, VBP=32, VPW=3, VFP=13).
  - Mengalokasikan **dua draw buffer parsial** masing-masing 40 baris langsung di SRAM internal berkecepatan tinggi (`MALLOC_CAP_INTERNAL | MALLOC_CAP_DMA`) untuk menghindari bus contention.
  - Menempatkan fungsi flush [`my_disp_flush`](src/hardware/display.cpp) di dalam **IRAM** menggunakan `IRAM_ATTR`.
- **[`src/ui/ui_mac_monitor.cpp`](src/ui/ui_mac_monitor.cpp)**: Merancang antarmuka dashboard Cyberpunk:
  - 1 Top Header (Nama Chip SoC, IP Lokal, dan Jam/Uptime sistem).
  - 3 Kartu Atas (CPU Arc Gauge, RAM Arc Gauge, SSD Capacity Bar).
  - 2 Kartu Bawah:
    - Kiri: SOC Thermal Sensors CPU/GPU & Network Download/Upload Traffic.
    - Kanan: **AGY Active Meter** (Dua circular arc meter untuk kuota 5 Jam & Mingguan model Gemini dan Claude/GPT serta label akun aktif dinamis).
  - Mengimplementasikan logika *differential update* (hanya memperbarui widget yang nilainya berubah) untuk menekan beban render CPU.
- **[`src/ui/ui_screen_agy_cockpit.cpp`](src/ui/ui_screen_agy_cockpit.cpp)**: Layar sekunder terisolasi (Modular Screen) untuk menampilkan daftar seluruh akun Antigravity Cockpit (terurut descending berdasarkan kuota Gemini terbanyak) dan menangani gesture touch switch akun secara langsung.
- **[`src/main.cpp`](src/main.cpp)**: Mengontrol siklus FreeRTOS loop:
  - Menerima baris JSON melalui USB Serial CDC buffer.
  - Mengekstrak data metrik ke dalam struct fixed-size char tanpa alokasi heap dinamis (`String`).
  - Mengirim respons konfirmasi `ACK:OK` ke PC.
  - Memanggil `lv_timer_handler()` untuk menyegarkan tampilan.
- **[`tools/mac_monitor_bridge.py`](tools/mac_monitor_bridge.py)**: Skrip Python multi-threaded yang berjalan di Mac via PM2 (`esp32hud`):
  - Mengumpulkan beban CPU (`psutil.cpu_percent`), memori fisik, sisa kapasitas storage (`shutil.disk_usage`), dan delta kecepatan bandwidth jaringan.
  - Mengekstrak temperatur CPU/GPU Apple Silicon secara akurat via `powermetrics` / `sysctl`.
  - **Standalone Quota Refresher**: Background worker asinkron setiap 60 detik yang memeriksa dan memperbarui sisa kuota seluruh akun Antigravity via Google Cloud Code Internal API tanpa perlu membuka desktop GUI Cockpit Tools.
  - Mengirim payload JSON setiap 1.0 detik ke port USB ESP32 (`/dev/cu.usbmodem*`) dan memverifikasi balasan `ACK:OK`.

---

## 3. Spesifikasi Protokol Komunikasi Serial

Komunikasi berjalan dua arah melalui antarmuka USB Serial CDC bawaan ESP32-S3 pada baudrate `115200`.

### Format Paket Data dari Mac ke ESP32 (JSON Newline-Delimited)
```json
{
  "cpu": 34.5,
  "cpu_temp": 68.2,
  "gpu_temp": 65.4,
  "ram_pct": 79.1,
  "ram_used": 12.6,
  "ram_total": 16.0,
  "disk_pct": 58.4,
  "disk_free": 185.3,
  "net_up": 142.8,
  "net_down": 1250.4,
  "chip": "Apple M4",
  "media": "Spotify",
  "uptime": "2d 23h 30m"
}
```

### Format Balasan dari ESP32 ke Mac (Handshake)
Setelah paket JSON tervalidasi dan metrik diekstraksi ke buffer internal, ESP32 membalas:
```text
ACK:OK\n
```

---

## 4. Panduan Instalasi & Penggunaan

### Prasyarat Perangkat Keras
1. Board **Waveshare ESP32-S3-Touch-LCD-4.3"**.
2. Kabel data USB Type-C (pastikan kabel mendukung jalur data, bukan hanya pengisian daya/charging).
3. Komputer Mac yang terhubung ke port USB ESP32.

---

### Langkah 1: Flash Firmware ke ESP32-S3

1. Hubungkan board ke port USB Mac. Cek port serial yang terdeteksi:
   ```bash
   ls /dev/cu.usbmodem*
   ```
   *(Contoh output: `/dev/cu.usbmodem21201`)*

2. Buka direktori proyek dan kompilasi serta flash firmware menggunakan PlatformIO:
   ```bash
   cd /Users/echoaxis/Projects/Esp32/Esp32HudMonitorPC
   
   # Menggunakan virtualenv bawaan proyek
   .venv/bin/pio run -t upload --upload-port /dev/cu.usbmodem21201
   ```
   *(Jika menggunakan PlatformIO global, cukup jalankan `pio run -t upload`)*

---

### Langkah 2: Persiapan Lingkungan Host Python di Mac

1. Aktifkan virtual environment atau gunakan binary virtualenv:
   ```bash
   cd /Users/echoaxis/Projects/Esp32/Esp32HudMonitorPC
   source .venv/bin/activate
   ```

2. Pasang pustaka dependensi Python:
   ```bash
   pip install -r requirements.txt
   ```

---

### Langkah 3: Menjalankan Host Bridge Daemon

Jalankan skrip daemon pemantau metrik:
```bash
python3 tools/mac_monitor_bridge.py
```

Output terminal saat terhubung normal:
```text
[INIT] Host SoC: Apple M4
[CONNECTED] ESP32 terdeteksi di: /dev/cu.usbmodem21201
[STREAM] CPU: 28.5% | Temp: 67.7C | RAM: 79.1% | Uptime: 2d 23h 30m | ACK: ACK:OK
[STREAM] CPU: 25.3% | Temp: 64.5C | RAM: 79.1% | Uptime: 2d 23h 30m | ACK: ACK:OK
```
Layar LCD akan langsung menampilkan dashboard aktif dengan pergerakan gauge dan angka yang diperbarui setiap detik.

---

## 5. Dokumentasi Masalah Glitch / Tearing & Resolusi Arsitektur

Saat tahap awal pengembangan, layar mengalami glitch visual horizontal (layar robek / berkedip) setiap 1 detik tepat ketika data serial tiba.

Dokumentasi lengkap mengenai investigasi arsitektur hardware bus ESP32-S3, analisis starvation pada GDMA FIFO, pengujian eksperimen yang gagal, hingga implementasi 4 langkah perbaikan permanen telah dirangkum dalam dokumen teknis terpisah:

👉 **[Baca Dokumentasi Lengkap Analisis Glitch & Tearing (docs/ESP32S3_RGB_TEARING_POSTMORTEM.md)](docs/ESP32S3_RGB_TEARING_POSTMORTEM.md)**

---

## 6. Lisensi & Kredit

- **Board Driver**: [Waveshare ESP32-S3-Touch-LCD-4.3 Wiki](https://www.waveshare.com/wiki/ESP32-S3-Touch-LCD-4.3)
- **GUI Engine**: [LVGL - Light and Versatile Graphics Library](https://lvgl.io/)
- **Author**: echoaxis
