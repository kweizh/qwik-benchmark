import os
import socket
import sqlite3
import pytest
import requests
from bs4 import BeautifulSoup
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
DB_PATH = os.path.join(PROJECT_DIR, "prisma/dev.db")
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik City development server using xprocess.
    Confirms readiness via port check and HTTP response.
    """
    class Starter(ProcessStarter):
        name = "qwik_app"
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
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
                # Confirm server actually responds
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
        printed_log_lines = len(all_lines)
        print(f"=== [{tag}] Captured {Starter.name} logs ===")
        print("".join(new_lines))
        print("=========================================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def test_database_initial_state():
    """Verify that the SQLite database exists and contains the pre-seeded users."""
    assert os.path.isfile(DB_PATH), f"Database file not found at {DB_PATH}"

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name, email, role FROM User ORDER BY email")
        users = cursor.fetchall()

        # Verify seed users
        emails = [u[1] for u in users]
        assert "admin@example.com" in emails, "admin@example.com not found in User table"
        assert "user@example.com" in emails, "user@example.com not found in User table"

        admin_user = [u for u in users if u[1] == "admin@example.com"][0]
        regular_user = [u for u in users if u[1] == "user@example.com"][0]

        assert admin_user[2] == "ADMIN", f"Expected admin@example.com to have role ADMIN, got {admin_user[2]}"
        assert regular_user[2] == "USER", f"Expected user@example.com to have role USER, got {regular_user[2]}"
    finally:
        conn.close()


def test_unauthorized_route(start_app):
    """Verify `/unauthorized` route returns status 200 and displays an unauthorized message."""
    resp = requests.get(f"{BASE_URL}/unauthorized")
    assert resp.status_code == 200, f"Expected 200 from /unauthorized, got {resp.status_code}"
    assert "unauthorized" in resp.text.lower() or "access denied" in resp.text.lower(), \
        "Expected response body to contain 'unauthorized' or 'access denied'"


def test_unauthenticated_access(start_app):
    """Verify unauthenticated access to `/profile` and `/admin/users` is rejected or redirected."""
    # Profile
    resp_profile = requests.get(f"{BASE_URL}/profile", allow_redirects=False)
    assert resp_profile.status_code in [403, 302, 307, 308], \
        f"Expected 403 or redirect for unauthenticated /profile, got {resp_profile.status_code}"
    if resp_profile.status_code in [302, 307, 308]:
        assert "unauthorized" in resp_profile.headers.get("Location", "").lower(), \
            f"Expected redirect to /unauthorized, got {resp_profile.headers.get('Location')}"

    # Admin Users
    resp_admin = requests.get(f"{BASE_URL}/admin/users", allow_redirects=False)
    assert resp_admin.status_code in [403, 302, 307, 308], \
        f"Expected 403 or redirect for unauthenticated /admin/users, got {resp_admin.status_code}"
    if resp_admin.status_code in [302, 307, 308]:
        assert "unauthorized" in resp_admin.headers.get("Location", "").lower(), \
            f"Expected redirect to /unauthorized, got {resp_admin.headers.get('Location')}"


def test_profile_access_with_user_role(start_app):
    """Verify that a user with USER role can access `/profile` and view their details."""
    cookies = {"session_email": "user@example.com"}
    resp = requests.get(f"{BASE_URL}/profile", cookies=cookies)
    assert resp.status_code == 200, f"Expected 200 for authenticated profile, got {resp.status_code}"
    assert "regular user" in resp.text.lower(), "Expected user name 'Regular User' in profile page"
    assert "user@example.com" in resp.text.lower(), "Expected user email in profile page"
    assert "user" in resp.text, "Expected role 'USER' in profile page"


def test_admin_users_access_with_user_role(start_app):
    """Verify that a user with USER role is rejected or redirected from `/admin/users`."""
    cookies = {"session_email": "user@example.com"}
    resp = requests.get(f"{BASE_URL}/admin/users", cookies=cookies, allow_redirects=False)
    assert resp.status_code in [403, 302, 307, 308], \
        f"Expected 403 or redirect for unauthorized access, got {resp.status_code}"
    if resp.status_code in [302, 307, 308]:
        assert "unauthorized" in resp.headers.get("Location", "").lower(), \
            f"Expected redirect to /unauthorized, got {resp.headers.get('Location')}"


def test_admin_users_access_with_admin_role(start_app):
    """Verify that a user with ADMIN role can access `/admin/users` and view the user list."""
    cookies = {"session_email": "admin@example.com"}
    resp = requests.get(f"{BASE_URL}/admin/users", cookies=cookies)
    assert resp.status_code == 200, f"Expected 200 for ADMIN accessing /admin/users, got {resp.status_code}"
    assert "admin user" in resp.text.lower(), "Expected 'Admin User' in user list"
    assert "regular user" in resp.text.lower(), "Expected 'Regular User' in user list"


def test_role_update_and_authorization(start_app):
    """
    Verify that an ADMIN can update a user's role via the routeAction$,
    and that a non-ADMIN cannot perform this action.
    """
    # 1. Attempt update as non-ADMIN (user@example.com) -> should fail
    cookies_user = {"session_email": "user@example.com"}

    # First get the action ID from the admin page (since the user cannot access `/admin/users` to get the action ID,
    # we can retrieve it using the admin's session first).
    cookies_admin = {"session_email": "admin@example.com"}
    resp_admin_page = requests.get(f"{BASE_URL}/admin/users", cookies=cookies_admin)
    assert resp_admin_page.status_code == 200

    soup = BeautifulSoup(resp_admin_page.text, "html.parser")
    qaction_input = soup.find("input", {"name": "_qaction"})
    assert qaction_input is not None, "Could not find Qwik routeAction ID (_qaction) in form"
    qaction_val = qaction_input.get("value")

    # Non-ADMIN tries to update user@example.com to ADMIN
    payload = {
        "_qaction": qaction_val,
        "email": "user@example.com",
        "role": "ADMIN"
    }
    resp_unauth_update = requests.post(
        f"{BASE_URL}/admin/users",
        cookies=cookies_user,
        data=payload,
        allow_redirects=False
    )

    # The request should either return 403 or a failure response, and the database must NOT be updated.
    assert resp_unauth_update.status_code in [403, 200, 302, 307, 308], \
        f"Expected rejection or redirect for unauthorized post, got {resp_unauth_update.status_code}"

    # Verify DB is unchanged
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT role FROM User WHERE email = 'user@example.com'")
        role = cursor.fetchone()[0]
        assert role == "USER", "Database was updated by an unauthorized user!"
    finally:
        conn.close()

    # 2. Perform update as ADMIN -> should succeed
    resp_auth_update = requests.post(
        f"{BASE_URL}/admin/users",
        cookies=cookies_admin,
        data=payload,
        allow_redirects=True
    )
    assert resp_auth_update.status_code == 200, f"Expected 200 OK for successful update, got {resp_auth_update.status_code}"

    # Verify database was updated
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT role FROM User WHERE email = 'user@example.com'")
        role = cursor.fetchone()[0]
        assert role == "ADMIN", f"Expected user@example.com role to be updated to ADMIN, but got {role}"
    finally:
        conn.close()

    # Verify updated role is visible on the page
    resp_admin_list = requests.get(f"{BASE_URL}/admin/users", cookies=cookies_admin)
    assert resp_admin_list.status_code == 200
    # Find user@example.com in the HTML and check its role is ADMIN
    # We can check that the text contains "user@example.com" and "ADMIN"
    assert "user@example.com" in resp_admin_list.text
    # Let's verify that the updated user can now access `/admin/users`!
    resp_new_admin = requests.get(f"{BASE_URL}/admin/users", cookies=cookies_user)
    assert resp_new_admin.status_code == 200, "The newly promoted ADMIN user was unable to access /admin/users"
