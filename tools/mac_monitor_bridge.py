#!/usr/bin/env python3
"""
Mac System Monitor Bridge to Waveshare ESP32-S3 (800x480)
Streams real-time CPU, Temperature (CPU & GPU via smctemp), RAM, Disk, Network IO, and Media info via USB Serial.
"""

import time
import os
import glob
import json
import shutil
import subprocess
import socket
import datetime
import threading
import psutil
import serial
import serial.tools.list_ports
import ctypes

# Initialize macOS display status detection via CoreGraphics and CoreFoundation
try:
    _cg = ctypes.cdll.LoadLibrary('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
    _cf = ctypes.cdll.LoadLibrary('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation')

    _cg.CGSessionCopyCurrentDictionary.restype = ctypes.c_void_p
    _cg.CGMainDisplayID.restype = ctypes.c_uint32
    _cg.CGDisplayIsAsleep.restype = ctypes.c_int
    _cg.CGDisplayIsAsleep.argtypes = [ctypes.c_uint32]

    _cf.CFStringCreateWithCString.restype = ctypes.c_void_p
    _cf.CFStringCreateWithCString.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint32]
    _cf.CFDictionaryGetValue.restype = ctypes.c_void_p
    _cf.CFDictionaryGetValue.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
    _cf.CFBooleanGetValue.restype = ctypes.c_bool
    _cf.CFBooleanGetValue.argtypes = [ctypes.c_void_p]
    _cf.CFRelease.argtypes = [ctypes.c_void_p]
    _HAS_CORE_GRAPHICS = True
except Exception:
    _HAS_CORE_GRAPHICS = False

def is_macos_display_off():
    """Detect if macOS screen is currently locked or asleep/powered off."""
    if not _HAS_CORE_GRAPHICS:
        return 0
    try:
        # 1. Check if main display is asleep
        main_id = _cg.CGMainDisplayID()
        if _cg.CGDisplayIsAsleep(main_id):
            return 1

        # 2. Check if user session is locked
        d = _cg.CGSessionCopyCurrentDictionary()
        if d:
            k = _cf.CFStringCreateWithCString(None, b'CGSSessionScreenIsLocked', 0x08000100)
            val = _cf.CFDictionaryGetValue(d, k)
            locked = False
            if val:
                locked = _cf.CFBooleanGetValue(val)
            _cf.CFRelease(k)
            _cf.CFRelease(d)
            if locked:
                return 1
    except Exception:
        pass
    return 0

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

_cached_weather = {
    "temp": 30.0,
    "code": 0,
    "day": 1,
    "text": "Cerah",
    "loc": "Bekasi"
}
_last_weather_fetch = 0
_cached_lat = None
_cached_lon = None
_cached_city = "Bekasi"

WMO_WEATHER_MAP = {
    0: "Cerah",
    1: "Cerah Berawan",
    2: "Sebagian Berawan",
    3: "Mendung",
    45: "Berkabut",
    48: "Kabut Tebal",
    51: "Gerimis Ringan",
    53: "Gerimis Sedang",
    55: "Gerimis Lebat",
    61: "Hujan Ringan",
    63: "Hujan Sedang",
    65: "Hujan Lebat",
    80: "Hujan Rintik",
    81: "Hujan Deras",
    82: "Hujan Sangat Deras",
    95: "Badai Petir",
    96: "Badai & Petir",
    99: "Badai Hebat"
}

def get_weather_info():
    global _cached_weather, _last_weather_fetch, _cached_lat, _cached_lon, _cached_city
    now = time.time()
    # Query weather every 10 minutes (600s)
    if now - _last_weather_fetch > 600.0 or _last_weather_fetch == 0:
        _last_weather_fetch = now
        def _worker():
            global _cached_weather, _cached_lat, _cached_lon, _cached_city
            try:
                import urllib.request
                if _cached_lat is None:
                    try:
                        req = urllib.request.Request("http://ip-api.com/json", headers={"User-Agent": "curl/7.68.0"})
                        with urllib.request.urlopen(req, timeout=4) as resp:
                            data = json.loads(resp.read().decode())
                            _cached_lat = data.get("lat", -6.2808)
                            _cached_lon = data.get("lon", 106.9835)
                            _cached_city = data.get("city", "Bekasi")
                    except Exception:
                        _cached_lat = -6.2808
                        _cached_lon = 106.9835
                        _cached_city = "Bekasi"

                url = f"https://api.open-meteo.com/v1/forecast?latitude={_cached_lat}&longitude={_cached_lon}&current_weather=true"
                req_w = urllib.request.Request(url, headers={"User-Agent": "curl/7.68.0"})
                with urllib.request.urlopen(req_w, timeout=5) as w_resp:
                    w_data = json.loads(w_resp.read().decode())
                    cw = w_data.get("current_weather", {})
                    temp = float(cw.get("temperature", 30.0))
                    wcode = int(cw.get("weathercode", 0))
                    is_day = int(cw.get("is_day", 1))
                    
                    w_text = WMO_WEATHER_MAP.get(wcode, "Cerah")
                    if is_day == 0 and wcode == 0:
                        w_text = "Malam Cerah"
                    
                    _cached_weather = {
                        "temp": round(temp, 1),
                        "code": wcode,
                        "day": is_day,
                        "text": w_text,
                        "loc": _cached_city
                    }
            except Exception:
                pass
        threading.Thread(target=_worker, daemon=True).start()
    return _cached_weather

def find_esp32_port():
    """Detect Waveshare ESP32-S3 USB CDC port."""
    ports = serial.tools.list_ports.comports()
    for port in ports:
        dev = port.device.lower()
        desc = (port.description or "").lower()
        if "usbmodem" in dev or "usbserial" in dev or "espressif" in desc:
            return port.device
    return None

_last_agy_quota_fetch = 0
_agy_quota_fetching = False

def refresh_all_agy_quotas_background():
    """Background worker to fetch latest quota for all accounts directly from Google API every 60s."""
    global _last_agy_quota_fetch, _agy_quota_fetching
    now = time.time()
    if _agy_quota_fetching or (now - _last_agy_quota_fetch < 60.0 and _last_agy_quota_fetch != 0):
        return

    _last_agy_quota_fetch = now
    _agy_quota_fetching = True

    def _worker():
        global _agy_quota_fetching
        try:
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
            import base64
            import urllib.request
            import urllib.parse
            import hashlib

            key_path = os.path.expanduser('~/.antigravity_cockpit/secure-account-storage.key')
            acc_path = os.path.expanduser('~/.antigravity_cockpit/accounts.json')
            cache_dir = os.path.expanduser('~/.antigravity_cockpit/cache/quota_api_v1_desktop/authorized')
            os.makedirs(cache_dir, exist_ok=True)

            if not os.path.exists(key_path) or not os.path.exists(acc_path):
                return

            with open(key_path) as f:
                key = base64.b64decode(f.read().strip())

            with open(acc_path) as f:
                acc_data = json.load(f)

            accounts = acc_data.get('accounts', [])
            google_client_id = None
            google_client_secret = None
            cockpit_bin = '/Applications/Cockpit Tools.app/Contents/MacOS/cockpit-tools'
            if os.path.exists(cockpit_bin):
                try:
                    import re
                    s_out = subprocess.run(['strings', cockpit_bin], capture_output=True, text=True, timeout=4).stdout
                    m_cid = re.search(r'([0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com)', s_out)
                    m_sec = re.search(r'(GOCSPX-[A-Za-z0-9_]{28})', s_out)
                    if m_cid: google_client_id = m_cid.group(1)
                    if m_sec: google_client_secret = m_sec.group(1)
                except Exception:
                    pass

            for a in accounts:
                acc_id = a.get('id')
                email = a.get('email')
                if not acc_id or not email:
                    continue

                env_path = os.path.expanduser(f'~/.antigravity_cockpit/accounts/{acc_id}.json')
                if not os.path.exists(env_path):
                    continue

                try:
                    with open(env_path) as ef:
                        envelope = json.load(ef)

                    nonce = base64.b64decode(envelope['nonce'])
                    ciphertext = base64.b64decode(envelope['ciphertext'])
                    aesgcm = AESGCM(key)
                    dec = json.loads(aesgcm.decrypt(nonce, ciphertext, None))

                    tok = dec.get('token', {})
                    access_token = tok.get('access_token')
                    expiry = tok.get('expiry_timestamp', 0)
                    refresh_token = tok.get('refresh_token')

                    # If token expires in less than 300s (5m), refresh it
                    if time.time() >= (expiry - 300) and refresh_token:
                        try:
                            refresh_params = urllib.parse.urlencode({
                                'client_id': google_client_id,
                                'client_secret': google_client_secret,
                                'refresh_token': refresh_token,
                                'grant_type': 'refresh_token'
                            }).encode('utf-8')
                            ref_req = urllib.request.Request('https://oauth2.googleapis.com/token', data=refresh_params)
                            with urllib.request.urlopen(ref_req, timeout=8) as rresp:
                                rdata = json.loads(rresp.read().decode())
                                if 'access_token' in rdata:
                                    access_token = rdata['access_token']
                                    tok['access_token'] = access_token
                                    expires_in = rdata.get('expires_in', 3600)
                                    tok['expiry_timestamp'] = int(time.time() + expires_in)
                                    dec['token'] = tok

                                    # Save back updated encrypted token envelope
                                    new_nonce = os.urandom(12)
                                    new_cipher = aesgcm.encrypt(new_nonce, json.dumps(dec).encode('utf-8'), None)
                                    envelope['nonce'] = base64.b64encode(new_nonce).decode('utf-8')
                                    envelope['ciphertext'] = base64.b64encode(new_cipher).decode('utf-8')
                                    with open(env_path, 'w') as ef_out:
                                        json.dump(envelope, ef_out, indent=2)
                        except Exception as rf_err:
                            print(f"[AGY QUOTA] Token refresh failed for {email}: {rf_err}")

                    if not access_token:
                        continue

                    # Query quota from Google Cloud Code internal API
                    quota_req = urllib.request.Request(
                        'https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary',
                        data=b'{}',
                        headers={
                            'Authorization': f'Bearer {access_token}',
                            'Content-Type': 'application/json',
                            'User-Agent': 'antigravity/2.12.2 darwin/arm64 google-api-nodejs-client/10.3.0',
                            'x-goog-api-client': 'gl-node/22.21.1'
                        }
                    )
                    with urllib.request.urlopen(quota_req, timeout=8) as qresp:
                        quota_summary = json.loads(qresp.read().decode())

                    # Save into cache file
                    cache_file = os.path.join(cache_dir, f'{hashlib.sha256(email.encode()).hexdigest()}.json')
                    payload = {}
                    if os.path.exists(cache_file):
                        try:
                            with open(cache_file) as cf:
                                payload = json.load(cf).get('payload', {})
                        except Exception:
                            pass
                    payload['quota_summary'] = quota_summary
                    cache_data = {
                        'version': 1,
                        'source': 'authorized',
                        'customSource': 'desktop',
                        'email': email,
                        'projectId': 'aicode-consumers',
                        'updatedAt': int(time.time() * 1000),
                        'payload': payload
                    }
                    with open(cache_file, 'w') as cf_out:
                        json.dump(cache_data, cf_out, indent=2)

                except Exception as acc_ex:
                    # Skip or log error for this specific account
                    pass
        except Exception as e:
            print(f"[AGY QUOTA REFRESH ERROR] {e}")
        finally:
            _agy_quota_fetching = False

    threading.Thread(target=_worker, daemon=True).start()

def get_agy_cockpit_metrics():
    """Extract multi-account usage & current active account from Antigravity Cockpit Tools."""
    # Trigger background quota check every 60s
    refresh_all_agy_quotas_background()

    acc_path = os.path.expanduser('~/.antigravity_cockpit/accounts.json')
    if not os.path.exists(acc_path):
        return None
    try:
        with open(acc_path) as f:
            acc_data = json.load(f)
        current_id = acc_data.get('current_account_id')
        accounts = acc_data.get('accounts', [])

        curr_email = 'Unknown'
        for a in accounts:
            if a.get('id') == current_id:
                curr_email = a.get('email', 'Unknown')
                break

        cache_pattern = os.path.expanduser('~/.antigravity_cockpit/cache/quota_api_v1_desktop/authorized/*.json')
        cache_files = glob.glob(cache_pattern)

        # Parse quota cache map by email
        quota_by_email = {}
        pool_ready = 0

        for p in cache_files:
            try:
                with open(p) as f:
                    d = json.load(f)
                    email = d.get('email')
                    summary = d.get('payload', {}).get('quota_summary', {})
                    groups = summary.get('groups', [])

                    acc_c_5h = 100
                    acc_c_wk = 100
                    acc_g_5h = 100
                    acc_g_wk = 100
                    for g in groups:
                        is_gemini = 'Gemini' in g.get('displayName', '')
                        for b in g.get('buckets', []):
                            w = b.get('window')
                            pct = int(b.get('remainingFraction', 1.0) * 100)
                            if is_gemini:
                                if w == '5h': acc_g_5h = pct
                                elif w == 'weekly': acc_g_wk = pct
                            else:
                                if w == '5h': acc_c_5h = pct
                                elif w == 'weekly': acc_c_wk = pct
                    quota_by_email[email] = {
                        'c_5h': acc_c_5h, 'c_wk': acc_c_wk,
                        'g_5h': acc_g_5h, 'g_wk': acc_g_wk
                    }
                    if acc_c_5h > 0 and acc_g_5h > 0:
                        pool_ready += 1
            except Exception:
                pass

        curr_q = quota_by_email.get(curr_email, {'c_5h': 100, 'c_wk': 100, 'g_5h': 100, 'g_wk': 100})
        short_name = curr_email.split('@')[0] if '@' in curr_email else curr_email

        # Build account list
        acc_list = []
        for a in accounts:
            email = a.get('email', '')
            acc_id = a.get('id', '')
            q = quota_by_email.get(email, {'c_5h': 100, 'c_wk': 100, 'g_5h': 100, 'g_wk': 100})
            is_cur = 1 if acc_id == current_id else 0
            acc_list.append({
                'id': acc_id,
                'n': email.split('@')[0][:14],
                'cur': is_cur,
                'c_5h': q['c_5h'],
                'c_wk': q['c_wk'],
                'g_5h': q['g_5h'],
                'g_wk': q['g_wk']
            })

        # Sort accounts: Gemini kuota terbanyak (g_5h desc, g_wk desc, c_5h desc)
        # Akun aktif tetap terlihat prioritas atau terurut jelas
        acc_list.sort(key=lambda x: (x['g_5h'], x['g_wk'], x['c_5h']), reverse=True)
        acc_list = acc_list[:8]

        return {
            'acc': short_name[:16],
            'c_5h': curr_q['c_5h'],
            'c_wk': curr_q['c_wk'],
            'g_5h': curr_q['g_5h'],
            'g_wk': curr_q['g_wk'],
            'ready': pool_ready,
            'total': len(accounts),
            'list': acc_list
        }
    except Exception:
        return None

def make_user_status_proto(email):
    """Generate protobuf base64 string for antigravityUnifiedStateSync.userStatus."""
    from base64 import b64encode
    inner1 = b"\x1a" + bytes([len(email)]) + email.encode()
    b64_1 = b64encode(inner1).decode()
    inner2 = b":" + bytes([len(email)]) + email.encode()
    b64_2 = b64encode(inner2).decode()
    combined_str = b64_1 + b64_2
    proto_data = bytes([0x0a, len(combined_str)]) + combined_str.encode()
    field2 = bytes([0x12, len(proto_data)]) + proto_data
    sentinel = b"userStatusSentinelKey"
    field1 = bytes([0x0a, len(sentinel)]) + sentinel
    full_body = field1 + field2
    wrapper = bytes([0x0a, len(full_body)]) + full_body
    return b64encode(wrapper).decode()

def sync_antigravity_user_status(target_account_id):
    """Sync target email into antigravityUnifiedStateSync.userStatus in state.vscdb."""
    acc_path = os.path.expanduser('~/.antigravity_cockpit/accounts.json')
    if not os.path.exists(acc_path):
        return
    try:
        with open(acc_path) as f:
            data = json.load(f)
        target_email = None
        for a in data.get('accounts', []):
            if a.get('id') == target_account_id:
                target_email = a.get('email')
                break
        if not target_email:
            return

        b64_val = make_user_status_proto(target_email)
        import sqlite3
        for db_path in [
            os.path.expanduser('~/Library/Application Support/Antigravity/User/globalStorage/state.vscdb'),
            os.path.expanduser('~/Library/Application Support/Antigravity IDE/User/globalStorage/state.vscdb')
        ]:
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                c = conn.cursor()
                c.execute('UPDATE ItemTable SET value = ? WHERE key = "antigravityUnifiedStateSync.userStatus"', (b64_val,))
                conn.commit()
                conn.close()
                print(f"[SWITCH] Synced userStatus to {target_email} in {db_path}")
    except Exception as e:
        print(f"[SWITCH ERROR] Failed to sync userStatus: {e}")

def inject_account_to_keychain(target_account_id):
    """Decrypt account token envelope from Cockpit and inject into macOS Keychain and jetski token."""
    key_path = os.path.expanduser('~/.antigravity_cockpit/secure-account-storage.key')
    env_path = os.path.expanduser(f'~/.antigravity_cockpit/accounts/{target_account_id}.json')
    if not os.path.exists(key_path) or not os.path.exists(env_path):
        return False
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        from datetime import datetime, timezone
        import base64

        with open(key_path) as f:
            key = base64.b64decode(f.read().strip())

        with open(env_path) as f:
            envelope = json.load(f)

        nonce = base64.b64decode(envelope['nonce'])
        ciphertext = base64.b64decode(envelope['ciphertext'])
        aesgcm = AESGCM(key)
        data = json.loads(aesgcm.decrypt(nonce, ciphertext, None))

        tok = data.get('token', {})
        target_email = data.get('email', '')
        if not tok.get('access_token'):
            print(f"[SWITCH ERROR] Token missing for {target_email}")
            return False

        expiry_ts = tok.get('expiry_timestamp', int(time.time() + 3600))
        expiry_dt = datetime.fromtimestamp(expiry_ts, tz=timezone.utc)
        expiry_str = expiry_dt.strftime("%Y-%m-%dT%H:%M:%S.000000Z")

        keyring_payload = {
            "token": {
                "access_token": tok["access_token"],
                "token_type": tok.get("token_type", "Bearer"),
                "refresh_token": tok.get("refresh_token", ""),
                "expiry": expiry_str
            },
            "auth_method": "consumer"
        }

        # 1. Update macOS Keychain (gemini / antigravity)
        encoded_blob = "go-keyring-base64:" + base64.b64encode(json.dumps(keyring_payload).encode()).decode()
        subprocess.check_call([
            "security", "add-generic-password",
            "-U",
            "-s", "gemini",
            "-a", "antigravity",
            "-w", encoded_blob
        ])

        # 2. Update ~/.gemini/jetski-standalone-oauth-token
        jetski_path = os.path.expanduser('~/.gemini/jetski-standalone-oauth-token')
        with open(jetski_path, 'w') as f:
            json.dump(keyring_payload, f, indent=2)

        # 3. Update ~/.gemini/google_accounts.json
        gacc_path = os.path.expanduser('~/.gemini/google_accounts.json')
        with open(gacc_path, 'w') as f:
            json.dump({"active": target_email, "old": []}, f, indent=2)

        print(f"[SWITCH] Successfully injected {target_email} into Keychain and Gemini configs!")
        return True
    except Exception as e:
        print(f"[SWITCH ERROR] Failed to inject token into keychain: {e}")
        return False

def switch_cockpit_account(target_account_id):
    """Switch active Antigravity account in Cockpit Tools & macOS Keychain and reload session."""
    try:
        # 1. Update ~/.antigravity_cockpit/accounts.json (current_account_id)
        acc_path = os.path.expanduser('~/.antigravity_cockpit/accounts.json')
        if os.path.exists(acc_path):
            try:
                with open(acc_path) as f:
                    acc_cfg = json.load(f)
                acc_cfg['current_account_id'] = target_account_id
                with open(acc_path, 'w') as f:
                    json.dump(acc_cfg, f, indent=2)
                print(f"[SWITCH] Updated accounts.json current_account_id to {target_account_id}")
            except Exception as e:
                print(f"[SWITCH ERROR] Failed to update accounts.json: {e}")

        # 2. Update ~/.antigravity_cockpit/antigravity_legacy_instances.json
        legacy_inst_path = os.path.expanduser('~/.antigravity_cockpit/antigravity_legacy_instances.json')
        if os.path.exists(legacy_inst_path):
            try:
                with open(legacy_inst_path) as f:
                    leg_data = json.load(f)
                if 'defaultSettings' not in leg_data:
                    leg_data['defaultSettings'] = {}
                leg_data['defaultSettings']['bindAccountId'] = target_account_id
                with open(legacy_inst_path, 'w') as f:
                    json.dump(leg_data, f, indent=2)
                print(f"[SWITCH] Updated legacy instances bindAccountId to {target_account_id}")
            except Exception as e:
                print(f"[SWITCH ERROR] Failed to update legacy instances: {e}")

        # 3. Notify Cockpit Tools via WebSocket if running (Graceful fallback if not running)
        server_json_path = os.path.expanduser('~/.antigravity_cockpit/server.json')
        if os.path.exists(server_json_path):
            try:
                with open(server_json_path) as f:
                    cfg = json.load(f)

                port = cfg.get('ws_port', 19528)
                token = cfg.get('auth_token', '')

                s = socket.socket()
                s.settimeout(1.5)
                s.connect(('127.0.0.1', port))

                handshake = (
                    f"GET /?token={token} HTTP/1.1\r\n"
                    f"Host: 127.0.0.1:{port}\r\n"
                    f"Upgrade: websocket\r\n"
                    f"Connection: Upgrade\r\n"
                    f"Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
                    f"Sec-WebSocket-Version: 13\r\n\r\n"
                )
                s.sendall(handshake.encode())
                s.recv(1024)
                try:
                    s.recv(1024)
                except Exception:
                    pass

                import struct
                data = json.dumps({
                    'type': 'request.switch_account',
                    'payload': {
                        'request_id': f"hud-sw-{int(time.time())}",
                        'account_id': target_account_id
                    }
                }).encode()

                length = len(data)
                frame = bytearray([0x81])
                mask = b'\x12\x34\x56\x78'
                if length <= 125:
                    frame.append(0x80 | length)
                elif length <= 65535:
                    frame.append(0x80 | 126)
                    frame.extend(struct.pack('>H', length))
                frame.extend(mask)
                frame.extend(bytearray(b ^ mask[i % 4] for i, b in enumerate(data)))

                s.sendall(bytes(frame))
                time.sleep(0.3)
                try:
                    resp = s.recv(2048)
                    print(f"[SWITCH] Cockpit responded: {resp[:120]}")
                except Exception:
                    pass
                s.close()
            except Exception as e:
                print(f"[SWITCH] Cockpit Tools daemon not reachable ({e}), proceeding with direct Keychain injection.")

        # 2. Sync userStatus in state.vscdb
        sync_antigravity_user_status(target_account_id)

        # 3. Inject token envelope directly into macOS Keychain & Gemini configs
        inject_account_to_keychain(target_account_id)

        # 4. Cleanly kill and relaunch Antigravity (replicating Cockpit play button)
        try:
            # Terminate all Antigravity processes cleanly
            subprocess.run(['killall', 'Antigravity'], stderr=subprocess.DEVNULL)
            # Give macOS time to fully reap the processes
            for _ in range(15):
                check = subprocess.run(['pgrep', '-x', 'Antigravity'], stdout=subprocess.DEVNULL)
                if check.returncode != 0:
                    break
                time.sleep(0.2)
            time.sleep(1.0)
            
            # Relaunch fresh instance
            subprocess.run(['open', '-n', '-a', '/Applications/Antigravity.app'])
            print("[SWITCH] Antigravity process cleanly restarted with new account.")
        except Exception as e:
            print(f"[SWITCH] Error restarting Antigravity: {e}")

        return True
    except Exception as e:
        print(f"[SWITCH ERROR] Failed to switch account: {e}")
        return False

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
    my_uid = os.getuid()
    for p in psutil.process_iter(['pid', 'name', 'uids']):
        try:
            if p.info['uids'] and p.info['uids'].real == my_uid:
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
            ser.write_timeout = 2
            ser.dtr = True
            ser.rts = True
            ser.open()
            time.sleep(0.5)
            ser.reset_input_buffer()
            ser.reset_output_buffer()

            while True:
                cpu_pct = psutil.cpu_percent(interval=None)
                cores_pct = [round(c, 1) for c in psutil.cpu_percent(percpu=True, interval=None)[:10]]
                ram_pct, ram_used, ram_total = get_macos_memory()
                cpu_temp, gpu_temp = get_temperatures()
                disk_pct, disk_free_gb, disk_used_gb, disk_total_gb, all_disks = get_macos_storage()

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

                top_procs = get_top_processes(limit=4)
                top_conns = get_network_connections(limit=2)
                weather = get_weather_info()
                rems_val = get_macos_reminders()[:100]
                agy_info = get_agy_cockpit_metrics()
                payload = {
                    "cpu": round(cpu_pct, 1),
                    "cpu_temp": cpu_temp,
                    "gpu_temp": gpu_temp,
                    "cores": cores_pct,
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
                    "disp_off": is_macos_display_off(),
                    "rem": rems_val,
                    "w_temp": weather.get("temp", 30.0),
                    "w_code": weather.get("code", 0),
                    "w_day": weather.get("day", 1),
                    "w_text": weather.get("text", "Cerah"),
                    "w_loc": weather.get("loc", "Bekasi"),
                    "procs": top_procs,
                    "conns": top_conns,
                    "disks": all_disks[:2],
                    "agy": agy_info
                }

                line = json.dumps(payload, separators=(',', ':')) + "\n"
                ser.write(line.encode("utf-8"))

                # Read response from ESP32 if available
                time.sleep(0.1)
                ack = ""
                if ser.in_waiting > 0:
                    raw_in = ser.read(ser.in_waiting).decode("utf-8", errors="ignore").strip()
                    ack = raw_in
                    for in_line in raw_in.splitlines():
                        in_line = in_line.strip()
                        if in_line.startswith("CMD:SWITCH_AGY:"):
                            target_id = in_line.replace("CMD:SWITCH_AGY:", "").strip()
                            print(f"\n[HUD TRIGGER] Switching AGY account requested for: {target_id}")
                            switch_cockpit_account(target_id)

                print(f"[STREAM] CPU: {payload['cpu']}% | Temp: {payload['cpu_temp']}C | RAM: {payload['ram_pct']}% | Uptime: {payload['uptime']} | ACK: {ack}", flush=True)

                time.sleep(0.9)

        except (serial.SerialException, serial.SerialTimeoutException) as e:
            print(f"[DISCONNECTED] Masalah koneksi serial: {e}")
            time.sleep(2)
        except KeyboardInterrupt:
            print("\nProgram dihentikan oleh pengguna.")
            break

if __name__ == "__main__":
    main()
