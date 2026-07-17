import os
import socket
import sqlite3
import json
import pytest
import requests
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/qwik-app"
DB_PATH = os.path.join(PROJECT_DIR, "form_builder.sqlite")
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik application using xprocess. Confirms readiness via port check.
    """
    class Starter(ProcessStarter):
        name = "start_app"
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
                # Try hitting the contact form endpoint to verify the app is fully ready
                resp = requests.get(f"{BASE_URL}/forms/contact_form", timeout=5)
                return resp.status_code == 200
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


def test_get_existing_form(start_app):
    """Verify GET /forms/:id renders the form correctly with all fields and labels."""
    url = f"{BASE_URL}/forms/contact_form"
    resp = requests.get(url)
    assert resp.status_code == 200, f"Expected status code 200, got {resp.status_code}"

    html = resp.text
    assert "<form" in html.lower(), "HTML response does not contain a <form> element"
    assert 'name="fullName"' in html, "HTML response is missing field 'fullName'"
    assert 'name="age"' in html, "HTML response is missing field 'age'"
    assert 'name="subscribe"' in html, "HTML response is missing field 'subscribe'"
    assert "<label" in html.lower(), "HTML response does not contain any <label> elements"


def test_get_non_existent_form(start_app):
    """Verify GET /forms/:id returns 404 for non-existent form IDs."""
    url = f"{BASE_URL}/forms/non_existent_form"
    resp = requests.get(url)
    assert resp.status_code == 404, f"Expected status code 404 for non-existent form, got {resp.status_code}"


def test_post_valid_submission_json(start_app):
    """Verify POST /forms/:id/submit accepts JSON, validates successfully, and persists to SQLite."""
    # Clean submissions table first
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM submissions WHERE form_id='contact_form';")
    conn.commit()
    conn.close()

    url = f"{BASE_URL}/forms/contact_form/submit"
    payload = {
        "fullName": "Wei Zhang",
        "age": 30,
        "subscribe": True
    }

    resp = requests.post(url, json=payload)
    assert resp.status_code in (200, 201), f"Expected status code 200 or 201, got {resp.status_code}"

    data = resp.json()
    assert data.get("success") is True, f"Expected success to be True, got {data}"
    submission_id = data.get("submissionId")
    assert isinstance(submission_id, int), f"Expected submissionId to be an integer, got {submission_id}"

    # Verify database persistence
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT form_id, data FROM submissions WHERE id=?;", (submission_id,))
    row = cursor.fetchone()
    conn.close()

    assert row is not None, f"Submission with ID {submission_id} not found in database"
    assert row[0] == "contact_form", f"Expected form_id to be 'contact_form', got {row[0]}"

    saved_data = json.loads(row[1])
    assert saved_data.get("fullName") == "Wei Zhang", f"Expected fullName to be 'Wei Zhang', got {saved_data.get('fullName')}"
    assert saved_data.get("age") == 30, f"Expected age to be 30, got {saved_data.get('age')}"
    assert saved_data.get("subscribe") is True, f"Expected subscribe to be True, got {saved_data.get('subscribe')}"


def test_post_valid_submission_urlencoded(start_app):
    """Verify POST /forms/:id/submit accepts URL-encoded form data, validates/parses, and persists."""
    url = f"{BASE_URL}/forms/contact_form/submit"
    payload = {
        "fullName": "Jane Doe",
        "age": "25",
        "subscribe": "on"
    }

    resp = requests.post(url, data=payload)
    assert resp.status_code in (200, 201), f"Expected status code 200 or 201, got {resp.status_code}"

    data = resp.json()
    assert data.get("success") is True, f"Expected success to be True, got {data}"
    submission_id = data.get("submissionId")
    assert isinstance(submission_id, int), f"Expected submissionId to be an integer, got {submission_id}"

    # Verify database persistence and type casting
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM submissions WHERE id=?;", (submission_id,))
    row = cursor.fetchone()
    conn.close()

    assert row is not None, f"Submission with ID {submission_id} not found in database"
    saved_data = json.loads(row[0])
    assert saved_data.get("fullName") == "Jane Doe", f"Expected fullName to be 'Jane Doe', got {saved_data.get('fullName')}"
    assert saved_data.get("age") == 25, f"Expected age to be parsed as number 25, got {saved_data.get('age')}"
    assert saved_data.get("subscribe") is True, f"Expected subscribe to be parsed as boolean True, got {saved_data.get('subscribe')}"


def test_post_validation_failures(start_app):
    """Verify POST /forms/:id/submit performs validation and returns 400 with detailed error messages."""
    url = f"{BASE_URL}/forms/contact_form/submit"
    payload = {
        "fullName": "Ab",  # minLength is 3
        "age": 15,         # min is 18
        "subscribe": False
    }

    resp = requests.post(url, json=payload)
    assert resp.status_code == 400, f"Expected status code 400 for validation failure, got {resp.status_code}"

    data = resp.json()
    assert data.get("success") is False, f"Expected success to be False, got {data}"
    errors = data.get("errors", {})
    assert "fullName" in errors, f"Expected validation error for 'fullName', got errors: {errors}"
    assert "age" in errors, f"Expected validation error for 'age', got errors: {errors}"


def test_post_missing_required_field(start_app):
    """Verify POST /forms/:id/submit fails if a required field is missing."""
    url = f"{BASE_URL}/forms/contact_form/submit"
    payload = {
        "age": 22
    }

    resp = requests.post(url, json=payload)
    assert resp.status_code == 400, f"Expected status code 400, got {resp.status_code}"

    data = resp.json()
    assert data.get("success") is False, f"Expected success to be False, got {data}"
    errors = data.get("errors", {})
    assert "fullName" in errors, f"Expected validation error for missing 'fullName', got errors: {errors}"


def test_browser_form_interaction(start_app, browser_verifier):
    """Verify that form can be filled and submitted via the browser UI."""
    reason = "The dynamic form page must render fields correctly, and submitting the form with valid data must return the success JSON response."
    truth = (
        f"Navigate to {BASE_URL}/forms/contact_form. "
        "Verify that input elements for 'fullName', 'age', and 'subscribe' are visible. "
        "Fill the 'fullName' field with 'Alice Smith'. "
        "Fill the 'age' field with '28'. "
        "Check the 'subscribe' checkbox. "
        "Submit the form. "
        "Verify that the page shows a JSON response containing '\"success\": true' and a 'submissionId'."
    )

    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_browser_form_interaction"
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"
