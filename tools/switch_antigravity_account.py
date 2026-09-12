#!/usr/bin/env python3
"""
Antigravity Account Switcher CLI
Executes the verified multi-step switch workflow:
1. Update ~/.antigravity_cockpit/accounts.json (current_account_id)
2. Update ~/.antigravity_cockpit/antigravity_legacy_instances.json (bindAccountId)
3. Notify Cockpit daemon via WebSocket (optional / graceful fallback)
4. Decrypt token envelope (AES-256-GCM) & get new tokens
5. Sync antigravityUnifiedStateSync.userStatus & oauthToken in state.vscdb (Standalone & IDE)
6. Inject token into macOS Keychain (gemini / antigravity) and ~/.gemini/ configs
7. Accurately terminate & restart target Antigravity applications using psutil exe paths
"""

import sys
import os
import json
import time
import socket
import struct
import base64
import sqlite3
import subprocess

try:
    import psutil
except ImportError:
    psutil = None

def make_user_status_proto(email: str) -> str:
    inner1 = b"\x1a" + bytes([len(email)]) + email.encode()
    b64_1 = base64.b64encode(inner1).decode()
    inner2 = b":" + bytes([len(email)]) + email.encode()
    b64_2 = base64.b64encode(inner2).decode()
    combined_str = b64_1 + b64_2
    proto_data = bytes([0x0a, len(combined_str)]) + combined_str.encode()
    field2 = bytes([0x12, len(proto_data)]) + proto_data
    sentinel = b"userStatusSentinelKey"
    field1 = bytes([0x0a, len(sentinel)]) + sentinel
    full_body = field1 + field2
    wrapper = bytes([0x0a, len(full_body)]) + full_body
    return base64.b64encode(wrapper).decode()

def sync_antigravity_databases(target_account_id: str, access_token: str = ""):
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

        b64_status = make_user_status_proto(target_email)

        db_paths = [
            os.path.expanduser('~/Library/Application Support/Antigravity/User/globalStorage/state.vscdb'),
            os.path.expanduser('~/Library/Application Support/Antigravity IDE/User/globalStorage/state.vscdb')
        ]

        for db_path in db_paths:
            if not os.path.exists(db_path):
                continue
            try:
                conn = sqlite3.connect(db_path)
                c = conn.cursor()
                c.execute('UPDATE ItemTable SET value = ? WHERE key = "antigravityUnifiedStateSync.userStatus"', (b64_status,))
                
                # If oauthToken key exists, update access_token inside protobuf wrapper if available
                if access_token:
                    c.execute('SELECT value FROM ItemTable WHERE key = "antigravityUnifiedStateSync.oauthToken"')
                    row = c.fetchone()
                    if row and row[0]:
                        try:
                            raw = base64.b64decode(row[0])
                            # find old ya29 token in raw bytes
                            import re
                            match = re.search(rb"ya29\.[a-zA-Z0-9_-]+", raw)
                            if match:
                                old_tok = match.group(0)
                                new_raw = raw.replace(old_tok, access_token.encode())
                                new_b64 = base64.b64encode(new_raw).decode()
                                c.execute('UPDATE ItemTable SET value = ? WHERE key = "antigravityUnifiedStateSync.oauthToken"', (new_b64,))
                                print(f"[SWITCH] Updated embedded oauthToken in {os.path.basename(os.path.dirname(os.path.dirname(db_path)))}")
                        except Exception as ex_tok:
                            print(f"[SWITCH] Note on updating embedded oauthToken: {ex_tok}")

                conn.commit()
                conn.close()
                print(f"[SWITCH] Synced userStatus to {target_email} in {db_path}")
            except Exception as e_db:
                print(f"[SWITCH ERROR] Failed to update db {db_path}: {e_db}")

    except Exception as e:
        print(f"[SWITCH ERROR] Failed in sync_antigravity_databases: {e}")

def get_decrypted_account_payload(target_account_id: str):
    key_path = os.path.expanduser('~/.antigravity_cockpit/secure-account-storage.key')
    env_path = os.path.expanduser(f'~/.antigravity_cockpit/accounts/{target_account_id}.json')
    if not os.path.exists(key_path) or not os.path.exists(env_path):
        return None
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        with open(key_path) as f:
            key = base64.b64decode(f.read().strip())
        with open(env_path) as f:
            envelope = json.load(f)
        nonce = base64.b64decode(envelope['nonce'])
        ciphertext = base64.b64decode(envelope['ciphertext'])
        aesgcm = AESGCM(key)
        return json.loads(aesgcm.decrypt(nonce, ciphertext, None))
    except Exception as e:
        print(f"[SWITCH ERROR] Decryption failed: {e}")
        return None

def inject_account_to_keychain(data: dict) -> bool:
    try:
        from datetime import datetime, timezone
        tok = data.get('token', {})
        target_email = data.get('email', '')
        if not tok.get('access_token'):
            print(f"[SWITCH ERROR] Access token missing for {target_email}")
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
        os.makedirs(os.path.dirname(jetski_path), exist_ok=True)
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

def restart_antigravity_processes(target_app: str = "both"):
    """
    Restart Antigravity Standalone, Antigravity IDE, or both.
    IMPORTANT: Hanya meluncurkan kembali (open -a) aplikasi yang SEBELUMNYA BENAR-BENAR SEDANG BERJALAN/AKTIF.
    Jika aplikasi dalam keadaan mati/tutup, JANGAN pernah diluncurkan secara otomatis.
    target_app options: 'standalone', 'ide', 'both'
    """
    if not psutil:
        return

    standalone_all_pids = []
    standalone_gui_running = False

    ide_all_pids = []
    ide_gui_running = False

    for p in psutil.process_iter(['pid', 'name', 'exe', 'cmdline']):
        try:
            exe = p.info['exe'] or ''
            cmd = ' '.join(p.info['cmdline'] or [])
            if '/Applications/Antigravity.app' in exe or '/Applications/Antigravity.app' in cmd:
                standalone_all_pids.append(p)
                if '/Applications/Antigravity.app/Contents/MacOS/Antigravity' in exe:
                    standalone_gui_running = True
            elif '/Applications/Antigravity IDE.app' in exe or '/Applications/Antigravity IDE.app' in cmd:
                ide_all_pids.append(p)
                if '/Applications/Antigravity IDE.app/Contents/MacOS/Electron' in exe:
                    ide_gui_running = True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    restart_standalone = target_app in ("standalone", "both") and standalone_gui_running
    restart_ide = target_app in ("ide", "both") and ide_gui_running

    if restart_standalone:
        print(f"[RESTART] Antigravity Standalone aktif ({len(standalone_all_pids)} proses). Menghentikan...")
        for p in standalone_all_pids:
            try:
                p.terminate()
            except Exception:
                pass
        time.sleep(0.5)
        for p in standalone_all_pids:
            try:
                if p.is_running():
                    p.kill()
            except Exception:
                pass
    else:
        print("[RESTART] Antigravity Standalone tidak aktif. Token Keychain/DB diperbarui tanpa membuka jendela baru.")

    if restart_ide:
        print(f"[RESTART] Antigravity IDE aktif ({len(ide_all_pids)} proses). Menghentikan...")
        for p in ide_all_pids:
            try:
                p.terminate()
            except Exception:
                pass
        time.sleep(0.5)
        for p in ide_all_pids:
            try:
                if p.is_running():
                    p.kill()
            except Exception:
                pass
    else:
        print("[RESTART] Antigravity IDE tidak aktif. Database state diperbarui tanpa membuka jendela baru.")

    # Hanya jalankan peluncuran ulang jika aplikasi tersebut tadinya aktif
    if restart_standalone or restart_ide:
        time.sleep(1.0)

    if restart_standalone:
        print("[RESTART] Membuka kembali Antigravity Standalone dengan akun baru...")
        subprocess.run(['open', '-n', '-a', '/Applications/Antigravity.app'])

    if restart_ide:
        print("[RESTART] Membuka kembali Antigravity IDE dengan akun baru...")
        subprocess.run(['open', '-n', '-a', '/Applications/Antigravity IDE.app'])

def switch_account(target_account_id: str, restart_target: str = "both") -> bool:
    try:
        # 1. Update ~/.antigravity_cockpit/accounts.json
        acc_path = os.path.expanduser('~/.antigravity_cockpit/accounts.json')
        if os.path.exists(acc_path):
            with open(acc_path) as f:
                acc_cfg = json.load(f)
            acc_cfg['current_account_id'] = target_account_id
            with open(acc_path, 'w') as f:
                json.dump(acc_cfg, f, indent=2)
            print(f"[SWITCH] Updated accounts.json current_account_id to {target_account_id}")

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

        # 3. Notify Cockpit daemon via WebSocket (graceful)
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

                data = json.dumps({
                    'type': 'request.switch_account',
                    'payload': {
                        'request_id': f"web-sw-{int(time.time())}",
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
                    s.recv(2048)
                except Exception:
                    pass
                s.close()
            except Exception as e:
                pass

        # 4. Decrypt target account credentials
        payload = get_decrypted_account_payload(target_account_id)
        if not payload:
            print(f"[SWITCH ERROR] Could not decrypt payload for {target_account_id}")
            return False

        access_token = payload.get('token', {}).get('access_token', '')

        # 5. Sync state.vscdb for BOTH Antigravity Standalone and Antigravity IDE
        sync_antigravity_databases(target_account_id, access_token=access_token)

        # 6. Inject token into Keychain and Gemini configs
        ok = inject_account_to_keychain(payload)
        if not ok:
            return False

        # 7. Restart apps cleanly if requested
        if restart_target != "none":
            restart_antigravity_processes(target_app=restart_target)

        return True
    except Exception as e:
        print(f"[SWITCH ERROR] Exception during switch: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: switch_antigravity_account.py <target_account_id> [standalone|ide|both|none]")
        sys.exit(1)
    
    target_id = sys.argv[1].strip()
    restart_mode = sys.argv[2].strip() if len(sys.argv) > 2 else "both"
    success = switch_account(target_id, restart_target=restart_mode)
    sys.exit(0 if success else 1)
