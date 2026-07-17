import os
import socket

import pytest
import requests
from xprocess import ProcessStarter
from playwright.sync_api import sync_playwright, expect

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1); connecting to 127.0.0.1 avoids confusing timeouts.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

# Give Qwik's on-demand SSR bundling and server$ RPC round-trips generous time.
ACTION_TIMEOUT_MS = 30000


@pytest.fixture(scope="session")
def start_app(xprocess):
    """Start the Qwik City SSR dev server and wait until it is reachable."""

    class Starter(ProcessStarter):
        name = "qwik_dev_server"
        # Matches the start command from the task description; --host 0.0.0.0
        # binds the IPv4 wildcard so 127.0.0.1 is reachable.
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", "0.0.0.0"]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 240
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
        try:
            with open(info.logpath, "r") as f:
                all_lines = f.readlines()
        except FileNotFoundError:
            return
        new_lines = all_lines[printed_log_lines:]
        skipped = printed_log_lines
        printed_log_lines = len(all_lines)
        print(f"===================== [{tag}: Begin] {Starter.name} log =====================")
        if skipped > 0:
            print(f"(skipped {skipped} already-printed lines)")
        print("".join(new_lines))
        print(f"===================== [{tag}: End  ] {Starter.name} log =====================")

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
def browser(start_app):
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        yield b
        b.close()


def _new_page(browser):
    """Return a fresh, cookie-less browser context + page (a new visitor)."""
    context = browser.new_context()
    page = context.new_page()
    page.set_default_timeout(ACTION_TIMEOUT_MS)
    return context, page


def _testid(page, tid):
    return page.locator(f'[data-testid="{tid}"]')


def test_empty_cart_initial(browser):
    """Truth step 1: a fresh visitor sees an empty cart."""
    context, page = _new_page(browser)
    try:
        page.goto(BASE_URL)
        expect(_testid(page, "empty-cart")).to_be_visible()
        expect(page.locator('[data-testid^="cart-item-"]')).to_have_count(0)
    finally:
        context.close()


def test_cart_add_update_and_persistence(browser):
    """Truth steps 2-5, 7-8: add/increase quantity, totals, reload persistence, removal."""
    context, page = _new_page(browser)
    try:
        page.goto(BASE_URL)
        expect(_testid(page, "empty-cart")).to_be_visible()

        # Step 2: add tshirt -> qty 1, total $20.00
        _testid(page, "add-tshirt").click()
        expect(_testid(page, "cart-item-tshirt")).to_have_count(1)
        expect(_testid(page, "qty-tshirt")).to_have_text("1")
        expect(_testid(page, "cart-total")).to_have_text("$20.00")

        # Step 3: add tshirt again -> single line, qty 2, total $40.00
        _testid(page, "add-tshirt").click()
        expect(_testid(page, "cart-item-tshirt")).to_have_count(1)
        expect(_testid(page, "qty-tshirt")).to_have_text("2")
        expect(_testid(page, "cart-total")).to_have_text("$40.00")

        # Step 4: add stickers -> qty 1, total $45.00
        _testid(page, "add-stickers").click()
        expect(_testid(page, "cart-item-stickers")).to_have_count(1)
        expect(_testid(page, "qty-stickers")).to_have_text("1")
        expect(_testid(page, "cart-total")).to_have_text("$45.00")

        # Step 5: increment tshirt -> qty 3, total $65.00; then decrement -> qty 2, total $45.00
        _testid(page, "inc-tshirt").click()
        expect(_testid(page, "qty-tshirt")).to_have_text("3")
        expect(_testid(page, "cart-total")).to_have_text("$65.00")
        _testid(page, "dec-tshirt").click()
        expect(_testid(page, "qty-tshirt")).to_have_text("2")
        expect(_testid(page, "cart-total")).to_have_text("$45.00")

        # Step 7: reload -> cart is restored from the server (persistence)
        page.reload()
        expect(_testid(page, "cart-item-tshirt")).to_have_count(1)
        expect(_testid(page, "qty-tshirt")).to_have_text("2")
        expect(_testid(page, "cart-item-stickers")).to_have_count(1)
        expect(_testid(page, "qty-stickers")).to_have_text("1")
        expect(_testid(page, "cart-total")).to_have_text("$45.00")

        # Step 8: remove stickers -> gone, total $40.00; reload -> removal persisted
        _testid(page, "remove-stickers").click()
        expect(_testid(page, "cart-item-stickers")).to_have_count(0)
        expect(_testid(page, "cart-total")).to_have_text("$40.00")
        page.reload()
        expect(_testid(page, "cart-item-stickers")).to_have_count(0)
        expect(_testid(page, "cart-item-tshirt")).to_have_count(1)
        expect(_testid(page, "qty-tshirt")).to_have_text("2")
        expect(_testid(page, "cart-total")).to_have_text("$40.00")
    finally:
        context.close()


def test_decrement_does_not_go_below_one(browser):
    """Truth step 6: decrement floors quantity at 1."""
    context, page = _new_page(browser)
    try:
        page.goto(BASE_URL)
        _testid(page, "add-mug").click()
        expect(_testid(page, "qty-mug")).to_have_text("1")
        expect(_testid(page, "cart-total")).to_have_text("$12.50")
        _testid(page, "dec-mug").click()
        # Quantity must remain at 1 (item not removed, not zero).
        expect(_testid(page, "cart-item-mug")).to_have_count(1)
        expect(_testid(page, "qty-mug")).to_have_text("1")
        expect(_testid(page, "cart-total")).to_have_text("$12.50")
    finally:
        context.close()


def test_session_isolation(browser):
    """Truth step 9: a brand-new visitor (no cookies) has an independent empty cart."""
    # First visitor adds an item under its own session cookie.
    ctx_a, page_a = _new_page(browser)
    try:
        page_a.goto(BASE_URL)
        _testid(page_a, "add-mug").click()
        expect(_testid(page_a, "cart-item-mug")).to_have_count(1)
    finally:
        # A second, independent visitor must NOT see the first visitor's cart.
        ctx_b, page_b = _new_page(browser)
        try:
            page_b.goto(BASE_URL)
            expect(_testid(page_b, "empty-cart")).to_be_visible()
            expect(page_b.locator('[data-testid^="cart-item-"]')).to_have_count(0)
        finally:
            ctx_b.close()
        ctx_a.close()


def test_local_sqlite_file_exists(start_app):
    """Truth step 10: a local SQLite database file exists in the project."""
    db_exts = (".db", ".sqlite", ".sqlite3")
    found = []
    for root, dirs, files in os.walk(PROJECT_DIR):
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if ".git" in dirs:
            dirs.remove(".git")
        for name in files:
            if name.lower().endswith(db_exts):
                found.append(os.path.join(root, name))
    assert found, (
        f"Expected a local SQLite database file (*.db / *.sqlite / *.sqlite3) "
        f"inside {PROJECT_DIR}, but none was found."
    )
