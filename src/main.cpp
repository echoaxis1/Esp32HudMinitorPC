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
    strncpy(initMetrics.media_title, "Waiting for Mac Data Bridge...", sizeof(initMetrics.media_title));
    initMetrics.process_count = 0;
    for (int i = 0; i < MAX_TOP_PROCESSES; i++) {
        strcpy(initMetrics.top_processes[i].name, "--");
        initMetrics.top_processes[i].pid = 0;
        initMetrics.top_processes[i].cpu_pct = 0.0f;
        initMetrics.top_processes[i].ram_pct = 0.0f;
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
