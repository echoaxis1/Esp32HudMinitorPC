# ⚡ Firmware ESP32-S3 Guidelines — C++ & LVGL (`src/`)

Dokumen ini adalah panduan arsitektur dan standar implementasi untuk firmware mikrokontroler **Waveshare ESP32-S3-Touch-LCD-4.3"** yang berada di direktori `src/` dan `include/`.

---

## 1. Spesifikasi Perangkat Keras

- **SoC**: ESP32-S3-WROOM-1-N16R8 (Dual-core 240MHz, 16MB Flash, 8MB Octal PSRAM).
- **Layar**: 4.3" TFT LCD 800×480, 16-bit Parallel RGB interface (ST7262 driver).
- **Touch**: Goodix GT911 Capacitive Multi-touch via I2C (`0x5D` / `0x14`).
- **IO Expander**: CH422G via I2C (`0x24`) untuk kontrol Backlight & Reset pin.
- **Engine Grafis**: LVGL v8.3.11.

---

## 2. Struktur Modul Firmware

```text
src/
├── main.cpp                        # Loop FreeRTOS, serial parser, dan sinkronisasi data
├── hardware/
│   ├── ch422g.h / .cpp             # Driver I2C expander
│   └── display.h / .cpp            # Inisialisasi panel RGB ST7262 & draw buffer
└── ui/
    ├── ui_mac_monitor.h / .cpp     # Dashboard Utama Cyberpunk (Layar 1 s/d 5)
    ├── ui_screen_agy_cockpit.h / .cpp # Layar Pool Akun AGY & Touch Switch (Layar 6)
    └── ui_theme.h                  # Token warna & helper komponen kartu
```

---

## 3. Aturan Arsitektur Anti-Tearing & Stabilitas Memori

1. **Alokasi Draw Buffer di Internal SRAM**:
   - Dua draw buffer LVGL dialokasikan langsung di internal SRAM dengan flag `MALLOC_CAP_INTERNAL | MALLOC_CAP_DMA` (ukuran masing-masing 40 baris).
   - **Dilarang** mengalokasikan draw buffer di PSRAM karena akan memicu starvation pada GDMA RGB controller saat transfer serial CDC berjalan.
2. **IRAM Flush Handler**:
   - Fungsi callback `my_disp_flush` wajib didekorasi dengan `IRAM_ATTR` agar dieksekusi dari instruksi RAM berkecepatan tinggi.
3. **Differential Rendering (*Delta Check*)**:
   - Semua pembaruan widget pada `updateMetrics()` wajib memeriksa apakah nilai baru berbeda dari nilai sebelumnya (`prev`).
   - Widget yang nilainya tidak berubah **tidak boleh dipanggil ulang fungsinya** untuk menghemat siklus rendering.
4. **Histeresis Transisi Screensaver**:
   - Transisi ke layar jam Standby Screensaver dikunci pada parameter `m.display_off` dengan counter histeresis minimal 2 siklus pembacaan (`ss_counter >= 2`) untuk mencegah kedap-kedip akibat sinyal idle sesaat.

---

## 4. Panduan Kompilasi & Flashing

```bash
# 1. Selalu matikan bridge PM2 terlebih dahulu
pm2 stop esp32hud

# 2. Kompilasi dan upload firmware via PlatformIO
pio run -t upload

# 3. Nyalakan kembali bridge PM2
pm2 start esp32hud
```
