#pragma once

#include <Arduino.h>
#include <lvgl.h>

enum AIAvatarState {
    AI_STATE_STANDBY = 0,
    AI_STATE_LOOK_UP,
    AI_STATE_REASONING,
    AI_STATE_TOOL_EXEC,
    AI_STATE_SUCCESS,
    AI_STATE_ERROR
};

class UIAvatar {
public:
    static void create(lv_obj_t *parent);
    static void setState(AIAvatarState state);
    static void setGaze(float x, float y); // Real-time webcam tracking offset
    static void setSpeechText(const char *text); // Terminal response subtitles
    static void updateTelemetry(const char *stateName, const char *toolName, const char *actionDesc, uint32_t step);
    static void tick(); // Periodic animation tick
};
