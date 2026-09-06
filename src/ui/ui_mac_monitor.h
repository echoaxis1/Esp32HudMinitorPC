#pragma once

#include <lvgl.h>
#include <Arduino.h>

struct MacSystemMetrics {
    float cpu_pct;
    float cpu_temp;
    float gpu_temp;
    float ram_pct;
    float ram_used_gb;
    float ram_total_gb;
    float disk_pct;
    float disk_free_gb;
    float net_up_kb;
    float net_down_kb;
    char chip_name[32];
    char media_title[64];
    char uptime[24];
};

class UIMacMonitor {
public:
    static void create(lv_obj_t *parent);
    static void updateMetrics(const MacSystemMetrics &metrics);
};
