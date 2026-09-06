#!/bin/bash
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:$PATH"
cd /Users/echoaxis/Projects/Esp32/Esp32HudMonitorPC
exec /Users/echoaxis/Projects/Esp32/Esp32HudMonitorPC/.venv/bin/python3 -u tools/mac_monitor_bridge.py
