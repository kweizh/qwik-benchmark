import os
import socket
import sqlite3
import time
import concurrent.futures
import requests
import pytest
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/qwik-app"
DB_PATH = os.path.join(PROJECT_DIR, "activity.db")
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik City application using xprocess.
    Confirms readiness via port and HTTP status checks.
    """
    class Starter(ProcessStarter):
        name = "qwik_app"
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 180
        terminate_on_interrupt = True

        def startup_check(self):
            # Check if port is open
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            # Confirm HTTP server is responding
            try:
                resp = requests.get(f"{BASE_URL}/public-page", timeout=5)
                return resp.status_code == 200
            except requests.RequestException:
                return False

    info = xprocess.getinfo(Starter.name)
    printed_log_lines = 0

    def capture_logs(tag):
        nonlocal printed_log_lines
        if os.path.exists(info.logpath):
            with open(info.logpath, "r") as f:
                all_lines = f.readlines()
            new_lines = all_lines[printed_log_lines:]
            printed_log_lines = len(all_lines)
            print(f"============================== [{tag}] Captured logs ==============================")
            print("".join(new_lines))
            print("====================================================================================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def get_db_connection():
    """Helper to connect to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def test_public_page_not_logged(start_app):
    """Verify that requests to /public-page are served but NOT logged to SQLite."""
    # Get initial count
    initial_count = 0
    if os.path.exists(DB_PATH):
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT COUNT(*) FROM ActivityLog")
            initial_count = cursor.fetchone()[0]
        except sqlite3.OperationalError:
            # Table might not exist yet if no logs have been written
            pass
        finally:
            conn.close()

    # Request the public page
    response = requests.get(f"{BASE_URL}/public-page")
    assert response.status_code == 200, "Failed to load /public-page"
    assert "Public Page" in response.text, "Response text does not contain 'Public Page'"

    # Verify no new logs were created for /public-page
    if os.path.exists(DB_PATH):
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT COUNT(*) FROM ActivityLog")
            final_count = cursor.fetchone()[0]
            assert final_count == initial_count, "Requests to /public-page should not be logged."
        except sqlite3.OperationalError:
            # If table still doesn't exist, that means nothing has been logged, which is correct
            pass
        finally:
            conn.close()


def test_api_ping_logged(start_app):
    """Verify that requests to /api/ping are logged with correct details."""
    response = requests.get(f"{BASE_URL}/api/ping")
    assert response.status_code == 200, "Failed to load /api/ping"
    assert response.json() == {"ping": "pong"}, f"Unexpected response from /api/ping: {response.text}"

    # Verify database log entry
    assert os.path.exists(DB_PATH), "Database file activity.db was not created."
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM ActivityLog ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        assert row is not None, "No log entry found in ActivityLog table."
        assert row["path"] == "/api/ping", f"Expected path '/api/ping', got '{row['path']}'"
        assert row["method"] == "GET", f"Expected method 'GET', got '{row['method']}'"
        assert row["ip"] in ("127.0.0.1", "::1", "localhost"), f"Unexpected IP: {row['ip']}"
        assert row["timestamp"] is not None, "Timestamp cannot be empty"
        # Validate ISO 8601 format roughly (should contain 'T' and 'Z' or offset)
        assert "T" in row["timestamp"], f"Timestamp '{row['timestamp']}' does not look like ISO 8601 format"
        assert isinstance(row["duration_ms"], int), "duration_ms must be an integer"
        assert row["duration_ms"] >= 0, "duration_ms cannot be negative"
    finally:
        conn.close()


def test_admin_dashboard_logged(start_app):
    """Verify that requests to /admin/dashboard are logged."""
    response = requests.get(f"{BASE_URL}/admin/dashboard")
    assert response.status_code == 200, "Failed to load /admin/dashboard"
    assert "Admin Dashboard" in response.text, "Response text does not contain 'Admin Dashboard'"

    # Verify database log entry
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM ActivityLog WHERE path = '/admin/dashboard' ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        assert row is not None, "Log entry for /admin/dashboard not found in database."
        assert row["method"] == "GET"
    finally:
        conn.close()


def test_api_slow_timing_accuracy(start_app):
    """Verify that the slow endpoint delays properly and the duration logged is accurate."""
    delay_ms = 350
    start_time = time.time()
    response = requests.get(f"{BASE_URL}/api/slow?delay={delay_ms}")
    end_time = time.time()

    assert response.status_code == 200, "Failed to load /api/slow"
    assert response.json() == {"delayed": true, "delay": delay_ms}, f"Unexpected response: {response.text}"

    actual_elapsed_ms = int((end_time - start_time) * 1000)
    assert actual_elapsed_ms >= delay_ms, f"Request completed in {actual_elapsed_ms}ms, which is faster than the requested delay of {delay_ms}ms"

    # Verify database log entry duration
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM ActivityLog WHERE path LIKE '/api/slow%' ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        assert row is not None, "Log entry for /api/slow not found in database."
        # The logged duration_ms should be at least delay_ms
        assert row["duration_ms"] >= delay_ms, f"Logged duration_ms ({row['duration_ms']}) is less than expected delay of {delay_ms}ms"
        # And it should be reasonably close to actual elapsed time
        assert row["duration_ms"] <= actual_elapsed_ms + 100, f"Logged duration_ms ({row['duration_ms']}) is significantly higher than actual elapsed time ({actual_elapsed_ms}ms)"
    finally:
        conn.close()


def test_admin_activity_json(start_app):
    """Verify the JSON representation of the activity page."""
    response = requests.get(f"{BASE_URL}/admin/activity?format=json")
    assert response.status_code == 200, "Failed to load /admin/activity?format=json"

    data = response.json()
    assert "total_requests" in data, "JSON response missing 'total_requests'"
    assert "average_duration_ms" in data, "JSON response missing 'average_duration_ms'"
    assert "logs" in data, "JSON response missing 'logs'"

    logs = data["logs"]
    assert isinstance(logs, list), "'logs' must be a list"
    assert len(logs) > 0, "'logs' list should not be empty"

    # Verify logs order (descending by timestamp)
    timestamps = [log["timestamp"] for log in logs]
    sorted_timestamps = sorted(timestamps, reverse=True)
    assert timestamps == sorted_timestamps, "Logs are not sorted descending by timestamp"

    # Verify metrics calculation
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*), AVG(duration_ms) FROM ActivityLog")
        db_count, db_avg = cursor.fetchone()
        assert data["total_requests"] == db_count, f"Expected total_requests {db_count}, got {data['total_requests']}"
        if db_count > 0:
            expected_avg = round(db_avg, 2)
            assert data["average_duration_ms"] == expected_avg, f"Expected average_duration_ms {expected_avg}, got {data['average_duration_ms']}"
        else:
            assert data["average_duration_ms"] == 0
    finally:
        conn.close()


def test_admin_activity_html(start_app, browser_verifier):
    """Verify the HTML elements on the admin activity page using the browser verifier."""
    reason = "The admin activity page must display total requests, average duration, and a list of logs with correct element IDs."
    truth = (
        f"Navigate to {BASE_URL}/admin/activity. "
        "Verify that an element with id='total-requests' is visible and contains an integer. "
        "Verify that an element with id='average-duration' is visible and contains a number. "
        "Verify that an element with id='logs-list' is visible."
    )

    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_admin_activity_html"
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"


def test_concurrency_robustness(start_app):
    """Verify that the middleware handles concurrent requests gracefully without database locked errors."""
    # Get initial count
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM ActivityLog")
        initial_count = cursor.fetchone()[0]
    finally:
        conn.close()

    num_requests = 20
    urls = [f"{BASE_URL}/api/ping" for _ in range(num_requests)]

    def make_request(url):
        try:
            resp = requests.get(url, timeout=10)
            return resp.status_code
        except Exception as e:
            return str(e)

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(make_request, urls))

    # Assert all requests completed with status 200
    assert results == [200] * num_requests, f"Some concurrent requests failed: {results}"

    # Verify that exactly num_requests new entries were logged
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM ActivityLog")
        final_count = cursor.fetchone()[0]
        assert final_count == initial_count + num_requests, \
            f"Expected {initial_count + num_requests} logs, but got {final_count}. Some logs were lost."
    finally:
        conn.close()
