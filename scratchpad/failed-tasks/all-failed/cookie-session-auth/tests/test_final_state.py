import os
import re
import socket
from urllib.parse import urljoin, urlparse

import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-auth"
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the dev server would listen on ::1 only while an
# AF_INET socket to 127.0.0.1 never connects -> readiness checks hang.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

VALID_USER = "alice"
VALID_PASS = "s3cret-pass"
WRONG_PASS = "wrong-pass"

FORM_RE = re.compile(r"<form\b[^>]*>.*?</form>", re.IGNORECASE | re.DOTALL)
ACTION_RE = re.compile(r"""\baction\s*=\s*["']([^"']+)["']""", re.IGNORECASE)


def _find_form_action(html, must_contain):
    """Return the `action` attribute of the first <form> block that contains
    all substrings in `must_contain` (case-insensitive)."""
    for block in FORM_RE.findall(html):
        low = block.lower()
        if all(s.lower() in low for s in must_contain):
            m = ACTION_RE.search(block)
            if m:
                return m.group(1)
    return None


def _set_cookie_headers(resp):
    try:
        return resp.raw.headers.getlist("Set-Cookie")
    except Exception:
        h = resp.headers.get("Set-Cookie")
        return [h] if h else []


def _location_path(resp):
    loc = resp.headers.get("Location", "")
    if not loc:
        return ""
    return urlparse(loc).path or loc


def _do_login(session, username, password, allow_redirects=False):
    r = session.get(BASE_URL + "/login", timeout=30)
    assert r.status_code == 200, f"GET /login returned {r.status_code}"
    action = _find_form_action(r.text, ["username", "password"])
    assert action is not None, (
        "Could not find a login <form> containing username/password inputs on /login."
    )
    post_url = urljoin(r.url, action)
    return session.post(
        post_url,
        data={"username": username, "password": password},
        allow_redirects=allow_redirects,
        timeout=30,
    )


@pytest.fixture(scope="session")
def start_app(xprocess):
    class Starter(ProcessStarter):
        name = "qwik_auth_app"
        # Dev script is `vite --mode ssr`; pass the port/host through after `--`.
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
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
                resp = requests.get(BASE_URL + "/login", timeout=30)
                return resp.status_code < 500
            except requests.RequestException:
                return False

    info = xprocess.getinfo(Starter.name)
    printed = 0

    def capture_logs(tag):
        nonlocal printed
        try:
            with open(info.logpath, "r") as f:
                all_lines = f.readlines()
        except FileNotFoundError:
            all_lines = []
        new_lines = all_lines[printed:]
        printed = len(all_lines)
        print(f"===== [{tag}] {Starter.name} log begin =====")
        print("".join(new_lines))
        print(f"===== [{tag}] {Starter.name} log end   =====")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def test_login_page_renders(start_app):
    r = requests.get(BASE_URL + "/login", timeout=30)
    assert r.status_code == 200, f"GET /login expected 200, got {r.status_code}"
    action = _find_form_action(r.text, ["username", "password"])
    assert action is not None, (
        "Expected /login to render a <form> with username and password inputs."
    )


def test_unauthenticated_dashboard_redirects_to_login(start_app):
    s = requests.Session()
    r = s.get(BASE_URL + "/dashboard", allow_redirects=False, timeout=30)
    assert 300 <= r.status_code < 400, (
        f"Unauthenticated GET /dashboard should redirect, got {r.status_code}"
    )
    assert "/login" in _location_path(r), (
        f"Unauthenticated /dashboard should redirect to /login, Location={r.headers.get('Location')}"
    )


def test_failed_login_is_rejected(start_app):
    s = requests.Session()
    r = _do_login(s, VALID_USER, WRONG_PASS, allow_redirects=False)
    # A failed login must NOT redirect to the dashboard.
    if 300 <= r.status_code < 400:
        assert "/dashboard" not in _location_path(r), (
            "Login with a wrong password must not redirect to /dashboard."
        )
    # The re-rendered page must show the error message.
    body = r.text
    if 300 <= r.status_code < 400:
        follow = s.get(urljoin(r.url, r.headers.get("Location", "/login")), timeout=30)
        body = follow.text
    assert "Invalid username or password" in body, (
        "Failed login should display the message 'Invalid username or password'."
    )
    # And no valid session should have been established.
    r2 = s.get(BASE_URL + "/dashboard", allow_redirects=False, timeout=30)
    assert 300 <= r2.status_code < 400 and "/login" in _location_path(r2), (
        "After a failed login, /dashboard must still redirect to /login."
    )


def test_successful_login_sets_httponly_cookie_and_redirects(start_app):
    s = requests.Session()
    r = _do_login(s, VALID_USER, VALID_PASS, allow_redirects=False)
    assert r.status_code in (302, 303), (
        f"Successful login should redirect with 302/303, got {r.status_code}"
    )
    assert _location_path(r) == "/dashboard", (
        f"Successful login should redirect to /dashboard, Location={r.headers.get('Location')}"
    )
    cookies = "\n".join(_set_cookie_headers(r))
    assert "session" in cookies, (
        f"Successful login should set a 'session' cookie. Set-Cookie: {cookies!r}"
    )
    assert re.search(r"httponly", cookies, re.IGNORECASE), (
        f"The 'session' cookie must be HttpOnly. Set-Cookie: {cookies!r}"
    )


def test_authenticated_dashboard_shows_user(start_app):
    s = requests.Session()
    _do_login(s, VALID_USER, VALID_PASS, allow_redirects=True)
    r = s.get(BASE_URL + "/dashboard", timeout=30)
    assert r.status_code == 200, (
        f"Authenticated GET /dashboard should return 200, got {r.status_code}"
    )
    assert VALID_USER in r.text, (
        "Authenticated dashboard should display the logged-in username 'alice'."
    )
    assert re.search(r"logout", r.text, re.IGNORECASE), (
        "Authenticated dashboard should provide a logout control."
    )


def test_logout_clears_session(start_app):
    s = requests.Session()
    _do_login(s, VALID_USER, VALID_PASS, allow_redirects=True)
    r = s.get(BASE_URL + "/dashboard", timeout=30)
    assert r.status_code == 200, "Precondition failed: could not reach authenticated dashboard."

    logout_action = _find_form_action(r.text, ["logout"])
    assert logout_action is not None, (
        "Could not find a logout <form> on the dashboard page."
    )
    logout_url = urljoin(r.url, logout_action)
    rr = s.post(logout_url, allow_redirects=False, timeout=30)
    assert 300 <= rr.status_code < 400, (
        f"Logout should redirect, got {rr.status_code}"
    )
    assert "/login" in _location_path(rr), (
        f"Logout should redirect to /login, Location={rr.headers.get('Location')}"
    )

    # Session must be invalidated: the dashboard is guarded again.
    r2 = s.get(BASE_URL + "/dashboard", allow_redirects=False, timeout=30)
    assert 300 <= r2.status_code < 400 and "/login" in _location_path(r2), (
        "After logout, /dashboard must redirect to /login again."
    )


def _find_sqlite_files():
    db_files = []
    for root, dirs, files in os.walk(PROJECT_DIR):
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if ".git" in dirs:
            dirs.remove(".git")
        for name in files:
            path = os.path.join(root, name)
            try:
                with open(path, "rb") as f:
                    header = f.read(16)
            except OSError:
                continue
            if header.startswith(b"SQLite format 3"):
                db_files.append(path)
    return db_files


def test_password_is_hashed_at_rest(start_app):
    # Ensure the DB has been created / the user seeded by exercising a login.
    s = requests.Session()
    _do_login(s, VALID_USER, VALID_PASS, allow_redirects=True)

    db_files = _find_sqlite_files()
    assert db_files, (
        f"Expected a local SQLite database file to exist under {PROJECT_DIR}."
    )
    needle = VALID_PASS.encode()
    for path in db_files:
        with open(path, "rb") as f:
            data = f.read()
        assert needle not in data, (
            f"Plaintext password found in database file {path}; passwords must be hashed."
        )
