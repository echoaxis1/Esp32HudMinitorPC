#pragma once

#include <lvgl.h>
#include "ui_mac_monitor.h"

class UIScreenAgyCockpit {
public:
    static lv_obj_t* create(lv_obj_t *parent, lv_event_cb_t back_cb);
    static void updateMetrics(const MacSystemMetrics &m, const MacSystemMetrics &prev, bool hasPrev);
    static lv_obj_t* getScreen();
};
