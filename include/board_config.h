#pragma once

#include <Arduino.h>

// Screen Dimensions
#define LCD_H_RES 800
#define LCD_V_RES 480

// RGB Timing parameters for ST7262 800x480 panel (Waveshare standard timings)
#define LCD_PIXEL_CLOCK_HZ (16 * 1000 * 1000)
#define LCD_HSYNC_BACK_PORCH 88
#define LCD_HSYNC_FRONT_PORCH 40
#define LCD_HSYNC_PULSE_WIDTH 48
#define LCD_VSYNC_BACK_PORCH 32
#define LCD_VSYNC_FRONT_PORCH 13
#define LCD_VSYNC_PULSE_WIDTH 3

// RGB Interface GPIO Pins (Waveshare ESP32-S3-Touch-LCD-4.3)
#define LCD_PIN_DE    5
#define LCD_PIN_VSYNC 3
#define LCD_PIN_HSYNC 46
#define LCD_PIN_PCLK  7

// Data Bus (RGB565: 5 bits Red, 6 bits Green, 5 bits Blue)
#define LCD_PIN_DATA0  14  // B3
#define LCD_PIN_DATA1  38  // B4
#define LCD_PIN_DATA2  18  // B5
#define LCD_PIN_DATA3  17  // B6
#define LCD_PIN_DATA4  10  // B7

#define LCD_PIN_DATA5  39  // G2
#define LCD_PIN_DATA6  0   // G3
#define LCD_PIN_DATA7  45  // G4
#define LCD_PIN_DATA8  48  // G5
#define LCD_PIN_DATA9  47  // G6
#define LCD_PIN_DATA10 21  // G7

#define LCD_PIN_DATA11 1   // R3
#define LCD_PIN_DATA12 2   // R4
#define LCD_PIN_DATA13 42  // R5
#define LCD_PIN_DATA14 41  // R6
#define LCD_PIN_DATA15 40  // R7

// I2C Pins for Touch (GT911) & IO Expander (CH422G)
#define I2C_MASTER_SDA_IO 8
#define I2C_MASTER_SCL_IO 9
#define I2C_MASTER_FREQ_HZ 400000

// GT911 Touch Controller
#define TOUCH_GT911_I2C_ADDR 0x5D
#define TOUCH_PIN_INT -1 // Handled or polled

// CH422G I/O Expander
#define CH422G_I2C_ADDR 0x24
#define CH422G_EXIO_TP_RST   (1 << 1) // EXIO1
#define CH422G_EXIO_LCD_BL   (1 << 2) // EXIO2: Backlight
#define CH422G_EXIO_LCD_RST  (1 << 3) // EXIO3: LCD Reset
#define CH422G_EXIO_SD_CS    (1 << 4) // EXIO4: SD Card Chip Select
