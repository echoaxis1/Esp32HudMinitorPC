#!/usr/bin/env python3
"""
Antigravity CLI (agy) to ESP32 Desk Companion Bridge
Reads active conversation transcripts in real-time, monitors webcam for human motion & face tracking,
and streams state telemetry to ESP32 via USB Serial.
"""

import os
import sys
import glob
import json
import time
import threading
import serial
import serial.tools.list_ports

import io
import wave
import subprocess
import sounddevice as sd
import speech_recognition as sr

try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False

BRAIN_DIR = os.path.expanduser("~/.gemini/antigravity-cli/brain")

g_current_state = "standby"
g_running = True
g_ser_lock = threading.Lock()
g_is_recording = False

def speak_text(text):
    """Voice output via macOS Damayanti TTS engine."""
    clean = text.replace('"', '').replace("'", "").strip()
    if not clean:
        return
    # Limit speech length for natural voice feedback
    if len(clean) > 200:
        clean = clean[:195] + "..."
    subprocess.Popen(["say", "-v", "Damayanti", "-r", "190", clean])

def handle_touch_listen(ser):
    """Record audio when user taps the screen, transcribe, copy to clipboard, and display."""
    global g_is_recording, g_current_state
    if g_is_recording:
        return
    g_is_recording = True

    try:
        # 1. Play listening ping chime
        subprocess.Popen(["afplay", "/System/Library/Sounds/Ping.aiff"])
        send_telemetry(ser, "lookup", "mic", "Mendengarkan suara... Silakan bicara.", 0)
        g_current_state = "lookup"

        # 2. Record 4 seconds of audio via sounddevice (16000Hz, mono, int16)
        fs = 16000
        duration = 4.0
        recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='int16')
        sd.wait()

        # 3. Convert raw PCM buffer into in-memory WAV for SpeechRecognition
        wav_io = io.BytesIO()
        with wave.open(wav_io, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(fs)
            wf.writeframes(recording.tobytes())
        wav_io.seek(0)

        # 4. Transcribe using Google Speech Recognition in Bahasa Indonesia
        r = sr.Recognizer()
        with sr.AudioFile(wav_io) as source:
            audio = r.record(source)

        try:
            recognized_text = r.recognize_google(audio, language="id-ID").strip()
            print(f"[VOICE INPUT] Recognized: '{recognized_text}'")

            # 5. Copy recognized prompt to macOS clipboard
            p = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE)
            p.communicate(recognized_text.encode("utf-8"))

            # 6. Play confirmation chime
            subprocess.Popen(["afplay", "/System/Library/Sounds/Tink.aiff"])

            # 7. Update display subtitle & terminal notice
            send_telemetry(ser, "lookup", "suara", f'"{recognized_text}"', 0)
            print(f"[VOICE READY] Auto-submitting prompt to terminal: {recognized_text}")

            # 8. Otomatis kirim teks ke terminal Ghostty dan tekan ENTER!
            osa_script = '''
            tell application "Ghostty" to activate
            delay 0.2
            tell application "System Events"
                keystroke "v" using command down
                delay 0.15
                key code 36 -- Enter
            end tell
            '''
            subprocess.Popen(["osascript", "-e", osa_script])

        except sr.UnknownValueError:
            print("[VOICE INPUT] Suara tidak terdengar jelas.")
            send_telemetry(ser, "error", "suara", "Suara tidak terdengar jelas.", 0)
            speak_text("Maaf, suara belum terdengar jelas.")
        except sr.RequestError as e:
            print(f"[VOICE INPUT] Speech API error: {e}")
            send_telemetry(ser, "error", "api", "Gagal menghubungi speech server.", 0)

    except Exception as ex:
        print(f"[VOICE ERROR] {ex}")
    finally:
        g_is_recording = False

def find_esp32_port():
    """Detect Waveshare ESP32-S3 USB CDC port."""
    ports = serial.tools.list_ports.comports()
    for port in ports:
        dev = port.device.lower()
        desc = (port.description or "").lower()
        if "usbmodem" in dev or "usbserial" in dev or "espressif" in desc:
            return port.device
    return None

def find_latest_transcript():
    """Locate the most recently updated transcript.jsonl."""
    if not os.path.exists(BRAIN_DIR):
        return None
    patterns = os.path.join(BRAIN_DIR, "*", ".system_generated", "logs", "transcript.jsonl")
    transcripts = glob.glob(patterns)
    if not transcripts:
        return None
    transcripts.sort(key=os.path.getmtime, reverse=True)
    return transcripts[0]

def send_telemetry(ser, state, tool="", action="", step=0):
    payload = {
        "state": state,
        "tool": tool,
        "action": action[:130],
        "step": step
    }
    line = json.dumps(payload) + "\n"
    with g_ser_lock:
        try:
            ser.write(line.encode("utf-8"))
            ser.flush()
            if state != "gaze":
                print(f"[TELEMETRY] {payload}")
        except Exception as e:
            print(f"[ERROR] Send error: {e}")

def transcript_monitor_loop(ser):
    """Background thread watching agy transcript file changes."""
    global g_current_state, g_running

    current_file = None
    file_handle = None
    last_pos = 0
    last_active_time = time.time()

    while g_running:
        latest = find_latest_transcript()
        if latest != current_file:
            if file_handle:
                file_handle.close()
            current_file = latest
            if current_file:
                print(f"[MONITOR] Sesi aktif ditemukan: {os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))}")
                file_handle = open(current_file, "r", encoding="utf-8")
                file_handle.seek(0, os.SEEK_END)
                last_pos = file_handle.tell()

        if file_handle:
            file_handle.seek(last_pos)
            lines = file_handle.readlines()
            last_pos = file_handle.tell()

            for line in lines:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    step_index = data.get("step_index", 0)
                    tool_calls = data.get("tool_calls", [])
                    msg_type = data.get("type", "")
                    content = data.get("content", "")

                    if tool_calls:
                        first_tool = tool_calls[0]
                        tool_name = first_tool.get("toolSummary", first_tool.get("name", "tool"))
                        tool_action = first_tool.get("toolAction", "Executing tool")
                        send_telemetry(ser, "executing", tool_name, tool_action, step_index)
                        g_current_state = "executing"
                        last_active_time = time.time()
                    elif content and not tool_calls and msg_type == "PLANNER_RESPONSE":
                        # Bersihkan format markdown dan ambil intisari jawaban
                        clean_answer = content.replace("\n", " ").replace("#", "").replace("*", "").replace("`", "").strip()
                        speak_text(clean_answer)
                        if len(clean_answer) > 115:
                            clean_answer = clean_answer[:112] + "..."
                        send_telemetry(ser, "success", "completed", clean_answer, step_index)
                        g_current_state = "success"
                        last_active_time = time.time()
                    elif data.get("thinking"):
                        send_telemetry(ser, "thinking", "reasoning", "Analyzing code & planning...", step_index)
                        g_current_state = "thinking"
                        last_active_time = time.time()
                    elif msg_type == "USER_INPUT":
                        user_text = content
                        if "<USER_REQUEST>" in user_text:
                            try:
                                user_text = user_text.split("<USER_REQUEST>")[1].split("</USER_REQUEST>")[0]
                            except IndexError:
                                pass
                        user_text = user_text.strip().replace("\n", " ")
                        send_telemetry(ser, "lookup", "user_prompt", f'"{user_text}"', step_index)
                        g_current_state = "lookup"
                        last_active_time = time.time()
                except json.JSONDecodeError:
                    pass

        # Auto-idle back to standby 3.5 detik setelah tugas selesai
        if g_current_state in ["success", "executing", "thinking", "lookup"] and (time.time() - last_active_time > 3.5):
            send_telemetry(ser, "standby", "idle", "Standby Ready", 0)
            g_current_state = "standby"

        time.sleep(0.25)

def run_main_loop(ser):
    """Main thread loop handling OpenCV motion & face tracking on macOS main run loop."""
    global g_current_state, g_running

    t_thread = threading.Thread(target=transcript_monitor_loop, args=(ser,), daemon=True)
    t_thread.start()

    cap = None
    face_cascade = None

    if OPENCV_AVAILABLE and "--no-webcam" not in sys.argv:
        try:
            cap = cv2.VideoCapture(0)
            if cap.isOpened():
                face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                print("[WEBCAM] Kamera aktif (LED hijau menyala). Pelacakan gerakan & wajah aktif.")
            else:
                print("[WEBCAM] Kamera tidak dapat dibuka. Melanjutkan mode telemetri biasa.")
                cap = None
        except Exception as e:
            print(f"[WEBCAM] Inisialisasi gagal: {e}")
            cap = None

    prev_gray = None
    last_gaze_sent = 0
    last_move_time = time.time()
    gaze_coords = [0.0, 0.0]
    serial_buf = ""

    try:
        while g_running:
            # Read incoming serial data from ESP32 for touch events
            with g_ser_lock:
                if ser.in_waiting > 0:
                    incoming = ser.read(ser.in_waiting).decode("utf-8", errors="ignore")
                    serial_buf += incoming

            if "\n" in serial_buf:
                lines = serial_buf.split("\n")
                serial_buf = lines[-1]
                for raw_line in lines[:-1]:
                    raw_line = raw_line.strip()
                    if not raw_line:
                        continue
                    if "touch_listen" in raw_line:
                        threading.Thread(target=handle_touch_listen, args=(ser,), daemon=True).start()

            if cap and g_current_state == "standby":
                ret, frame = cap.read()
                if ret:
                    # Mirror frame horizontally so user movement aligns with eye direction
                    frame = cv2.flip(frame, 1)
                    small = cv2.resize(frame, (160, 120))
                    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
                    blur = cv2.GaussianBlur(gray, (15, 15), 0)

                    detected = False

                    # 1. Optical Motion Detection (Sangat responsif terhadap gerak kepala/tangan)
                    if prev_gray is not None:
                        diff = cv2.absdiff(prev_gray, blur)
                        _, thresh = cv2.threshold(diff, 16, 255, cv2.THRESH_BINARY)
                        M = cv2.moments(thresh)
                        if M['m00'] > 1500: # Ada pergerakan terlihat
                            cx = M['m10'] / M['m00']
                            cy = M['m01'] / M['m00']
                            # Map normalized to -1.0 .. 1.0 with responsive gain
                            norm_x = (cx / 160.0 - 0.5) * 2.5
                            norm_y = (cy / 120.0 - 0.5) * 2.5
                            gaze_coords[0] = max(-1.0, min(1.0, norm_x))
                            gaze_coords[1] = max(-1.0, min(1.0, norm_y))
                            detected = True
                            last_move_time = time.time()

                    prev_gray = blur

                    # 2. Jika tidak ada gerakan cepat, gunakan deteksi wajah sebagai patokan diam
                    if not detected and face_cascade is not None:
                        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.15, minNeighbors=3, minSize=(24, 24))
                        if len(faces) > 0:
                            fx, fy, fw, fh = faces[0]
                            cx = (fx + fw / 2.0) / 160.0
                            cy = (fy + fh / 2.0) / 120.0
                            gaze_coords[0] = max(-1.0, min(1.0, (cx - 0.5) * 2.2))
                            gaze_coords[1] = max(-1.0, min(1.0, (cy - 0.5) * 2.2))
                            detected = True
                            last_move_time = time.time()

                    # 3. Jika tidak ada orang/gerak >2 detik, tatap lurus tengah
                    if not detected and (time.time() - last_move_time > 2.0):
                        gaze_coords[0] = 0.0
                        gaze_coords[1] = 0.0

                    # Kirim koordinat mata ke ESP32 setiap ~70ms (~14 FPS)
                    now = time.time()
                    if now - last_gaze_sent > 0.07:
                        last_gaze_sent = now
                        gaze_payload = {
                            "state": "gaze",
                            "x": round(gaze_coords[0], 2),
                            "y": round(gaze_coords[1], 2)
                        }
                        line = json.dumps(gaze_payload) + "\n"
                        with g_ser_lock:
                            try:
                                ser.write(line.encode("utf-8"))
                                ser.flush()
                            except Exception:
                                pass

                time.sleep(0.02)
            else:
                prev_gray = None
                time.sleep(0.1)
    finally:
        if cap:
            cap.release()

def run_test_mode(ser):
    print("\n--- TEST MODE ---")
    print("Tekan tombol angka untuk mengirim ekspresi:")
    print("1: STANDBY (Kedip normal)")
    print("2: REASONING (Mata fokus + radar scanner)")
    print("3: TOOL EXECUTION (Laser focus + status run_command)")
    print("4: SUCCESS (Mata gembira)")
    print("5: ERROR (Glitch crimson)")
    print("6: LOOK UP (Mata mendongak melihat ketikan user)")
    print("Ctrl+C untuk keluar.\n")

    while True:
        choice = input("Pilih ekspresi (1-6): ").strip()
        if choice == "1":
            send_telemetry(ser, "standby", "idle", "Standby Ready", 0)
        elif choice == "2":
            send_telemetry(ser, "thinking", "reasoning", "Deep thinking in progress...", 1)
        elif choice == "3":
            send_telemetry(ser, "executing", "run_command", "npm run build --prod", 2)
        elif choice == "4":
            send_telemetry(ser, "success", "complete", "Task completed smoothly!", 3)
        elif choice == "5":
            send_telemetry(ser, "error", "failed", "Compilation error code 1", 4)
        elif choice == "6":
            send_telemetry(ser, "lookup", "prompt", "\"Watching user typing...\"", 5)

def main():
    while True:
        port = find_esp32_port()
        if not port:
            print("[WAITING] Menunggu ESP32 terhubung ke port USB...")
            time.sleep(2)
            continue

        print(f"[CONNECTED] ESP32 terdeteksi di: {port}")
        try:
            ser = serial.Serial(port, 115200, timeout=1)
            ser.dtr = True
            ser.rts = True
            time.sleep(1)

            send_telemetry(ser, "standby", "idle", "AGY Companion Online", 0)

            if "--test" in sys.argv:
                run_test_mode(ser)
            else:
                run_main_loop(ser)
        except serial.SerialException as e:
            print(f"[DISCONNECTED] Koneksi serial terputus: {e}")
            time.sleep(2)
        except KeyboardInterrupt:
            print("\nKeluar dari AGY Companion Bridge.")
            break

if __name__ == "__main__":
    main()
