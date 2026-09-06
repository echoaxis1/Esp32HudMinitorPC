#include "ui_mac_monitor.h"
#include <stdio.h>

// Color Scheme (Futuristic Slate & Cyberpunk Neon)
#define COLOR_BG          lv_color_hex(0x070B12)
#define COLOR_CARD        lv_color_hex(0x0F172A)
#define COLOR_CARD_BORDER lv_color_hex(0x1E293B)
#define COLOR_ACCENT_CYAN lv_color_hex(0x00F0FF)
#define COLOR_ACCENT_PURPLE lv_color_hex(0xA855F7)
#define COLOR_ACCENT_GREEN lv_color_hex(0x10B981)
#define COLOR_ACCENT_AMBER lv_color_hex(0xF59E0B)
#define COLOR_ACCENT_CORAL lv_color_hex(0xFB7185)
#define COLOR_TEXT_MAIN   lv_color_hex(0xF8FAFC)
#define COLOR_TEXT_MUTED  lv_color_hex(0x64748B)

// Root container
static lv_obj_t *root_scr = nullptr;

// Header Widgets
static lv_obj_t *lbl_chip = nullptr;
static lv_obj_t *lbl_uptime = nullptr;
static lv_obj_t *lbl_clock = nullptr;

// CPU Widgets
static lv_obj_t *arc_cpu = nullptr;
static lv_obj_t *lbl_cpu_val = nullptr;
static lv_obj_t *lbl_cpu_temp = nullptr;

// RAM Widgets
static lv_obj_t *arc_ram = nullptr;
static lv_obj_t *lbl_ram_val = nullptr;
static lv_obj_t *lbl_ram_sub = nullptr;

// DISK Widgets (Top-Right Card)
static lv_obj_t *bar_disk = nullptr;
static lv_obj_t *lbl_disk_val = nullptr;
static lv_obj_t *lbl_disk_sub = nullptr;

// THERMAL Widgets (Bottom-Left Card)
static lv_obj_t *lbl_cpu_temp_val = nullptr;
static lv_obj_t *lbl_gpu_temp_val = nullptr;
static lv_obj_t *bar_cpu_temp = nullptr;
static lv_obj_t *bar_gpu_temp = nullptr;

// NETWORK Widgets (Bottom-Right Card)
static lv_obj_t *lbl_net_down = nullptr;
static lv_obj_t *lbl_net_up = nullptr;

static lv_obj_t *create_card(lv_obj_t *parent, int x, int y, int w, int h) {
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

void UIMacMonitor::create(lv_obj_t *parent) {
    root_scr = parent;
    lv_obj_set_style_bg_color(parent, COLOR_BG, 0);

    // ==========================================
    // 1. TOP HEADER BAR (800 x 46)
    // ==========================================
    lv_obj_t *header = lv_obj_create(parent);
    lv_obj_set_pos(header, 12, 10);
    lv_obj_set_size(header, 776, 46);
    lv_obj_set_style_bg_color(header, COLOR_CARD, 0);
    lv_obj_set_style_border_color(header, COLOR_CARD_BORDER, 0);
    lv_obj_set_style_border_width(header, 1, 0);
    lv_obj_set_style_radius(header, 12, 0);
    lv_obj_clear_flag(header, LV_OBJ_FLAG_SCROLLABLE);

    lbl_chip = lv_label_create(header);
    lv_label_set_text(lbl_chip, "APPLE SILICON");
    lv_obj_set_style_text_color(lbl_chip, COLOR_ACCENT_CYAN, 0);
    lv_obj_set_style_text_font(lbl_chip, &lv_font_montserrat_16, 0);
    lv_obj_align(lbl_chip, LV_ALIGN_LEFT_MID, 8, 0);

    lbl_uptime = lv_label_create(header);
    lv_label_set_text(lbl_uptime, "UPTIME: --");
    lv_obj_set_style_text_color(lbl_uptime, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_uptime, &lv_font_montserrat_14, 0);
    lv_obj_align(lbl_uptime, LV_ALIGN_CENTER, 0, 0);

    lbl_clock = lv_label_create(header);
    lv_label_set_text(lbl_clock, "LIVE MONITOR");
    lv_obj_set_style_text_color(lbl_clock, COLOR_TEXT_MAIN, 0);
    lv_obj_set_style_text_font(lbl_clock, &lv_font_montserrat_16, 0);
    lv_obj_align(lbl_clock, LV_ALIGN_RIGHT_MID, -8, 0);

    // ==========================================
    // 2. CPU CARD (Top Left: 245 x 220)
    // ==========================================
    lv_obj_t *card_cpu = create_card(parent, 12, 66, 245, 220);

    lv_obj_t *title_cpu = lv_label_create(card_cpu);
    lv_label_set_text(title_cpu, "CPU UTILIZATION");
    lv_obj_set_style_text_color(title_cpu, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(title_cpu, &lv_font_montserrat_14, 0);
    lv_obj_align(title_cpu, LV_ALIGN_TOP_LEFT, 0, 0);

    arc_cpu = lv_arc_create(card_cpu);
    lv_obj_set_size(arc_cpu, 140, 140);
    lv_arc_set_rotation(arc_cpu, 135);
    lv_arc_set_bg_angles(arc_cpu, 0, 270);
    lv_arc_set_range(arc_cpu, 0, 100);
    lv_arc_set_value(arc_cpu, 0);
    lv_obj_set_style_arc_color(arc_cpu, lv_color_hex(0x1E293B), LV_PART_MAIN);
    lv_obj_set_style_arc_width(arc_cpu, 12, LV_PART_MAIN);
    lv_obj_set_style_arc_color(arc_cpu, COLOR_ACCENT_CYAN, LV_PART_INDICATOR);
    lv_obj_set_style_arc_width(arc_cpu, 12, LV_PART_INDICATOR);
    lv_obj_remove_style(arc_cpu, NULL, LV_PART_KNOB);
    lv_obj_clear_flag(arc_cpu, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_align(arc_cpu, LV_ALIGN_CENTER, 0, 12);

    lbl_cpu_val = lv_label_create(card_cpu);
    lv_label_set_text(lbl_cpu_val, "0.0%");
    lv_obj_set_style_text_color(lbl_cpu_val, COLOR_TEXT_MAIN, 0);
    lv_obj_set_style_text_font(lbl_cpu_val, &lv_font_montserrat_24, 0);
    lv_obj_align(lbl_cpu_val, LV_ALIGN_CENTER, 0, 6);

    lbl_cpu_temp = lv_label_create(card_cpu);
    lv_label_set_text(lbl_cpu_temp, "Core: -- C");
    lv_obj_set_style_text_color(lbl_cpu_temp, COLOR_ACCENT_CORAL, 0);
    lv_obj_set_style_text_font(lbl_cpu_temp, &lv_font_montserrat_12, 0);
    lv_obj_align(lbl_cpu_temp, LV_ALIGN_CENTER, 0, 28);

    // ==========================================
    // 3. RAM / MEMORY CARD (Top Middle: 245 x 220)
    // ==========================================
    lv_obj_t *card_ram = create_card(parent, 277, 66, 245, 220);

    lv_obj_t *title_ram = lv_label_create(card_ram);
    lv_label_set_text(title_ram, "UNIFIED MEMORY");
    lv_obj_set_style_text_color(title_ram, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(title_ram, &lv_font_montserrat_14, 0);
    lv_obj_align(title_ram, LV_ALIGN_TOP_LEFT, 0, 0);

    arc_ram = lv_arc_create(card_ram);
    lv_obj_set_size(arc_ram, 140, 140);
    lv_arc_set_rotation(arc_ram, 135);
    lv_arc_set_bg_angles(arc_ram, 0, 270);
    lv_arc_set_range(arc_ram, 0, 100);
    lv_arc_set_value(arc_ram, 0);
    lv_obj_set_style_arc_color(arc_ram, lv_color_hex(0x1E293B), LV_PART_MAIN);
    lv_obj_set_style_arc_width(arc_ram, 12, LV_PART_MAIN);
    lv_obj_set_style_arc_color(arc_ram, COLOR_ACCENT_PURPLE, LV_PART_INDICATOR);
    lv_obj_set_style_arc_width(arc_ram, 12, LV_PART_INDICATOR);
    lv_obj_remove_style(arc_ram, NULL, LV_PART_KNOB);
    lv_obj_clear_flag(arc_ram, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_align(arc_ram, LV_ALIGN_CENTER, 0, 12);

    lbl_ram_val = lv_label_create(card_ram);
    lv_label_set_text(lbl_ram_val, "0.0%");
    lv_obj_set_style_text_color(lbl_ram_val, COLOR_TEXT_MAIN, 0);
    lv_obj_set_style_text_font(lbl_ram_val, &lv_font_montserrat_24, 0);
    lv_obj_align(lbl_ram_val, LV_ALIGN_CENTER, 0, 4);

    lbl_ram_sub = lv_label_create(card_ram);
    lv_label_set_text(lbl_ram_sub, "0.0 / 16.0 GB");
    lv_obj_set_style_text_color(lbl_ram_sub, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_ram_sub, &lv_font_montserrat_12, 0);
    lv_obj_align(lbl_ram_sub, LV_ALIGN_CENTER, 0, 28);

    // ==========================================
    // 4. STORAGE (SSD) CARD (Top Right: 246 x 220)
    // ==========================================
    lv_obj_t *card_disk = create_card(parent, 542, 66, 246, 220);

    lv_obj_t *title_disk = lv_label_create(card_disk);
    lv_label_set_text(title_disk, "STORAGE (SSD)");
    lv_obj_set_style_text_color(title_disk, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(title_disk, &lv_font_montserrat_14, 0);
    lv_obj_align(title_disk, LV_ALIGN_TOP_LEFT, 0, 0);

    lbl_disk_val = lv_label_create(card_disk);
    lv_label_set_text(lbl_disk_val, "0.0%");
    lv_obj_set_style_text_color(lbl_disk_val, COLOR_ACCENT_AMBER, 0);
    lv_obj_set_style_text_font(lbl_disk_val, &lv_font_montserrat_24, 0);
    lv_obj_align(lbl_disk_val, LV_ALIGN_TOP_RIGHT, 0, 0);

    bar_disk = lv_bar_create(card_disk);
    lv_obj_set_size(bar_disk, 206, 18);
    lv_obj_set_pos(bar_disk, 0, 42);
    lv_bar_set_range(bar_disk, 0, 100);
    lv_obj_set_style_bg_color(bar_disk, lv_color_hex(0x1E293B), LV_PART_MAIN);
    lv_obj_set_style_bg_color(bar_disk, COLOR_ACCENT_AMBER, LV_PART_INDICATOR);
    lv_obj_set_style_radius(bar_disk, 9, 0);

    lbl_disk_sub = lv_label_create(card_disk);
    lv_label_set_text(lbl_disk_sub, "Free: -- GB");
    lv_obj_set_style_text_color(lbl_disk_sub, COLOR_TEXT_MAIN, 0);
    lv_obj_set_style_text_font(lbl_disk_sub, &lv_font_montserrat_14, 0);
    lv_obj_set_pos(lbl_disk_sub, 0, 70);

    lv_obj_t *lbl_disk_info = lv_label_create(card_disk);
    lv_label_set_text(lbl_disk_info, "Macintosh HD - APFS");
    lv_obj_set_style_text_color(lbl_disk_info, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_disk_info, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(lbl_disk_info, 0, 130);

    // ==========================================
    // 5. THERMAL SENSORS CARD (Bottom Left: 378 x 172)
    // ==========================================
    lv_obj_t *card_thermal = create_card(parent, 12, 296, 378, 172);

    lv_obj_t *title_thermal = lv_label_create(card_thermal);
    lv_label_set_text(title_thermal, "SOC THERMAL SENSORS");
    lv_obj_set_style_text_color(title_thermal, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(title_thermal, &lv_font_montserrat_14, 0);
    lv_obj_align(title_thermal, LV_ALIGN_TOP_LEFT, 0, 0);

    // CPU Temp Row
    lv_obj_t *lbl_cpu_t_title = lv_label_create(card_thermal);
    lv_label_set_text(lbl_cpu_t_title, "CPU CORE");
    lv_obj_set_style_text_color(lbl_cpu_t_title, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_cpu_t_title, &lv_font_montserrat_14, 0);
    lv_obj_set_pos(lbl_cpu_t_title, 0, 30);

    lbl_cpu_temp_val = lv_label_create(card_thermal);
    lv_label_set_text(lbl_cpu_temp_val, "-- C");
    lv_obj_set_style_text_color(lbl_cpu_temp_val, COLOR_ACCENT_CORAL, 0);
    lv_obj_set_style_text_font(lbl_cpu_temp_val, &lv_font_montserrat_20, 0);
    lv_obj_align(lbl_cpu_temp_val, LV_ALIGN_TOP_RIGHT, 0, 26);

    bar_cpu_temp = lv_bar_create(card_thermal);
    lv_obj_set_size(bar_cpu_temp, 338, 10);
    lv_obj_set_pos(bar_cpu_temp, 0, 56);
    lv_bar_set_range(bar_cpu_temp, 20, 105);
    lv_obj_set_style_bg_color(bar_cpu_temp, lv_color_hex(0x1E293B), LV_PART_MAIN);
    lv_obj_set_style_bg_color(bar_cpu_temp, COLOR_ACCENT_CORAL, LV_PART_INDICATOR);
    lv_obj_set_style_radius(bar_cpu_temp, 5, 0);

    // GPU Temp Row
    lv_obj_t *lbl_gpu_t_title = lv_label_create(card_thermal);
    lv_label_set_text(lbl_gpu_t_title, "GRAPHIC CORE");
    lv_obj_set_style_text_color(lbl_gpu_t_title, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_gpu_t_title, &lv_font_montserrat_14, 0);
    lv_obj_set_pos(lbl_gpu_t_title, 0, 78);

    lbl_gpu_temp_val = lv_label_create(card_thermal);
    lv_label_set_text(lbl_gpu_temp_val, "-- C");
    lv_obj_set_style_text_color(lbl_gpu_temp_val, COLOR_ACCENT_GREEN, 0);
    lv_obj_set_style_text_font(lbl_gpu_temp_val, &lv_font_montserrat_20, 0);
    lv_obj_align(lbl_gpu_temp_val, LV_ALIGN_TOP_RIGHT, 0, 74);

    bar_gpu_temp = lv_bar_create(card_thermal);
    lv_obj_set_size(bar_gpu_temp, 338, 10);
    lv_obj_set_pos(bar_gpu_temp, 0, 104);
    lv_bar_set_range(bar_gpu_temp, 20, 105);
    lv_obj_set_style_bg_color(bar_gpu_temp, lv_color_hex(0x1E293B), LV_PART_MAIN);
    lv_obj_set_style_bg_color(bar_gpu_temp, COLOR_ACCENT_GREEN, LV_PART_INDICATOR);
    lv_obj_set_style_radius(bar_gpu_temp, 5, 0);

    // ==========================================
    // 6. NETWORK TRAFFIC CARD (Bottom Right: 388 x 172)
    // ==========================================
    lv_obj_t *card_net = create_card(parent, 400, 296, 388, 172);

    lv_obj_t *title_net = lv_label_create(card_net);
    lv_label_set_text(title_net, "NETWORK TRAFFIC");
    lv_obj_set_style_text_color(title_net, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(title_net, &lv_font_montserrat_14, 0);
    lv_obj_align(title_net, LV_ALIGN_TOP_LEFT, 0, 0);

    // Download
    lv_obj_t *lbl_dl_tag = lv_label_create(card_net);
    lv_label_set_text(lbl_dl_tag, "DOWNLOAD");
    lv_obj_set_style_text_color(lbl_dl_tag, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_dl_tag, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(lbl_dl_tag, 0, 32);

    lbl_net_down = lv_label_create(card_net);
    lv_label_set_text(lbl_net_down, "0.0 KB/s");
    lv_obj_set_style_text_color(lbl_net_down, COLOR_ACCENT_CYAN, 0);
    lv_obj_set_style_text_font(lbl_net_down, &lv_font_montserrat_20, 0);
    lv_obj_set_pos(lbl_net_down, 0, 50);

    // Upload
    lv_obj_t *lbl_ul_tag = lv_label_create(card_net);
    lv_label_set_text(lbl_ul_tag, "UPLOAD");
    lv_obj_set_style_text_color(lbl_ul_tag, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_ul_tag, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(lbl_ul_tag, 180, 32);

    lbl_net_up = lv_label_create(card_net);
    lv_label_set_text(lbl_net_up, "0.0 KB/s");
    lv_obj_set_style_text_color(lbl_net_up, COLOR_ACCENT_PURPLE, 0);
    lv_obj_set_style_text_font(lbl_net_up, &lv_font_montserrat_20, 0);
    lv_obj_set_pos(lbl_net_up, 180, 50);

    // Interface Info
    lv_obj_t *lbl_net_if = lv_label_create(card_net);
    lv_label_set_text(lbl_net_if, "Active Interface: en0 (Wi-Fi / Ethernet)");
    lv_obj_set_style_text_color(lbl_net_if, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_net_if, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(lbl_net_if, 0, 100);
}

#include <math.h>

void UIMacMonitor::updateMetrics(const MacSystemMetrics &m) {
    char buf[64];
    static MacSystemMetrics prev;
    static bool hasPrev = false;

    // Chip Name
    if (lbl_chip && m.chip_name[0] != '\0' && (!hasPrev || strcmp(m.chip_name, prev.chip_name) != 0)) {
        lv_label_set_text(lbl_chip, m.chip_name);
    }

    // Uptime
    if (lbl_uptime && m.uptime[0] != '\0' && (!hasPrev || strcmp(m.uptime, prev.uptime) != 0)) {
        snprintf(buf, sizeof(buf), "UPTIME: %s", m.uptime);
        lv_label_set_text(lbl_uptime, buf);
    }

    // CPU
    if (arc_cpu && (!hasPrev || (int)m.cpu_pct != (int)prev.cpu_pct)) {
        lv_arc_set_value(arc_cpu, (int)m.cpu_pct);
    }
    if (lbl_cpu_val && (!hasPrev || fabsf(m.cpu_pct - prev.cpu_pct) >= 0.1f)) {
        snprintf(buf, sizeof(buf), "%.1f%%", m.cpu_pct);
        lv_label_set_text(lbl_cpu_val, buf);
    }
    if (lbl_cpu_temp && (!hasPrev || fabsf(m.cpu_temp - prev.cpu_temp) >= 0.1f)) {
        if (m.cpu_temp > 0.0f) {
            snprintf(buf, sizeof(buf), "Core: %.1f C", m.cpu_temp);
        } else {
            snprintf(buf, sizeof(buf), "Core: -- C");
        }
        lv_label_set_text(lbl_cpu_temp, buf);
    }

    // RAM
    if (arc_ram && (!hasPrev || (int)m.ram_pct != (int)prev.ram_pct)) {
        lv_arc_set_value(arc_ram, (int)m.ram_pct);
    }
    if (lbl_ram_val && (!hasPrev || fabsf(m.ram_pct - prev.ram_pct) >= 0.1f)) {
        snprintf(buf, sizeof(buf), "%.1f%%", m.ram_pct);
        lv_label_set_text(lbl_ram_val, buf);
    }
    if (lbl_ram_sub && (!hasPrev || fabsf(m.ram_used_gb - prev.ram_used_gb) >= 0.1f || fabsf(m.ram_total_gb - prev.ram_total_gb) >= 0.1f)) {
        snprintf(buf, sizeof(buf), "%.1f / %.1f GB", m.ram_used_gb, m.ram_total_gb);
        lv_label_set_text(lbl_ram_sub, buf);
    }

    // DISK
    if (bar_disk && (!hasPrev || (int)m.disk_pct != (int)prev.disk_pct)) {
        lv_bar_set_value(bar_disk, (int)m.disk_pct, LV_ANIM_OFF);
    }
    if (lbl_disk_val && (!hasPrev || fabsf(m.disk_pct - prev.disk_pct) >= 0.1f)) {
        snprintf(buf, sizeof(buf), "%.1f%%", m.disk_pct);
        lv_label_set_text(lbl_disk_val, buf);
    }
    if (lbl_disk_sub && (!hasPrev || fabsf(m.disk_free_gb - prev.disk_free_gb) >= 0.1f)) {
        snprintf(buf, sizeof(buf), "Free: %.1f GB", m.disk_free_gb);
        lv_label_set_text(lbl_disk_sub, buf);
    }

    // THERMAL SENSORS (Bottom Left Card)
    if (lbl_cpu_temp_val && (!hasPrev || fabsf(m.cpu_temp - prev.cpu_temp) >= 0.1f)) {
        if (m.cpu_temp > 0.0f) {
            snprintf(buf, sizeof(buf), "%.1f C", m.cpu_temp);
        } else {
            snprintf(buf, sizeof(buf), "-- C");
        }
        lv_label_set_text(lbl_cpu_temp_val, buf);
    }
    if (bar_cpu_temp && (!hasPrev || (int)m.cpu_temp != (int)prev.cpu_temp)) {
        lv_bar_set_value(bar_cpu_temp, m.cpu_temp > 0.0f ? (int)m.cpu_temp : 0, LV_ANIM_OFF);
    }
    if (lbl_gpu_temp_val && (!hasPrev || fabsf(m.gpu_temp - prev.gpu_temp) >= 0.1f)) {
        if (m.gpu_temp > 0.0f) {
            snprintf(buf, sizeof(buf), "%.1f C", m.gpu_temp);
        } else {
            snprintf(buf, sizeof(buf), "-- C");
        }
        lv_label_set_text(lbl_gpu_temp_val, buf);
    }
    if (bar_gpu_temp && (!hasPrev || (int)m.gpu_temp != (int)prev.gpu_temp)) {
        lv_bar_set_value(bar_gpu_temp, m.gpu_temp > 0.0f ? (int)m.gpu_temp : 0, LV_ANIM_OFF);
    }

    // NETWORK (Bottom Right Card)
    if (lbl_net_down && (!hasPrev || fabsf(m.net_down_kb - prev.net_down_kb) >= 0.5f)) {
        if (m.net_down_kb > 1024.0f) {
            snprintf(buf, sizeof(buf), "%.2f MB/s", m.net_down_kb / 1024.0f);
        } else {
            snprintf(buf, sizeof(buf), "%.1f KB/s", m.net_down_kb);
        }
        lv_label_set_text(lbl_net_down, buf);
    }
    if (lbl_net_up && (!hasPrev || fabsf(m.net_up_kb - prev.net_up_kb) >= 0.5f)) {
        if (m.net_up_kb > 1024.0f) {
            snprintf(buf, sizeof(buf), "%.2f MB/s", m.net_up_kb / 1024.0f);
        } else {
            snprintf(buf, sizeof(buf), "%.1f KB/s", m.net_up_kb);
        }
        lv_label_set_text(lbl_net_up, buf);
    }

    prev = m;
    hasPrev = true;
}
