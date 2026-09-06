#include "display.h"
#include "board_config.h"
#include "ch422g.h"
#include <esp_lcd_panel_io.h>
#include <esp_lcd_panel_vendor.h>
#include <esp_lcd_panel_ops.h>
#include <esp_lcd_panel_rgb.h>
#include <TAMC_GT911.h>

static TAMC_GT911 touch(I2C_MASTER_SDA_IO, I2C_MASTER_SCL_IO, TOUCH_PIN_INT, -1, LCD_H_RES, LCD_V_RES);
static esp_lcd_panel_handle_t panel_handle = NULL;
static lv_disp_draw_buf_t draw_buf;
static lv_color_t *buf1 = nullptr;
static lv_color_t *buf2 = nullptr;

static void IRAM_ATTR my_disp_flush(lv_disp_drv_t *disp_drv, const lv_area_t *area, lv_color_t *color_p) {
    esp_lcd_panel_draw_bitmap(panel_handle, area->x1, area->y1, area->x2 + 1, area->y2 + 1, color_p);
    lv_disp_flush_ready(disp_drv);
}

static bool touch_initialized = false;

static void my_touch_read(lv_indev_drv_t *indev_drv, lv_indev_data_t *data) {
    if (!touch_initialized) {
        data->state = LV_INDEV_STATE_REL;
        return;
    }
    touch.read();
    if (touch.isTouched) {
        data->state = LV_INDEV_STATE_PR;
        data->point.x = touch.points[0].x;
        data->point.y = touch.points[0].y;
    } else {
        data->state = LV_INDEV_STATE_REL;
    }
}

bool DisplayManager::init() {
    // 1. Initialize I2C Bus for Expander & Touch
    Wire.begin(I2C_MASTER_SDA_IO, I2C_MASTER_SCL_IO, I2C_MASTER_FREQ_HZ);

    // 2. Initialize CH422G IO Expander & Power on Backlight / Reset
    ioExpander.begin(Wire);
    ioExpander.resetLCD();
    ioExpander.resetTouch();
    ioExpander.setBacklight(true);

    // 3. Touch Controller bypassed for desk HUD monitor to prevent I2C bus lockups
    touch_initialized = false;

    // 4. Configure ESP32 RGB LCD Panel
    esp_lcd_rgb_panel_config_t panel_conf = {
        .clk_src = LCD_CLK_SRC_PLL160M,
        .timings = {
            .pclk_hz = LCD_PIXEL_CLOCK_HZ,
            .h_res = LCD_H_RES,
            .v_res = LCD_V_RES,
            .hsync_pulse_width = LCD_HSYNC_PULSE_WIDTH,
            .hsync_back_porch = LCD_HSYNC_BACK_PORCH,
            .hsync_front_porch = LCD_HSYNC_FRONT_PORCH,
            .vsync_pulse_width = LCD_VSYNC_PULSE_WIDTH,
            .vsync_back_porch = LCD_VSYNC_BACK_PORCH,
            .vsync_front_porch = LCD_VSYNC_FRONT_PORCH,
            .flags = {
                .hsync_idle_low = 0,
                .vsync_idle_low = 0,
                .de_idle_high = 0,
                .pclk_active_neg = 1,
                .pclk_idle_high = 0,
            },
        },
        .data_width = 16,
        .sram_trans_align = 4,
        .psram_trans_align = 64,
        .hsync_gpio_num = LCD_PIN_HSYNC,
        .vsync_gpio_num = LCD_PIN_VSYNC,
        .de_gpio_num = LCD_PIN_DE,
        .pclk_gpio_num = LCD_PIN_PCLK,
        .data_gpio_nums = {
            LCD_PIN_DATA0,
            LCD_PIN_DATA1,
            LCD_PIN_DATA2,
            LCD_PIN_DATA3,
            LCD_PIN_DATA4,
            LCD_PIN_DATA5,
            LCD_PIN_DATA6,
            LCD_PIN_DATA7,
            LCD_PIN_DATA8,
            LCD_PIN_DATA9,
            LCD_PIN_DATA10,
            LCD_PIN_DATA11,
            LCD_PIN_DATA12,
            LCD_PIN_DATA13,
            LCD_PIN_DATA14,
            LCD_PIN_DATA15,
        },
        .disp_gpio_num = -1,
        .on_frame_trans_done = NULL,
        .user_ctx = NULL,
        .flags = {
            .disp_active_low = 0,
            .relax_on_idle = 0,
            .fb_in_psram = 1,
        },
    };

    esp_err_t err = esp_lcd_new_rgb_panel(&panel_conf, &panel_handle);
    if (err != ESP_OK) {
        Serial.printf("Failed to create RGB panel: %d\n", err);
        return false;
    }

    esp_lcd_panel_reset(panel_handle);
    esp_lcd_panel_init(panel_handle);

    // 5. Initialize LVGL
    lv_init();

    // Allocate draw buffer in fast internal SRAM (40 lines) to eliminate PSRAM bus contention glitches
    const size_t buf_lines = 40;
    size_t buf_size = LCD_H_RES * buf_lines * sizeof(lv_color_t);
    buf1 = (lv_color_t *)heap_caps_malloc(buf_size, MALLOC_CAP_INTERNAL | MALLOC_CAP_DMA);
    buf2 = (lv_color_t *)heap_caps_malloc(buf_size, MALLOC_CAP_INTERNAL | MALLOC_CAP_DMA);
    if (!buf1) {
        buf1 = (lv_color_t *)heap_caps_malloc(buf_size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    }

    if (!buf1) {
        Serial.println("Failed to allocate LVGL draw buffer");
        return false;
    }

    lv_disp_draw_buf_init(&draw_buf, buf1, buf2, LCD_H_RES * buf_lines);

    // Register Display Driver
    static lv_disp_drv_t disp_drv;
    lv_disp_drv_init(&disp_drv);
    disp_drv.hor_res = LCD_H_RES;
    disp_drv.ver_res = LCD_V_RES;
    disp_drv.flush_cb = my_disp_flush;
    disp_drv.draw_buf = &draw_buf;
    disp_drv.direct_mode = 0;
    lv_disp_drv_register(&disp_drv);

    Serial.println("Display initialized successfully.");
    return true;
}

void DisplayManager::setBrightness(uint8_t percent) {
    // CH422G backlight toggle (or PWM if configured)
    ioExpander.setBacklight(percent > 0);
}
