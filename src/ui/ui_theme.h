#pragma once

#include <lvgl.h>

// Color Scheme (Futuristic Slate & Cyberpunk Neon)
#define COLOR_BG            lv_color_hex(0x070B12)
#define COLOR_CARD          lv_color_hex(0x0F172A)
#define COLOR_CARD_BORDER   lv_color_hex(0x1E293B)
#define COLOR_ACCENT_CYAN   lv_color_hex(0x00F0FF)
#define COLOR_ACCENT_PURPLE lv_color_hex(0xA855F7)
#define COLOR_ACCENT_GREEN  lv_color_hex(0x10B981)
#define COLOR_ACCENT_AMBER  lv_color_hex(0xF59E0B)
#define COLOR_ACCENT_CORAL  lv_color_hex(0xFB7185)
#define COLOR_TEXT_MAIN     lv_color_hex(0xF8FAFC)
#define COLOR_TEXT_MUTED    lv_color_hex(0x64748B)

inline lv_obj_t *ui_create_card(lv_obj_t *parent, int x, int y, int w, int h) {
    lv_obj_t *card = lv_obj_create(parent);
    lv_obj_set_pos(card, x, y);
    lv_obj_set_size(card, w, h);
    lv_obj_set_style_bg_color(card, COLOR_CARD, 0);
    lv_obj_set_style_bg_opa(card, LV_OPA_COVER, 0);
    lv_obj_set_style_border_color(card, COLOR_CARD_BORDER, 0);
    lv_obj_set_style_border_width(card, 1, 0);
    lv_obj_set_style_radius(card, 14, 0);
    lv_obj_clear_flag(card, LV_OBJ_FLAG_SCROLLABLE);
    return card;
}
