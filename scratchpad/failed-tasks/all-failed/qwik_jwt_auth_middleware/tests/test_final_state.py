import os
import socket
import requests
import pytest
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik application service using xprocess. Confirms readiness via port check.
    """
    class Starter(ProcessStarter):
        name = "qwik_app"
        # Force Vite/Qwik to bind to IPv4 explicitly on port 3000
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
        env = os.environ.copy()
        env["PORT"] = str(PORT)
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 180
        terminate_on_interrupt = True

        def startup_check(self):
            """
            Custom check: returns True if port is accepting connections and responds to HTTP requests.
            """
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            try:
                # The port is open; check if the HTTP server responds
                resp = requests.get(f"{BASE_URL}/login", timeout=5, allow_redirects=False)
                return resp.status_code in [200, 302, 404]
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


def test_unauthorized_admin_access(start_app):
    """
    Verify that accessing GET /admin/dashboard without a JWT token redirects to /login with 302.
    """
    url = f"{BASE_URL}/admin/dashboard"
    response = requests.get(url, allow_redirects=False)

    assert response.status_code == 302, f"Expected redirect status code 302, got {response.status_code}"

    location = response.headers.get("Location", "")
    assert location.endswith("/login") or "/login" in location, f"Expected redirect location to be /login, got {location}"


def test_invalid_jwt_admin_access(start_app):
    """
    Verify that accessing GET /admin/dashboard with an invalid JWT token redirects to /login with 302.
    """
    url = f"{BASE_URL}/admin/dashboard"
    cookies = {"jwt_token": "invalid_token_value_xyz"}
    response = requests.get(url, cookies=cookies, allow_redirects=False)

    assert response.status_code == 302, f"Expected redirect status code 302, got {response.status_code}"

    location = response.headers.get("Location", "")
    assert location.endswith("/login") or "/login" in location, f"Expected redirect location to be /login, got {location}"


def test_login_invalid_credentials(start_app):
    """
    Verify that logging in with invalid credentials returns 401 and an error message.
    """
    url = f"{BASE_URL}/login"
    payload = {"username": "admin", "password": "wrong_password"}

    # Test JSON payload
    response_json = requests.post(url, json=payload, allow_redirects=False)
    assert response_json.status_code == 401, f"Expected status 401 for invalid credentials (JSON), got {response_json.status_code}"
    try:
        data = response_json.json()
        assert data.get("error") == "Invalid credentials", f"Expected error message 'Invalid credentials', got {data}"
    except ValueError:
        pytest.fail("Expected a JSON response for invalid credentials")

    # Test Form URL-encoded payload
    response_form = requests.post(url, data=payload, allow_redirects=False)
    assert response_form.status_code == 401, f"Expected status 401 for invalid credentials (Form), got {response_form.status_code}"
    try:
        data = response_form.json()
        assert data.get("error") == "Invalid credentials", f"Expected error message 'Invalid credentials', got {data}"
    except ValueError:
        pytest.fail("Expected a JSON response for invalid credentials")


def test_login_valid_credentials_and_admin_flow(start_app):
    """
    Verify the complete login, access authorized admin, and logout flow.
    """
    login_url = f"{BASE_URL}/login"
    payload = {"username": "admin", "password": "password123"}

    # 1. Login with valid credentials
    response = requests.post(login_url, json=payload, allow_redirects=False)
    assert response.status_code == 302, f"Expected redirect status 302 on successful login, got {response.status_code}"

    location = response.headers.get("Location", "")
    assert location.endswith("/admin/dashboard") or "/admin/dashboard" in location, f"Expected redirect to /admin/dashboard, got {location}"

    jwt_cookie = response.cookies.get("jwt_token")
    assert jwt_cookie is not None, "Expected 'jwt_token' cookie to be set in response"

    # 2. Access /admin/dashboard with the valid JWT token
    admin_url = f"{BASE_URL}/admin/dashboard"
    cookies = {"jwt_token": jwt_cookie}
    admin_response = requests.get(admin_url, cookies=cookies, allow_redirects=False)

    assert admin_response.status_code == 200, f"Expected status 200 for authorized access, got {admin_response.status_code}"
    assert "Welcome to the Admin Dashboard, admin!" in admin_response.text, "Expected dashboard welcome text in response"

    # 3. Logout
    logout_url = f"{BASE_URL}/logout"
    logout_response = requests.post(logout_url, cookies=cookies, allow_redirects=False)

    assert logout_response.status_code == 302, f"Expected redirect status 302 on logout, got {logout_response.status_code}"

    logout_location = logout_response.headers.get("Location", "")
    assert logout_location.endswith("/login") or "/login" in logout_location, f"Expected redirect to /login on logout, got {logout_location}"

    # Check that the cookie is cleared (has empty value or is deleted)
    cleared_cookie = logout_response.cookies.get("jwt_token")
    # If the cookie is cleared, it might be absent, empty, or have an expiration date in the past
    if cleared_cookie is not None:
        assert cleared_cookie == "" or "Max-Age=0" in logout_response.headers.get("Set-Cookie", "") or "expires" in logout_response.headers.get("Set-Cookie", "").lower(), "Expected jwt_token cookie to be cleared on logout"
