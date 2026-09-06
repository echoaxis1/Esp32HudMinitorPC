#!/bin/bash
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:$PATH"
cd /Users/echoaxis/Projects/Esp32/Esp32HudMonitorPC

if [ ! -f "tools/get_storage" ] && [ -f "tools/get_storage.m" ]; then
    clang -O2 -framework Foundation -o tools/get_storage tools/get_storage.m 2>/dev/null || true
fi

exec /Users/echoaxis/Projects/Esp32/Esp32HudMonitorPC/.venv/bin/python3 -u tools/mac_monitor_bridge.py
