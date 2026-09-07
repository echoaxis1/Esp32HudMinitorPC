#include <Arduino.h>
#include <ArduinoJson.h>
#include "board_config.h"
#include "hardware/display.h"
#include "ui/ui_mac_monitor.h"

static char serialBuf[2048];
static size_t bufIdx = 0;
static bool metricsReady = false;
static MacSystemMetrics latestMetrics;

// Parse JSON and store in latestMetrics. Does NOT touch LVGL here.
void processMacMetricsJson(const char *jsonStr) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, jsonStr);
    if (err) {
        Serial.printf("ERR:JSON_%s\n", err.c_str());
        return;
    }

    latestMetrics.cpu_pct       = doc["cpu"].as<float>();
    latestMetrics.cpu_temp      = doc["cpu_temp"].as<float>();
    latestMetrics.gpu_temp      = doc["gpu_temp"].as<float>();
    latestMetrics.ram_pct       = doc["ram_pct"].as<float>();
    latestMetrics.ram_used_gb   = doc["ram_used"].as<float>();
    latestMetrics.ram_total_gb  = doc["ram_total"].is<float>() ? doc["ram_total"].as<float>() : 16.0f;
    latestMetrics.disk_pct      = doc["disk_pct"].as<float>();
    latestMetrics.disk_free_gb  = doc["disk_free"].as<float>();
    latestMetrics.net_up_kb     = doc["net_up"].as<float>();
    latestMetrics.net_down_kb   = doc["net_down"].as<float>();
    latestMetrics.net_total_rx_gb = doc["rx_gb"].is<float>() ? doc["rx_gb"].as<float>() : 0.0f;
    latestMetrics.net_total_tx_gb = doc["tx_gb"].is<float>() ? doc["tx_gb"].as<float>() : 0.0f;
    latestMetrics.net_interface[0] = '\0';
    if (doc["iface"].is<const char*>()) {
        strncpy(latestMetrics.net_interface, doc["iface"].as<const char*>(), sizeof(latestMetrics.net_interface) - 1);
        latestMetrics.net_interface[sizeof(latestMetrics.net_interface) - 1] = '\0';
    } else {
        strcpy(latestMetrics.net_interface, "en1");
    }
    latestMetrics.net_local_ip[0] = '\0';
    if (doc["ip"].is<const char*>()) {
        strncpy(latestMetrics.net_local_ip, doc["ip"].as<const char*>(), sizeof(latestMetrics.net_local_ip) - 1);
        latestMetrics.net_local_ip[sizeof(latestMetrics.net_local_ip) - 1] = '\0';
    } else {
        strcpy(latestMetrics.net_local_ip, "127.0.0.1");
    }
    latestMetrics.chip_name[0] = '\0';
    if (doc["chip"].is<const char*>()) {
        strncpy(latestMetrics.chip_name, doc["chip"].as<const char*>(), sizeof(latestMetrics.chip_name) - 1);
        latestMetrics.chip_name[sizeof(latestMetrics.chip_name) - 1] = '\0';
    } else {
        strcpy(latestMetrics.chip_name, "Apple Silicon");
    }

    latestMetrics.media_title[0] = '\0';
    if (doc["media"].is<const char*>()) {
        strncpy(latestMetrics.media_title, doc["media"].as<const char*>(), sizeof(latestMetrics.media_title) - 1);
        latestMetrics.media_title[sizeof(latestMetrics.media_title) - 1] = '\0';
    }

    latestMetrics.uptime[0] = '\0';
    if (doc["uptime"].is<const char*>()) {
        strncpy(latestMetrics.uptime, doc["uptime"].as<const char*>(), sizeof(latestMetrics.uptime) - 1);
        latestMetrics.uptime[sizeof(latestMetrics.uptime) - 1] = '\0';
    } else {
        strcpy(latestMetrics.uptime, "--");
    }

    latestMetrics.clock_time[0] = '\0';
    if (doc["time"].is<const char*>()) {
        strncpy(latestMetrics.clock_time, doc["time"].as<const char*>(), sizeof(latestMetrics.clock_time) - 1);
        latestMetrics.clock_time[sizeof(latestMetrics.clock_time) - 1] = '\0';
    } else {
        strcpy(latestMetrics.clock_time, "--:--");
    }

    latestMetrics.clock_date[0] = '\0';
    if (doc["date"].is<const char*>()) {
        strncpy(latestMetrics.clock_date, doc["date"].as<const char*>(), sizeof(latestMetrics.clock_date) - 1);
        latestMetrics.clock_date[sizeof(latestMetrics.clock_date) - 1] = '\0';
    } else {
        strcpy(latestMetrics.clock_date, "--");
    }

    latestMetrics.reminders[0] = '\0';
    if (doc["rem"].is<const char*>()) {
        strncpy(latestMetrics.reminders, doc["rem"].as<const char*>(), sizeof(latestMetrics.reminders) - 1);
        latestMetrics.reminders[sizeof(latestMetrics.reminders) - 1] = '\0';
    } else {
        strcpy(latestMetrics.reminders, "Tidak ada reminder aktif");
    }

    latestMetrics.day_idx = doc["day_idx"] | 0;

    // Top CPU Processes Parsing
    latestMetrics.process_count = 0;
    if (doc["procs"].is<JsonArray>()) {
        for (JsonObject p : doc["procs"].as<JsonArray>()) {
            if (latestMetrics.process_count >= MAX_TOP_PROCESSES) break;
            int idx = latestMetrics.process_count;
            const char *name = p["n"] | "--";
            strncpy(latestMetrics.top_processes[idx].name, name, sizeof(latestMetrics.top_processes[idx].name) - 1);
            latestMetrics.top_processes[idx].name[sizeof(latestMetrics.top_processes[idx].name) - 1] = '\0';
            latestMetrics.top_processes[idx].pid = p["p"] | 0;
            latestMetrics.top_processes[idx].cpu_pct = p["c"] | 0.0f;
            latestMetrics.top_processes[idx].ram_pct = p["m"] | 0.0f;
            latestMetrics.process_count++;
        }
    }

    // Top Network Connections Parsing
    latestMetrics.net_conn_count = 0;
    if (doc["conns"].is<JsonArray>()) {
        for (JsonObject c : doc["conns"].as<JsonArray>()) {
            if (latestMetrics.net_conn_count >= MAX_TOP_NET_CONNS) break;
            int idx = latestMetrics.net_conn_count;
            const char *name = c["n"] | "--";
            strncpy(latestMetrics.net_conns[idx].name, name, sizeof(latestMetrics.net_conns[idx].name) - 1);
            latestMetrics.net_conns[idx].name[sizeof(latestMetrics.net_conns[idx].name) - 1] = '\0';
            latestMetrics.net_conns[idx].pid = c["p"] | 0;
            const char *remote = c["r"] | "--";
            strncpy(latestMetrics.net_conns[idx].remote, remote, sizeof(latestMetrics.net_conns[idx].remote) - 1);
            latestMetrics.net_conns[idx].remote[sizeof(latestMetrics.net_conns[idx].remote) - 1] = '\0';
            const char *status = c["s"] | "ESTAB";
            strncpy(latestMetrics.net_conns[idx].status, status, sizeof(latestMetrics.net_conns[idx].status) - 1);
            latestMetrics.net_conns[idx].status[sizeof(latestMetrics.net_conns[idx].status) - 1] = '\0';
            latestMetrics.net_conn_count++;
        }
    }

    // Mounted Disks Parsing
    latestMetrics.disk_count = 0;
    if (doc["disks"].is<JsonArray>()) {
        for (JsonObject d : doc["disks"].as<JsonArray>()) {
            if (latestMetrics.disk_count >= MAX_DISKS) break;
            int idx = latestMetrics.disk_count;
            const char *name = d["n"] | "Disk";
            strncpy(latestMetrics.disks[idx].name, name, sizeof(latestMetrics.disks[idx].name) - 1);
            latestMetrics.disks[idx].name[sizeof(latestMetrics.disks[idx].name) - 1] = '\0';
            const char *type = d["t"] | "EXT";
            strncpy(latestMetrics.disks[idx].type, type, sizeof(latestMetrics.disks[idx].type) - 1);
            latestMetrics.disks[idx].type[sizeof(latestMetrics.disks[idx].type) - 1] = '\0';
            latestMetrics.disks[idx].used_gb = d["u"] | 0.0f;
            latestMetrics.disks[idx].free_gb = d["f"] | 0.0f;
            latestMetrics.disks[idx].total_gb = d["tot"] | 0.0f;
            latestMetrics.disks[idx].pct = d["p"] | 0.0f;
            latestMetrics.disk_count++;
        }
    }

    metricsReady = true;
    Serial.println("ACK:OK");
}

// Drain all available serial bytes. Process each newline-delimited JSON.
// If multiple packets arrived while we were rendering, only the LAST one
// will end up in latestMetrics (intermediate ones are overwritten).
void handleSerialInput() {
    while (Serial.available()) {
        char c = (char)Serial.read();
        if (c == '\n' || c == '\r') {
            if (bufIdx > 0) {
                serialBuf[bufIdx] = '\0';
                char *p = serialBuf;
                while (*p == ' ' || *p == '\t') p++;
                if (*p == '{') {
                    processMacMetricsJson(p);
                }
                bufIdx = 0;
            }
        } else {
            if (bufIdx < sizeof(serialBuf) - 1) {
                serialBuf[bufIdx++] = c;
            } else {
                bufIdx = 0; // overflow: discard and wait for next \n
            }
        }
    }
}

void setup() {
    Serial.setRxBufferSize(4096);
    Serial.setTxBufferSize(4096);
    Serial.begin(115200);
    delay(500);

    // 1. Inisialisasi Layar & Touch
    DisplayManager::init();

    // 2. Buat Tampilan Dashboard Mac Monitor di LVGL
    UIMacMonitor::create(lv_scr_act());

    // 3. Set Nilai Awal Default
    MacSystemMetrics initMetrics;
    initMetrics.cpu_pct = 0.0f;
    initMetrics.cpu_temp = 0.0f;
    initMetrics.gpu_temp = 0.0f;
    initMetrics.ram_pct = 0.0f;
    initMetrics.ram_used_gb = 0.0f;
    initMetrics.ram_total_gb = 16.0f;
    initMetrics.disk_pct = 0.0f;
    initMetrics.disk_free_gb = 0.0f;
    initMetrics.net_down_kb = 0.0f;
    initMetrics.net_up_kb = 0.0f;
    strncpy(initMetrics.chip_name, "Apple Silicon", sizeof(initMetrics.chip_name));
    strncpy(initMetrics.uptime, "--", sizeof(initMetrics.uptime));
    strncpy(initMetrics.clock_time, "--:--", sizeof(initMetrics.clock_time));
    strncpy(initMetrics.clock_date, "--", sizeof(initMetrics.clock_date));
    strncpy(initMetrics.media_title, "Waiting for Mac Data Bridge...", sizeof(initMetrics.media_title));
    initMetrics.process_count = 0;
    for (int i = 0; i < MAX_TOP_PROCESSES; i++) {
        strcpy(initMetrics.top_processes[i].name, "--");
        initMetrics.top_processes[i].pid = 0;
        initMetrics.top_processes[i].cpu_pct = 0.0f;
        initMetrics.top_processes[i].ram_pct = 0.0f;
    }
    initMetrics.net_conn_count = 0;
    for (int i = 0; i < MAX_TOP_NET_CONNS; i++) {
        strcpy(initMetrics.net_conns[i].name, "--");
        initMetrics.net_conns[i].pid = 0;
        strcpy(initMetrics.net_conns[i].remote, "--");
        strcpy(initMetrics.net_conns[i].status, "--");
    }
    initMetrics.disk_count = 0;
    for (int i = 0; i < MAX_DISKS; i++) {
        strcpy(initMetrics.disks[i].name, "--");
        strcpy(initMetrics.disks[i].type, "EXT");
        initMetrics.disks[i].used_gb = 0.0f;
        initMetrics.disks[i].free_gb = 0.0f;
        initMetrics.disks[i].total_gb = 0.0f;
        initMetrics.disks[i].pct = 0.0f;
    }

    UIMacMonitor::updateMetrics(initMetrics);
    lv_refr_now(NULL); // Initial draw only - safe because no serial data yet
}

void loop() {
    // 1. Drain serial BEFORE rendering (catch data that arrived during last frame)
    handleSerialInput();

    // 2. If new metrics arrived, push to LVGL widgets
    if (metricsReady) {
        metricsReady = false;
        UIMacMonitor::updateMetrics(latestMetrics);
    }

    // 3. Let LVGL render dirty areas
    lv_timer_handler();

    // 4. Drain serial AGAIN after rendering (catch data that arrived during render)
    handleSerialInput();

    delay(2);
}
