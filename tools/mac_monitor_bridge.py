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

_BOOT_TIME = None

def get_uptime():
    """In-memory zero-process uptime calculation."""
    global _BOOT_TIME
    try:
        if _BOOT_TIME is None:
            _BOOT_TIME = psutil.boot_time()
        elapsed = int(time.time() - _BOOT_TIME)
        days = elapsed // 86400
        hours = (elapsed % 86400) // 3600
        mins = (elapsed % 3600) // 60
        if days > 0:
            return f"{days}d {hours}h {mins}m"
        elif hours > 0:
            return f"{hours}h {mins}m"
        else:
            return f"{mins}m"
    except Exception:
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

def get_top_processes(limit=6):
    """Fetch top CPU-consuming processes."""
    procs = []
    for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
        try:
            info = p.info
            if info['cpu_percent'] is not None and info['name']:
                procs.append(info)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    procs.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
    top = []
    for p in procs[:limit]:
        top.append({
            "n": p['name'][:18],
            "p": p['pid'],
            "c": round(p['cpu_percent'] or 0.0, 1),
            "m": round(p['memory_percent'] or 0.0, 1)
        })
    return top

def get_network_connections(limit=6):
    """Fetch active network socket connections per process."""
    conns = []
    for p in psutil.process_iter(['pid', 'name']):
        try:
            c_list = p.net_connections(kind='inet')
            if c_list:
                pname = p.info['name']
                pid = p.info['pid']
                for c in c_list:
                    if c.raddr:
                        ip = c.raddr.ip
                        port = c.raddr.port
                        is_local = ip.startswith('127.') or ip == '::1' or ip.startswith('fe80')
                        r_str = f"{ip}:{port}"
                        status = c.status if c.status else "ESTAB"
                        if status == "ESTABLISHED":
                            status = "ESTAB"
                        conns.append({
                            "n": pname[:16],
                            "p": pid,
                            "r": r_str[:22],
                            "s": status[:8],
                            "_loc": 1 if is_local else 0
                        })
        except (psutil.AccessDenied, psutil.NoSuchProcess, psutil.ZombieProcess):
            pass

    # Sort external connections first, then established
    conns.sort(key=lambda x: (x['_loc'], 0 if x['s'] == 'ESTAB' else 1))
    top = []
    for c in conns[:limit]:
        top.append({
            "n": c['n'],
            "p": c['p'],
            "r": c['r'],
            "s": c['s']
        })
    return top

def main():
    chip_name = get_chip_name()
    print(f"[INIT] Host SoC: {chip_name}")

    # Prime psutil process_iter
    for _ in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
        pass

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

                # 5. Uptime
                uptime = get_uptime()

                # 6. Top CPU Processes
                top_procs = get_top_processes(limit=6)

                # 7. Top Network Connections
                top_conns = get_network_connections(limit=6)

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
                    "uptime": uptime,
                    "procs": top_procs,
                    "conns": top_conns
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
