# Post-Mortem & Analisis Arsitektural: Glitch / Tearing pada ESP32-S3 RGB LCD (ST7262) & LVGL

Dokumen ini mendokumentasikan investigasi teknis mendalam mengenai penyebab terjadinya glitch grafis, layar berkedip (*tearing*), dan layar bergoyang pada panel **Waveshare ESP32-S3-Touch-LCD-4.3"** (800×480 RGB parallel, ST7262 driver, 8MB Octal PSRAM, 16MB Flash) saat menerima data streaming serial secara periodik (setiap 1 detik), serta langkah resolusi arsitektural yang berhasil mengatasinya secara tuntas.

---

## 1. Ringkasan Eksekutif (Executive Summary)

- **Gejala Masalah**: Layar LCD 800×480 mengalami artefak visual (*glitch* horizontal seperti monitor analog rusak) persis setiap 1 detik ketika data metrik sistem baru dikirimkan dari komputer Mac melalui USB Serial.
- **Akar Masalah (Root Cause)**:
  ESP32-S3 menggunakan bus memori eksternal bersama (**MSPI Bus / SPI0-SPI1**) untuk mengakses Flash eksternal dan Octal PSRAM eksternal. Framebuffer tampilan disimpan di PSRAM dan dialirkan secara kontinu oleh **GDMA** ke layar pada kecepatan 16 MHz (~32 MB/detik). Ketika paket data serial tiba, CPU secara serentak mengeksekusi instruksi dari Flash, membaca data *font glyph* dari Flash (`.rodata`), melakukan alokasi heap dinamis (`String`), dan menyalin piksel ke PSRAM. Beban serentak ini menyebabkan arbiter MSPI memprioritaskan CPU/Flash dan menahan GDMA hingga **FIFO GDMA kehabisan data (*GDMA FIFO underflow*)**, yang merusak sinyal sinkronisasi piksel ST7262.
- **Solusi Utama**:
  1. Mengubah mode Flash dari **Dual I/O (`dio`)** ke **Quad I/O (`qio`)** pada 80 MHz, memotong waktu okupansi bus Flash hingga separuhnya.
  2. Menempatkan rutin flush grafis [`my_disp_flush`](../src/hardware/display.cpp) ke dalam memori RAM internal menggunakan atribut **`IRAM_ATTR`**.
  3. Mengaktifkan **Double-Buffering di SRAM Internal** (`buf1` dan `buf2` masing-masing 40 baris pada `MALLOC_CAP_INTERNAL | MALLOC_CAP_DMA`), mengisolasi proses rendering LVGL dari PSRAM bus.
  4. Mengganti seluruh alokasi memori dinamis (`String`) pada parser JSON dengan **Fixed-Size Char Arrays** untuk meniadakan fragmentasi heap.

---

## 2. Spesifikasi Perangkat Keras & Tumpukan Perangkat Lunak

| Komponen | Spesifikasi / Konfigurasi |
| :--- | :--- |
| **SoC** | ESP32-S3 (Xtensa Dual-Core 32-bit LX7 @ 240 MHz) |
| **Memori Internal** | 512 KB Internal SRAM |
| **Memori Eksternal** | 16 MB SPI Flash + 8 MB Octal PSRAM (OPI @ 80 MHz) |
| **LCD Panel** | Waveshare 4.3-inch TFT LCD (800 × 480 piksel) |
| **LCD Driver IC** | Sitronix ST7262 (RGB Parallel Interface 16-bit 5-6-5) |
| **Pixel Clock (PCLK)** | 16.0 MHz (~31.05 FPS) |
| **GUI Framework** | Light and Versatile Graphics Library (LVGL) v8.3.11 |
| **Build System** | PlatformIO Core / Arduino Core ESP32 (ESP-IDF 4.4.x backend) |

---

## 3. Investigasi Mendalam: Mengapa Glitch Terjadi?

### 3.1. Arsitektur Bus Memori Bersama (Shared MSPI Bus)
Pada ESP32-S3, periferal antarmuka memori eksternal (MSPI) mengontrol:
1. **SPI0**: Akses cache CPU ke Flash dan PSRAM.
2. **SPI1**: Operasi DMA periferal serta akses bus internal.

```
                  ┌──────────────────────────────────────────────┐
                  │             ESP32-S3 SoC                     │
                  │                                              │
                  │  ┌──────────┐            ┌────────────────┐  │
                  │  │ CPU Core │            │  LCD GDMA Tx   │  │
                  │  └────┬─────┘            └───────┬────────┘  │
                  │       │                          │           │
                  │   (Instruksi/Font)        (Streaming Piksel) │
                  │       │                          │           │
                  │       ▼                          ▼           │
                  │  ┌────────────────────────────────────────┐  │
                  │  │       MSPI Arbiter / Memory Bus        │  │
                  │  └───────────────────┬────────────────────┘  │
                  └──────────────────────┼───────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
                   ▼                                           ▼
          ┌─────────────────┐                        ┌───────────────────┐
          │  External Flash │                        │   Octal PSRAM     │
          │  16MB (Code/Font│                        │  8MB (Framebuffer)│
          └─────────────────┘                        └───────────────────┘
```

Panel RGB 800×480 tidak memiliki *internal Graphic RAM (GRAM)* terintegrasi di dalam panel. Oleh karena itu, kontroler LCD ESP32-S3 harus **terus-menerus memompa data piksel secara non-stop** dari framebuffer yang disimpan di PSRAM:
$$\text{Throughput GDMA} = 800 \times 480 \times 2 \text{ byte} \times 31.05 \text{ frame/detik} \approx 23.85 \text{ MB/detik}$$

Pada tingkat fisik bus, transfer membaca baris-baris piksel membutuhkan bandwidth aktif sekitar **32 MB/detik** pada PCLK 16 MHz.

### 3.2. Skenario Pemicu (The 1-Second Burst Contention)
Selama kondisi idle (tidak ada data yang masuk dari PC):
- CPU berada dalam kondisi hemat daya / sleep (`delay(2)`).
- Tidak ada penulisan data ke PSRAM dan tidak ada pembacaan instruksi berat dari Flash.
- **Hasil**: GDMA memiliki akses hampir 100% tanpa hambatan ke bus PSRAM. **Layar terlihat sangat normal dan stabil.**

Namun, persis setiap 1 detik ketika skrip `mac_monitor_bridge.py` mengirim data:
1. **Penerimaan USB CDC**: Interupsi serial memicu eksekusi `handleSerialInput()`.
2. **Deserialisasi JSON**: Pustaka `ArduinoJson` mem-parsing ratusan byte string JSON.
3. **Alokasi Heap Dinamis**: Kode sebelumnya mengonversi field teks menjadi objek `String` (`String(doc["chip"])`, `String(doc["uptime"])`). Alokasi `malloc`/`free` berkali-kali menyebabkan *cache eviction* pada memori L1 data cache.
4. **Invalidasi Widget LVGL**: Perubahan nilai CPU, RAM, Suhu, SSD, dan Jaringan memicu invalidasi 12–15 area *bounding box* di seluruh koordinat layar.
5. **Rendering Font dari Flash**: LVGL merender karakter-karakter teks (`Montserrat 24`, `20`, `14`, `12`). Tabel *glyph bitmap* huruf dan angka terletak di bagian `.rodata` Flash eksternal. Setiap pembacaan bitmap huruf oleh CPU harus ditarik dari Flash via MSPI bus.
6. **Eksekusi Flush ke PSRAM**: Fungsi [`my_disp_flush`](../src/hardware/display.cpp) memanggil `esp_lcd_panel_draw_bitmap`, yang melakukan loop `memcpy` baris demi baris langsung ke framebuffer di PSRAM, diikuti sinkronisasi cache `Cache_WriteBack_Addr`.

### 3.3. Titik Kegagalan (GDMA FIFO Underflow)
Karena mode Flash sebelumnya dikonfigurasi pada mode **Dual I/O (`dio`)**, setiap pengambilan instruksi memakan waktu 2 kali lebih lama daripada Quad I/O. 

Ketika CPU sibuk membaca *font glyph* dari Flash dan serentak menulis piksel ke PSRAM, arbiter bus MSPI menahan (*stall*) permintaan baca dari GDMA. FIFO internal kontroler GDMA LCD (yang hanya berukuran beberapa *words*) habis dalam hitungan mikrodetik (**GDMA Underflow / `outfifo_udf`**). Akibatnya, pulsa sinyal horizontal/vertikal kehilangan bit data warna saat panel sedang memindai baris, menghasilkan garis robek (*tearing*) dan visual rusak selama 10–20 milidetik pembaruan.

---

## 4. Analisis Eksperimen yang Gagal (Lessons Learned)

Sebelum menemukan solusi arsitektural yang tepat, dilakukan beberapa percobaan yang memberikan wawasan penting:

### Eksperimen 1: Menurunkan PCLK ke 14 MHz & Mengubah Nilai Porch Secara Sembarangan
- **Tindakan**: Mengurangi PCLK dari 16 MHz ke 14 MHz serta mengubah nilai *Back Porch* dan *Pulse Width* ke nilai minimal (misal HBP=8, HPW=4).
- **Hasil**: Layar mengalami desinkronisasi total (*rolling display* / monitor rusak parah).
- **Penyebab**: IC driver ST7262 memiliki batasan fisik absolut pada datasheet:
  - Total Horizontal Blanking: $\text{HBP} + \text{HPW} \ge 88 \text{ PCLK}$
  - Total Vertical Blanking: $\text{VBP} + \text{VPW} \ge 8 \text{ baris}$
  Melanggar batasan ini membuat PLL internal ST7262 gagal mengunci frekuensi pemindaian vertikal.

### Eksperimen 2: Menambahkan Binary Semaphore VSYNC di Dalam `my_disp_flush`
- **Tindakan**: Mengambil semaphore VSYNC (`xSemaphoreTake(sem_vsync_end, ...)`) tepat sebelum `esp_lcd_panel_draw_bitmap`.
- **Hasil**: Layar bergoyang-goyang (*jittery / vibrating*) setiap 1 detik.
- **Penyebab**:
  Draw buffer LVGL berukuran 40 baris (parsial). Ketika 12 widget berbeda diperbarui di seluruh layar, LVGL memanggil `my_disp_flush` sebanyak **12 hingga 15 kali berturut-turut** dalam satu siklus render. Dengan memaksa setiap panggilan menunggu 1 siklus VSYNC (32 ms):
  $$15 \text{ panggilan flush} \times 32.2 \text{ ms} = 483 \text{ ms}$$
  Proses pembaruan frame terpecah-pecah selama hampir setengah detik. Pengguna melihat kartu-kartu dashboard digambar satu per satu secara bertahap di layar, yang tampak seperti efek layar bergoyang hebat.

---

## 5. Solusi Arsitektural Komprehensif (The Winning Fix)

Masalah berhasil diselesaikan secara permanen dengan memadukan 4 optimasi arsitektural berikut:

### 1. Mengaktifkan Quad Flash I/O (`qio`) pada Frekuensi 80 MHz
Pada berkas [`platformio.ini`](../platformio.ini):
```ini
; Sebelumnya: board_build.flash_mode = dio (Dual I/O, 2-bit per clock)
; Diubah menjadi:
board_build.arduino.memory_type = qio_opi
board_build.flash_mode = qio
board_build.f_flash = 80000000L
board_build.f_cpu = 240000000L
```
**Dampak Teknis**: Membaca instruksi kode dan tabel font dari Flash kini menggunakan 4 pin data secara simultan pada 80 MHz. Throughput bus Flash melonjak 200%, sehingga waktu tunggu arbiter MSPI berkurang drastis dan tidak lagi mengunci GDMA.

### 2. Memindahkan Rutin Flush ke RAM Internal (`IRAM_ATTR`)
Pada berkas [`src/hardware/display.cpp`](../src/hardware/display.cpp):
```cpp
static void IRAM_ATTR my_disp_flush(lv_disp_drv_t *disp_drv, const lv_area_t *area, lv_color_t *color_p) {
    esp_lcd_panel_draw_bitmap(panel_handle, area->x1, area->y1, area->x2 + 1, area->y2 + 1, color_p);
    lv_disp_flush_ready(disp_drv);
}
```
**Dampak Teknis**: Saat fungsi flush dieksekusi, CPU tidak perlu mengambil *opcodes* dari SPI Flash melalui bus MSPI; seluruh instruksi dieksekusi secara instan dari modul SRAM internal.

### 3. Double-Buffering Menggunakan Memori SRAM Internal Murni
Pada berkas [`src/hardware/display.cpp`](../src/hardware/display.cpp):
```cpp
const size_t buf_lines = 40;
size_t buf_size = LCD_H_RES * buf_lines * sizeof(lv_color_t); // 800 * 40 * 2 = 64 KB

buf1 = (lv_color_t *)heap_caps_malloc(buf_size, MALLOC_CAP_INTERNAL | MALLOC_CAP_DMA);
buf2 = (lv_color_t *)heap_caps_malloc(buf_size, MALLOC_CAP_INTERNAL | MALLOC_CAP_DMA);

lv_disp_draw_buf_init(&draw_buf, buf1, buf2, LCD_H_RES * buf_lines);
```
**Dampak Teknis**:
- `buf1` (64 KB) dan `buf2` (64 KB) ditempatkan seluruhnya di SRAM internal berkecepatan sangat tinggi (tanpa menyentuh PSRAM selama proses menggambar/rastering LVGL).
- Dengan **dua buffer terpisah**, LVGL dapat merender potongan baris berikutnya ke `buf2` saat `buf1` sedang disalin ke PSRAM, mencegah pipeline CPU berhenti (*stall*).

### 4. Zero-Allocation Serial Parsing (Menghilangkan `String` Heap Churn)
Pada berkas [`src/ui/ui_mac_monitor.h`](../src/ui/ui_mac_monitor.h) dan [`src/main.cpp`](../src/main.cpp):
```cpp
// src/ui/ui_mac_monitor.h
struct MacSystemMetrics {
    float cpu_pct;
    float cpu_temp;
    float gpu_temp;
    float ram_pct;
    float ram_used_gb;
    float ram_total_gb;
    float disk_pct;
    float disk_free_gb;
    float net_up_kb;
    float net_down_kb;
    char chip_name[32];      // Tidak lagi menggunakan Arduino String
    char media_title[64];    // Fixed buffer di stack/static memory
    char uptime[24];         // Mencegah heap allocation & fragmentation
};
```
Pada [`src/main.cpp`](../src/main.cpp):
```cpp
// Zero-allocation extraction
if (doc["chip"].is<const char*>()) {
    strncpy(latestMetrics.chip_name, doc["chip"].as<const char*>(), sizeof(latestMetrics.chip_name) - 1);
    latestMetrics.chip_name[sizeof(latestMetrics.chip_name) - 1] = '\0';
}
```
**Dampak Teknis**: Menghilangkan alokasi memori dinamis di heap pada setiap paket data 1 detik. L1 Data Cache CPU tetap hangat dan konsisten.

---

## 6. Referensi & Tautan Teknis

1. **Espressif Arduino Core Discussion #12339**:
   [Screen tearing and UI glitches on Waveshare ESP32-S3 4.3" RGB LCD when writing to NVS (LVGL + RGB panel)](https://github.com/espressif/arduino-esp32/discussions/12339)
2. **Dokumentasi Resmi Espressif LCD RGB Driver**:
   [ESP-IDF LCD RGB Panel API Reference](https://docs.espressif.com/projects/esp-idf/en/release-v4.4/esp32s3/api-reference/peripherals/lcd.html)
3. **Datasheet Sitronix ST7262**:
   [ST7262 RGB Driver Timing & Porch Requirements](https://www.waveshare.com/wiki/ESP32-S3-Touch-LCD-4.3)
