import os
import socket
import sqlite3

import pytest
import requests
from playwright.sync_api import expect, sync_playwright
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/optimistic-todo"
DB_PATH = os.path.join(PROJECT_DIR, "data", "todos.sqlite")
PORT = 5173
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the dev server may listen on ::1 only while an AF_INET
# socket to 127.0.0.1 never connects -> readiness checks would hang.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"


def _query_todos(title=None):
    """Read rows from the local SQLite todos table."""
    assert os.path.isfile(DB_PATH), f"SQLite database not found at {DB_PATH}."
    con = sqlite3.connect(DB_PATH)
    try:
        con.row_factory = sqlite3.Row
        cur = con.cursor()
        if title is None:
            cur.execute("SELECT id, title, completed FROM todos")
        else:
            cur.execute(
                "SELECT id, title, completed FROM todos WHERE title = ?", (title,)
            )
        return [dict(r) for r in cur.fetchall()]
    finally:
        con.close()


@pytest.fixture(scope="session")
def start_app(xprocess):
    # Start from a clean database so persistence checks are deterministic.
    if os.path.isfile(DB_PATH):
        os.remove(DB_PATH)

    class Starter(ProcessStarter):
        name = "start_app"
        # Force Vite to bind IPv4 loopback on the expected port.
        args = ["npm", "run", "dev", "--", "--host", HOST, "--port", str(PORT)]
        # CRITICAL: set `env` here as a class attribute, NEVER inside popen_kwargs.
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
                resp = requests.get(BASE_URL, timeout=30)
                return resp.status_code < 500
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
        print(f"===================== [{tag}] {Starter.name} log begin =====================")
        print("".join(new_lines))
        print(f"===================== [{tag}] {Starter.name} log end   =====================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


@pytest.fixture(scope="session")
def page(start_app):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        pg = browser.new_page()
        pg.set_default_timeout(15000)
        yield pg
        browser.close()


def _add_todo(page, title):
    page.fill('[data-testid="new-todo-input"]', title)
    page.click('[data-testid="add-todo"]')


def _item(page, title):
    return page.locator(f'[data-testid="todo-item"][data-title="{title}"]')


def test_initial_ui(page):
    page.goto(BASE_URL)
    expect(page.locator('[data-testid="new-todo-input"]')).to_be_visible()
    expect(page.locator('[data-testid="add-todo"]')).to_be_visible()
    expect(page.locator('[data-testid="todo-list"]')).to_be_visible()


def test_optimistic_add_and_persist(page):
    page.goto(BASE_URL)
    _add_todo(page, "Buy milk")
    # Optimistic item should appear.
    expect(_item(page, "Buy milk")).to_have_count(1)
    # Persisted across a full server-rendered reload (routeLoader reads the DB).
    page.goto(BASE_URL)
    expect(_item(page, "Buy milk")).to_have_count(1)
    # Persisted in SQLite.
    rows = _query_todos("Buy milk")
    assert len(rows) == 1, f"Expected exactly one 'Buy milk' row in DB, found {len(rows)}."
    assert rows[0]["completed"] == 0, "Newly added 'Buy milk' should have completed = 0."


def test_failure_rollback(page):
    page.goto(BASE_URL)
    _add_todo(page, "FAIL server down")
    # Error surfaced and the optimistic item is rolled back.
    expect(page.locator('[data-testid="error-message"]')).to_be_visible()
    expect(_item(page, "FAIL server down")).to_have_count(0)
    # Still absent after a reload.
    page.goto(BASE_URL)
    expect(_item(page, "FAIL server down")).to_have_count(0)
    # Never persisted to SQLite.
    rows = _query_todos("FAIL server down")
    assert len(rows) == 0, "A title starting with 'FAIL' must never be persisted."


def test_pending_state(page):
    page.goto(BASE_URL)
    _add_todo(page, "SLOW upload")
    slow = _item(page, "SLOW upload")
    # While the (delayed) server persistence is in flight the item is pending.
    expect(slow).to_have_attribute("data-pending", "true", timeout=5000)
    # Once reconciled, it is no longer pending.
    expect(slow).not_to_have_attribute("data-pending", "true", timeout=10000)
    # Persisted after reload and present in the DB.
    page.goto(BASE_URL)
    expect(_item(page, "SLOW upload")).to_have_count(1)
    rows = _query_todos("SLOW upload")
    assert len(rows) == 1, f"Expected 'SLOW upload' to be persisted, found {len(rows)} rows."


def test_toggle_persist(page):
    page.goto(BASE_URL)
    checkbox = _item(page, "Buy milk").locator('input[type="checkbox"]')
    checkbox.check()
    expect(checkbox).to_be_checked()
    # Persisted across reload.
    page.goto(BASE_URL)
    expect(_item(page, "Buy milk").locator('input[type="checkbox"]')).to_be_checked()
    rows = _query_todos("Buy milk")
    assert len(rows) == 1, f"Expected one 'Buy milk' row, found {len(rows)}."
    assert rows[0]["completed"] == 1, "Toggled 'Buy milk' should have completed = 1 in the DB."


def test_delete_persist(page):
    page.goto(BASE_URL)
    _item(page, "Buy milk").locator('[data-testid="delete-todo"]').click()
    expect(_item(page, "Buy milk")).to_have_count(0)
    # Gone after reload.
    page.goto(BASE_URL)
    expect(_item(page, "Buy milk")).to_have_count(0)
    rows = _query_todos("Buy milk")
    assert len(rows) == 0, "Deleted 'Buy milk' must be removed from the DB."


def test_sqlite_storage_valid():
    assert os.path.isfile(DB_PATH), f"Expected SQLite database file at {DB_PATH}."
    con = sqlite3.connect(DB_PATH)
    try:
        cur = con.cursor()
        cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='todos'"
        )
        assert cur.fetchone() is not None, "Expected a 'todos' table in the SQLite database."
    finally:
        con.close()
