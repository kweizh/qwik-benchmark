import os
import socket
import time
import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik City app using xprocess. Confirms readiness via port check.
    """
    class Starter(ProcessStarter):
        name = "start_qwik_app"
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 180
        terminate_on_interrupt = True

        def startup_check(self):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            try:
                # Try to hit the api/data endpoint or base URL to verify it's responding
                resp = requests.get(f"{BASE_URL}/api/data", timeout=5)
                # Accept any response (even 404 or 429 or 200) as long as the server responded
                return True
            except requests.RequestException:
                return False

    info = xprocess.getinfo(Starter.name)
    printed_log_lines = 0

    def capture_logs(tag):
        nonlocal printed_log_lines
        with open(info.logpath, "r") as f:
            all_lines = f.readlines()
        new_lines = all_lines[printed_log_lines:]
        printed_log_lines = len(all_lines)
        print(f"============================== [{tag}: Begin] Captured {Starter.name} logfile ==============================")
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


def test_rate_limiting_and_headers(start_app):
    # To avoid boundary issues, if we are extremely close to the end of a 10s window (e.g. within 1.5 seconds),
    # sleep until the next window starts so our test runs fully inside a single window.
    now = time.time()
    time_in_window = now % 10
    if time_in_window > 8.5:
        sleep_time = 10.5 - time_in_window
        print(f"Close to window boundary ({time_in_window:.2f}s). Sleeping for {sleep_time:.2f}s to align window.")
        time.sleep(sleep_time)

    # 1. Send first request
    url = f"{BASE_URL}/api/data"
    resp = requests.get(url)
    assert resp.status_code == 200, f"Expected 200 OK on first request, got {resp.status_code}"
    assert resp.json() == {"data": "Success"}, f"Expected body to be {{'data': 'Success'}}, got {resp.json()}"

    # Assert headers
    headers = resp.headers
    assert "X-RateLimit-Limit" in headers, "Missing X-RateLimit-Limit header"
    assert "X-RateLimit-Remaining" in headers, "Missing X-RateLimit-Remaining header"
    assert "X-RateLimit-Reset" in headers, "Missing X-RateLimit-Reset header"

    assert headers["X-RateLimit-Limit"] == "5", f"Expected X-RateLimit-Limit to be 5, got {headers['X-RateLimit-Limit']}"
    assert headers["X-RateLimit-Remaining"] == "4", f"Expected X-RateLimit-Remaining to be 4 on first request, got {headers['X-RateLimit-Remaining']}"

    # Reset timestamp check
    reset_ts = int(headers["X-RateLimit-Reset"])
    expected_reset = (int(time.time()) // 10 + 1) * 10
    assert abs(reset_ts - expected_reset) <= 10, f"X-RateLimit-Reset {reset_ts} is not close to expected reset {expected_reset}"

    # 2. Send 4 more requests (should succeed)
    for i in range(4):
        resp = requests.get(url)
        assert resp.status_code == 200, f"Expected 200 OK on request {i+2}, got {resp.status_code}"
        expected_remaining = str(3 - i)
        assert resp.headers.get("X-RateLimit-Remaining") == expected_remaining, \
            f"Expected remaining to be {expected_remaining}, got {resp.headers.get('X-RateLimit-Remaining')}"

    # 3. 6th request (should be rate limited)
    resp = requests.get(url)
    assert resp.status_code == 429, f"Expected 429 Too Many Requests on 6th request, got {resp.status_code}"
    assert resp.json() == {"error": "Too Many Requests"}, f"Expected body to be {{'error': 'Too Many Requests'}}, got {resp.json()}"
    assert resp.headers.get("X-RateLimit-Remaining") == "0", "Expected remaining to be 0 on rate-limited request"
    assert resp.headers.get("X-RateLimit-Limit") == "5"


def test_debug_store_endpoint(start_app):
    # Retrieve current window ID
    window_id = int(time.time()) // 10
    debug_url = f"{BASE_URL}/api/debug-store"

    resp = requests.get(debug_url)
    assert resp.status_code == 200, f"Expected 200 OK from debug store, got {resp.status_code}"

    data = resp.json()
    assert "keys" in data, f"Response JSON missing 'keys' field: {data}"

    keys = data["keys"]
    expected_key = f"ratelimit:127.0.0.1:{window_id}"
    assert expected_key in keys, f"Expected key {expected_key} not found in debug store keys: {keys}"
    assert keys[expected_key] == 6, f"Expected count for 127.0.0.1 to be 6, got {keys[expected_key]}"


def test_ip_detection_via_x_forwarded_for(start_app):
    window_id = int(time.time()) // 10
    url = f"{BASE_URL}/api/data"
    debug_url = f"{BASE_URL}/api/debug-store"

    # Request from custom IP
    custom_ip = "203.0.113.195"
    resp = requests.get(url, headers={"X-Forwarded-For": custom_ip})
    assert resp.status_code == 200, f"Expected 200 OK for custom IP, got {resp.status_code}"
    assert resp.headers.get("X-RateLimit-Remaining") == "4"

    # Query debug store to verify custom IP is tracked
    resp = requests.get(debug_url)
    assert resp.status_code == 200
    keys = resp.json()["keys"]
    expected_key = f"ratelimit:{custom_ip}:{window_id}"
    assert expected_key in keys, f"Expected custom IP key {expected_key} not found in keys: {keys}"
    assert keys[expected_key] == 1, f"Expected count for custom IP to be 1, got {keys[expected_key]}"


def test_window_reset_and_cleanup(start_app):
    # Wait for the next window
    now = time.time()
    time_left = 10 - (now % 10)
    sleep_time = time_left + 0.5
    print(f"Sleeping for {sleep_time:.2f}s to wait for rate limit reset...")
    time.sleep(sleep_time)

    # Request in the new window
    url = f"{BASE_URL}/api/data"
    resp = requests.get(url)
    assert resp.status_code == 200, f"Expected 200 OK in new window, got {resp.status_code}"
    assert resp.headers.get("X-RateLimit-Remaining") == "4", "Expected remaining to reset to 4 in new window"

    # Verify cleanup of old keys in debug store
    debug_url = f"{BASE_URL}/api/debug-store"
    resp = requests.get(debug_url)
    assert resp.status_code == 200
    keys = resp.json()["keys"]

    # The active key should be present
    new_window_id = int(time.time()) // 10
    active_key = f"ratelimit:127.0.0.1:{new_window_id}"
    assert active_key in keys, f"Expected active key {active_key} to be present"

    # The old keys should be cleaned up (no longer in keys)
    old_window_id = new_window_id - 1
    old_key = f"ratelimit:127.0.0.1:{old_window_id}"
    assert old_key not in keys, f"Expected old key {old_key} to be cleaned up from debug store: {keys}"
