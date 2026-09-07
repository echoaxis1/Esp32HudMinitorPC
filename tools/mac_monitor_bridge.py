#!/usr/bin/env python3
"""
Mac System Monitor Bridge to Waveshare ESP32-S3 (800x480)
Streams real-time CPU, Temperature (CPU & GPU via smctemp), RAM, Disk, Network IO, and Media info via USB Serial.
"""

import time
import os
import json
import shutil
import subprocess
import socket
import datetime
import threading
import psutil
import serial
import serial.tools.list_ports

_cached_reminders = "Tidak ada reminder hari ini"
_last_reminders_fetch = 0

def get_macos_reminders():
    global _cached_reminders, _last_reminders_fetch
    now = time.time()
    if now - _last_reminders_fetch > 30.0:
        _last_reminders_fetch = now
        def _worker():
            global _cached_reminders
            script = """
            var Reminders = Application("Reminders");
            var list = Reminders.defaultList();
            var rems = list.reminders.whose({completed: false});
            var names = rems.name();
            var dates = rems.dueDate();

            var today = new Date();
            today.setHours(23, 59, 59, 999);

            var out = [];
            for (var i = 0; i < names.length; i++) {
                if (dates[i] && dates[i] <= today) {
                    if (out.indexOf(names[i]) === -1) {
                        out.push(names[i]);
                    }
                }
            }
            out.join(" • ");
            """
            try:
                res = subprocess.run(["osascript", "-l", "JavaScript", "-e", script], capture_output=True, text=True, timeout=12)
                out = res.stdout.strip()
                if out:
                    _cached_reminders = out
                else:
                    _cached_reminders = "Tidak ada reminder hari ini"
            except Exception:
                pass
        threading.Thread(target=_worker, daemon=True).start()
    return _cached_reminders

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

def get_macos_memory():
    """
    Calculate memory stats matching macOS Activity Monitor:
    Memory Used = App Memory + Wired Memory + Compressed Memory
    Where:
      App Memory = (Anonymous pages - Pages purgeable) * PageSize
      Wired Memory = Pages wired down * PageSize
      Compressed Memory = Pages occupied by compressor * PageSize
    """
    try:
        vm = subprocess.check_output(['vm_stat'], stderr=subprocess.DEVNULL).decode()
        stats = {}
        for line in vm.splitlines():
            if ':' in line:
                k, v = line.split(':', 1)
                val = v.strip().rstrip('.')
                if val.isdigit():
                    stats[k.strip()] = int(val)

        page_size = 16384
        try:
            pg = subprocess.check_output(['sysctl', '-n', 'hw.pagesize'], stderr=subprocess.DEVNULL).decode().strip()
            page_size = int(pg)
        except Exception:
            pass

        total_mem = psutil.virtual_memory().total
        anon = stats.get("Anonymous pages", 0)
        purgeable = stats.get("Pages purgeable", 0)
        wired = stats.get("Pages wired down", 0)
        compressor = stats.get("Pages occupied by compressor", 0)

        app_bytes = max(0, anon - purgeable) * page_size
        wired_bytes = wired * page_size
        compressed_bytes = compressor * page_size
        used_bytes = app_bytes + wired_bytes + compressed_bytes

        used_gb = round(used_bytes / (1024**3), 1)
        total_gb = round(total_mem / (1024**3), 1)
        pct = round((used_bytes / total_mem) * 100, 1)
        return pct, used_gb, total_gb
    except Exception:
        mem = psutil.virtual_memory()
        return round(mem.percent, 1), round(mem.used / (1024**3), 1), round(mem.total / (1024**3), 1)

def get_macos_storage():
    """
    Query exact macOS APFS storage metrics matching macOS System Settings (General > Storage).
    Returns (primary_pct, primary_free, primary_used, primary_total, all_disks_list).
    """
    helper_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "get_storage")
    if os.path.exists(helper_path):
        try:
            out = subprocess.check_output([helper_path], stderr=subprocess.DEVNULL).decode().strip()
            disks = json.loads(out)
            if disks and len(disks) > 0:
                primary = disks[0]
                pct = float(primary.get('p', 0.0))
                free_gb = float(primary.get('f', 0.0))
                used_gb = float(primary.get('u', 0.0))
                total_gb = float(primary.get('tot', 0.0))
                return pct, free_gb, used_gb, total_gb, disks[:4]
        except Exception:
            pass

    try:
        st = os.statvfs('/')
        total_b = st.f_blocks * st.f_frsize
        free_b = st.f_bavail * st.f_frsize
        used_b = total_b - free_b
        pct = round((used_b / total_b) * 100, 1)
        free_gb = round(free_b / 1e9, 1)
        used_gb = round(used_b / 1e9, 1)
        total_gb = round(total_b / 1e9, 1)
        disks = [{"n": "Macintosh HD", "t": "INT", "u": used_gb, "f": free_gb, "tot": total_gb, "p": pct}]
        return pct, free_gb, used_gb, total_gb, disks
    except Exception:
        du = shutil.disk_usage('/')
        pct = round(du.used / du.total * 100, 1)
        free_gb = round(du.free / 1e9, 1)
        used_gb = round(du.used / 1e9, 1)
        total_gb = round(du.total / 1e9, 1)
        disks = [{"n": "Macintosh HD", "t": "INT", "u": used_gb, "f": free_gb, "tot": total_gb, "p": pct}]
        return pct, free_gb, used_gb, total_gb, disks

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
                ram_pct, ram_used, ram_total = get_macos_memory()

                # 2. Temperature (CPU & GPU SoC)
                cpu_temp, gpu_temp = get_temperatures()

                # 3. Disk (macOS APFS System Settings match)
                disk_pct, disk_free_gb, disk_used_gb, disk_total_gb, all_disks = get_macos_storage()

                # 4. Network Rate & Cumulative Stats
                now = time.time()
                dt = now - last_time if (now - last_time) > 0 else 1.0
                curr_net = psutil.net_io_counters()
                net_down_kb = round((curr_net.bytes_recv - last_net.bytes_recv) / 1024.0 / dt, 1)
                net_up_kb = round((curr_net.bytes_sent - last_net.bytes_sent) / 1024.0 / dt, 1)
                rx_total_gb = round(curr_net.bytes_recv / (1024**3), 2)
                tx_total_gb = round(curr_net.bytes_sent / (1024**3), 2)
                last_net = curr_net
                last_time = now

                # 4.1 Local IP & Active Interface
                local_ip = "127.0.0.1"
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    s.connect(('8.8.8.8', 80))
                    local_ip = s.getsockname()[0]
                    s.close()
                except Exception:
                    pass

                active_iface = "en1"
                try:
                    net_pernic = psutil.net_io_counters(pernic=True)
                    for iface, stats in net_pernic.items():
                        if (iface.startswith('en') or iface.startswith('ap')) and stats.bytes_recv > 1024*1024:
                            active_iface = iface
                            break
                except Exception:
                    pass

                # 5. Uptime & Indonesian Clock Time/Date
                uptime = get_uptime()
                now_dt = datetime.datetime.now()
                time_str = now_dt.strftime("%H:%M")
                
                INDONESIAN_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
                INDONESIAN_MONTHS = [
                    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
                ]
                day_idx = now_dt.weekday() # 0 = Senin, 6 = Minggu
                day_name = INDONESIAN_DAYS[day_idx]
                month_name = INDONESIAN_MONTHS[now_dt.month]
                date_str = f"{day_name}, {now_dt.day:02d} {month_name} {now_dt.year}"

                # 6. Top CPU Processes
                top_procs = get_top_processes(limit=6)

                # 7. Top Network Connections
                top_conns = get_network_connections(limit=3)

                payload = {
                    "cpu": round(cpu_pct, 1),
                    "cpu_temp": cpu_temp,
                    "gpu_temp": gpu_temp,
                    "ram_pct": ram_pct,
                    "ram_used": ram_used,
                    "ram_total": ram_total,
                    "disk_pct": disk_pct,
                    "disk_free": disk_free_gb,
                    "net_down": net_down_kb,
                    "net_up": net_up_kb,
                    "rx_gb": rx_total_gb,
                    "tx_gb": tx_total_gb,
                    "iface": active_iface,
                    "ip": local_ip,
                    "chip": chip_name,
                    "uptime": uptime,
                    "time": time_str,
                    "date": date_str,
                    "day_idx": day_idx,
                    "rem": get_macos_reminders()[:250],
                    "procs": top_procs,
                    "conns": top_conns,
                    "disks": all_disks
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
