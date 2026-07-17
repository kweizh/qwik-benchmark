import os
import socket
import sqlite3
import time
import requests
import pytest
from bs4 import BeautifulSoup
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"
WIKI_DB = os.path.join(PROJECT_DIR, "wiki.db")
WIKI_PAGES_DIR = os.path.join(PROJECT_DIR, "wiki-pages")

def clean_db_and_files():
    """Helper to clean up markdown files and SQLite rows before/between tests."""
    if os.path.exists(WIKI_PAGES_DIR):
        import shutil
        for item in os.listdir(WIKI_PAGES_DIR):
            item_path = os.path.join(WIKI_PAGES_DIR, item)
            try:
                if os.path.isfile(item_path):
                    os.remove(item_path)
                elif os.path.isdir(item_path):
                    shutil.rmtree(item_path)
            except Exception as e:
                print(f"Error removing {item_path}: {e}")

    if os.path.exists(WIKI_DB):
        try:
            conn = sqlite3.connect(WIKI_DB)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='revisions';")
            if cursor.fetchone():
                cursor.execute("DELETE FROM revisions;")
                conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error cleaning DB: {e}")

@pytest.fixture(autouse=True)
def setup_test_case():
    clean_db_and_files()
    yield
    clean_db_and_files()

@pytest.fixture(scope="session")
def start_app(xprocess):
    """Starts the Qwik City development server using xprocess."""
    class Starter(ProcessStarter):
        name = "qwik_markdown_wiki"
        # We pass --host 127.0.0.1 and --port 3000 to npm run dev via --
        args = ["npm", "run", "dev", "--", "--host", HOST, "--port", str(PORT)]
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
            # Port is open; verify HTTP response
            try:
                resp = requests.get(BASE_URL, timeout=10)
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

def test_missing_page_returns_404(start_app):
    """Verify that accessing a non-existent wiki page returns a 404 status code."""
    url = f"{BASE_URL}/wiki/nonexistent"
    resp = requests.get(url)
    assert resp.status_code == 404, f"Expected 404 for non-existent page, got {resp.status_code}"

def test_edit_page_saves_and_logs(start_app):
    """Verify that editing a page saves the markdown file and logs a revision in SQLite."""
    slug = "home"
    content = "# Welcome to the Wiki\nThis is the home page."
    user = "alice"

    # POST to edit endpoint
    edit_url = f"{BASE_URL}/wiki/{slug}/edit"
    payload = {"content": content, "user": user}

    # We allow standard form-urlencoded or JSON
    resp = requests.post(edit_url, data=payload, allow_redirects=False)

    # Assert successful status code or redirect
    assert resp.status_code in [200, 201, 302, 303], \
        f"Expected redirect or success status code on POST edit, got {resp.status_code}"

    # Verify markdown file was saved
    md_file_path = os.path.join(WIKI_PAGES_DIR, f"{slug}.md")
    assert os.path.isfile(md_file_path), f"Markdown file was not created at {md_file_path}"
    with open(md_file_path, "r") as f:
        saved_content = f.read()
    assert saved_content == content, f"Expected content '{content}', got '{saved_content}'"

    # Verify SQLite database entry
    assert os.path.isfile(WIKI_DB), f"SQLite database was not created at {WIKI_DB}"
    conn = sqlite3.connect(WIKI_DB)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='revisions';")
    table_exists = cursor.fetchone()
    assert table_exists, "Table 'revisions' does not exist in SQLite database"

    cursor.execute("SELECT id, slug, user, timestamp, content_length FROM revisions;")
    rows = cursor.fetchall()
    conn.close()

    assert len(rows) == 1, f"Expected exactly 1 revision row, got {len(rows)}"
    row = rows[0]
    assert row[1] == slug, f"Expected slug '{slug}', got '{row[1]}'"
    assert row[2] == user, f"Expected user '{user}', got '{row[2]}'"
    assert row[4] == len(content), f"Expected content_length {len(content)}, got {row[4]}"
    # Verify timestamp is reasonable (within the last minute)
    now_ms = int(time.time() * 1000)
    assert abs(now_ms - row[3]) < 60000, f"Timestamp {row[3]} is not reasonable compared to current time {now_ms}"

def test_view_rendered_page(start_app):
    """Verify that GET /wiki/:slug renders the Markdown content to HTML inside the correct container."""
    slug = "test-page"
    content = "# Heading 1\nSome paragraph text with **bold**."
    user = "bob"

    # Create the page first
    edit_url = f"{BASE_URL}/wiki/{slug}/edit"
    requests.post(edit_url, data={"content": content, "user": user})

    # Fetch the rendered page
    view_url = f"{BASE_URL}/wiki/{slug}"
    resp = requests.get(view_url)
    assert resp.status_code == 200, f"Expected 200 OK for rendered page, got {resp.status_code}"

    # Parse HTML and verify the presence of .wiki-content and correct tags
    soup = BeautifulSoup(resp.text, "html.parser")
    wiki_content_div = soup.find(class_="wiki-content")
    assert wiki_content_div is not None, "Could not find element with class 'wiki-content' in rendered HTML"

    # Check for converted Markdown elements
    h1_tag = wiki_content_div.find("h1")
    assert h1_tag is not None, "Could not find <h1> tag inside .wiki-content"
    assert h1_tag.text.strip() == "Heading 1", f"Expected Heading 1, got '{h1_tag.text}'"

    bold_tag = wiki_content_div.find("strong") or wiki_content_div.find("b")
    assert bold_tag is not None, "Could not find bold tag (<strong> or <b>) inside .wiki-content"
    assert bold_tag.text.strip() == "bold", f"Expected bold text, got '{bold_tag.text}'"

def test_get_page_history_and_sorting(start_app):
    """Verify that GET /wiki/:slug/history returns all revisions sorted by timestamp descending."""
    slug = "history-test"

    # First revision by Alice
    edit_url = f"{BASE_URL}/wiki/{slug}/edit"
    requests.post(edit_url, data={"content": "Version 1", "user": "alice"})

    # Sleep briefly to ensure distinct timestamps
    time.sleep(0.1)

    # Second revision by Bob
    requests.post(edit_url, data={"content": "Version 2 updated", "user": "bob"})

    # Fetch history
    history_url = f"{BASE_URL}/wiki/{slug}/history"
    resp = requests.get(history_url)
    assert resp.status_code == 200, f"Expected 200 OK for history endpoint, got {resp.status_code}"

    # Verify JSON response
    try:
        history = resp.json()
    except Exception as e:
        pytest.fail(f"Failed to parse history response as JSON: {e}. Raw response: {resp.text}")

    assert isinstance(history, list), f"Expected history response to be a JSON list, got {type(history)}"
    assert len(history) == 2, f"Expected exactly 2 revisions, got {len(history)}"

    # Revisions must be sorted by timestamp descending (newest first)
    rev1 = history[0]
    rev2 = history[1]

    assert rev1["user"] == "bob", f"Expected newest revision to be by bob, got {rev1['user']}"
    assert rev1["content_length"] == len("Version 2 updated"), f"Expected content length {len('Version 2 updated')}, got {rev1['content_length']}"

    assert rev2["user"] == "alice", f"Expected older revision to be by alice, got {rev2['user']}"
    assert rev2["content_length"] == len("Version 1"), f"Expected content length {len('Version 1')}, got {rev2['content_length']}"

    assert rev1["timestamp"] >= rev2["timestamp"], "Expected revisions to be sorted by timestamp descending"
