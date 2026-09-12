#pragma once

#include <lvgl.h>
#include <Arduino.h>

#define MAX_TOP_PROCESSES 6
#define MAX_TOP_NET_CONNS 6
#define MAX_DISKS 4
#define MAX_AGY_ACCOUNTS 8
#define MAX_CPU_CORES 10

struct MacAgyAccountInfo {
    char id[40];
    char name[24];
    bool is_current;
    uint8_t c_5h;
    uint8_t c_wk;
    uint8_t g_5h;
    uint8_t g_wk;
};

struct MacProcessInfo {
    char name[24];
    int pid;
    float cpu_pct;
    float ram_pct;
};

struct MacNetConnInfo {
    char name[20];
    int pid;
    char remote[28];
    char status[12];
};

struct MacDiskInfo {
    char name[24];
    char type[12]; // INT, EXT, SD/USB
    float used_gb;
    float free_gb;
    float total_gb;
    float pct;
};

struct MacSystemMetrics {
    float cpu_pct;
    float cpu_temp;
    float gpu_temp;
    uint8_t core_count;
    float core_pcts[MAX_CPU_CORES];
    float ram_pct;
    float ram_used_gb;
    float ram_total_gb;
    float disk_pct;
    float disk_free_gb;
    float net_up_kb;
    float net_down_kb;
    float net_total_rx_gb;
    float net_total_tx_gb;
    char net_interface[16];
    char net_local_ip[20];
    char chip_name[32];
    char media_title[64];
    char uptime[24];
    char clock_time[16];
    char clock_date[32];
    char reminders[256];
    int day_idx;
    bool display_off;
    
    // Real-time Weather
    float weather_temp;
    int weather_code;
    int weather_is_day;
    char weather_text[28];
    char weather_loc[28];
    
    uint8_t process_count;
    MacProcessInfo top_processes[MAX_TOP_PROCESSES];

    uint8_t net_conn_count;
    MacNetConnInfo net_conns[MAX_TOP_NET_CONNS];

    uint8_t disk_count;
    MacDiskInfo disks[MAX_DISKS];

    // Antigravity Cockpit Metrics
    char agy_acc[24];
    uint8_t agy_c_5h;
    uint8_t agy_c_wk;
    uint8_t agy_g_5h;
    uint8_t agy_g_wk;
    uint8_t agy_ready;
    uint8_t agy_total;

    uint8_t agy_account_count;
    MacAgyAccountInfo agy_accounts[MAX_AGY_ACCOUNTS];
};

class UIMacMonitor {
public:
    static void create(lv_obj_t *parent);
    static void updateMetrics(const MacSystemMetrics &metrics);
    static void showDashboard();
    static void showProcesses();
    static void showNetConnections();
    static void showStorage();
    static void showScreensaver();
    static void showAgyAccounts();
    static void tickReminders();
};


