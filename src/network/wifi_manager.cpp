#include "wifi_manager.h"
#include "ui/ui_avatar.h"

static TelemetryCallback onTelemetryReceived = nullptr;
static Preferences prefs;
static String serialBuffer = "";

void NetworkManager::init(TelemetryCallback callback) {
    onTelemetryReceived = callback;
    prefs.begin("agy_network", false);

    String savedSSID = prefs.getString("ssid", "");
    String savedPass = prefs.getString("pass", "");

    if (savedSSID.length() > 0) {
        WiFi.mode(WIFI_STA);
        WiFi.begin(savedSSID.c_str(), savedPass.c_str());
        Serial.printf("[WiFi] Connecting to saved network: %s...\n", savedSSID.c_str());
    }
}

bool NetworkManager::connectWiFi(const char *ssid, const char *pass) {
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, pass);
    Serial.printf("[WiFi] Connecting to %s\n", ssid);

    uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
        delay(300);
        Serial.print(".");
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        prefs.putString("ssid", ssid);
        prefs.putString("pass", pass);
        Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
        return true;
    }
    return false;
}

bool NetworkManager::isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

String NetworkManager::getIP() {
    if (isConnected()) {
        return WiFi.localIP().toString();
    }
    return "Disconnected";
}

void NetworkManager::processTelemetryJson(const String &jsonStr) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, jsonStr);
    if (err) {
        return; // Ignore malformed JSON or debug noise
    }

    String state = doc["state"] | "standby";
    if (state.equalsIgnoreCase("gaze")) {
        float x = doc["x"] | 0.0f;
        float y = doc["y"] | 0.0f;
        UIAvatar::setGaze(x, y);
        return;
    }

    String tool = doc["tool"] | "";
    String action = doc["action"] | "";
    uint32_t step = doc["step"] | 0;

    if (onTelemetryReceived) {
        onTelemetryReceived(state, tool, action, step);
    }
}

void NetworkManager::handleSerialData() {
    while (Serial.available()) {
        char c = (char)Serial.read();
        if (c == '\n' || c == '\r') {
            serialBuffer.trim();
            if (serialBuffer.length() > 0 && serialBuffer.startsWith("{") && serialBuffer.endsWith("}")) {
                processTelemetryJson(serialBuffer);
            }
            serialBuffer = "";
        } else {
            if (serialBuffer.length() < 1024) {
                serialBuffer += c;
            } else {
                serialBuffer = "";
            }
        }
    }
}

void NetworkManager::loop() {
    handleSerialData();
}
