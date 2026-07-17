import os
import socket
import sqlite3
import pytest
import requests
import concurrent.futures
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/qwik-app"
DB_PATH = os.path.join(PROJECT_DIR, "poll.db")
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik development server using xprocess. Confirms readiness via port check.
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
            # Check if port is open
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            # Check if Qwik is responding
            try:
                resp = requests.get(f"{BASE_URL}/poll/frameworks", timeout=10)
                # Any non-5xx status means the server is up and routing is working
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


def test_get_poll_pages(start_app):
    """Verify that poll pages load successfully and render correct elements."""
    # Test valid poll: frameworks
    resp = requests.get(f"{BASE_URL}/poll/frameworks")
    assert resp.status_code == 200, f"Expected 200 OK for /poll/frameworks, got {resp.status_code}"
    html = resp.text

    assert "What is your favorite frontend framework?" in html, "Poll question not found in HTML"
    assert 'id="poll-question"' in html, "Element with id='poll-question' is missing"
    assert 'id="poll-chart"' in html, "SVG with id='poll-chart' is missing"
    assert 'width="500"' in html, "SVG chart width must be 500"
    assert 'height="300"' in html, "SVG chart height must be 300"

    # Check for presence of vote buttons and class name
    assert 'class="vote-button"' in html, "Vote buttons with class='vote-button' are missing"
    assert 'data-option-id="1"' in html, "Option 1 button or element is missing"
    assert 'data-option-id="2"' in html, "Option 2 button or element is missing"

    # Test valid poll: colors
    resp = requests.get(f"{BASE_URL}/poll/colors")
    assert resp.status_code == 200, f"Expected 200 OK for /poll/colors, got {resp.status_code}"
    assert "What is your favorite primary color?" in resp.text, "Poll question for 'colors' not found"

    # Test invalid poll
    resp = requests.get(f"{BASE_URL}/poll/invalid-poll-id")
    assert resp.status_code == 404, f"Expected 404 Not Found for invalid poll ID, got {resp.status_code}"


def test_vote_api_validation(start_app):
    """Verify API input validation and error responses."""
    # Invalid Option ID (non-existent option)
    resp = requests.post(
        f"{BASE_URL}/poll/frameworks/vote",
        json={"optionId": 999},
        headers={"X-Forwarded-For": "100.100.100.1"}
    )
    assert resp.status_code in [404, 400], f"Expected 404 or 400 for non-existent option, got {resp.status_code}"
    assert "error" in resp.json(), "Response should contain an error message"

    # Invalid Option ID (wrong type/missing)
    resp = requests.post(
        f"{BASE_URL}/poll/frameworks/vote",
        json={"optionId": "not-a-number"},
        headers={"X-Forwarded-For": "100.100.100.2"}
    )
    assert resp.status_code == 400, f"Expected 400 Bad Request for invalid optionId type, got {resp.status_code}"
    assert "error" in resp.json()

    # Missing optionId
    resp = requests.post(
        f"{BASE_URL}/poll/frameworks/vote",
        json={},
        headers={"X-Forwarded-For": "100.100.100.3"}
    )
    assert resp.status_code == 400, f"Expected 400 Bad Request for missing optionId, got {resp.status_code}"


def test_vote_flow_and_rate_limiting(start_app):
    """Verify voting success, database persistence, and rate limiting."""
    # Reset any previous votes for option 1 (Qwik) in SQLite for determinism
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE options SET votes = 0 WHERE id = 1;")
    cursor.execute("DELETE FROM votes_log WHERE poll_id = 'frameworks';")
    conn.commit()
    conn.close()

    # Vote 1: IP 1.2.3.4
    resp = requests.post(
        f"{BASE_URL}/poll/frameworks/vote",
        json={"optionId": 1},
        headers={"X-Forwarded-For": "1.2.3.4"}
    )
    assert resp.status_code == 200, f"First vote failed: {resp.text}"
    data = resp.json()
    assert data["success"] is True
    assert data["votes"]["1"] == 1, f"Expected 1 vote for option 1, got {data['votes']['1']}"

    # Vote 2: IP 1.2.3.4 (Immediate duplicate - should be rate limited)
    resp = requests.post(
        f"{BASE_URL}/poll/frameworks/vote",
        json={"optionId": 1},
        headers={"X-Forwarded-For": "1.2.3.4"}
    )
    assert resp.status_code == 429, f"Expected 429 Too Many Requests for rate limit, got {resp.status_code}"
    assert resp.json()["error"] == "Rate limit exceeded"

    # Vote 3: IP 5.6.7.8 (Different IP - should succeed)
    resp = requests.post(
        f"{BASE_URL}/poll/frameworks/vote",
        json={"optionId": 1},
        headers={"X-Forwarded-For": "5.6.7.8"}
    )
    assert resp.status_code == 200, f"Vote from different IP failed: {resp.text}"
    data = resp.json()
    assert data["success"] is True
    assert data["votes"]["1"] == 2, f"Expected 2 votes for option 1, got {data['votes']['1']}"

    # Verify database state directly
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT votes FROM options WHERE id = 1;")
    votes = cursor.fetchone()[0]
    conn.close()
    assert votes == 2, f"Expected database to have 2 votes for option 1, found {votes}"


def test_concurrency(start_app):
    """Verify that concurrent votes from different IPs are processed correctly without race conditions."""
    # Reset votes for option 3 (Vue)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE options SET votes = 0 WHERE id = 3;")
    cursor.execute("DELETE FROM votes_log WHERE poll_id = 'frameworks';")
    conn.commit()
    conn.close()

    num_threads = 20
    ips = [f"10.0.0.{i}" for i in range(1, num_threads + 1)]

    def cast_vote(ip):
        try:
            resp = requests.post(
                f"{BASE_URL}/poll/frameworks/vote",
                json={"optionId": 3},
                headers={"X-Forwarded-For": ip},
                timeout=5
            )
            return resp.status_code
        except Exception as e:
            return str(e)

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        results = list(executor.map(cast_vote, ips))

    # Assert all concurrent requests succeeded with 200
    assert results == [200] * num_threads, f"Some concurrent requests failed: {results}"

    # Verify database has exactly 20 votes
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT votes FROM options WHERE id = 3;")
    votes = cursor.fetchone()[0]
    conn.close()
    assert votes == num_threads, f"Expected exactly {num_threads} votes, but found {votes} in database."


def test_browser_ui_verification(start_app, browser_verifier):
    """Verify frontend rendering and dynamic updates using PochiVerifier."""
    # Reset votes for poll 'colors' to 0 for option 5 (Red)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE options SET votes = 0 WHERE id = 5;")
    cursor.execute("DELETE FROM votes_log WHERE poll_id = 'colors';")
    conn.commit()
    conn.close()

    reason = "The poll page should render the question, an SVG bar chart of results, and allow casting a vote which dynamically updates the SVG chart."
    truth = (
        f"Navigate to {BASE_URL}/poll/colors. "
        "Verify that the element with id 'poll-question' contains 'What is your favorite primary color?'. "
        "Verify that the SVG with id 'poll-chart' is visible. "
        "Find the vote button with data-option-id '5' (for Red) and click it. "
        "Verify that the vote count text with data-option-id '5' inside the SVG chart is updated to '1' or contains '1'. "
        "Verify that the SVG rect with data-option-id '5' now has a width greater than 0."
    )

    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_polling_system_ui"
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"
