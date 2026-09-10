#include "ui_screen_agy_cockpit.h"
#include "ui_theme.h"
#include <stdio.h>
#include <string.h>

static lv_obj_t *scr_agy = nullptr;
static lv_obj_t *card_agy_rows[MAX_AGY_ACCOUNTS];
static lv_obj_t *lbl_agy_row_name[MAX_AGY_ACCOUNTS];
static lv_obj_t *lbl_agy_row_badge[MAX_AGY_ACCOUNTS];
static lv_obj_t *lbl_agy_row_c_val[MAX_AGY_ACCOUNTS];
static lv_obj_t *bar_agy_row_c[MAX_AGY_ACCOUNTS];
static lv_obj_t *lbl_agy_row_g_val[MAX_AGY_ACCOUNTS];
static lv_obj_t *bar_agy_row_g[MAX_AGY_ACCOUNTS];
static lv_obj_t *lbl_agy_summary_head = nullptr;
static char s_agy_acc_ids[MAX_AGY_ACCOUNTS][40];

static void on_agy_row_click(lv_event_t *e) {
    const char *acc_id = (const char *)lv_event_get_user_data(e);
    if (acc_id && acc_id[0] != '\0') {
        Serial.printf("CMD:SWITCH_AGY:%s\n", acc_id);
    }
}

lv_obj_t* UIScreenAgyCockpit::getScreen() {
    return scr_agy;
}

lv_obj_t* UIScreenAgyCockpit::create(lv_obj_t *parent, lv_event_cb_t back_cb) {
    scr_agy = lv_obj_create(parent);
    lv_obj_set_size(scr_agy, 800, 480);
    lv_obj_set_pos(scr_agy, 0, 0);
    lv_obj_set_style_bg_color(scr_agy, COLOR_BG, 0);
    lv_obj_set_style_border_width(scr_agy, 0, 0);
    lv_obj_set_style_pad_all(scr_agy, 0, 0);
    lv_obj_clear_flag(scr_agy, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_add_flag(scr_agy, LV_OBJ_FLAG_HIDDEN); // Initially hidden

    // Header Bar
    lv_obj_t *agy_header = lv_obj_create(scr_agy);
    lv_obj_set_pos(agy_header, 12, 10);
    lv_obj_set_size(agy_header, 776, 46);
    lv_obj_set_style_bg_color(agy_header, COLOR_CARD, 0);
    lv_obj_set_style_border_color(agy_header, COLOR_CARD_BORDER, 0);
    lv_obj_set_style_border_width(agy_header, 1, 0);
    lv_obj_set_style_radius(agy_header, 12, 0);
    lv_obj_clear_flag(agy_header, LV_OBJ_FLAG_SCROLLABLE);

    // Back Button
    lv_obj_t *btn_agy_back = lv_btn_create(agy_header);
    lv_obj_set_size(btn_agy_back, 110, 34);
    lv_obj_align(btn_agy_back, LV_ALIGN_LEFT_MID, 4, 0);
    lv_obj_set_style_bg_color(btn_agy_back, lv_color_hex(0x1E293B), 0);
    lv_obj_set_style_border_color(btn_agy_back, COLOR_ACCENT_AMBER, 0);
    lv_obj_set_style_border_width(btn_agy_back, 1, 0);
    lv_obj_set_style_radius(btn_agy_back, 8, 0);
    if (back_cb) {
        lv_obj_add_event_cb(btn_agy_back, back_cb, LV_EVENT_CLICKED, NULL);
    }

    lv_obj_t *lbl_agy_b = lv_label_create(btn_agy_back);
    lv_label_set_text(lbl_agy_b, "< BACK");
    lv_obj_set_style_text_color(lbl_agy_b, COLOR_ACCENT_AMBER, 0);
    lv_obj_set_style_text_font(lbl_agy_b, &lv_font_montserrat_14, 0);
    lv_obj_align(lbl_agy_b, LV_ALIGN_CENTER, 0, 0);

    lbl_agy_summary_head = lv_label_create(agy_header);
    lv_label_set_text(lbl_agy_summary_head, "AGY COCKPIT • MULTI-ACCOUNT POOL");
    lv_obj_set_style_text_color(lbl_agy_summary_head, COLOR_TEXT_MAIN, 0);
    lv_obj_set_style_text_font(lbl_agy_summary_head, &lv_font_montserrat_16, 0);
    lv_obj_align(lbl_agy_summary_head, LV_ALIGN_CENTER, 30, 0);

    // Table Column Header
    lv_obj_t *agy_col_bar = lv_obj_create(scr_agy);
    lv_obj_set_pos(agy_col_bar, 12, 60);
    lv_obj_set_size(agy_col_bar, 776, 24);
    lv_obj_set_style_bg_opa(agy_col_bar, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_width(agy_col_bar, 0, 0);
    lv_obj_set_style_pad_all(agy_col_bar, 0, 0);
    lv_obj_clear_flag(agy_col_bar, LV_OBJ_FLAG_SCROLLABLE);

    lv_obj_t *th_a_name = lv_label_create(agy_col_bar);
    lv_label_set_text(th_a_name, "ACCOUNT / EMAIL");
    lv_obj_set_style_text_color(th_a_name, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(th_a_name, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(th_a_name, 50, 2);

    lv_obj_t *th_a_status = lv_label_create(agy_col_bar);
    lv_label_set_text(th_a_status, "STATUS");
    lv_obj_set_style_text_color(th_a_status, COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(th_a_status, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(th_a_status, 240, 2);

    lv_obj_t *th_a_claude = lv_label_create(agy_col_bar);
    lv_label_set_text(th_a_claude, "CLAUDE (5H / WK)");
    lv_obj_set_style_text_color(th_a_claude, COLOR_ACCENT_AMBER, 0);
    lv_obj_set_style_text_font(th_a_claude, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(th_a_claude, 380, 2);

    lv_obj_t *th_a_gemini = lv_label_create(agy_col_bar);
    lv_label_set_text(th_a_gemini, "GEMINI (5H / WK)");
    lv_obj_set_style_text_color(th_a_gemini, COLOR_ACCENT_CYAN, 0);
    lv_obj_set_style_text_font(th_a_gemini, &lv_font_montserrat_12, 0);
    lv_obj_set_pos(th_a_gemini, 590, 2);

    // Account Rows (Up to 8 accounts, 44px each)
    for (int i = 0; i < MAX_AGY_ACCOUNTS; i++) {
        int y_pos = 86 + i * 48;
        card_agy_rows[i] = ui_create_card(scr_agy, 12, y_pos, 776, 44);
        lv_obj_add_flag(card_agy_rows[i], LV_OBJ_FLAG_CLICKABLE);
        lv_obj_add_event_cb(card_agy_rows[i], on_agy_row_click, LV_EVENT_CLICKED, s_agy_acc_ids[i]);
        lv_obj_set_style_border_color(card_agy_rows[i], COLOR_ACCENT_AMBER, LV_STATE_PRESSED);

        // Index / Rank Badge
        lv_obj_t *lbl_idx = lv_label_create(card_agy_rows[i]);
        char idx_str[8];
        snprintf(idx_str, sizeof(idx_str), "#%d", i + 1);
        lv_label_set_text(lbl_idx, idx_str);
        lv_obj_set_style_text_color(lbl_idx, COLOR_TEXT_MUTED, 0);
        lv_obj_set_style_text_font(lbl_idx, &lv_font_montserrat_12, 0);
        lv_obj_set_pos(lbl_idx, 0, 4);

        // Account Name
        lbl_agy_row_name[i] = lv_label_create(card_agy_rows[i]);
        lv_label_set_text(lbl_agy_row_name[i], "--");
        lv_obj_set_style_text_color(lbl_agy_row_name[i], COLOR_TEXT_MAIN, 0);
        lv_obj_set_style_text_font(lbl_agy_row_name[i], &lv_font_montserrat_14, 0);
        lv_obj_set_pos(lbl_agy_row_name[i], 36, 4);

        // Active Badge
        lbl_agy_row_badge[i] = lv_label_create(card_agy_rows[i]);
        lv_label_set_text(lbl_agy_row_badge[i], "STANDBY");
        lv_obj_set_style_text_color(lbl_agy_row_badge[i], COLOR_TEXT_MUTED, 0);
        lv_obj_set_style_text_font(lbl_agy_row_badge[i], &lv_font_montserrat_12, 0);
        lv_obj_set_pos(lbl_agy_row_badge[i], 226, 4);

        // Claude Quota Text & Bar
        lbl_agy_row_c_val[i] = lv_label_create(card_agy_rows[i]);
        lv_label_set_text(lbl_agy_row_c_val[i], "5h: --% | Wk: --%");
        lv_obj_set_style_text_color(lbl_agy_row_c_val[i], COLOR_TEXT_MAIN, 0);
        lv_obj_set_style_text_font(lbl_agy_row_c_val[i], &lv_font_montserrat_12, 0);
        lv_obj_set_pos(lbl_agy_row_c_val[i], 366, 0);

        bar_agy_row_c[i] = lv_bar_create(card_agy_rows[i]);
        lv_obj_set_size(bar_agy_row_c[i], 160, 6);
        lv_obj_set_pos(bar_agy_row_c[i], 366, 16);
        lv_bar_set_range(bar_agy_row_c[i], 0, 100);
        lv_obj_set_style_bg_color(bar_agy_row_c[i], lv_color_hex(0x1E293B), LV_PART_MAIN);
        lv_obj_set_style_bg_color(bar_agy_row_c[i], COLOR_ACCENT_AMBER, LV_PART_INDICATOR);
        lv_obj_set_style_radius(bar_agy_row_c[i], 3, 0);

        // Gemini Quota Text & Bar
        lbl_agy_row_g_val[i] = lv_label_create(card_agy_rows[i]);
        lv_label_set_text(lbl_agy_row_g_val[i], "5h: --% | Wk: --%");
        lv_obj_set_style_text_color(lbl_agy_row_g_val[i], COLOR_TEXT_MAIN, 0);
        lv_obj_set_style_text_font(lbl_agy_row_g_val[i], &lv_font_montserrat_12, 0);
        lv_obj_set_pos(lbl_agy_row_g_val[i], 576, 0);

        bar_agy_row_g[i] = lv_bar_create(card_agy_rows[i]);
        lv_obj_set_size(bar_agy_row_g[i], 160, 6);
        lv_obj_set_pos(bar_agy_row_g[i], 576, 16);
        lv_bar_set_range(bar_agy_row_g[i], 0, 100);
        lv_obj_set_style_bg_color(bar_agy_row_g[i], lv_color_hex(0x1E293B), LV_PART_MAIN);
        lv_obj_set_style_bg_color(bar_agy_row_g[i], COLOR_ACCENT_CYAN, LV_PART_INDICATOR);
        lv_obj_set_style_radius(bar_agy_row_g[i], 3, 0);
    }

    return scr_agy;
}

void UIScreenAgyCockpit::updateMetrics(const MacSystemMetrics &m, const MacSystemMetrics &prev, bool hasPrev) {
    char buf[64];

    if (lbl_agy_summary_head && (!hasPrev || m.agy_ready != prev.agy_ready || m.agy_total != prev.agy_total)) {
        if (m.agy_total > 0) {
            snprintf(buf, sizeof(buf), "AGY COCKPIT • %d ACCOUNTS (%d READY)", m.agy_total, m.agy_ready);
        } else {
            snprintf(buf, sizeof(buf), "AGY COCKPIT • MULTI-ACCOUNT POOL");
        }
        lv_label_set_text(lbl_agy_summary_head, buf);
    }

    for (int i = 0; i < MAX_AGY_ACCOUNTS; i++) {
        if (card_agy_rows[i] == nullptr) continue;
        if (i < m.agy_account_count) {
            lv_obj_clear_flag(card_agy_rows[i], LV_OBJ_FLAG_HIDDEN);
            strncpy(s_agy_acc_ids[i], m.agy_accounts[i].id, sizeof(s_agy_acc_ids[i]) - 1);
            s_agy_acc_ids[i][sizeof(s_agy_acc_ids[i]) - 1] = '\0';

            // Account Name
            if (lbl_agy_row_name[i]) {
                lv_label_set_text(lbl_agy_row_name[i], m.agy_accounts[i].name);
            }

            // Badge Active / Standby
            if (lbl_agy_row_badge[i]) {
                if (m.agy_accounts[i].is_current) {
                    lv_label_set_text(lbl_agy_row_badge[i], "[AKTIF]");
                    lv_obj_set_style_text_color(lbl_agy_row_badge[i], COLOR_ACCENT_GREEN, 0);
                    lv_obj_set_style_border_color(card_agy_rows[i], COLOR_ACCENT_GREEN, 0);
                } else {
                    lv_label_set_text(lbl_agy_row_badge[i], "STANDBY");
                    lv_obj_set_style_text_color(lbl_agy_row_badge[i], COLOR_TEXT_MUTED, 0);
                    lv_obj_set_style_border_color(card_agy_rows[i], COLOR_CARD_BORDER, 0);
                }
            }

            // Claude Values & Bar
            if (lbl_agy_row_c_val[i]) {
                snprintf(buf, sizeof(buf), "5h: %d%% | Wk: %d%%", m.agy_accounts[i].c_5h, m.agy_accounts[i].c_wk);
                lv_label_set_text(lbl_agy_row_c_val[i], buf);
            }
            if (bar_agy_row_c[i]) {
                lv_bar_set_value(bar_agy_row_c[i], m.agy_accounts[i].c_5h, LV_ANIM_OFF);
            }

            // Gemini Values & Bar
            if (lbl_agy_row_g_val[i]) {
                snprintf(buf, sizeof(buf), "5h: %d%% | Wk: %d%%", m.agy_accounts[i].g_5h, m.agy_accounts[i].g_wk);
                lv_label_set_text(lbl_agy_row_g_val[i], buf);
            }
            if (bar_agy_row_g[i]) {
                lv_bar_set_value(bar_agy_row_g[i], m.agy_accounts[i].g_5h, LV_ANIM_OFF);
            }
        } else {
            lv_obj_add_flag(card_agy_rows[i], LV_OBJ_FLAG_HIDDEN);
        }
    }
}
