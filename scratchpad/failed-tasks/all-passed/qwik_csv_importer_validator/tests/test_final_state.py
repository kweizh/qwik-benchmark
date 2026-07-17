import os
import sqlite3
import socket
import requests
import pytest
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
DB_PATH = os.path.join(PROJECT_DIR, "database.sqlite")
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session", autouse=True)
def clean_db():
    # Remove existing database to ensure clean state
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except OSError:
            pass
    yield

@pytest.fixture(scope="session", autouse=True)
def start_app(xprocess):
    """
    Starts the Qwik app using xprocess. Confirms readiness via port check.
    """
    class Starter(ProcessStarter):
        name = "qwik_app"
        args = ["npm", "run", "dev", "--", "--host", HOST, "--port", str(PORT)]
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
                resp = requests.get(f"{BASE_URL}/users", timeout=5)
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
            print(f"=== [{tag}] Captured {Starter.name} logfile ===")
            print("".join(new_lines))
            print("==================================================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def test_get_users_initially_empty():
    """Verify that GET /users is initially empty."""
    resp = requests.get(f"{BASE_URL}/users")
    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}"
    data = resp.json()
    assert data == [], f"Expected empty list, got {data}"


def test_post_import_valid_csv():
    """Verify importing a valid CSV succeeds and inserts rows into SQLite."""
    csv_content = (
        "Name,Email,Age\n"
        "Alice,alice@example.com,25\n"
        "Bob,bob@example.com,30\n"
    )

    files = {"file": ("valid.csv", csv_content, "text/csv")}
    resp = requests.post(f"{BASE_URL}/import", files=files)
    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}"

    res_json = resp.json()
    assert res_json.get("success") is True, f"Expected success to be True, got {res_json}"
    assert res_json.get("imported") == 2, f"Expected imported to be 2, got {res_json}"
    assert res_json.get("errors") == [], f"Expected errors to be empty, got {res_json}"

    # Verify via GET /users
    users_resp = requests.get(f"{BASE_URL}/users")
    assert users_resp.status_code == 200
    users_data = users_resp.json()
    assert len(users_data) == 2, f"Expected 2 users in list, got {users_data}"

    alice = users_data[0]
    assert alice["name"] == "Alice"
    assert alice["email"] == "alice@example.com"
    assert alice["age"] == 25

    bob = users_data[1]
    assert bob["name"] == "Bob"
    assert bob["email"] == "bob@example.com"
    assert bob["age"] == 30

    # Verify SQLite database directly
    assert os.path.exists(DB_PATH), f"SQLite database file not found at {DB_PATH}"
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, age FROM users ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()

    assert len(rows) == 2
    assert rows[0] == (1, "Alice", "alice@example.com", 25)
    assert rows[1] == (2, "Bob", "bob@example.com", 30)


def test_post_import_invalid_csv_atomicity():
    """Verify that if any row fails validation, no rows are imported and the transaction is rolled back."""
    # Charlie email is empty -> "Invalid email format"
    # David age is -5 -> "Age must be an integer >= 0"
    # Eve email is invalid and age is non-integer -> both errors
    csv_content = (
        "Name,Email,Age\n"
        "Charlie,,15\n"
        "David,david@example.com,-5\n"
        "Eve,invalid-email,abc\n"
    )

    files = {"file": ("invalid.csv", csv_content, "text/csv")}
    resp = requests.post(f"{BASE_URL}/import", files=files)
    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}"

    res_json = resp.json()
    assert res_json.get("success") is False, f"Expected success to be False, got {res_json}"
    assert res_json.get("imported") == 0, f"Expected imported to be 0, got {res_json}"

    errors = res_json.get("errors", [])
    expected_errors = [
        {"row": 1, "errors": ["Invalid email format"]},
        {"row": 2, "errors": ["Age must be an integer >= 0"]},
        {"row": 3, "errors": ["Invalid email format", "Age must be an integer >= 0"]}
    ]
    assert errors == expected_errors, f"Expected errors {expected_errors}, got {errors}"

    # Verify database was NOT changed (contains only Alice and Bob)
    users_resp = requests.get(f"{BASE_URL}/users")
    assert users_resp.status_code == 200
    users_data = users_resp.json()
    assert len(users_data) == 2, f"Expected users count to remain 2, got {users_data}"

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    conn.close()
    assert count == 2, f"Expected SQLite count to remain 2, got {count}"


def test_post_import_empty_name():
    """Verify that empty/whitespace name fails validation and rolls back."""
    csv_content = (
        "Name,Email,Age\n"
        " ,valid@example.com,20\n"
    )

    files = {"file": ("empty_name.csv", csv_content, "text/csv")}
    resp = requests.post(f"{BASE_URL}/import", files=files)
    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}"

    res_json = resp.json()
    assert res_json.get("success") is False, f"Expected success to be False, got {res_json}"
    assert res_json.get("imported") == 0, f"Expected imported to be 0, got {res_json}"

    errors = res_json.get("errors", [])
    expected_errors = [
        {"row": 1, "errors": ["Name cannot be empty"]}
    ]
    assert errors == expected_errors, f"Expected errors {expected_errors}, got {errors}"

    # Verify database was NOT changed
    users_resp = requests.get(f"{BASE_URL}/users")
    assert users_resp.status_code == 200
    assert len(users_resp.json()) == 2
