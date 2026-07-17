import pytest
import subprocess
import os
import socket
import requests
import sqlite3
import threading
import time
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"
DB_PATH = os.path.join(PROJECT_DIR, "chat.db")

@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik app using xprocess. Confirms readiness via port check.
    """
    class Starter(ProcessStarter):
        name = "start_app"
        # Start Qwik in dev mode, forcing IPv4 binding
        args = ["npm", "run", "dev", "--", "--host", HOST, "--port", str(PORT)]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 180
        terminate_on_interrupt = True

        def startup_check(self):
            """
            Custom check: returns True if port is accepting connections and responding.
            """
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            try:
                # Qwik dev server might return 200 or 404 for root, let's accept any non-5xx
                resp = requests.get(BASE_URL, timeout=5)
                return resp.status_code < 500
            except requests.RequestException:
                return False

    info = xprocess.getinfo(Starter.name)
    printed_log_lines = 0

    def capture_logs(tag):
        nonlocal printed_log_lines
        if not os.path.exists(info.logpath):
            return
        with open(info.logpath, "r") as f:
            all_lines = f.readlines()
        new_lines = all_lines[printed_log_lines:]
        skipped = printed_log_lines
        printed_log_lines = len(all_lines)
        print(f"============================== [{tag}: Begin] Captured {Starter.name} logfile ==============================")
        if skipped > 0:
            print(f"(skipped {skipped} already-printed lines)")
        print("".join(new_lines))
        print(f"============================== [{tag}: End  ] Captured {Starter.name} logfile ==============================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def test_database_schema(start_app):
    """Verify that the SQLite database exists and has the correct schema."""
    assert os.path.isfile(DB_PATH), f"Database file not found at {DB_PATH}"

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("PRAGMA table_info(messages)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}

        required_columns = {
            "id": "INTEGER",
            "user": "TEXT",
            "text": "TEXT",
            "timestamp": "TEXT"
        }

        for col_name, col_type in required_columns.items():
            assert col_name in columns, f"Column '{col_name}' is missing from 'messages' table."
            assert col_type in columns[col_name].upper(), f"Column '{col_name}' has incorrect type. Expected {col_type}, got {columns[col_name]}."
    finally:
        conn.close()


def test_post_message_and_validation(start_app):
    """Verify posting messages and input validation."""
    api_url = f"{BASE_URL}/api/messages"

    # 1. Test POST with missing/invalid payload
    bad_payloads = [
        {},
        {"user": ""},
        {"text": ""},
        {"user": "Alice"},
        {"text": "Hello"},
        {"user": "Alice", "text": ""},
        {"user": "", "text": "Hello"},
        {"user": 123, "text": "Hello"},
        {"user": "Alice", "text": 456}
    ]
    for idx, payload in enumerate(bad_payloads):
        resp = requests.post(api_url, json=payload)
        assert resp.status_code == 400, f"Expected 400 Bad Request for payload {idx}: {payload}, got {resp.status_code}"

    # 2. Test POST with valid payload
    payload = {"user": "Alice", "text": "Hello World!"}
    resp = requests.post(api_url, json=payload)
    assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}"

    data = resp.json()
    assert "id" in data, "Response JSON is missing 'id'"
    assert data["user"] == "Alice", f"Expected 'user' to be 'Alice', got {data.get('user')}"
    assert data["text"] == "Hello World!", f"Expected 'text' to be 'Hello World!', got {data.get('text')}"
    assert "timestamp" in data, "Response JSON is missing 'timestamp'"

    # 3. Verify persistence in SQLite
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user, text, timestamp FROM messages WHERE id = ?", (data["id"],))
        row = cursor.fetchone()
        assert row is not None, f"Message with id {data['id']} was not found in the database."
        assert row[0] == "Alice", f"Database user expected 'Alice', got {row[0]}"
        assert row[1] == "Hello World!", f"Database text expected 'Hello World!', got {row[1]}"
        assert row[2] == data["timestamp"], f"Database timestamp {row[2]} does not match response timestamp {data['timestamp']}"
    finally:
        conn.close()


def test_sse_headers_and_initial_stream(start_app):
    """Verify that GET /api/messages returns the correct SSE headers and initial stream of messages."""
    api_url = f"{BASE_URL}/api/messages"

    # Clean up and seed database with a known message to ensure deterministic initial stream
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM messages")
        cursor.execute("INSERT INTO messages (user, text, timestamp) VALUES (?, ?, ?)",
                       ("SeedUser", "SeedText", "2026-08-01T12:00:00.000Z"))
        conn.commit()
    finally:
        conn.close()

    resp = requests.get(api_url, stream=True, timeout=5)

    # Verify SSE headers
    assert resp.headers.get("Content-Type") == "text/event-stream", \
        f"Incorrect Content-Type header: {resp.headers.get('Content-Type')}"
    assert resp.headers.get("Cache-Control") == "no-cache", \
        f"Incorrect Cache-Control header: {resp.headers.get('Cache-Control')}"
    assert resp.headers.get("Connection") == "keep-alive", \
        f"Incorrect Connection header: {resp.headers.get('Connection')}"

    # Read the stream lines to check the seeded message
    lines = []
    for line in resp.iter_lines():
        if line:
            lines.append(line.decode("utf-8"))
        if len(lines) >= 2:  # data line and empty line separator
            break

    assert len(lines) >= 1, "No data received from SSE stream."
    data_line = lines[0]
    assert data_line.startswith("data:"), f"Expected line to start with 'data:', got {data_line}"

    event_data = data_line[5:].strip()
    import json
    parsed = json.loads(event_data)
    assert parsed["user"] == "SeedUser", f"Expected user 'SeedUser', got {parsed.get('user')}"
    assert parsed["text"] == "SeedText", f"Expected text 'SeedText', got {parsed.get('text')}"


def test_sse_realtime_broadcast(start_app):
    """Verify that posting a message broadcasts it to all active SSE connections in real-time."""
    api_url = f"{BASE_URL}/api/messages"
    received_events = []
    connection_established = threading.Event()

    def listen_sse():
        try:
            r = requests.get(api_url, stream=True, timeout=10)
            connection_established.set()
            for line in r.iter_lines():
                if line:
                    line_str = line.decode("utf-8")
                    if line_str.startswith("data:"):
                        received_events.append(line_str)
        except Exception:
            pass

    t = threading.Thread(target=listen_sse)
    t.daemon = True
    t.start()

    # Wait for listener thread to start and connect
    assert connection_established.wait(timeout=5), "SSE client failed to connect within timeout."
    time.sleep(1)  # Allow connection to fully settle

    # POST a new message to trigger broadcast
    broadcast_payload = {"user": "Broadcaster", "text": "Live Stream Message"}
    post_resp = requests.post(api_url, json=broadcast_payload)
    assert post_resp.status_code == 201

    # Wait for broadcast to be received
    time.sleep(1.5)

    # Verify that the message was received in real-time
    found_broadcast = False
    import json
    for event in received_events:
        try:
            data = json.loads(event[5:].strip())
            if data.get("user") == "Broadcaster" and data.get("text") == "Live Stream Message":
                found_broadcast = True
                break
        except Exception:
            continue

    assert found_broadcast, f"Broadcast message not received in SSE stream. Received events: {received_events}"


def test_chat_page_html_structure(start_app):
    """Verify that the /chat page exists and contains the required DOM elements."""
    chat_url = f"{BASE_URL}/chat"
    resp = requests.get(chat_url)
    assert resp.status_code == 200, f"Expected 200 OK for /chat, got {resp.status_code}"

    html = resp.text

    # Verify required elements are present in the HTML response
    assert 'data-testid="user-input"' in html or 'id="user-input"' in html, \
        "Missing user input field with data-testid='user-input' or id='user-input'"
    assert 'data-testid="text-input"' in html or 'id="text-input"' in html, \
        "Missing message text input field with data-testid='text-input' or id='text-input'"
    assert 'data-testid="send-button"' in html or 'id="send-button"' in html, \
        "Missing send button with data-testid='send-button' or id='send-button'"
    assert 'data-testid="message-list"' in html or 'id="message-list"' in html, \
        "Missing message list container with data-testid='message-list' or id='message-list'"


def test_chat_page_browser_interaction(start_app, browser_verifier):
    """Verify the live interactive chat flow using the browser verifier."""
    reason = "The /chat page must connect to the SSE endpoint and support real-time message posting and list updating."
    truth = (
        f"Navigate to {BASE_URL}/chat. Verify that the input fields and send button are visible. "
        "Type 'Charlie' into the user input field (data-testid='user-input' or id='user-input'). "
        "Type 'Hello from Charlie' into the message text input field (data-testid='text-input' or id='text-input'). "
        "Click the send button (data-testid='send-button' or id='send-button'). "
        "Verify that a message item containing 'Charlie' and 'Hello from Charlie' is appended to the message list (data-testid='message-list' or id='message-list') "
        "and that the message input field is cleared."
    )

    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_chat_page_browser_interaction"
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"
