#include "ui_mac_monitor.h"
#include <stdio.h>
#include <string.h>
#include <math.h>

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

// Screen Containers
LV_FONT_DECLARE(font_clock_160);

static lv_obj_t *root_parent = nullptr;
static lv_obj_t *scr_dashboard = nullptr;
static lv_obj_t *scr_processes = nullptr;
static lv_obj_t *scr_networks = nullptr;
static lv_obj_t *scr_storage = nullptr;
static lv_obj_t *scr_screensaver = nullptr;

// Dashboard Header Widgets
static lv_obj_t *lbl_chip = nullptr;
static lv_obj_t *lbl_uptime = nullptr;
static lv_obj_t *lbl_clock = nullptr;

// Dashboard CPU Widgets
static lv_obj_t *card_cpu = nullptr;
static lv_obj_t *arc_cpu = nullptr;
static lv_obj_t *lbl_cpu_val = nullptr;
static lv_obj_t *lbl_cpu_temp = nullptr;

// Dashboard RAM Widgets
static lv_obj_t *arc_ram = nullptr;
static lv_obj_t *lbl_ram_val = nullptr;
static lv_obj_t *lbl_ram_sub = nullptr;

// Dashboard DISK Widgets (Top-Right Card - Multi Drive Stack)
static lv_obj_t *card_disk = nullptr;
static lv_obj_t *lbl_dash_dname[2];
static lv_obj_t *lbl_dash_dpct[2];
static lv_obj_t *bar_dash_disk[2];
static lv_obj_t *lbl_dash_dsub[2];

// Dashboard THERMAL Widgets (Bottom-Left Card)
static lv_obj_t *lbl_cpu_temp_val = nullptr;
static lv_obj_t *lbl_gpu_temp_val = nullptr;
static lv_obj_t *bar_cpu_temp = nullptr;
static lv_obj_t *bar_gpu_temp = nullptr;

// Dashboard NETWORK Widgets (Bottom-Right Card)
static lv_obj_t *lbl_net_down = nullptr;
static lv_obj_t *lbl_net_up = nullptr;

// Process Screen Widgets
static lv_obj_t *lbl_proc_names[MAX_TOP_PROCESSES];
static lv_obj_t *lbl_proc_pids[MAX_TOP_PROCESSES];
static lv_obj_t *bar_proc_cpus[MAX_TOP_PROCESSES];
static lv_obj_t *lbl_proc_cpus[MAX_TOP_PROCESSES];
static lv_obj_t *lbl_proc_rams[MAX_TOP_PROCESSES];

// Network Screen Widgets
static lv_obj_t *lbl_net_rx_rate = nullptr;
static lv_obj_t *bar_net_rx = nullptr;
static lv_obj_t *lbl_net_rx_total = nullptr;
static lv_obj_t *lbl_net_tx_rate = nullptr;
static lv_obj_t *bar_net_tx = nullptr;
static lv_obj_t *lbl_net_tx_total = nullptr;
static lv_obj_t *lbl_net_iface_info = nullptr;
static lv_obj_t *lbl_net_pnames[MAX_TOP_NET_CONNS];
static lv_obj_t *lbl_net_pids[MAX_TOP_NET_CONNS];
static lv_obj_t *lbl_net_remotes[MAX_TOP_NET_CONNS];
static lv_obj_t *lbl_net_statuses[MAX_TOP_NET_CONNS];

// Storage Screen Widgets
static lv_obj_t *card_disk_slots[MAX_DISKS];
static lv_obj_t *lbl_d_badges[MAX_DISKS];
static lv_obj_t *lbl_d_names[MAX_DISKS];
static lv_obj_t *lbl_d_pcts[MAX_DISKS];
static lv_obj_t *bar_d_usages[MAX_DISKS];
static lv_obj_t *lbl_d_stats[MAX_DISKS];
static lv_obj_t *lbl_d_subtitles[MAX_DISKS];

// Screensaver Standby Widgets (Apple Standby Watch Style)
static lv_obj_t *lbl_ss_time = nullptr;
static lv_obj_t *lbl_ss_date = nullptr;
static lv_obj_t *lbl_ss_status = nullptr;
static lv_obj_t *lbl_ss_sub = nullptr;
static lv_obj_t *ss_sun = nullptr;
static lv_obj_t *lbl_ss_days[7];
static const char* INDO_DAYS_SHORT[7] = {"Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"};

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

static void on_cpu_card_click(lv_event_t *e) {
    UIMacMonitor::showProcesses();
}

static void on_net_card_click(lv_event_t *e) {
    UIMacMonitor::showNetConnections();
}

static void on_disk_card_click(lv_event_t *e) {
    UIMacMonitor::showStorage();
}

static void on_clock_header_click(lv_event_t *e) {
    UIMacMonitor::showScreensaver();
}

static void on_back_btn_click(lv_event_t *e) {
    UIMacMonitor::showDashboard();
}

void UIMacMonitor::showDashboard() {
    if (scr_processes) lv_obj_add_flag(scr_processes, LV_OBJ_FLAG_HIDDEN);
    if (scr_networks) lv_obj_add_flag(scr_networks, LV_OBJ_FLAG_HIDDEN);
    if (scr_storage) lv_obj_add_flag(scr_storage, LV_OBJ_FLAG_HIDDEN);
    if (scr_screensaver) lv_obj_add_flag(scr_screensaver, LV_OBJ_FLAG_HIDDEN);
    if (scr_dashboard) lv_obj_clear_flag(scr_dashboard, LV_OBJ_FLAG_HIDDEN);
}

void UIMacMonitor::showProcesses() {
    if (scr_dashboard) lv_obj_add_flag(scr_dashboard, LV_OBJ_FLAG_HIDDEN);
    if (scr_networks) lv_obj_add_flag(scr_networks, LV_OBJ_FLAG_HIDDEN);
    if (scr_storage) lv_obj_add_flag(scr_storage, LV_OBJ_FLAG_HIDDEN);
    if (scr_screensaver) lv_obj_add_flag(scr_screensaver, LV_OBJ_FLAG_HIDDEN);
    if (scr_processes) lv_obj_clear_flag(scr_processes, LV_OBJ_FLAG_HIDDEN);
}

void UIMacMonitor::showNetConnections() {
    if (scr_dashboard) lv_obj_add_flag(scr_dashboard, LV_OBJ_FLAG_HIDDEN);
    if (scr_processes) lv_obj_add_flag(scr_processes, LV_OBJ_FLAG_HIDDEN);
    if (scr_storage) lv_obj_add_flag(scr_storage, LV_OBJ_FLAG_HIDDEN);
    if (scr_screensaver) lv_obj_add_flag(scr_screensaver, LV_OBJ_FLAG_HIDDEN);
    if (scr_networks) lv_obj_clear_flag(scr_networks, LV_OBJ_FLAG_HIDDEN);
}

void UIMacMonitor::showStorage() {
    if (scr_dashboard) lv_obj_add_flag(scr_dashboard, LV_OBJ_FLAG_HIDDEN);
    if (scr_processes) lv_obj_add_flag(scr_processes, LV_OBJ_FLAG_HIDDEN);
    if (scr_networks) lv_obj_add_flag(scr_networks, LV_OBJ_FLAG_HIDDEN);
    if (scr_screensaver) lv_obj_add_flag(scr_screensaver, LV_OBJ_FLAG_HIDDEN);
    if (scr_storage) lv_obj_clear_flag(scr_storage, LV_OBJ_FLAG_HIDDEN);
}

void UIMacMonitor::showScreensaver() {
    if (scr_dashboard) lv_obj_add_flag(scr_dashboard, LV_OBJ_FLAG_HIDDEN);
    if (scr_processes) lv_obj_add_flag(scr_processes, LV_OBJ_FLAG_HIDDEN);
    if (scr_networks) lv_obj_add_flag(scr_networks, LV_OBJ_FLAG_HIDDEN);
    if (scr_storage) lv_obj_add_flag(scr_storage, LV_OBJ_FLAG_HIDDEN);
    if (scr_screensaver) lv_obj_clear_flag(scr_screensaver, LV_OBJ_FLAG_HIDDEN);
}

void UIMacMonitor::create(lv_obj_t *parent) {
    root_parent = parent;
    lv_obj_set_style_bg_color(parent, COLOR_BG, 0);

    // =========================================================================
    // 1. DASHBOARD CONTAINER (SCREEN 1)
    // =========================================================================
    scr_dashboard = lv_obj_create(parent);
    lv_obj_set_size(scr_dashboard, 800, 480);
    lv_obj_set_pos(scr_dashboard, 0, 0);
    lv_obj_set_style_bg_color(scr_dashboard, COLOR_BG, 0);
    lv_obj_set_style_border_width(scr_dashboard, 0, 0);
    lv_obj_set_style_pad_all(scr_dashboard, 0, 0);
    lv_obj_clear_flag(scr_dashboard, LV_OBJ_FLAG_SCROLLABLE);

    // 1.1 TOP HEADER BAR (800 x 46)
    lv_obj_t *header = lv_obj_create(scr_dashboard);
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
    lv_label_set_text(lbl_clock, "--:--");
    lv_obj_set_style_text_color(lbl_clock, COLOR_TEXT_MAIN, 0);
    lv_obj_set_style_text_font(lbl_clock, &lv_font_montserrat_16, 0);
    lv_obj_align(lbl_clock, LV_ALIGN_RIGHT_MID, -8, 0);
    lv_obj_add_flag(lbl_clock, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_add_event_cb(lbl_clock, on_clock_header_click, LV_EVENT_CLICKED, NULL);

    // 1.2 CPU CARD (Top Left: 245 x 220) - INTERACTIVE TOUCH BUTTON
    card_cpu = create_card(scr_dashboard, 12, 66, 245, 220);
    lv_obj_add_flag(card_cpu, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_add_event_cb(card_cpu, on_cpu_card_click, LV_EVENT_CLICKED, NULL);
    lv_obj_set_style_border_color(card_cpu, COLOR_ACCENT_CYAN, LV_STATE_PRESSED);

    lv_obj_t *title_cpu = lv_label_create(card_cpu);
    lv_label_set_text(title_cpu, "CPU UTILIZATION");
    lv_obj_set_style_text_color(title_cpu, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(title_cpu, &lv_font_montserrat_14, 0);
    lv_obj_align(title_cpu, LV_ALIGN_TOP_LEFT, 0, 0);

    arc_cpu = lv_arc_create(card_cpu);
    lv_obj_set_size(arc_cpu, 130, 130);
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
    lv_obj_align(arc_cpu, LV_ALIGN_CENTER, 0, 4);

    lbl_cpu_val = lv_label_create(card_cpu);
    lv_label_set_text(lbl_cpu_val, "0.0%");
    lv_obj_set_style_text_color(lbl_cpu_val, COLOR_TEXT_MAIN, 0);
    lv_obj_set_style_text_font(lbl_cpu_val, &lv_font_montserrat_24, 0);
    lv_obj_align(lbl_cpu_val, LV_ALIGN_CENTER, 0, -2);

    lbl_cpu_temp = lv_label_create(card_cpu);
    lv_label_set_text(lbl_cpu_temp, "Core: -- C");
    lv_obj_set_style_text_color(lbl_cpu_temp, COLOR_ACCENT_CORAL, 0);
    lv_obj_set_style_text_font(lbl_cpu_temp, &lv_font_montserrat_12, 0);
    lv_obj_align(lbl_cpu_temp, LV_ALIGN_CENTER, 0, 22);

    // 1.3 RAM / MEMORY CARD (Top Middle: 245 x 220)
    lv_obj_t *card_ram = create_card(scr_dashboard, 277, 66, 245, 220);

    lv_obj_t *title_ram = lv_label_create(card_ram);
    lv_label_set_text(title_ram, "UNIFIED MEMORY");
    lv_obj_set_style_text_color(title_ram, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(title_ram, &lv_font_montserrat_14, 0);
    lv_obj_align(title_ram, LV_ALIGN_TOP_LEFT, 0, 0);

    arc_ram = lv_arc_create(card_ram);
    lv_obj_set_size(arc_ram, 130, 130);
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
    lv_obj_align(arc_ram, LV_ALIGN_CENTER, 0, 4);

    lbl_ram_val = lv_label_create(card_ram);
    lv_label_set_text(lbl_ram_val, "0.0%");
    lv_obj_set_style_text_color(lbl_ram_val, COLOR_TEXT_MAIN, 0);
    lv_obj_set_style_text_font(lbl_ram_val, &lv_font_montserrat_24, 0);
    lv_obj_align(lbl_ram_val, LV_ALIGN_CENTER, 0, -2);

    lbl_ram_sub = lv_label_create(card_ram);
    lv_label_set_text(lbl_ram_sub, "0.0 / 16.0 GB");
    lv_obj_set_style_text_color(lbl_ram_sub, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_ram_sub, &lv_font_montserrat_12, 0);
    lv_obj_align(lbl_ram_sub, LV_ALIGN_CENTER, 0, 22);

    // 1.4 STORAGE (SSD) CARD (Top Right: 246 x 220) - INTERACTIVE TOUCH BUTTON
    card_disk = create_card(scr_dashboard, 542, 66, 246, 220);
    lv_obj_add_flag(card_disk, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_add_event_cb(card_disk, on_disk_card_click, LV_EVENT_CLICKED, NULL);
    lv_obj_set_style_border_color(card_disk, COLOR_ACCENT_AMBER, LV_STATE_PRESSED);

    lv_obj_t *title_disk = lv_label_create(card_disk);
    lv_label_set_text(title_disk, "STORAGE & VOLUMES");
    lv_obj_set_style_text_color(title_disk, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(title_disk, &lv_font_montserrat_12, 0);
    lv_obj_align(title_disk, LV_ALIGN_TOP_LEFT, 0, 0);

    // Row 0: Internal Storage (Macintosh HD)
    lbl_dash_dname[0] = lv_label_create(card_disk);
    lv_label_set_text(lbl_dash_dname[0], "Macintosh HD");
    lv_obj_set_style_text_color(lbl_dash_dname[0], COLOR_TEXT_MAIN, 0);
    lv_obj_set_style_text_font(lbl_dash_dname[0], &lv_font_montserrat_12, 0);
    lv_obj_set_pos(lbl_dash_dname[0], 0, 24);

    lbl_dash_dpct[0] = lv_label_create(card_disk);
    lv_label_set_text(lbl_dash_dpct[0], "0.0%");
    lv_obj_set_style_text_color(lbl_dash_dpct[0], COLOR_ACCENT_CYAN, 0);
    lv_obj_set_style_text_font(lbl_dash_dpct[0], &lv_font_montserrat_14, 0);
    lv_obj_align(lbl_dash_dpct[0], LV_ALIGN_TOP_RIGHT, 0, 22);

    bar_dash_disk[0] = lv_bar_create(card_disk);
    lv_obj_set_size(bar_dash_disk[0], 206, 12);
    lv_obj_set_pos(bar_dash_disk[0], 0, 44);
    lv_bar_set_range(bar_dash_disk[0], 0, 100);
    lv_obj_set_style_bg_color(bar_dash_disk[0], lv_color_hex(0x1E293B), LV_PART_MAIN);
    lv_obj_set_style_bg_opa(bar_dash_disk[0], LV_OPA_COVER, LV_PART_MAIN);
    lv_obj_set_style_bg_color(bar_dash_disk[0], COLOR_ACCENT_CYAN, LV_PART_INDICATOR);
    lv_obj_set_style_bg_opa(bar_dash_disk[0], LV_OPA_COVER, LV_PART_INDICATOR);
    lv_obj_set_style_radius(bar_dash_disk[0], 6, LV_PART_MAIN);
    lv_obj_set_style_radius(bar_dash_disk[0], 6, LV_PART_INDICATOR);

    lbl_dash_dsub[0] = lv_label_create(card_disk);
    lv_label_set_text(lbl_dash_dsub[0], "Free: -- GB");
    lv_obj_set_style_text_color(lbl_dash_dsub[0], COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_dash_dsub[0], &lv_font_montserrat_12, 0);
    lv_obj_set_pos(lbl_dash_dsub[0], 0, 60);

    // Row 1: External Storage (MAC_EXTERNAL_SSD / SD Card)
    lbl_dash_dname[1] = lv_label_create(card_disk);
    lv_label_set_text(lbl_dash_dname[1], "MAC_EXTERNAL_SSD");
    lv_obj_set_style_text_color(lbl_dash_dname[1], COLOR_TEXT_MAIN, 0);
    lv_obj_set_style_text_font(lbl_dash_dname[1], &lv_font_montserrat_12, 0);
    lv_obj_set_pos(lbl_dash_dname[1], 0, 94);

    lbl_dash_dpct[1] = lv_label_create(card_disk);
    lv_label_set_text(lbl_dash_dpct[1], "0.0%");
    lv_obj_set_style_text_color(lbl_dash_dpct[1], COLOR_ACCENT_AMBER, 0);
    lv_obj_set_style_text_font(lbl_dash_dpct[1], &lv_font_montserrat_14, 0);
    lv_obj_align(lbl_dash_dpct[1], LV_ALIGN_TOP_RIGHT, 0, 92);

    bar_dash_disk[1] = lv_bar_create(card_disk);
    lv_obj_set_size(bar_dash_disk[1], 206, 12);
    lv_obj_set_pos(bar_dash_disk[1], 0, 114);
    lv_bar_set_range(bar_dash_disk[1], 0, 100);
    lv_obj_set_style_bg_color(bar_dash_disk[1], lv_color_hex(0x1E293B), LV_PART_MAIN);
    lv_obj_set_style_bg_opa(bar_dash_disk[1], LV_OPA_COVER, LV_PART_MAIN);
    lv_obj_set_style_bg_color(bar_dash_disk[1], COLOR_ACCENT_AMBER, LV_PART_INDICATOR);
    lv_obj_set_style_bg_opa(bar_dash_disk[1], LV_OPA_COVER, LV_PART_INDICATOR);
    lv_obj_set_style_radius(bar_dash_disk[1], 6, LV_PART_MAIN);
    lv_obj_set_style_radius(bar_dash_disk[1], 6, LV_PART_INDICATOR);

    lbl_dash_dsub[1] = lv_label_create(card_disk);
    lv_label_set_text(lbl_dash_dsub[1], "Free: -- GB");
    lv_obj_set_style_text_color(lbl_dash_dsub[1], COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_dash_dsub[1], &lv_font_montserrat_12, 0);
    lv_obj_set_pos(lbl_dash_dsub[1], 0, 130);

    // 1.5 THERMAL SENSORS CARD (Bottom Left: 378 x 172)
    lv_obj_t *card_thermal = create_card(scr_dashboard, 12, 296, 378, 172);

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

    // Graphic Core Temp Row
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

    // 1.6 NETWORK TRAFFIC CARD (Bottom Right: 388 x 172) - INTERACTIVE TOUCH BUTTON
    lv_obj_t *card_net = create_card(scr_dashboard, 400, 296, 388, 172);
    lv_obj_add_flag(card_net, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_add_event_cb(card_net, on_net_card_click, LV_EVENT_CLICKED, NULL);
    lv_obj_set_style_border_color(card_net, COLOR_ACCENT_CYAN, LV_STATE_PRESSED);

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

    lv_obj_t *lbl_net_if = lv_label_create(card_net);
    lv_label_set_text(lbl_net_if, "Active Interface: en0 (Wi-Fi / Ethernet)");
    lv_obj_set_style_text_color(lbl_net_if, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_net_if, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(lbl_net_if, 0, 100);

    // =========================================================================
    // 2. TOP PROCESSES CONTAINER (SCREEN 2)
    // =========================================================================
    scr_processes = lv_obj_create(parent);
    lv_obj_set_size(scr_processes, 800, 480);
    lv_obj_set_pos(scr_processes, 0, 0);
    lv_obj_set_style_bg_color(scr_processes, COLOR_BG, 0);
    lv_obj_set_style_border_width(scr_processes, 0, 0);
    lv_obj_set_style_pad_all(scr_processes, 0, 0);
    lv_obj_clear_flag(scr_processes, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_add_flag(scr_processes, LV_OBJ_FLAG_HIDDEN); // Initially hidden

    // 2.1 PROCESS HEADER BAR
    lv_obj_t *p_header = lv_obj_create(scr_processes);
    lv_obj_set_pos(p_header, 12, 10);
    lv_obj_set_size(p_header, 776, 46);
    lv_obj_set_style_bg_color(p_header, COLOR_CARD, 0);
    lv_obj_set_style_border_color(p_header, COLOR_CARD_BORDER, 0);
    lv_obj_set_style_border_width(p_header, 1, 0);
    lv_obj_set_style_radius(p_header, 12, 0);
    lv_obj_clear_flag(p_header, LV_OBJ_FLAG_SCROLLABLE);

    // BACK BUTTON
    lv_obj_t *btn_back = lv_btn_create(p_header);
    lv_obj_set_size(btn_back, 110, 34);
    lv_obj_align(btn_back, LV_ALIGN_LEFT_MID, 4, 0);
    lv_obj_set_style_bg_color(btn_back, lv_color_hex(0x1E293B), 0);
    lv_obj_set_style_border_color(btn_back, COLOR_ACCENT_CYAN, 0);
    lv_obj_set_style_border_width(btn_back, 1, 0);
    lv_obj_set_style_radius(btn_back, 8, 0);
    lv_obj_add_event_cb(btn_back, on_back_btn_click, LV_EVENT_CLICKED, NULL);

    lv_obj_t *lbl_back = lv_label_create(btn_back);
    lv_label_set_text(lbl_back, "< BACK");
    lv_obj_set_style_text_color(lbl_back, COLOR_ACCENT_CYAN, 0);
    lv_obj_set_style_text_font(lbl_back, &lv_font_montserrat_14, 0);
    lv_obj_align(lbl_back, LV_ALIGN_CENTER, 0, 0);

    lv_obj_t *lbl_p_title = lv_label_create(p_header);
    lv_label_set_text(lbl_p_title, "TOP CPU PROCESSES (ACTIVITY MONITOR)");
    lv_obj_set_style_text_color(lbl_p_title, COLOR_TEXT_MAIN, 0);
    lv_obj_set_style_text_font(lbl_p_title, &lv_font_montserrat_16, 0);
    lv_obj_align(lbl_p_title, LV_ALIGN_CENTER, 30, 0);

    // 2.2 TABLE COLUMN HEADER
    lv_obj_t *col_bar = lv_obj_create(scr_processes);
    lv_obj_set_pos(col_bar, 12, 62);
    lv_obj_set_size(col_bar, 776, 26);
    lv_obj_set_style_bg_opa(col_bar, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_width(col_bar, 0, 0);
    lv_obj_set_style_pad_all(col_bar, 0, 0);
    lv_obj_clear_flag(col_bar, LV_OBJ_FLAG_SCROLLABLE);

    lv_obj_t *th_name = lv_label_create(col_bar);
    lv_label_set_text(th_name, "APPLICATION / PROCESS");
    lv_obj_set_style_text_color(th_name, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(th_name, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(th_name, 50, 4);

    lv_obj_t *th_pid = lv_label_create(col_bar);
    lv_label_set_text(th_pid, "PID");
    lv_obj_set_style_text_color(th_pid, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(th_pid, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(th_pid, 300, 4);

    lv_obj_t *th_cpu = lv_label_create(col_bar);
    lv_label_set_text(th_cpu, "CPU LOAD");
    lv_obj_set_style_text_color(th_cpu, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(th_cpu, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(th_cpu, 430, 4);

    lv_obj_t *th_ram = lv_label_create(col_bar);
    lv_label_set_text(th_ram, "RAM %");
    lv_obj_set_style_text_color(th_ram, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(th_ram, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(th_ram, 670, 4);

    // 2.3 TOP 6 PROCESS CARDS
    for (int i = 0; i < MAX_TOP_PROCESSES; i++) {
        int y_pos = 90 + i * 62;
        lv_obj_t *row = create_card(scr_processes, 12, y_pos, 776, 56);

        // Rank Badge
        lv_obj_t *lbl_rank = lv_label_create(row);
        char rank_str[8];
        snprintf(rank_str, sizeof(rank_str), "#%d", i + 1);
        lv_label_set_text(lbl_rank, rank_str);
        lv_obj_set_style_text_color(lbl_rank, i == 0 ? COLOR_ACCENT_CORAL : (i < 3 ? COLOR_ACCENT_AMBER : COLOR_ACCENT_CYAN), 0);
        lv_obj_set_style_text_font(lbl_rank, &lv_font_montserrat_16, 0);
        lv_obj_set_pos(lbl_rank, 10, 10);

        // Process Name
        lbl_proc_names[i] = lv_label_create(row);
        lv_label_set_text(lbl_proc_names[i], "--");
        lv_obj_set_style_text_color(lbl_proc_names[i], COLOR_TEXT_MAIN, 0);
        lv_obj_set_style_text_font(lbl_proc_names[i], &lv_font_montserrat_16, 0);
        lv_obj_set_pos(lbl_proc_names[i], 50, 10);

        // PID
        lbl_proc_pids[i] = lv_label_create(row);
        lv_label_set_text(lbl_proc_pids[i], "PID: --");
        lv_obj_set_style_text_color(lbl_proc_pids[i], COLOR_TEXT_MUTED, 0);
        lv_obj_set_style_text_font(lbl_proc_pids[i], &lv_font_montserrat_14, 0);
        lv_obj_set_pos(lbl_proc_pids[i], 300, 12);

        // CPU Usage Bar
        bar_proc_cpus[i] = lv_bar_create(row);
        lv_obj_set_size(bar_proc_cpus[i], 120, 12);
        lv_obj_set_pos(bar_proc_cpus[i], 430, 16);
        lv_bar_set_range(bar_proc_cpus[i], 0, 100);
        lv_obj_set_style_bg_color(bar_proc_cpus[i], lv_color_hex(0x1E293B), LV_PART_MAIN);
        lv_obj_set_style_bg_color(bar_proc_cpus[i], COLOR_ACCENT_CORAL, LV_PART_INDICATOR);
        lv_obj_set_style_radius(bar_proc_cpus[i], 6, 0);

        // CPU Label
        lbl_proc_cpus[i] = lv_label_create(row);
        lv_label_set_text(lbl_proc_cpus[i], "0.0%");
        lv_obj_set_style_text_color(lbl_proc_cpus[i], COLOR_ACCENT_CORAL, 0);
        lv_obj_set_style_text_font(lbl_proc_cpus[i], &lv_font_montserrat_16, 0);
        lv_obj_set_pos(lbl_proc_cpus[i], 560, 10);

        // RAM Label
        lbl_proc_rams[i] = lv_label_create(row);
        lv_label_set_text(lbl_proc_rams[i], "0.0%");
        lv_obj_set_style_text_color(lbl_proc_rams[i], COLOR_ACCENT_PURPLE, 0);
        lv_obj_set_style_text_font(lbl_proc_rams[i], &lv_font_montserrat_16, 0);
        lv_obj_set_pos(lbl_proc_rams[i], 670, 10);
    }

    // =========================================================================
    // 3. NETWORK SPEED & INTERFACE MONITOR CONTAINER (SCREEN 3)
    // =========================================================================
    scr_networks = lv_obj_create(parent);
    lv_obj_set_size(scr_networks, 800, 480);
    lv_obj_set_pos(scr_networks, 0, 0);
    lv_obj_set_style_bg_color(scr_networks, COLOR_BG, 0);
    lv_obj_set_style_border_width(scr_networks, 0, 0);
    lv_obj_set_style_pad_all(scr_networks, 0, 0);
    lv_obj_clear_flag(scr_networks, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_add_flag(scr_networks, LV_OBJ_FLAG_HIDDEN); // Initially hidden

    // 3.1 NETWORK HEADER BAR
    lv_obj_t *n_header = lv_obj_create(scr_networks);
    lv_obj_set_pos(n_header, 12, 10);
    lv_obj_set_size(n_header, 776, 46);
    lv_obj_set_style_bg_color(n_header, COLOR_CARD, 0);
    lv_obj_set_style_border_color(n_header, COLOR_CARD_BORDER, 0);
    lv_obj_set_style_border_width(n_header, 1, 0);
    lv_obj_set_style_radius(n_header, 12, 0);
    lv_obj_clear_flag(n_header, LV_OBJ_FLAG_SCROLLABLE);

    // BACK BUTTON
    lv_obj_t *btn_n_back = lv_btn_create(n_header);
    lv_obj_set_size(btn_n_back, 110, 34);
    lv_obj_align(btn_n_back, LV_ALIGN_LEFT_MID, 4, 0);
    lv_obj_set_style_bg_color(btn_n_back, lv_color_hex(0x1E293B), 0);
    lv_obj_set_style_border_color(btn_n_back, COLOR_ACCENT_CYAN, 0);
    lv_obj_set_style_border_width(btn_n_back, 1, 0);
    lv_obj_set_style_radius(btn_n_back, 8, 0);
    lv_obj_add_event_cb(btn_n_back, on_back_btn_click, LV_EVENT_CLICKED, NULL);

    lv_obj_t *lbl_n_back = lv_label_create(btn_n_back);
    lv_label_set_text(lbl_n_back, "< BACK");
    lv_obj_set_style_text_color(lbl_n_back, COLOR_ACCENT_CYAN, 0);
    lv_obj_set_style_text_font(lbl_n_back, &lv_font_montserrat_14, 0);
    lv_obj_align(lbl_n_back, LV_ALIGN_CENTER, 0, 0);

    lv_obj_t *lbl_n_title = lv_label_create(n_header);
    lv_label_set_text(lbl_n_title, "NETWORK TRAFFIC & INTERFACE MONITOR (TX / RX)");
    lv_obj_set_style_text_color(lbl_n_title, COLOR_TEXT_MAIN, 0);
    lv_obj_set_style_text_font(lbl_n_title, &lv_font_montserrat_16, 0);
    lv_obj_align(lbl_n_title, LV_ALIGN_CENTER, 30, 0);

    // 3.2 TOP PERFORMANCE CARDS (RX & TX)
    // Left: RX (Download) Card
    lv_obj_t *card_rx = create_card(scr_networks, 12, 66, 380, 140);
    lv_obj_t *t_rx = lv_label_create(card_rx);
    lv_label_set_text(t_rx, "DOWNLOAD RATE (RX SPEED)");
    lv_obj_set_style_text_color(t_rx, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(t_rx, &lv_font_montserrat_14, 0);
    lv_obj_align(t_rx, LV_ALIGN_TOP_LEFT, 0, 0);

    lbl_net_rx_rate = lv_label_create(card_rx);
    lv_label_set_text(lbl_net_rx_rate, "0.0 KB/s");
    lv_obj_set_style_text_color(lbl_net_rx_rate, COLOR_ACCENT_CYAN, 0);
    lv_obj_set_style_text_font(lbl_net_rx_rate, &lv_font_montserrat_24, 0);
    lv_obj_set_pos(lbl_net_rx_rate, 0, 26);

    bar_net_rx = lv_bar_create(card_rx);
    lv_obj_set_size(bar_net_rx, 340, 12);
    lv_obj_set_pos(bar_net_rx, 0, 64);
    lv_bar_set_range(bar_net_rx, 0, 20480);
    lv_obj_set_style_bg_color(bar_net_rx, lv_color_hex(0x1E293B), LV_PART_MAIN);
    lv_obj_set_style_bg_color(bar_net_rx, COLOR_ACCENT_CYAN, LV_PART_INDICATOR);
    lv_obj_set_style_radius(bar_net_rx, 6, 0);

    lbl_net_rx_total = lv_label_create(card_rx);
    lv_label_set_text(lbl_net_rx_total, "Session RX Total: 0.00 GB");
    lv_obj_set_style_text_color(lbl_net_rx_total, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_net_rx_total, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(lbl_net_rx_total, 0, 86);

    // Right: TX (Upload) Card
    lv_obj_t *card_tx = create_card(scr_networks, 408, 66, 380, 140);
    lv_obj_t *t_tx = lv_label_create(card_tx);
    lv_label_set_text(t_tx, "UPLOAD RATE (TX SPEED)");
    lv_obj_set_style_text_color(t_tx, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(t_tx, &lv_font_montserrat_14, 0);
    lv_obj_align(t_tx, LV_ALIGN_TOP_LEFT, 0, 0);

    lbl_net_tx_rate = lv_label_create(card_tx);
    lv_label_set_text(lbl_net_tx_rate, "0.0 KB/s");
    lv_obj_set_style_text_color(lbl_net_tx_rate, COLOR_ACCENT_PURPLE, 0);
    lv_obj_set_style_text_font(lbl_net_tx_rate, &lv_font_montserrat_24, 0);
    lv_obj_set_pos(lbl_net_tx_rate, 0, 26);

    bar_net_tx = lv_bar_create(card_tx);
    lv_obj_set_size(bar_net_tx, 340, 12);
    lv_obj_set_pos(bar_net_tx, 0, 64);
    lv_bar_set_range(bar_net_tx, 0, 10240);
    lv_obj_set_style_bg_color(bar_net_tx, lv_color_hex(0x1E293B), LV_PART_MAIN);
    lv_obj_set_style_bg_color(bar_net_tx, COLOR_ACCENT_PURPLE, LV_PART_INDICATOR);
    lv_obj_set_style_radius(bar_net_tx, 6, 0);

    lbl_net_tx_total = lv_label_create(card_tx);
    lv_label_set_text(lbl_net_tx_total, "Session TX Total: 0.00 GB");
    lv_obj_set_style_text_color(lbl_net_tx_total, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_net_tx_total, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(lbl_net_tx_total, 0, 86);

    // 3.3 INTERFACE & IP BANNER
    lv_obj_t *card_iface = create_card(scr_networks, 12, 214, 776, 42);
    lbl_net_iface_info = lv_label_create(card_iface);
    lv_label_set_text(lbl_net_iface_info, "ACTIVE INTERFACE: --  |  LOCAL IP: --  |  STATUS: ONLINE");
    lv_obj_set_style_text_color(lbl_net_iface_info, COLOR_ACCENT_GREEN, 0);
    lv_obj_set_style_text_font(lbl_net_iface_info, &lv_font_montserrat_14, 0);
    lv_obj_align(lbl_net_iface_info, LV_ALIGN_CENTER, 0, 0);

    // 3.4 ACTIVE CONNECTIONS / SOCKETS (TOP 3)
    lv_obj_t *col_n_bar = lv_obj_create(scr_networks);
    lv_obj_set_pos(col_n_bar, 12, 262);
    lv_obj_set_size(col_n_bar, 776, 24);
    lv_obj_set_style_bg_opa(col_n_bar, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_width(col_n_bar, 0, 0);
    lv_obj_set_style_pad_all(col_n_bar, 0, 0);
    lv_obj_clear_flag(col_n_bar, LV_OBJ_FLAG_SCROLLABLE);

    lv_obj_t *th_n_name = lv_label_create(col_n_bar);
    lv_label_set_text(th_n_name, "APPLICATION");
    lv_obj_set_style_text_color(th_n_name, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(th_n_name, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(th_n_name, 50, 2);

    lv_obj_t *th_n_pid = lv_label_create(col_n_bar);
    lv_label_set_text(th_n_pid, "PID");
    lv_obj_set_style_text_color(th_n_pid, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(th_n_pid, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(th_n_pid, 240, 2);

    lv_obj_t *th_n_remote = lv_label_create(col_n_bar);
    lv_label_set_text(th_n_remote, "REMOTE HOST / IP:PORT");
    lv_obj_set_style_text_color(th_n_remote, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(th_n_remote, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(th_n_remote, 360, 2);

    lv_obj_t *th_n_status = lv_label_create(col_n_bar);
    lv_label_set_text(th_n_status, "STATUS");
    lv_obj_set_style_text_color(th_n_status, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(th_n_status, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(th_n_status, 670, 2);

    for (int i = 0; i < 3; i++) {
        int y_pos = 290 + i * 58;
        lv_obj_t *row = create_card(scr_networks, 12, y_pos, 776, 52);

        // Rank Badge
        lv_obj_t *lbl_rank = lv_label_create(row);
        char rank_str[8];
        snprintf(rank_str, sizeof(rank_str), "#%d", i + 1);
        lv_label_set_text(lbl_rank, rank_str);
        lv_obj_set_style_text_color(lbl_rank, i == 0 ? COLOR_ACCENT_CORAL : (i == 1 ? COLOR_ACCENT_AMBER : COLOR_ACCENT_CYAN), 0);
        lv_obj_set_style_text_font(lbl_rank, &lv_font_montserrat_14, 0);
        lv_obj_set_pos(lbl_rank, 10, 8);

        // Process Name
        lbl_net_pnames[i] = lv_label_create(row);
        lv_label_set_text(lbl_net_pnames[i], "--");
        lv_obj_set_style_text_color(lbl_net_pnames[i], COLOR_TEXT_MAIN, 0);
        lv_obj_set_style_text_font(lbl_net_pnames[i], &lv_font_montserrat_14, 0);
        lv_obj_set_pos(lbl_net_pnames[i], 50, 8);

        // PID
        lbl_net_pids[i] = lv_label_create(row);
        lv_label_set_text(lbl_net_pids[i], "PID: --");
        lv_obj_set_style_text_color(lbl_net_pids[i], COLOR_TEXT_MUTED, 0);
        lv_obj_set_style_text_font(lbl_net_pids[i], &lv_font_montserrat_12, 0);
        lv_obj_set_pos(lbl_net_pids[i], 240, 10);

        // Remote Endpoint
        lbl_net_remotes[i] = lv_label_create(row);
        lv_label_set_text(lbl_net_remotes[i], "--");
        lv_obj_set_style_text_color(lbl_net_remotes[i], COLOR_ACCENT_CYAN, 0);
        lv_obj_set_style_text_font(lbl_net_remotes[i], &lv_font_montserrat_14, 0);
        lv_obj_set_pos(lbl_net_remotes[i], 360, 8);

        // Status Badge
        lbl_net_statuses[i] = lv_label_create(row);
        lv_label_set_text(lbl_net_statuses[i], "--");
        lv_obj_set_style_text_color(lbl_net_statuses[i], COLOR_ACCENT_GREEN, 0);
        lv_obj_set_style_text_font(lbl_net_statuses[i], &lv_font_montserrat_14, 0);
        lv_obj_set_pos(lbl_net_statuses[i], 670, 8);
    }

    // =========================================================================
    // 4. STORAGE & DRIVES OVERVIEW CONTAINER (SCREEN 4)
    // =========================================================================
    scr_storage = lv_obj_create(parent);
    lv_obj_set_size(scr_storage, 800, 480);
    lv_obj_set_pos(scr_storage, 0, 0);
    lv_obj_set_style_bg_color(scr_storage, COLOR_BG, 0);
    lv_obj_set_style_border_width(scr_storage, 0, 0);
    lv_obj_set_style_pad_all(scr_storage, 0, 0);
    lv_obj_clear_flag(scr_storage, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_add_flag(scr_storage, LV_OBJ_FLAG_HIDDEN); // Initially hidden

    // 4.1 STORAGE HEADER BAR
    lv_obj_t *s_header = lv_obj_create(scr_storage);
    lv_obj_set_pos(s_header, 12, 10);
    lv_obj_set_size(s_header, 776, 46);
    lv_obj_set_style_bg_color(s_header, COLOR_CARD, 0);
    lv_obj_set_style_border_color(s_header, COLOR_CARD_BORDER, 0);
    lv_obj_set_style_border_width(s_header, 1, 0);
    lv_obj_set_style_radius(s_header, 12, 0);
    lv_obj_clear_flag(s_header, LV_OBJ_FLAG_SCROLLABLE);

    // BACK BUTTON
    lv_obj_t *btn_s_back = lv_btn_create(s_header);
    lv_obj_set_size(btn_s_back, 110, 34);
    lv_obj_align(btn_s_back, LV_ALIGN_LEFT_MID, 4, 0);
    lv_obj_set_style_bg_color(btn_s_back, lv_color_hex(0x1E293B), 0);
    lv_obj_set_style_border_color(btn_s_back, COLOR_ACCENT_AMBER, 0);
    lv_obj_set_style_border_width(btn_s_back, 1, 0);
    lv_obj_set_style_radius(btn_s_back, 8, 0);
    lv_obj_add_event_cb(btn_s_back, on_back_btn_click, LV_EVENT_CLICKED, NULL);

    lv_obj_t *lbl_s_back = lv_label_create(btn_s_back);
    lv_label_set_text(lbl_s_back, "< BACK");
    lv_obj_set_style_text_color(lbl_s_back, COLOR_ACCENT_AMBER, 0);
    lv_obj_set_style_text_font(lbl_s_back, &lv_font_montserrat_14, 0);
    lv_obj_align(lbl_s_back, LV_ALIGN_CENTER, 0, 0);

    lv_obj_t *lbl_s_title = lv_label_create(s_header);
    lv_label_set_text(lbl_s_title, "STORAGE & DRIVES OVERVIEW (HOTPLUG DETECT)");
    lv_obj_set_style_text_color(lbl_s_title, COLOR_TEXT_MAIN, 0);
    lv_obj_set_style_text_font(lbl_s_title, &lv_font_montserrat_16, 0);
    lv_obj_align(lbl_s_title, LV_ALIGN_CENTER, 30, 0);

    // 4.2 DRIVE CARDS (2x2 Grid)
    const int slot_x[MAX_DISKS] = {12, 408, 12, 408};
    const int slot_y[MAX_DISKS] = {66, 66, 268, 268};

    for (int i = 0; i < MAX_DISKS; i++) {
        card_disk_slots[i] = create_card(scr_storage, slot_x[i], slot_y[i], 380, 194);

        // Type Badge (e.g. [INT], [EXT], [SD/USB])
        lbl_d_badges[i] = lv_label_create(card_disk_slots[i]);
        lv_label_set_text(lbl_d_badges[i], "[INT]");
        lv_obj_set_style_text_color(lbl_d_badges[i], COLOR_ACCENT_CYAN, 0);
        lv_obj_set_style_text_font(lbl_d_badges[i], &lv_font_montserrat_12, 0);
        lv_obj_set_pos(lbl_d_badges[i], 0, 2);

        // Drive Name
        lbl_d_names[i] = lv_label_create(card_disk_slots[i]);
        lv_label_set_text(lbl_d_names[i], "Macintosh HD");
        lv_obj_set_style_text_color(lbl_d_names[i], COLOR_TEXT_MAIN, 0);
        lv_obj_set_style_text_font(lbl_d_names[i], &lv_font_montserrat_16, 0);
        lv_obj_set_pos(lbl_d_names[i], 60, 0);

        // Percentage Label
        lbl_d_pcts[i] = lv_label_create(card_disk_slots[i]);
        lv_label_set_text(lbl_d_pcts[i], "0.0%");
        lv_obj_set_style_text_color(lbl_d_pcts[i], COLOR_ACCENT_AMBER, 0);
        lv_obj_set_style_text_font(lbl_d_pcts[i], &lv_font_montserrat_20, 0);
        lv_obj_align(lbl_d_pcts[i], LV_ALIGN_TOP_RIGHT, 0, 0);

        // Progress Bar
        bar_d_usages[i] = lv_bar_create(card_disk_slots[i]);
        lv_obj_set_size(bar_d_usages[i], 340, 18);
        lv_obj_set_pos(bar_d_usages[i], 0, 42);
        lv_bar_set_range(bar_d_usages[i], 0, 100);
        lv_obj_set_style_bg_color(bar_d_usages[i], lv_color_hex(0x1E293B), LV_PART_MAIN);
        lv_obj_set_style_bg_opa(bar_d_usages[i], LV_OPA_COVER, LV_PART_MAIN);
        lv_obj_set_style_bg_color(bar_d_usages[i], COLOR_ACCENT_AMBER, LV_PART_INDICATOR);
        lv_obj_set_style_bg_opa(bar_d_usages[i], LV_OPA_COVER, LV_PART_INDICATOR);
        lv_obj_set_style_radius(bar_d_usages[i], 9, LV_PART_MAIN);
        lv_obj_set_style_radius(bar_d_usages[i], 9, LV_PART_INDICATOR);

        // Stats Line 1
        lbl_d_stats[i] = lv_label_create(card_disk_slots[i]);
        lv_label_set_text(lbl_d_stats[i], "Used: -- GB  |  Free: -- GB");
        lv_obj_set_style_text_color(lbl_d_stats[i], COLOR_TEXT_MAIN, 0);
        lv_obj_set_style_text_font(lbl_d_stats[i], &lv_font_montserrat_14, 0);
        lv_obj_set_pos(lbl_d_stats[i], 0, 74);

        // Stats Line 2 (Capacity & Mount info)
        lbl_d_subtitles[i] = lv_label_create(card_disk_slots[i]);
        lv_label_set_text(lbl_d_subtitles[i], "Total Capacity: -- GB");
        lv_obj_set_style_text_color(lbl_d_subtitles[i], COLOR_TEXT_MUTED, 0);
        lv_obj_set_style_text_font(lbl_d_subtitles[i], &lv_font_montserrat_12, 0);
        lv_obj_set_pos(lbl_d_subtitles[i], 0, 106);
    }

    // =========================================================================
    // 5. SCREENSAVER STANDBY CONTAINER (SCREEN 5) - APPLE STANDBY WATCH STYLE
    // =========================================================================
    scr_screensaver = lv_obj_create(parent);
    lv_obj_set_size(scr_screensaver, 800, 480);
    lv_obj_set_pos(scr_screensaver, 0, 0);
    lv_obj_set_style_bg_color(scr_screensaver, lv_color_hex(0x000000), 0);
    lv_obj_set_style_border_width(scr_screensaver, 0, 0);
    lv_obj_set_style_pad_all(scr_screensaver, 0, 0);
    lv_obj_clear_flag(scr_screensaver, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_add_flag(scr_screensaver, LV_OBJ_FLAG_HIDDEN);
    lv_obj_add_flag(scr_screensaver, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_add_event_cb(scr_screensaver, on_back_btn_click, LV_EVENT_CLICKED, NULL);

    // 5.1 Ultra Huge Time Label (160px SF Compact Rounded)
    lbl_ss_time = lv_label_create(scr_screensaver);
    lv_label_set_text(lbl_ss_time, "00:00");
    lv_obj_set_style_text_color(lbl_ss_time, lv_color_hex(0xFFFFFF), 0);
    lv_obj_set_style_text_font(lbl_ss_time, &font_clock_160, 0);
    lv_obj_set_pos(lbl_ss_time, 45, 80);
    lv_obj_add_flag(lbl_ss_time, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_add_event_cb(lbl_ss_time, on_back_btn_click, LV_EVENT_CLICKED, NULL);

    // 5.2 Golden Accent Sun Circle (next to time)
    ss_sun = lv_obj_create(scr_screensaver);
    lv_obj_set_size(ss_sun, 64, 64);
    lv_obj_set_pos(ss_sun, 500, 125);
    lv_obj_set_style_bg_color(ss_sun, lv_color_hex(0xFFB800), 0);
    lv_obj_set_style_bg_opa(ss_sun, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(ss_sun, 0, 0);
    lv_obj_set_style_radius(ss_sun, LV_RADIUS_CIRCLE, 0);
    lv_obj_clear_flag(ss_sun, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_add_flag(ss_sun, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_add_event_cb(ss_sun, on_back_btn_click, LV_EVENT_CLICKED, NULL);

    // 5.3 Vertical Indonesian Days Roll (Right Column)
    for (int i = 0; i < 7; i++) {
        lbl_ss_days[i] = lv_label_create(scr_screensaver);
        lv_label_set_text(lbl_ss_days[i], INDO_DAYS_SHORT[i]);
        lv_obj_set_style_text_color(lbl_ss_days[i], lv_color_hex(0x475569), 0);
        lv_obj_set_style_text_font(lbl_ss_days[i], &lv_font_montserrat_20, 0);
        lv_obj_set_pos(lbl_ss_days[i], 660, 48 + (i * 54));
        lv_obj_add_flag(lbl_ss_days[i], LV_OBJ_FLAG_CLICKABLE);
        lv_obj_add_event_cb(lbl_ss_days[i], on_back_btn_click, LV_EVENT_CLICKED, NULL);
    }

    // 5.4 Indonesian Full Date (Directly beneath the huge clock)
    lbl_ss_date = lv_label_create(scr_screensaver);
    lv_label_set_text(lbl_ss_date, "Senin, 01 Januari 2026");
    lv_obj_set_style_text_color(lbl_ss_date, lv_color_hex(0xE2E8F0), 0);
    lv_obj_set_style_text_font(lbl_ss_date, &lv_font_montserrat_28, 0);
    lv_obj_set_pos(lbl_ss_date, 45, 275);
    lv_obj_add_flag(lbl_ss_date, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_add_event_cb(lbl_ss_date, on_back_btn_click, LV_EVENT_CLICKED, NULL);

    // 5.5 Standby Status & Touch Hint
    lbl_ss_status = lv_label_create(scr_screensaver);
    lv_label_set_text(lbl_ss_status, "[ GRAPHIC CORE INACTIVE • STANDBY ]");
    lv_obj_set_style_text_color(lbl_ss_status, COLOR_ACCENT_AMBER, 0);
    lv_obj_set_style_text_font(lbl_ss_status, &lv_font_montserrat_14, 0);
    lv_obj_set_pos(lbl_ss_status, 45, 370);

    lbl_ss_sub = lv_label_create(scr_screensaver);
    lv_label_set_text(lbl_ss_sub, "Sentuh layar untuk membuka HUD Monitor");
    lv_obj_set_style_text_color(lbl_ss_sub, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(lbl_ss_sub, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(lbl_ss_sub, 45, 405);
}

void UIMacMonitor::updateMetrics(const MacSystemMetrics &m) {
    char buf[64];
    static MacSystemMetrics prev;
    static bool hasPrev = false;

    // SCREEN SAVER / STANDBY AUTO TRANSITION (Triggered when Graphic Core is inactive / asleep)
    static bool inScreensaver = false;
    if (m.gpu_temp <= 0.0f) {
        if (!inScreensaver) {
            inScreensaver = true;
            UIMacMonitor::showScreensaver();
        }
    } else {
        if (inScreensaver) {
            inScreensaver = false;
            UIMacMonitor::showDashboard();
        }
    }

    // Screensaver & Header Clock Updates
    if (lbl_ss_time && m.clock_time[0] != '\0') {
        lv_label_set_text(lbl_ss_time, m.clock_time);
    }
    if (lbl_ss_date && m.clock_date[0] != '\0') {
        lv_label_set_text(lbl_ss_date, m.clock_date);
    }
    if (lbl_clock && m.clock_time[0] != '\0') {
        lv_label_set_text(lbl_clock, m.clock_time);
    }

    // Indonesian Day-of-week roll highlight
    for (int i = 0; i < 7; i++) {
        if (lbl_ss_days[i]) {
            if (i == m.day_idx) {
                lv_obj_set_style_text_color(lbl_ss_days[i], lv_color_hex(0xFFFFFF), 0);
                lv_obj_set_style_text_font(lbl_ss_days[i], &lv_font_montserrat_32, 0);
                lv_obj_set_pos(lbl_ss_days[i], 650, 42 + (i * 54));
            } else {
                lv_obj_set_style_text_color(lbl_ss_days[i], lv_color_hex(0x475569), 0);
                lv_obj_set_style_text_font(lbl_ss_days[i], &lv_font_montserrat_20, 0);
                lv_obj_set_pos(lbl_ss_days[i], 660, 48 + (i * 54));
            }
        }
    }

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

    // DASHBOARD MULTI-DRIVE UPDATE (Top-Right Card Rows)
    if (m.disk_count > 0) {
        // Row 0 - Internal Drive (Macintosh HD)
        if (lbl_dash_dname[0]) lv_label_set_text(lbl_dash_dname[0], m.disks[0].name[0] ? m.disks[0].name : "Macintosh HD");
        if (lbl_dash_dpct[0]) {
            snprintf(buf, sizeof(buf), "%.1f%%", m.disks[0].pct);
            lv_label_set_text(lbl_dash_dpct[0], buf);
        }
        if (bar_dash_disk[0]) {
            int p0 = (int)roundf(m.disks[0].pct);
            if (p0 < 0) p0 = 0;
            if (p0 > 100) p0 = 100;
            lv_bar_set_value(bar_dash_disk[0], p0, LV_ANIM_OFF);
        }
        if (lbl_dash_dsub[0]) {
            snprintf(buf, sizeof(buf), "Free: %.1f GB", m.disks[0].free_gb);
            lv_label_set_text(lbl_dash_dsub[0], buf);
        }

        // Row 1 - External Drive (MAC_EXTERNAL_SSD / SD Card)
        if (m.disk_count > 1) {
            lv_obj_clear_flag(lbl_dash_dname[1], LV_OBJ_FLAG_HIDDEN);
            lv_obj_clear_flag(lbl_dash_dpct[1], LV_OBJ_FLAG_HIDDEN);
            lv_obj_clear_flag(bar_dash_disk[1], LV_OBJ_FLAG_HIDDEN);
            lv_obj_clear_flag(lbl_dash_dsub[1], LV_OBJ_FLAG_HIDDEN);

            if (lbl_dash_dname[1]) lv_label_set_text(lbl_dash_dname[1], m.disks[1].name);
            if (lbl_dash_dpct[1]) {
                snprintf(buf, sizeof(buf), "%.1f%%", m.disks[1].pct);
                lv_label_set_text(lbl_dash_dpct[1], buf);
            }
            if (bar_dash_disk[1]) {
                int p1 = (int)roundf(m.disks[1].pct);
                if (p1 < 0) p1 = 0;
                if (p1 > 100) p1 = 100;
                lv_bar_set_value(bar_dash_disk[1], p1, LV_ANIM_OFF);
            }
            if (lbl_dash_dsub[1]) {
                snprintf(buf, sizeof(buf), "Free: %.1f GB", m.disks[1].free_gb);
                lv_label_set_text(lbl_dash_dsub[1], buf);
            }
        } else {
            lv_obj_add_flag(lbl_dash_dname[1], LV_OBJ_FLAG_HIDDEN);
            lv_obj_add_flag(lbl_dash_dpct[1], LV_OBJ_FLAG_HIDDEN);
            lv_obj_add_flag(bar_dash_disk[1], LV_OBJ_FLAG_HIDDEN);
            lv_obj_add_flag(lbl_dash_dsub[1], LV_OBJ_FLAG_HIDDEN);
        }
    } else {
        if (lbl_dash_dname[0]) lv_label_set_text(lbl_dash_dname[0], "Macintosh HD");
        if (lbl_dash_dpct[0]) {
            snprintf(buf, sizeof(buf), "%.1f%%", m.disk_pct);
            lv_label_set_text(lbl_dash_dpct[0], buf);
        }
        if (bar_dash_disk[0]) {
            int p0 = (int)roundf(m.disk_pct);
            if (p0 < 0) p0 = 0;
            if (p0 > 100) p0 = 100;
            lv_bar_set_value(bar_dash_disk[0], p0, LV_ANIM_OFF);
        }
        if (lbl_dash_dsub[0]) {
            snprintf(buf, sizeof(buf), "Free: %.1f GB", m.disk_free_gb);
            lv_label_set_text(lbl_dash_dsub[0], buf);
        }
        lv_obj_add_flag(lbl_dash_dname[1], LV_OBJ_FLAG_HIDDEN);
        lv_obj_add_flag(lbl_dash_dpct[1], LV_OBJ_FLAG_HIDDEN);
        lv_obj_add_flag(bar_dash_disk[1], LV_OBJ_FLAG_HIDDEN);
        lv_obj_add_flag(lbl_dash_dsub[1], LV_OBJ_FLAG_HIDDEN);
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

    // NETWORK DASHBOARD (Bottom Right Card)
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

    // DEDICATED NETWORK MONITOR SCREEN (TX / RX & Interface details)
    if (lbl_net_rx_rate && (!hasPrev || fabsf(m.net_down_kb - prev.net_down_kb) >= 0.5f)) {
        if (m.net_down_kb > 1024.0f) {
            snprintf(buf, sizeof(buf), "%.2f MB/s", m.net_down_kb / 1024.0f);
        } else {
            snprintf(buf, sizeof(buf), "%.1f KB/s", m.net_down_kb);
        }
        lv_label_set_text(lbl_net_rx_rate, buf);
    }
    if (bar_net_rx && (!hasPrev || (int)m.net_down_kb != (int)prev.net_down_kb)) {
        lv_bar_set_value(bar_net_rx, (int)m.net_down_kb, LV_ANIM_OFF);
    }
    if (lbl_net_rx_total && (!hasPrev || fabsf(m.net_total_rx_gb - prev.net_total_rx_gb) >= 0.01f)) {
        snprintf(buf, sizeof(buf), "Session RX Total: %.2f GB", m.net_total_rx_gb);
        lv_label_set_text(lbl_net_rx_total, buf);
    }

    if (lbl_net_tx_rate && (!hasPrev || fabsf(m.net_up_kb - prev.net_up_kb) >= 0.5f)) {
        if (m.net_up_kb > 1024.0f) {
            snprintf(buf, sizeof(buf), "%.2f MB/s", m.net_up_kb / 1024.0f);
        } else {
            snprintf(buf, sizeof(buf), "%.1f KB/s", m.net_up_kb);
        }
        lv_label_set_text(lbl_net_tx_rate, buf);
    }
    if (bar_net_tx && (!hasPrev || (int)m.net_up_kb != (int)prev.net_up_kb)) {
        lv_bar_set_value(bar_net_tx, (int)m.net_up_kb, LV_ANIM_OFF);
    }
    if (lbl_net_tx_total && (!hasPrev || fabsf(m.net_total_tx_gb - prev.net_total_tx_gb) >= 0.01f)) {
        snprintf(buf, sizeof(buf), "Session TX Total: %.2f GB", m.net_total_tx_gb);
        lv_label_set_text(lbl_net_tx_total, buf);
    }

    if (lbl_net_iface_info && (!hasPrev || strcmp(m.net_interface, prev.net_interface) != 0 || strcmp(m.net_local_ip, prev.net_local_ip) != 0)) {
        snprintf(buf, sizeof(buf), "INTERFACE: %s  |  LOCAL IP: %s  |  STATUS: CONNECTED", 
                 m.net_interface[0] ? m.net_interface : "en1", 
                 m.net_local_ip[0] ? m.net_local_ip : "127.0.0.1");
        lv_label_set_text(lbl_net_iface_info, buf);
    }

    // TOP 6 CPU PROCESSES UPDATE
    for (int i = 0; i < MAX_TOP_PROCESSES; i++) {
        if (i < m.process_count) {
            if (lbl_proc_names[i] && (!hasPrev || strcmp(m.top_processes[i].name, prev.top_processes[i].name) != 0)) {
                lv_label_set_text(lbl_proc_names[i], m.top_processes[i].name);
            }
            if (lbl_proc_pids[i] && (!hasPrev || m.top_processes[i].pid != prev.top_processes[i].pid)) {
                snprintf(buf, sizeof(buf), "PID: %d", m.top_processes[i].pid);
                lv_label_set_text(lbl_proc_pids[i], buf);
            }
            if (bar_proc_cpus[i] && (!hasPrev || (int)m.top_processes[i].cpu_pct != (int)prev.top_processes[i].cpu_pct)) {
                int c_val = (int)m.top_processes[i].cpu_pct;
                if (c_val > 100) c_val = 100;
                lv_bar_set_value(bar_proc_cpus[i], c_val, LV_ANIM_OFF);
            }
            if (lbl_proc_cpus[i] && (!hasPrev || fabsf(m.top_processes[i].cpu_pct - prev.top_processes[i].cpu_pct) >= 0.1f)) {
                snprintf(buf, sizeof(buf), "%.1f%%", m.top_processes[i].cpu_pct);
                lv_label_set_text(lbl_proc_cpus[i], buf);
            }
            if (lbl_proc_rams[i] && (!hasPrev || fabsf(m.top_processes[i].ram_pct - prev.top_processes[i].ram_pct) >= 0.1f)) {
                snprintf(buf, sizeof(buf), "%.1f%%", m.top_processes[i].ram_pct);
                lv_label_set_text(lbl_proc_rams[i], buf);
            }
        } else {
            if (lbl_proc_names[i]) lv_label_set_text(lbl_proc_names[i], "--");
            if (lbl_proc_pids[i]) lv_label_set_text(lbl_proc_pids[i], "PID: --");
            if (bar_proc_cpus[i]) lv_bar_set_value(bar_proc_cpus[i], 0, LV_ANIM_OFF);
            if (lbl_proc_cpus[i]) lv_label_set_text(lbl_proc_cpus[i], "0.0%");
            if (lbl_proc_rams[i]) lv_label_set_text(lbl_proc_rams[i], "0.0%");
        }
    }

    // TOP 3 ACTIVE SOCKETS UPDATE
    for (int i = 0; i < 3; i++) {
        if (i < m.net_conn_count) {
            if (lbl_net_pnames[i] && (!hasPrev || strcmp(m.net_conns[i].name, prev.net_conns[i].name) != 0)) {
                lv_label_set_text(lbl_net_pnames[i], m.net_conns[i].name);
            }
            if (lbl_net_pids[i] && (!hasPrev || m.net_conns[i].pid != prev.net_conns[i].pid)) {
                if (m.net_conns[i].pid > 0) {
                    snprintf(buf, sizeof(buf), "PID: %d", m.net_conns[i].pid);
                } else {
                    snprintf(buf, sizeof(buf), "PID: --");
                }
                lv_label_set_text(lbl_net_pids[i], buf);
            }
            if (lbl_net_remotes[i] && (!hasPrev || strcmp(m.net_conns[i].remote, prev.net_conns[i].remote) != 0)) {
                lv_label_set_text(lbl_net_remotes[i], m.net_conns[i].remote);
            }
            if (lbl_net_statuses[i] && (!hasPrev || strcmp(m.net_conns[i].status, prev.net_conns[i].status) != 0)) {
                lv_label_set_text(lbl_net_statuses[i], m.net_conns[i].status);
                if (strstr(m.net_conns[i].status, "ESTAB")) {
                    lv_obj_set_style_text_color(lbl_net_statuses[i], COLOR_ACCENT_GREEN, 0);
                } else {
                    lv_obj_set_style_text_color(lbl_net_statuses[i], COLOR_ACCENT_CYAN, 0);
                }
            }
        } else {
            if (lbl_net_pnames[i]) lv_label_set_text(lbl_net_pnames[i], "--");
            if (lbl_net_pids[i]) lv_label_set_text(lbl_net_pids[i], "PID: --");
            if (lbl_net_remotes[i]) lv_label_set_text(lbl_net_remotes[i], "--");
            if (lbl_net_statuses[i]) lv_label_set_text(lbl_net_statuses[i], "--");
        }
    }

    // ALL MOUNTED DISKS UPDATE (Screen 4)
    for (int i = 0; i < MAX_DISKS; i++) {
        if (i < m.disk_count) {
            lv_obj_clear_flag(card_disk_slots[i], LV_OBJ_FLAG_HIDDEN);

            // Badge & Bar Indicator Color
            if (lbl_d_badges[i]) {
                snprintf(buf, sizeof(buf), "[%s]", m.disks[i].type);
                lv_label_set_text(lbl_d_badges[i], buf);
                if (strstr(m.disks[i].type, "INT")) {
                    lv_obj_set_style_text_color(lbl_d_badges[i], COLOR_ACCENT_CYAN, 0);
                    if (bar_d_usages[i]) lv_obj_set_style_bg_color(bar_d_usages[i], COLOR_ACCENT_CYAN, LV_PART_INDICATOR);
                } else if (strstr(m.disks[i].type, "SD") || strstr(m.disks[i].type, "USB")) {
                    lv_obj_set_style_text_color(lbl_d_badges[i], COLOR_ACCENT_GREEN, 0);
                    if (bar_d_usages[i]) lv_obj_set_style_bg_color(bar_d_usages[i], COLOR_ACCENT_GREEN, LV_PART_INDICATOR);
                } else {
                    lv_obj_set_style_text_color(lbl_d_badges[i], COLOR_ACCENT_AMBER, 0);
                    if (bar_d_usages[i]) lv_obj_set_style_bg_color(bar_d_usages[i], COLOR_ACCENT_AMBER, LV_PART_INDICATOR);
                }
            }

            // Name
            if (lbl_d_names[i]) {
                lv_label_set_text(lbl_d_names[i], m.disks[i].name);
            }

            // Percentage
            if (lbl_d_pcts[i]) {
                snprintf(buf, sizeof(buf), "%.1f%%", m.disks[i].pct);
                lv_label_set_text(lbl_d_pcts[i], buf);
            }

            // Usage Bar
            if (bar_d_usages[i]) {
                int p = (int)roundf(m.disks[i].pct);
                if (p < 0) p = 0;
                if (p > 100) p = 100;
                lv_bar_set_value(bar_d_usages[i], p, LV_ANIM_OFF);
            }

            // Stats Line 1
            if (lbl_d_stats[i]) {
                snprintf(buf, sizeof(buf), "Used: %.1f GB  |  Free: %.1f GB", m.disks[i].used_gb, m.disks[i].free_gb);
                lv_label_set_text(lbl_d_stats[i], buf);
            }

            // Subtitle Total
            if (lbl_d_subtitles[i]) {
                snprintf(buf, sizeof(buf), "Total: %.1f GB  |  Mounted", m.disks[i].total_gb);
                lv_label_set_text(lbl_d_subtitles[i], buf);
            }
        } else {
            // Hide slot if no drive present
            lv_obj_add_flag(card_disk_slots[i], LV_OBJ_FLAG_HIDDEN);
        }
    }

    prev = m;
    hasPrev = true;
}

