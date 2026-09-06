#!/usr/bin/env python3
"""
Mac System Monitor Bridge to Waveshare ESP32-S3 (800x480)
Streams real-time CPU, Temperature (CPU & GPU via smctemp), RAM, Disk, Network IO, and Media info via USB Serial.
"""

import time
import json
import shutil
import subprocess
import psutil
import serial
import serial.tools.list_ports

def find_esp32_port():
    """Detect Waveshare ESP32-S3 USB CDC port."""
    ports = serial.tools.list_ports.comports()
    for port in ports:
        dev = port.device.lower()
        desc = (port.description or "").lower()
        if "usbmodem" in dev or "usbserial" in dev or "espressif" in desc:
            return port.device
    return None

def get_chip_name():
    try:
        out = subprocess.check_output(['sysctl', '-n', 'machdep.cpu.brand_string']).decode().strip()
        return out if out else "Apple Silicon"
    except Exception:
        return "Apple Silicon"

def get_uptime():
    try:
        out = subprocess.check_output(['uptime'], stderr=subprocess.DEVNULL).decode().strip()
        import re
        m = re.search(r'up\s+([^,]+(?:,\s*[^,]+)?)', out)
        if m:
            raw = m.group(1).strip()
            parts = [p.strip() for p in raw.split(',')]
            days_str = ''
            time_str = ''
            for p in parts:
                if 'day' in p:
                    days_str = p.split()[0] + 'd'
                elif ':' in p:
                    h, mn = p.split(':')
                    time_str = f"{int(h)}h {int(mn)}m"
                elif 'min' in p:
                    time_str = f"{p.split()[0]}m"
            if days_str and time_str:
                return f"{days_str} {time_str}"
            elif days_str:
                return days_str
            elif time_str:
                return time_str
            return raw
    except Exception:
        pass
    return "--"

def get_temperatures():
    """Query CPU and GPU temperatures using smctemp."""
    cpu_t = 0.0
    gpu_t = 0.0
    try:
        res_c = subprocess.check_output(['smctemp', '-c'], stderr=subprocess.DEVNULL).decode().strip()
        if res_c:
            cpu_t = round(float(res_c.split('\n')[0]), 1)
    except Exception:
        pass

    try:
        res_g = subprocess.check_output(['smctemp', '-g'], stderr=subprocess.DEVNULL).decode().strip()
        if res_g:
            gpu_t = round(float(res_g.split('\n')[0]), 1)
    except Exception:
        pass

    return cpu_t, gpu_t

def get_media_info():
    script = '''
    on run
        if application "Music" is running then
            tell application "Music"
                if player state is playing then
                    return (get name of current track) & " - " & (get artist of current track)
                end if
            end tell
        end if
        if application "Spotify" is running then
            tell application "Spotify"
                if player state is playing then
                    return (get name of current track) & " - " & (get artist of current track)
                end if
            end tell
        end if
        return "No Media Playing"
    end run
    '''
    try:
        res = subprocess.check_output(['osascript', '-e', script], stderr=subprocess.DEVNULL).decode().strip()
        return res if res else "No Media Playing"
    except Exception:
        return "No Media Playing"

def main():
    chip_name = get_chip_name()
    print(f"[INIT] Host SoC: {chip_name}")

    last_net = psutil.net_io_counters()
    last_time = time.time()

    while True:
        port = find_esp32_port()
        if not port:
            print("[WAITING] Menghubungkan ke Waveshare ESP32-S3...")
            time.sleep(2)
            continue

        print(f"[CONNECTED] ESP32 terdeteksi di: {port}")
        try:
            ser = serial.Serial()
            ser.port = port
            ser.baudrate = 115200
            ser.timeout = 1
            ser.dtr = None
            ser.rts = None
            ser.open()
            time.sleep(1.0)
            ser.reset_input_buffer()

            while True:
                # 1. CPU & RAM
                cpu_pct = psutil.cpu_percent(interval=None)
                mem = psutil.virtual_memory()

                # 2. Temperature (CPU & GPU SoC)
                cpu_temp, gpu_temp = get_temperatures()

                # 3. Disk
                disk = shutil.disk_usage('/')
                disk_pct = round(disk.used / disk.total * 100, 1)
                disk_free_gb = round(disk.free / (1024**3), 1)

                # 4. Network Rate
                now = time.time()
                dt = now - last_time if (now - last_time) > 0 else 1.0
                curr_net = psutil.net_io_counters()
                net_down_kb = round((curr_net.bytes_recv - last_net.bytes_recv) / 1024.0 / dt, 1)
                net_up_kb = round((curr_net.bytes_sent - last_net.bytes_sent) / 1024.0 / dt, 1)
                last_net = curr_net
                last_time = now

                # 5. Media & Uptime
                media = get_media_info()
                uptime = get_uptime()

                payload = {
                    "cpu": round(cpu_pct, 1),
                    "cpu_temp": cpu_temp,
                    "gpu_temp": gpu_temp,
                    "ram_pct": round(mem.percent, 1),
                    "ram_used": round(mem.used / (1024**3), 1),
                    "ram_total": round(mem.total / (1024**3), 1),
                    "disk_pct": disk_pct,
                    "disk_free": disk_free_gb,
                    "net_down": net_down_kb,
                    "net_up": net_up_kb,
                    "chip": chip_name,
                    "uptime": uptime
                }

                # Drain stale data from previous cycle before sending new payload
                if ser.in_waiting > 0:
                    ser.read(ser.in_waiting)

                # Use compact JSON (no spaces) to keep payload under USB CDC buffer limit
                line = json.dumps(payload, separators=(',', ':')) + "\n"
                ser.write(line.encode("utf-8"))
                ser.flush()

                # Wait for ESP32 to process and respond
                time.sleep(0.5)
                ack = ""
                if ser.in_waiting > 0:
                    ack = ser.read(ser.in_waiting).decode("utf-8", errors="ignore").strip()

                print(f"[STREAM] CPU: {payload['cpu']}% | Temp: {payload['cpu_temp']}C | RAM: {payload['ram_pct']}% | Uptime: {payload['uptime']} | ACK: {ack}")

                time.sleep(0.5)

        except serial.SerialException as e:
            print(f"[DISCONNECTED] Koneksi serial terputus: {e}")
            time.sleep(2)
        except KeyboardInterrupt:
            print("\nProgram dihentikan oleh pengguna.")
            break

if __name__ == "__main__":
    main()
