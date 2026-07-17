import os
import socket
import sqlite3
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-wizard"
DB_PATH = "/home/user/qwik-wizard/db/app.db"
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the dev server may listen on ::1 only while an AF_INET
# socket to 127.0.0.1 never connects -> readiness checks would hang.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

ACCOUNT_URL = f"{BASE_URL}/register/"
PROFILE_URL = f"{BASE_URL}/register/profile/"
REVIEW_URL = f"{BASE_URL}/register/review/"
SUCCESS_URL = f"{BASE_URL}/register/success/"


# --------------------------------------------------------------------------
# HTML helpers: parse the first <form> of a Qwik City page to find where a
# no-JS submission should be POSTed (Qwik encodes the action target in the
# form's `action` attribute, e.g. `?qaction=...`) plus any hidden inputs.
# --------------------------------------------------------------------------
class FirstFormParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_form = False
        self.done = False
        self.action = None
        self.method = None
        self.hidden = {}

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "form" and not self.done and not self.in_form:
            self.in_form = True
            self.action = d.get("action")
            self.method = (d.get("method") or "get").lower()
        elif tag == "input" and self.in_form:
            if (d.get("type") or "text").lower() == "hidden":
                name = d.get("name")
                if name is not None:
                    self.hidden[name] = d.get("value", "")

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag == "form" and self.in_form:
            self.in_form = False
            self.done = True


def path_of(url):
    return urlparse(url).path.rstrip("/")


def submit_step(session, step_url, data):
    """Emulate a no-JS native form submission for a wizard step.

    GET the step page, discover the form's POST target and hidden fields,
    then POST the provided field values, following any redirect.
    """
    get_resp = session.get(step_url, timeout=60)
    parser = FirstFormParser()
    parser.feed(get_resp.text)
    action = parser.action
    post_url = urljoin(step_url, action) if action else step_url
    payload = dict(parser.hidden)
    payload.update(data)
    return session.post(post_url, data=payload, timeout=120, allow_redirects=True)


def query_users(email):
    conn = sqlite3.connect(DB_PATH, timeout=30)
    try:
        conn.execute("PRAGMA busy_timeout=5000")
        cur = conn.execute(
            "SELECT email, password, full_name, age, country FROM users WHERE email = ?",
            (email,),
        )
        rows = cur.fetchall()
    finally:
        conn.close()
    return rows


# --------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------
@pytest.fixture(scope="session")
def start_app(xprocess):
    class Starter(ProcessStarter):
        name = "qwik_wizard"
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
        # CRITICAL: set `env` as a class attribute here, NEVER inside popen_kwargs.
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
                resp = requests.get(ACCOUNT_URL, timeout=30)
                return resp.status_code < 500
            except requests.RequestException:
                return False

    info = xprocess.getinfo(Starter.name)
    printed = 0

    def capture_logs(tag):
        nonlocal printed
        try:
            with open(info.logpath, "r") as f:
                lines = f.readlines()
        except OSError:
            return
        new = lines[printed:]
        printed = len(lines)
        print(f"===== [{tag}] {Starter.name} log =====")
        print("".join(new))
        print(f"===== [{tag}] end log =====")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield
    capture_logs("TEARDOWN")
    info.terminate()


@pytest.fixture(scope="module")
def clean_db(start_app):
    """Remove verifier-owned rows so the run is repeatable."""
    try:
        conn = sqlite3.connect(DB_PATH, timeout=30)
        try:
            conn.execute("PRAGMA busy_timeout=5000")
            conn.execute("DELETE FROM users WHERE email LIKE '%@verify.test'")
            conn.commit()
        finally:
            conn.close()
    except sqlite3.OperationalError:
        # Table may not exist yet if nothing has been persisted; nothing to clean.
        pass
    yield


@pytest.fixture(scope="module")
def alice_registration(clean_db):
    """Drive the full wizard for alice@verify.test and return the responses."""
    session = requests.Session()
    account = submit_step(
        session,
        ACCOUNT_URL,
        {
            "email": "alice@verify.test",
            "password": "Str0ngPass",
            "confirmPassword": "Str0ngPass",
        },
    )
    profile = submit_step(
        session,
        PROFILE_URL,
        {"fullName": "Alice Tester", "age": "30", "country": "Wonderland"},
    )
    review_html = session.get(REVIEW_URL, timeout=60).text
    # Final submit lives on the review step.
    success = submit_step(session, REVIEW_URL, {})
    return {
        "session": session,
        "account": account,
        "profile": profile,
        "review_html": review_html,
        "success": success,
    }


# --------------------------------------------------------------------------
# Happy path
# --------------------------------------------------------------------------
def test_account_step_advances_to_profile(alice_registration):
    resp = alice_registration["account"]
    assert resp.status_code == 200, (
        f"Account submission returned {resp.status_code}, body: {resp.text[:500]}"
    )
    assert path_of(resp.url) == "/register/profile", (
        f"Valid account step should redirect to /register/profile/, "
        f"but ended at {resp.url}"
    )


def test_profile_step_advances_to_review(alice_registration):
    resp = alice_registration["profile"]
    assert resp.status_code == 200, (
        f"Profile submission returned {resp.status_code}, body: {resp.text[:500]}"
    )
    assert path_of(resp.url) == "/register/review", (
        f"Valid profile step should redirect to /register/review/, "
        f"but ended at {resp.url}"
    )


def test_review_shows_entered_data_but_not_password(alice_registration):
    html = alice_registration["review_html"]
    for expected in ["alice@verify.test", "Alice Tester", "30", "Wonderland"]:
        assert expected in html, (
            f"Review page should display '{expected}' but it was not found."
        )
    assert "Str0ngPass" not in html, (
        "Review page must NOT display the plaintext password."
    )


def test_final_submit_reaches_success_page(alice_registration):
    resp = alice_registration["success"]
    assert resp.status_code == 200, (
        f"Final submission returned {resp.status_code}, body: {resp.text[:500]}"
    )
    assert path_of(resp.url) == "/register/success", (
        f"Final submission should redirect to /register/success/, "
        f"but ended at {resp.url}"
    )
    assert "alice@verify.test" in resp.text, (
        "Success page must show the registered email 'alice@verify.test'."
    )


def test_user_persisted_to_sqlite(alice_registration):
    rows = query_users("alice@verify.test")
    assert len(rows) == 1, (
        f"Expected exactly one users row for alice@verify.test, found {len(rows)}."
    )
    email, password, full_name, age, country = rows[0]
    assert full_name == "Alice Tester", f"Unexpected full_name: {full_name!r}"
    assert int(age) == 30, f"Unexpected age: {age!r}"
    assert country == "Wonderland", f"Unexpected country: {country!r}"
    assert password, "Stored password must be non-empty."
    assert password != "Str0ngPass", (
        "Password must be stored hashed, not as plaintext 'Str0ngPass'."
    )


# --------------------------------------------------------------------------
# Validation behavior
# --------------------------------------------------------------------------
def test_email_uniqueness_rejected(alice_registration):
    session = requests.Session()
    resp = submit_step(
        session,
        ACCOUNT_URL,
        {
            "email": "alice@verify.test",
            "password": "Str0ngPass",
            "confirmPassword": "Str0ngPass",
        },
    )
    assert resp.status_code == 200
    assert path_of(resp.url) == "/register", (
        "Registering an already-used email must NOT advance to the profile step; "
        f"ended at {resp.url}"
    )
    assert 'name="email"' in resp.text, (
        "Account step should re-render its form on a uniqueness failure."
    )
    rows = query_users("alice@verify.test")
    assert len(rows) == 1, (
        f"Duplicate email must not create another row; found {len(rows)}."
    )


def test_weak_password_rejected(clean_db):
    session = requests.Session()
    resp = submit_step(
        session,
        ACCOUNT_URL,
        {
            "email": "weak@verify.test",
            "password": "weak",
            "confirmPassword": "weak",
        },
    )
    assert resp.status_code == 200
    assert path_of(resp.url) == "/register", (
        f"A weak password must not advance the wizard; ended at {resp.url}"
    )
    assert 'name="email"' in resp.text, (
        "Account step should re-render its form on a password strength failure."
    )
    assert len(query_users("weak@verify.test")) == 0, (
        "A rejected weak-password registration must not persist a user."
    )


def test_password_mismatch_rejected(clean_db):
    session = requests.Session()
    resp = submit_step(
        session,
        ACCOUNT_URL,
        {
            "email": "mismatch@verify.test",
            "password": "Str0ngPass",
            "confirmPassword": "Different1",
        },
    )
    assert resp.status_code == 200
    assert path_of(resp.url) == "/register", (
        f"Mismatched passwords must not advance the wizard; ended at {resp.url}"
    )
    assert 'name="email"' in resp.text, (
        "Account step should re-render its form on a confirmation mismatch."
    )
    assert len(query_users("mismatch@verify.test")) == 0, (
        "A rejected mismatch registration must not persist a user."
    )


def test_underage_rejected_on_profile_step(clean_db):
    session = requests.Session()
    account = submit_step(
        session,
        ACCOUNT_URL,
        {
            "email": "teen@verify.test",
            "password": "Str0ngPass",
            "confirmPassword": "Str0ngPass",
        },
    )
    assert path_of(account.url) == "/register/profile", (
        f"Valid account step for teen should reach the profile step; got {account.url}"
    )
    resp = submit_step(
        session,
        PROFILE_URL,
        {"fullName": "Teen User", "age": "15", "country": "Nowhere"},
    )
    assert resp.status_code == 200
    assert path_of(resp.url) == "/register/profile", (
        f"An under-18 age must not advance to review; ended at {resp.url}"
    )
    assert 'name="age"' in resp.text, (
        "Profile step should re-render its form on an age validation failure."
    )
    assert len(query_users("teen@verify.test")) == 0, (
        "An incomplete/rejected registration must not persist a user."
    )


# --------------------------------------------------------------------------
# Back navigation preserves data
# --------------------------------------------------------------------------
def test_back_navigation_preserves_account_data(clean_db):
    session = requests.Session()
    account = submit_step(
        session,
        ACCOUNT_URL,
        {
            "email": "carol@verify.test",
            "password": "Str0ngPass",
            "confirmPassword": "Str0ngPass",
        },
    )
    assert path_of(account.url) == "/register/profile", (
        f"Carol's valid account step should reach the profile step; got {account.url}"
    )
    back = session.get(ACCOUNT_URL, timeout=60)
    assert back.status_code == 200
    assert "carol@verify.test" in back.text, (
        "Navigating back to the account step must re-display the previously "
        "entered email (partial progress persisted server-side)."
    )
