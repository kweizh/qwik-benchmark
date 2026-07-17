import os
import shutil
import socket
import sqlite3
import glob
import pytest
import requests
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

def clean_state():
    db_path = os.path.join(PROJECT_DIR, "metadata.db")
    uploads_dir = os.path.join(PROJECT_DIR, "public", "uploads")

    # Ensure uploads directory exists
    os.makedirs(uploads_dir, exist_ok=True)

    # Clean database
    if os.path.isfile(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("DROP TABLE IF EXISTS files;")
            cursor.execute("""
                CREATE TABLE files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    size INTEGER NOT NULL,
                    mime TEXT NOT NULL,
                    tag TEXT NOT NULL
                );
            """)
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error cleaning DB: {e}")
            try:
                os.remove(db_path)
            except Exception:
                pass

    # Clean uploads directory
    if os.path.isdir(uploads_dir):
        for f in glob.glob(os.path.join(uploads_dir, "*")):
            if os.path.isfile(f):
                try:
                    os.remove(f)
                except Exception:
                    pass

@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik app using xprocess. Confirms readiness via port check.
    """
    clean_state()

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
                # Qwik dev server might take a moment to respond
                resp = requests.get(f"{BASE_URL}/files", timeout=5)
                return resp.status_code < 500
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
            print(f"============================== [{tag}] Captured {Starter.name} logfile ==============================")
            print("".join(new_lines))
            print(f"============================== [{tag}: End] ==============================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def test_01_initial_empty_list(start_app):
    """Verify that the file list is initially empty."""
    url = f"{BASE_URL}/files/list"
    resp = requests.get(url, timeout=5)
    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"
    data = resp.json()
    assert isinstance(data, list), "Expected response to be a JSON list"
    assert len(data) == 0, f"Expected empty list, got {data}"


def test_02_upload_file(start_app):
    """Verify that uploading a valid file succeeds and stores metadata in SQLite."""
    url = f"{BASE_URL}/files/upload"
    file_content = b"hello world"
    files = {
        "file": ("test.txt", file_content, "text/plain")
    }
    data = {
        "tag": "test-tag"
    }

    resp = requests.post(url, files=files, data=data, timeout=5)
    assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}. Response: {resp.text}"

    res_data = resp.json()
    assert res_data.get("id") is not None, "Response missing 'id'"
    assert res_data.get("name") == "test.txt", f"Expected name 'test.txt', got {res_data.get('name')}"
    assert res_data.get("size") == len(file_content), f"Expected size {len(file_content)}, got {res_data.get('size')}"
    assert res_data.get("mime") == "text/plain", f"Expected mime 'text/plain', got {res_data.get('mime')}"
    assert res_data.get("tag") == "test-tag", f"Expected tag 'test-tag', got {res_data.get('tag')}"

    # Verify physical file exists on disk
    expected_path = os.path.join(PROJECT_DIR, "public", "uploads", "test.txt")
    # Note: If the app renames files to avoid collisions, we should support that,
    # but the task description says "saves files to public/uploads". Let's check both options.
    if not os.path.exists(expected_path):
        # Check if any file exists in public/uploads
        uploaded_files = os.listdir(os.path.join(PROJECT_DIR, "public", "uploads"))
        assert len(uploaded_files) > 0, "No files found in public/uploads directory after upload"
        # Read the content of the first file to ensure it matches
        with open(os.path.join(PROJECT_DIR, "public", "uploads", uploaded_files[0]), "rb") as f:
            disk_content = f.read()
        assert disk_content == file_content, "File content on disk does not match uploaded content"
    else:
        with open(expected_path, "rb") as f:
            disk_content = f.read()
        assert disk_content == file_content, "File content on disk does not match uploaded content"


def test_03_list_with_uploaded_file(start_app):
    """Verify that the uploaded file appears in the file listing."""
    url = f"{BASE_URL}/files/list"
    resp = requests.get(url, timeout=5)
    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"
    data = resp.json()
    assert isinstance(data, list), "Expected response to be a JSON list"
    assert len(data) == 1, f"Expected 1 item, got {data}"

    item = data[0]
    assert item.get("name") == "test.txt"
    assert item.get("size") == 11
    assert item.get("mime") == "text/plain"
    assert item.get("tag") == "test-tag"


def test_04_files_page_ui(start_app, browser_verifier):
    """Verify that the /files page UI renders the upload form and the listed files correctly."""
    reason = "The /files page must serve an HTML interface with an upload form (id='upload-form') and list the uploaded files inside a container (id='file-list')."
    truth = (
        f"Navigate to {BASE_URL}/files. "
        "Verify that the page contains an element with id='upload-form'. "
        "Verify that the page contains input elements with id='file-input' (or name='file') and id='tag-input' (or name='tag'). "
        "Verify that the container with id='file-list' contains the text 'test.txt'."
    )

    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_files_page_ui"
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"


def test_05_delete_file(start_app):
    """Verify that deleting a file by ID removes it from disk and SQLite."""
    # First, get the ID of the uploaded file
    list_url = f"{BASE_URL}/files/list"
    list_resp = requests.get(list_url, timeout=5)
    data = list_resp.json()
    assert len(data) > 0, "No files found to delete"
    file_id = data[0]["id"]
    file_name = data[0]["name"]

    # Delete the file
    delete_url = f"{BASE_URL}/files/{file_id}"
    del_resp = requests.delete(delete_url, timeout=5)
    assert del_resp.status_code == 200, f"Expected 200 OK on DELETE, got {del_resp.status_code}. Response: {del_resp.text}"
    assert del_resp.json().get("success") is True, f"Expected success: true, got {del_resp.json()}"

    # Verify database record is gone
    list_resp2 = requests.get(list_url, timeout=5)
    assert len(list_resp2.json()) == 0, f"Expected file list to be empty after deletion, got {list_resp2.json()}"

    # Verify physical file is gone from disk
    expected_path = os.path.join(PROJECT_DIR, "public", "uploads", file_name)
    assert not os.path.exists(expected_path), f"File still exists at {expected_path} after deletion"


def test_06_delete_non_existent(start_app):
    """Verify that deleting a non-existent file ID returns 404 Not Found."""
    delete_url = f"{BASE_URL}/files/9999"
    del_resp = requests.delete(delete_url, timeout=5)
    assert del_resp.status_code == 404, f"Expected 404 Not Found, got {del_resp.status_code}"
    assert del_resp.json().get("error") is not None, "Expected an error message in JSON response"


def test_07_upload_invalid(start_app):
    """Verify that uploading with missing file or invalid payload returns 400 Bad Request."""
    url = f"{BASE_URL}/files/upload"
    # Missing file, only tag
    data = {"tag": "invalid-upload"}
    resp = requests.post(url, data=data, timeout=5)
    assert resp.status_code == 400, f"Expected 400 Bad Request for missing file, got {resp.status_code}"
    assert resp.json().get("error") is not None, "Expected error message in response"


def test_08_delete_missing_physical_file(start_app):
    """Verify that if physical file is missing from disk but exists in DB, deletion still succeeds and cleans DB."""
    # 1. Upload a file
    url = f"{BASE_URL}/files/upload"
    file_content = b"ghost content"
    files = {
        "file": ("ghost.txt", file_content, "text/plain")
    }
    data = {
        "tag": "ghost-tag"
    }
    resp = requests.post(url, files=files, data=data, timeout=5)
    assert resp.status_code == 201, f"Upload failed with status {resp.status_code}"
    res_data = resp.json()
    file_id = res_data["id"]
    file_name = res_data["name"]

    # 2. Manually delete the physical file from disk
    physical_path = os.path.join(PROJECT_DIR, "public", "uploads", file_name)
    if os.path.exists(physical_path):
        os.remove(physical_path)

    # 3. Request deletion of the record by ID
    delete_url = f"{BASE_URL}/files/{file_id}"
    del_resp = requests.delete(delete_url, timeout=5)
    assert del_resp.status_code == 200, f"Expected 200 OK on DELETE even if physical file is missing, got {del_resp.status_code}"
    assert del_resp.json().get("success") is True, f"Expected success: true, got {del_resp.json()}"

    # 4. Verify database record is gone
    list_url = f"{BASE_URL}/files/list"
    list_resp = requests.get(list_url, timeout=5)
    assert len(list_resp.json()) == 0, f"Expected file list to be empty, got {list_resp.json()}"
