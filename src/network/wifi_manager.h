#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <Preferences.h>
#include <ArduinoJson.h>

typedef void (*TelemetryCallback)(const String &state, const String &tool, const String &action, uint32_t step);

class NetworkManager {
public:
    static void init(TelemetryCallback callback);
    static void loop();
    static bool connectWiFi(const char *ssid, const char *pass);
    static bool isConnected();
    static String getIP();

private:
    static void handleSerialData();
    static void processTelemetryJson(const String &jsonStr);
};
