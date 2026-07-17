import os
import socket
import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session", autouse=True)
def start_app(xprocess):
    """
    Starts the Qwik City service using xprocess. Confirms readiness via port check.
    Removes pre-existing db.sqlite to guarantee clean state and deterministic rowids.
    """
    # Cleanup DB file if it exists to ensure deterministic rowids
    db_path = os.path.join(PROJECT_DIR, "db.sqlite")
    if os.path.isfile(db_path):
        try:
            os.remove(db_path)
        except Exception as e:
            print(f"Failed to remove db file: {e}")

    class Starter(ProcessStarter):
        name = "start_app"
        args = ["npm", "run", "dev", "--", "--host", HOST]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 180
        terminate_on_interrupt = True

        def startup_check(self):
            """
            Custom check: returns True if port is accepting connections.
            """
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            try:
                # Ping the search endpoint to confirm HTTP server is responding
                resp = requests.get(f"{BASE_URL}/search", timeout=5)
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

def test_empty_or_missing_query():
    """Verify that an empty or missing query parameter returns an empty array."""
    # Test missing query parameter
    resp = requests.get(f"{BASE_URL}/search")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    assert resp.json() == [], f"Expected empty list, got {resp.json()}"

    # Test empty query parameter
    resp = requests.get(f"{BASE_URL}/search?q=")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    assert resp.json() == [], f"Expected empty list, got {resp.json()}"

def test_standard_search():
    """Verify that a standard term search returns matching articles with highlighted snippets."""
    resp = requests.get(f"{BASE_URL}/search?q=resumability")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert isinstance(data, list), "Response is not a JSON list"
    assert len(data) == 2, f"Expected exactly 2 results, got {len(data)}"

    # Find and assert on "Introduction to Qwik"
    intro = next((item for item in data if item["title"] == "Introduction to Qwik"), None)
    assert intro is not None, "Could not find 'Introduction to Qwik' in results"
    assert "<b>resumability</b>" in intro["snippet"].lower(), f"Expected highlighted search term in snippet: {intro['snippet']}"

    # Find and assert on "Understanding Resumability"
    und = next((item for item in data if item["title"] == "Understanding Resumability"), None)
    assert und is not None, "Could not find 'Understanding Resumability' in results"
    assert "<b>resumability</b>" in und["snippet"].lower(), f"Expected highlighted search term in snippet: {und['snippet']}"

def test_advanced_fts5_syntax_query():
    """Verify that advanced FTS5 syntax queries work correctly."""
    resp = requests.get(f"{BASE_URL}/search?q=SQLite+AND+FTS5")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert isinstance(data, list), "Response is not a JSON list"
    assert len(data) == 1, f"Expected exactly 1 result, got {len(data)}"
    assert data[0]["title"] == "SQLite FTS5 Full-Text Search", f"Expected title 'SQLite FTS5 Full-Text Search', got '{data[0]['title']}'"

    snippet_lower = data[0]["snippet"].lower()
    assert "<b>sqlite</b>" in snippet_lower, f"Expected highlighted 'sqlite' in snippet: {data[0]['snippet']}"
    assert "<b>fts5</b>" in snippet_lower, f"Expected highlighted 'fts5' in snippet: {data[0]['snippet']}"

def test_invalid_fts5_syntax_handling():
    """Verify that invalid FTS5 queries are caught and handled gracefully returning 400."""
    resp = requests.get(f"{BASE_URL}/search?q=\"unclosed+quote")
    assert resp.status_code == 400, f"Expected 400 Bad Request, got {resp.status_code}"
    assert resp.json() == {"error": "Invalid search query syntax"}, f"Expected error JSON, got {resp.json()}"

def test_insert_new_article():
    """Verify that a new article can be successfully inserted with implicit rowid returned."""
    payload = {
        "title": "Qwik Optimizer",
        "content": "The Qwik Optimizer is a Rust tool that splits your code into tiny, lazy-loadable parts."
    }
    resp = requests.post(f"{BASE_URL}/articles", json=payload)
    assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}"
    data = resp.json()
    assert data["rowid"] == 4, f"Expected rowid 4, got {data.get('rowid')}"
    assert data["title"] == "Qwik Optimizer", f"Expected title 'Qwik Optimizer', got '{data.get('title')}'"
    assert data["content"] == payload["content"], "Content mismatch in creation response"

def test_search_newly_inserted_article():
    """Verify that the newly inserted article is immediately searchable via FTS5 match."""
    resp = requests.get(f"{BASE_URL}/search?q=Optimizer")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert isinstance(data, list), "Response is not a JSON list"
    assert len(data) == 1, f"Expected exactly 1 result, got {len(data)}"
    assert data[0]["title"] == "Qwik Optimizer", f"Expected title 'Qwik Optimizer', got '{data[0]['title']}'"
    assert "<b>optimizer</b>" in data[0]["snippet"].lower(), f"Expected highlighted 'optimizer' in snippet: {data[0]['snippet']}"

def test_validation_errors_on_insert():
    """Verify that missing or empty fields are rejected with 400 Bad Request."""
    # Empty title
    resp = requests.post(f"{BASE_URL}/articles", json={"title": "", "content": "Some content"})
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert resp.json() == {"error": "Title and content are required"}, f"Expected validation error, got {resp.json()}"

    # Empty content
    resp = requests.post(f"{BASE_URL}/articles", json={"title": "Some Title", "content": ""})
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert resp.json() == {"error": "Title and content are required"}, f"Expected validation error, got {resp.json()}"

    # Missing fields
    resp = requests.post(f"{BASE_URL}/articles", json={})
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert resp.json() == {"error": "Title and content are required"}, f"Expected validation error, got {resp.json()}"
