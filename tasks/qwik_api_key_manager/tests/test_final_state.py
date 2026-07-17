import os
import sqlite3
import hashlib
import socket
import requests
import pytest
import concurrent.futures
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/qwik-app"
DB_PATH = os.path.join(PROJECT_DIR, "db.sqlite")
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik app using xprocess. Confirms readiness via port check.
    """
    class Starter(ProcessStarter):
        name = "qwik_app"
        # Since Vite/Qwik City is used, we run `npm run dev` and pass host/port if needed,
        # or rely on the dev server config. To be safe, we run the start command specified.
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
                # Qwik might return 200 or 404 depending on index route, but as long as it responds, the server is up.
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


def test_sqlite_database_exists():
    """Verify that the SQLite database file exists."""
    assert os.path.isfile(DB_PATH), f"Database file not found at {DB_PATH}"


def test_sqlite_table_schema():
    """Verify that the api_keys table has the exact schema required."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='api_keys';")
    table = cursor.fetchone()
    assert table is not None, "Table 'api_keys' does not exist in the database"

    # Check columns
    cursor.execute("PRAGMA table_info(api_keys);")
    columns = {col[1]: col[2].upper() for col in cursor.fetchall()}

    required_columns = {
        "id": "INTEGER",
        "name": "TEXT",
        "key_prefix": "TEXT",
        "hashed_key": "TEXT",
        "status": "TEXT",
        "created_at": "TEXT"
    }

    for col_name, col_type in required_columns.items():
        assert col_name in columns, f"Column '{col_name}' is missing from 'api_keys' table"
        assert required_columns[col_name] in columns[col_name], f"Column '{col_name}' has incorrect type. Expected {col_type}, got {columns[col_name]}"

    conn.close()


def test_api_key_lifecycle_and_security(start_app):
    """
    Test the complete lifecycle of API keys:
    1. Generate API Key via REST API
    2. Verify Security (No Plain Text in DB, Hash matches SHA-256)
    3. Authenticate with Valid Key
    4. Reject Unauthorized Requests (Missing, Invalid, Revoked)
    5. List Keys (Ensure plain text/hash is not exposed)
    6. Revoke Key
    7. Authenticate with Revoked Key (Should fail)
    """
    # 1. Generate API Key
    payload = {"name": "Production Key"}
    resp = requests.post(f"{BASE_URL}/api/v1/developer/keys", json=payload)
    assert resp.status_code == 201, f"Failed to generate key: {resp.text}"

    data = resp.json()
    assert "id" in data, "Response is missing 'id'"
    assert data["name"] == "Production Key", f"Expected name 'Production Key', got {data.get('name')}"
    assert "prefix" in data, "Response is missing 'prefix'"
    assert "key" in data, "Response is missing plain text 'key'"
    assert "status" in data, "Response is missing 'status'"
    assert "created_at" in data, "Response is missing 'created_at'"

    key_id = data["id"]
    plain_key = data["key"]
    prefix = data["prefix"]

    assert len(prefix) == 7, f"Expected prefix length of 7, got {len(prefix)}"
    assert prefix.startswith("qk_"), f"Prefix must start with 'qk_', got {prefix}"
    assert len(plain_key) == 35, f"Expected full key length of 35, got {len(plain_key)}"
    assert plain_key.startswith(prefix), f"Full key {plain_key} should start with prefix {prefix}"
    assert data["status"] == "active", f"Expected status 'active', got {data['status']}"

    # 2. Verify Security (Direct SQLite check)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM api_keys WHERE id = ?;", (key_id,))
    row = cursor.fetchone()
    assert row is not None, f"No database record found for key ID {key_id}"

    # Map row values by column name
    cursor.execute("PRAGMA table_info(api_keys);")
    col_names = [col[1] for col in cursor.fetchall()]
    row_dict = dict(zip(col_names, row))

    # Ensure plain text key is NOT stored anywhere in the row
    for col_name, value in row_dict.items():
        if col_name != "id" and isinstance(value, str):
            assert plain_key not in value, f"Security violation: Plain text key found in column '{col_name}'!"

    # Verify the hash matches SHA-256
    expected_hash = hashlib.sha256(plain_key.encode("utf-8")).hexdigest()
    assert row_dict["hashed_key"] == expected_hash, f"Hashed key in DB ({row_dict['hashed_key']}) does not match expected SHA-256 hash ({expected_hash})"
    assert row_dict["key_prefix"] == prefix, f"Expected prefix {prefix} in DB, got {row_dict['key_prefix']}"
    conn.close()

    # 3. Authenticate with Valid Key
    headers = {"X-API-Key": plain_key}
    resp = requests.get(f"{BASE_URL}/api/v1/hello", headers=headers)
    assert resp.status_code == 200, f"Failed to authenticate with valid key: {resp.text}"
    assert resp.json() == {"message": "Hello, authenticated developer!"}

    # 4. Reject Unauthorized Requests
    # Missing header
    resp = requests.get(f"{BASE_URL}/api/v1/hello")
    assert resp.status_code == 401, f"Expected 401 for missing header, got {resp.status_code}"
    assert resp.json() == {"error": "Unauthorized"}

    # Invalid key
    resp = requests.get(f"{BASE_URL}/api/v1/hello", headers={"X-API-Key": "qk_invalidkey1234567890123456789012"})
    assert resp.status_code == 401, f"Expected 401 for invalid key, got {resp.status_code}"
    assert resp.json() == {"error": "Unauthorized"}

    # 5. List Keys
    resp = requests.get(f"{BASE_URL}/api/v1/developer/keys")
    assert resp.status_code == 200, f"Failed to list keys: {resp.text}"
    keys_list = resp.json()
    assert isinstance(keys_list, list), "Expected response to be a list"

    # Find our key in the list
    found_key = None
    for k in keys_list:
        if k.get("id") == key_id:
            found_key = k
            break

    assert found_key is not None, f"Generated key with ID {key_id} not found in listed keys"
    assert found_key["name"] == "Production Key"
    assert found_key["prefix"] == prefix
    assert found_key["status"] == "active"
    assert "key" not in found_key, "Security violation: plain text 'key' returned in key list!"
    assert "hashed_key" not in found_key, "Security violation: 'hashed_key' returned in key list!"

    # 6. Revoke Key
    resp = requests.post(f"{BASE_URL}/api/v1/developer/keys/{key_id}/revoke")
    assert resp.status_code == 200, f"Failed to revoke key: {resp.text}"
    assert resp.json().get("success") is True

    # Verify status is updated in list
    resp = requests.get(f"{BASE_URL}/api/v1/developer/keys")
    keys_list = resp.json()
    found_key = next((k for k in keys_list if k.get("id") == key_id), None)
    assert found_key is not None
    assert found_key["status"] == "revoked", f"Expected status 'revoked', got {found_key['status']}"

    # 7. Authenticate with Revoked Key (Should fail)
    resp = requests.get(f"{BASE_URL}/api/v1/hello", headers=headers)
    assert resp.status_code == 401, f"Expected 401 for revoked key, got {resp.status_code}"
    assert resp.json() == {"error": "Unauthorized"}


def test_concurrency_and_race_conditions(start_app):
    """
    Verify that generating keys concurrently does not result in SQLite locking issues or corrupted database states.
    """
    num_requests = 10
    payloads = [{"name": f"Concurrent Key {i}"} for i in range(num_requests)]

    def send_post(payload):
        try:
            return requests.post(f"{BASE_URL}/api/v1/developer/keys", json=payload, timeout=10)
        except Exception as e:
            return e

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(send_post, payloads))

    success_count = 0
    generated_keys = []

    for res in results:
        assert not isinstance(res, Exception), f"Request failed with exception: {res}"
        if res.status_code == 201:
            success_count += 1
            data = res.json()
            generated_keys.append(data["key"])

    assert success_count == num_requests, f"Expected {num_requests} successful creations, but only {success_count} succeeded."

    # Verify they all work to authenticate
    for key in generated_keys:
        resp = requests.get(f"{BASE_URL}/api/v1/hello", headers={"X-API-Key": key})
        assert resp.status_code == 200, "Concurrent key failed to authenticate"


def test_ui_dashboard(start_app, browser_verifier):
    """Verify that the UI route /developer/keys renders and behaves correctly."""
    reason = "The developer API keys dashboard should display existing keys, allow generation of new keys, show the generated key exactly once, and support revoking keys."
    truth = (
        f"Navigate to {BASE_URL}/developer/keys. Verify that the page loads, contains a list of API keys, "
        f"and displays a form to generate a new key. Fill in the key name field with 'Dashboard Integration Test', "
        f"submit the form, and verify that the newly generated key starting with 'qk_' is shown exactly once in a "
        f"prominent success message or alert box. Click the revoke button for that key, and verify that its status changes to revoked."
    )

    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_ui_dashboard"
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"
