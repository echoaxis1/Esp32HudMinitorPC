#include "ui_avatar.h"

static AIAvatarState currentState = AI_STATE_STANDBY;
static lv_obj_t *avatar_container = nullptr;
static lv_obj_t *eye_left = nullptr;
static lv_obj_t *eye_right = nullptr;
static lv_obj_t *spinner_ring = nullptr;
static lv_obj_t *speech_panel = nullptr;
static lv_obj_t *lbl_speech_bubble = nullptr;

static uint32_t last_blink_time = 0;
static uint32_t blink_interval = 3500;
static bool is_blinking = false;

// Full-screen Eye Dimensions (800x480 canvas)
#define EYE_BASE_W 135
#define EYE_BASE_H 190
#define EYE_RADIUS 65
#define EYE_SPACING 115
#define EYE_CENTER_Y -40

// Colors (Cyberpunk Palette)
#define COLOR_CYAN    lv_color_hex(0x00F0FF)
#define COLOR_EMERALD lv_color_hex(0x00FF88)
#define COLOR_CRIMSON lv_color_hex(0xFF3366)
#define COLOR_AMBER   lv_color_hex(0xFFB703)
#define COLOR_SKY     lv_color_hex(0x38BDF8)
#define COLOR_BG      lv_color_hex(0x070B12)
#define COLOR_BANNER  lv_color_hex(0x0F172A)
#define COLOR_BORDER  lv_color_hex(0x1E293B)
#define COLOR_TEXT    lv_color_hex(0xF8FAFC)
#define COLOR_MUTED   lv_color_hex(0x94A3B8)

static int base_y_offset = EYE_CENTER_Y;
static float target_gaze_x = 0.0f;
static float target_gaze_y = 0.0f;
static float current_gaze_x = 0.0f;
static float current_gaze_y = 0.0f;

static void set_eyes_color(lv_color_t color) {
    lv_obj_set_style_bg_color(eye_left, color, 0);
    lv_obj_set_style_bg_color(eye_right, color, 0);
    lv_obj_set_style_shadow_color(eye_left, color, 0);
    lv_obj_set_style_shadow_color(eye_right, color, 0);
}

static void screen_click_cb(lv_event_t *e) {
    UIAvatar::setState(AI_STATE_LOOK_UP);
    UIAvatar::setSpeechText("Mendengarkan suara Anda... Silakan bicara.");
    Serial.println("{\"event\":\"touch_listen\"}");
}

void UIAvatar::create(lv_obj_t *parent) {
    // 1. Fullscreen Dark Canvas (800 x 480)
    lv_obj_set_style_bg_color(parent, COLOR_BG, 0);

    avatar_container = lv_obj_create(parent);
    lv_obj_set_size(avatar_container, 800, 480);
    lv_obj_set_pos(avatar_container, 0, 0);
    lv_obj_set_style_bg_opa(avatar_container, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_width(avatar_container, 0, 0);
    lv_obj_clear_flag(avatar_container, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_add_flag(avatar_container, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_add_event_cb(avatar_container, screen_click_cb, LV_EVENT_CLICKED, NULL);

    // 2. Rotating Holographic Radar Ring (Diameter 430px centered)
    spinner_ring = lv_spinner_create(avatar_container, 1400, 60);
    lv_obj_set_size(spinner_ring, 440, 440);
    lv_obj_align(spinner_ring, LV_ALIGN_CENTER, 0, EYE_CENTER_Y);
    lv_obj_set_style_arc_color(spinner_ring, lv_color_hex(0x131E33), LV_PART_MAIN);
    lv_obj_set_style_arc_width(spinner_ring, 5, LV_PART_MAIN);
    lv_obj_set_style_arc_color(spinner_ring, COLOR_CYAN, LV_PART_INDICATOR);
    lv_obj_set_style_arc_width(spinner_ring, 5, LV_PART_INDICATOR);
    lv_obj_add_flag(spinner_ring, LV_OBJ_FLAG_HIDDEN);

    // 3. Left Robot Eye
    eye_left = lv_obj_create(avatar_container);
    lv_obj_set_size(eye_left, EYE_BASE_W, EYE_BASE_H);
    lv_obj_align(eye_left, LV_ALIGN_CENTER, -EYE_SPACING, EYE_CENTER_Y);
    lv_obj_set_style_radius(eye_left, EYE_RADIUS, 0);
    lv_obj_set_style_bg_color(eye_left, COLOR_CYAN, 0);
    lv_obj_set_style_border_width(eye_left, 0, 0);
    lv_obj_set_style_shadow_width(eye_left, 45, 0);
    lv_obj_set_style_shadow_spread(eye_left, 10, 0);
    lv_obj_set_style_shadow_color(eye_left, COLOR_CYAN, 0);
    lv_obj_set_style_shadow_opa(eye_left, LV_OPA_80, 0);
    lv_obj_clear_flag(eye_left, LV_OBJ_FLAG_SCROLLABLE);

    // 4. Right Robot Eye
    eye_right = lv_obj_create(avatar_container);
    lv_obj_set_size(eye_right, EYE_BASE_W, EYE_BASE_H);
    lv_obj_align(eye_right, LV_ALIGN_CENTER, EYE_SPACING, EYE_CENTER_Y);
    lv_obj_set_style_radius(eye_right, EYE_RADIUS, 0);
    lv_obj_set_style_bg_color(eye_right, COLOR_CYAN, 0);
    lv_obj_set_style_border_width(eye_right, 0, 0);
    lv_obj_set_style_shadow_width(eye_right, 45, 0);
    lv_obj_set_style_shadow_spread(eye_right, 10, 0);
    lv_obj_set_style_shadow_color(eye_right, COLOR_CYAN, 0);
    lv_obj_set_style_shadow_opa(eye_right, LV_OPA_80, 0);
    lv_obj_clear_flag(eye_right, LV_OBJ_FLAG_SCROLLABLE);

    // 5. Floating Response / Answer Subtitle Bar (Bottom: 750 x 76 px)
    speech_panel = lv_obj_create(parent);
    lv_obj_set_size(speech_panel, 750, 76);
    lv_obj_align(speech_panel, LV_ALIGN_BOTTOM_MID, 0, -14);
    lv_obj_set_style_bg_color(speech_panel, COLOR_BANNER, 0);
    lv_obj_set_style_bg_opa(speech_panel, LV_OPA_80, 0);
    lv_obj_set_style_border_color(speech_panel, COLOR_BORDER, 0);
    lv_obj_set_style_border_width(speech_panel, 1, 0);
    lv_obj_set_style_radius(speech_panel, 16, 0);
    lv_obj_set_style_pad_hor(speech_panel, 18, 0);
    lv_obj_set_style_pad_ver(speech_panel, 10, 0);
    lv_obj_clear_flag(speech_panel, LV_OBJ_FLAG_SCROLLABLE);

    lbl_speech_bubble = lv_label_create(speech_panel);
    lv_obj_set_width(lbl_speech_bubble, 714);
    lv_label_set_long_mode(lbl_speech_bubble, LV_LABEL_LONG_WRAP);
    lv_obj_set_style_text_font(lbl_speech_bubble, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(lbl_speech_bubble, COLOR_TEXT, 0);
    lv_obj_align(lbl_speech_bubble, LV_ALIGN_CENTER, 0, 0);
    lv_label_set_text(lbl_speech_bubble, "Standby... Siap mendampingi sesi coding agy cli.");
}

void UIAvatar::setSpeechText(const char *text) {
    if (lbl_speech_bubble && text) {
        lv_label_set_text(lbl_speech_bubble, text);
    }
}

void UIAvatar::setState(AIAvatarState state) {
    currentState = state;
    base_y_offset = EYE_CENTER_Y;

    switch (state) {
        case AI_STATE_STANDBY:
            set_eyes_color(COLOR_CYAN);
            lv_obj_set_size(eye_left, EYE_BASE_W, EYE_BASE_H);
            lv_obj_set_size(eye_right, EYE_BASE_W, EYE_BASE_H);
            lv_obj_set_style_radius(eye_left, EYE_RADIUS, 0);
            lv_obj_set_style_radius(eye_right, EYE_RADIUS, 0);
            lv_obj_add_flag(spinner_ring, LV_OBJ_FLAG_HIDDEN);
            break;

        case AI_STATE_LOOK_UP:
            // Mendongak ke atas melihat user/ketikan
            set_eyes_color(COLOR_SKY);
            lv_obj_set_size(eye_left, 145, 175);
            lv_obj_set_size(eye_right, 145, 175);
            lv_obj_set_style_radius(eye_left, 70, 0);
            lv_obj_set_style_radius(eye_right, 70, 0);
            base_y_offset = -105; // Geser jauh ke atas
            lv_obj_add_flag(spinner_ring, LV_OBJ_FLAG_HIDDEN);
            break;

        case AI_STATE_REASONING:
            set_eyes_color(COLOR_AMBER);
            // Squint eyes focused with rotating holographic radar
            lv_obj_set_size(eye_left, 160, 68);
            lv_obj_set_size(eye_right, 160, 68);
            lv_obj_set_style_radius(eye_left, 34, 0);
            lv_obj_set_style_radius(eye_right, 34, 0);
            lv_obj_clear_flag(spinner_ring, LV_OBJ_FLAG_HIDDEN);
            lv_obj_set_style_arc_color(spinner_ring, COLOR_AMBER, LV_PART_INDICATOR);
            break;

        case AI_STATE_TOOL_EXEC:
            set_eyes_color(COLOR_CYAN);
            // Laser focused slit
            lv_obj_set_size(eye_left, 175, 80);
            lv_obj_set_size(eye_right, 175, 80);
            lv_obj_set_style_radius(eye_left, 24, 0);
            lv_obj_set_style_radius(eye_right, 24, 0);
            lv_obj_clear_flag(spinner_ring, LV_OBJ_FLAG_HIDDEN);
            lv_obj_set_style_arc_color(spinner_ring, COLOR_CYAN, LV_PART_INDICATOR);
            break;

        case AI_STATE_SUCCESS:
            set_eyes_color(COLOR_EMERALD);
            // Joyful curved smile eyes
            lv_obj_set_size(eye_left, 150, 105);
            lv_obj_set_size(eye_right, 150, 105);
            lv_obj_set_style_radius(eye_left, 52, 0);
            lv_obj_set_style_radius(eye_right, 52, 0);
            lv_obj_add_flag(spinner_ring, LV_OBJ_FLAG_HIDDEN);
            break;

        case AI_STATE_ERROR:
            set_eyes_color(COLOR_CRIMSON);
            lv_obj_set_size(eye_left, 70, 70);
            lv_obj_set_size(eye_right, 70, 70);
            lv_obj_set_style_radius(eye_left, 12, 0);
            lv_obj_set_style_radius(eye_right, 12, 0);
            lv_obj_add_flag(spinner_ring, LV_OBJ_FLAG_HIDDEN);
            break;
    }

    int left_x  = -EYE_SPACING + (int)(current_gaze_x * 80.0f);
    int right_x =  EYE_SPACING + (int)(current_gaze_x * 80.0f);
    int eye_y   =  base_y_offset + (int)(current_gaze_y * 45.0f);

    lv_obj_align(eye_left, LV_ALIGN_CENTER, left_x, eye_y);
    lv_obj_align(eye_right, LV_ALIGN_CENTER, right_x, eye_y);
    lv_obj_invalidate(avatar_container);
}

void UIAvatar::updateTelemetry(const char *stateName, const char *toolName, const char *actionDesc, uint32_t step) {
    if (actionDesc && strlen(actionDesc) > 0) {
        setSpeechText(actionDesc);
    }
}

void UIAvatar::setGaze(float x, float y) {
    if (x < -1.0f) x = -1.0f;
    if (x > 1.0f)  x = 1.0f;
    if (y < -1.0f) y = -1.0f;
    if (y > 1.0f)  y = 1.0f;
    target_gaze_x = x;
    target_gaze_y = y;
}

void UIAvatar::tick() {
    uint32_t now = millis();

    // Natural blinking & dynamic gaze tracking in Standby mode
    if (currentState == AI_STATE_STANDBY) {
        if (!is_blinking && (now - last_blink_time > blink_interval)) {
            is_blinking = true;
            last_blink_time = now;
            lv_obj_set_height(eye_left, 10);
            lv_obj_set_height(eye_right, 10);
        } else if (is_blinking && (now - last_blink_time > 140)) {
            is_blinking = false;
            last_blink_time = now;
            lv_obj_set_height(eye_left, EYE_BASE_H);
            lv_obj_set_height(eye_right, EYE_BASE_H);
            blink_interval = 2500 + (esp_random() % 3000);
        }

        // Smooth gaze interpolation towards user's face position across 800px width
        current_gaze_x += (target_gaze_x - current_gaze_x) * 0.28f;
        current_gaze_y += (target_gaze_y - current_gaze_y) * 0.28f;

        int left_x  = -EYE_SPACING + (int)(current_gaze_x * 85.0f);
        int right_x =  EYE_SPACING + (int)(current_gaze_x * 85.0f);
        int eye_y   =  base_y_offset + (int)(current_gaze_y * 45.0f);

        lv_obj_align(eye_left, LV_ALIGN_CENTER, left_x, eye_y);
        lv_obj_align(eye_right, LV_ALIGN_CENTER, right_x, eye_y);
    }
}
