#pragma once

#include <lvgl.h>
#include <Arduino.h>

#define MAX_TOP_PROCESSES 6

struct MacProcessInfo {
    char name[24];
    int pid;
    float cpu_pct;
    float ram_pct;
};

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
    
    uint8_t process_count;
    MacProcessInfo top_processes[MAX_TOP_PROCESSES];
};

class UIMacMonitor {
public:
    static void create(lv_obj_t *parent);
    static void updateMetrics(const MacSystemMetrics &metrics);
    static void showDashboard();
    static void showProcesses();
};
