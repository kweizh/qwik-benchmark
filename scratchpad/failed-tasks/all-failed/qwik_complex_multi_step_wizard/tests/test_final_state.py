import os
import socket
import urllib.parse
import json
import requests
import pytest
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

def parse_cookie_json(cookie_val):
    if not cookie_val:
        return None
    # Try unquoting first
    unquoted = urllib.parse.unquote(cookie_val)
    try:
        return json.loads(unquoted)
    except Exception:
        try:
            return json.loads(cookie_val)
        except Exception:
            return None

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik City development server using xprocess. Confirms readiness via port check.
    """

    class Starter(ProcessStarter):
        name = "start_app"
        # We specify host and port for Vite to ensure it binds to IPv4 127.0.0.1:3000
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
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
            xprocess calls this repeatedly until it returns True or times out.
            """
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            # Port is open; confirm the HTTP server actually responds.
            try:
                # We can hit any path, e.g. /signup or /
                resp = requests.get(f"{BASE_URL}/signup", timeout=20, allow_redirects=True)
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


def test_redirect_on_default_route(start_app):
    url = f"{BASE_URL}/signup"
    resp = requests.get(url, allow_redirects=False)
    assert resp.status_code in [302, 303], f"Expected 302 or 303 redirect, got {resp.status_code}"
    loc = resp.headers.get("Location", "")
    assert "/signup?step=1" in loc or "step=1" in loc, f"Expected redirect to step 1, got Location: {loc}"


def test_step1_validation_failure(start_app):
    url = f"{BASE_URL}/signup?step=1"
    data = {"username": "ab", "password": "123"}
    resp = requests.post(url, data=data, allow_redirects=False)
    assert resp.status_code == 200, f"Expected status code 200, got {resp.status_code}"
    html = resp.text
    assert "Username must be at least 3 characters" in html or "at least 3 characters" in html, "Expected username validation error message"
    assert "Password must be at least 6 characters" in html or "at least 6 characters" in html, "Expected password validation error message"
    assert "signup_step1" not in resp.cookies, "signup_step1 cookie should not be set on validation failure"


def test_step1_validation_success(start_app):
    url = f"{BASE_URL}/signup?step=1"
    data = {"username": "john_doe", "password": "password123"}
    resp = requests.post(url, data=data, allow_redirects=False)
    assert resp.status_code in [302, 303], f"Expected 302/303 redirect, got {resp.status_code}"
    loc = resp.headers.get("Location", "")
    assert "step=2" in loc, f"Expected redirect to step 2, got {loc}"
    assert "signup_step1" in resp.cookies, "signup_step1 cookie was not set on validation success"
    cookie_val = resp.cookies["signup_step1"]
    parsed = parse_cookie_json(cookie_val)
    assert parsed is not None, f"Failed to parse signup_step1 cookie value: {cookie_val}"
    assert parsed.get("username") == "john_doe", f"Expected username 'john_doe', got {parsed.get('username')}"
    assert parsed.get("password") == "password123", f"Expected password 'password123', got {parsed.get('password')}"


def test_step2_missing_cookie_redirect(start_app):
    url = f"{BASE_URL}/signup?step=2"
    resp = requests.get(url, allow_redirects=False)
    assert resp.status_code in [302, 303], f"Expected 302/303 redirect, got {resp.status_code}"
    loc = resp.headers.get("Location", "")
    assert "step=1" in loc, f"Expected redirect to step 1, got {loc}"


def test_step2_validation_failure(start_app):
    url = f"{BASE_URL}/signup?step=2"
    data = {"fullName": "J", "email": "invalid-email"}
    cookies = {"signup_step1": urllib.parse.quote(json.dumps({"username": "john_doe", "password": "password123"}))}
    resp = requests.post(url, data=data, cookies=cookies, allow_redirects=False)
    assert resp.status_code == 200, f"Expected status code 200, got {resp.status_code}"
    html = resp.text
    assert "Full name must be at least 2 characters" in html or "at least 2 characters" in html, "Expected fullName validation error message"
    assert "Invalid email address" in html or "Invalid email" in html, "Expected email validation error message"
    assert "signup_step2" not in resp.cookies, "signup_step2 cookie should not be set on validation failure"


def test_step2_validation_success(start_app):
    url = f"{BASE_URL}/signup?step=2"
    data = {"fullName": "John Doe", "email": "john@example.com"}
    cookies = {"signup_step1": urllib.parse.quote(json.dumps({"username": "john_doe", "password": "password123"}))}
    resp = requests.post(url, data=data, cookies=cookies, allow_redirects=False)
    assert resp.status_code in [302, 303], f"Expected 302/303 redirect, got {resp.status_code}"
    loc = resp.headers.get("Location", "")
    assert "step=3" in loc, f"Expected redirect to step 3, got {loc}"
    assert "signup_step2" in resp.cookies, "signup_step2 cookie was not set on validation success"
    cookie_val = resp.cookies["signup_step2"]
    parsed = parse_cookie_json(cookie_val)
    assert parsed is not None, f"Failed to parse signup_step2 cookie value: {cookie_val}"
    assert parsed.get("fullName") == "John Doe", f"Expected fullName 'John Doe', got {parsed.get('fullName')}"
    assert parsed.get("email") == "john@example.com", f"Expected email 'john@example.com', got {parsed.get('email')}"


def test_step3_missing_cookies_redirect(start_app):
    url = f"{BASE_URL}/signup?step=3"
    # Try with no cookies
    resp = requests.get(url, allow_redirects=False)
    assert resp.status_code in [302, 303], "Expected redirect on missing cookies"
    assert "step=1" in resp.headers.get("Location", "")

    # Try with only step1 cookie
    cookies = {"signup_step1": urllib.parse.quote(json.dumps({"username": "john_doe", "password": "password123"}))}
    resp = requests.get(url, cookies=cookies, allow_redirects=False)
    assert resp.status_code in [302, 303], "Expected redirect on missing step2 cookie"
    assert "step=1" in resp.headers.get("Location", "")

    # Try with only step2 cookie
    cookies = {"signup_step2": urllib.parse.quote(json.dumps({"fullName": "John Doe", "email": "john@example.com"}))}
    resp = requests.get(url, cookies=cookies, allow_redirects=False)
    assert resp.status_code in [302, 303], "Expected redirect on missing step1 cookie"
    assert "step=1" in resp.headers.get("Location", "")


def test_step3_render_details(start_app):
    url = f"{BASE_URL}/signup?step=3"
    cookies = {
        "signup_step1": urllib.parse.quote(json.dumps({"username": "john_doe", "password": "password123"})),
        "signup_step2": urllib.parse.quote(json.dumps({"fullName": "John Doe", "email": "john@example.com"}))
    }
    resp = requests.get(url, cookies=cookies, allow_redirects=False)
    assert resp.status_code == 200, f"Expected status code 200, got {resp.status_code}"
    html = resp.text
    assert "john_doe" in html, "Expected username to be displayed on step 3"
    assert "John Doe" in html, "Expected fullName to be displayed on step 3"
    assert "john@example.com" in html, "Expected email to be displayed on step 3"
    assert "password123" not in html, "Password should not be exposed in plain text on step 3"


def test_step3_submit_confirmation(start_app):
    url = f"{BASE_URL}/signup?step=3"
    cookies = {
        "signup_step1": urllib.parse.quote(json.dumps({"username": "john_doe", "password": "password123"})),
        "signup_step2": urllib.parse.quote(json.dumps({"fullName": "John Doe", "email": "john@example.com"}))
    }
    resp = requests.post(url, cookies=cookies, allow_redirects=False)
    assert resp.status_code == 200, f"Expected status code 200, got {resp.status_code}"
    html = resp.text
    assert "Signup complete!" in html, "Expected 'Signup complete!' message"
    assert "step=1" in html, "Expected link to start over at step 1"

    # Verify that cookies are deleted in response headers.
    set_cookie_headers = resp.headers.get("Set-Cookie", "")
    assert "signup_step1=" in set_cookie_headers or "signup_step1" not in resp.cookies, "Expected signup_step1 deletion"
    assert "signup_step2=" in set_cookie_headers or "signup_step2" not in resp.cookies, "Expected signup_step2 deletion"
