#pragma once

#include <Arduino.h>
#include <lvgl.h>

class DisplayManager {
public:
    static bool init();
    static void setBrightness(uint8_t percent);
};
