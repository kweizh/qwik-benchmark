import os
import socket
import time
import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"
DB_PATH = os.path.join(PROJECT_DIR, "database.sqlite")

@pytest.fixture(scope="session", autouse=True)
def clean_database_before_suite():
    """Ensure the database is clean before the test suite starts."""
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except Exception as e:
            print(f"Warning: could not remove database file: {e}")

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik application using xprocess. Confirms readiness via port check.
    """
    class Starter(ProcessStarter):
        name = "qwik_app"
        args = ["npm", "run", "dev", "--", "--host", HOST, "--port", str(PORT)]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 120
        terminate_on_interrupt = True

        def startup_check(self):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            try:
                # Ping the server to ensure it is serving requests
                resp = requests.get(f"{BASE_URL}/posts/test_ping/comments", headers={"Accept": "application/json"}, timeout=5)
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
            print(f"============================== [{tag}] Captured {Starter.name} logfile ==============================")
            print("".join(new_lines))
            print(f"====================================================================================================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTUP STATUS: " + ("SUCCESS" if started else "FAILED"))

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def test_empty_comments(start_app):
    """Verify that a post with no comments returns an empty JSON list."""
    post_id = "post_empty_test"
    url = f"{BASE_URL}/posts/{post_id}/comments"
    headers = {"Accept": "application/json"}

    response = requests.get(url, headers=headers)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}. Response: {response.text}"

    data = response.json()
    assert isinstance(data, list), "Expected response to be a JSON array."
    assert len(data) == 0, f"Expected empty array for post with no comments, got {data}"


def test_comment_lifecycle_and_nested_tree(start_app):
    """Verify the creation of comments, nested replies, sorting, and tree retrieval."""
    post_id = "post_lifecycle_test"
    url = f"{BASE_URL}/posts/{post_id}/comments"
    headers = {"Accept": "application/json", "Content-Type": "application/json"}

    # 1. Create a top-level comment
    c1_payload = {
        "parentId": None,
        "text": "First top-level comment",
        "author": "Alice"
    }
    r1 = requests.post(url, json=c1_payload, headers=headers)
    assert r1.status_code == 201, f"Expected 201 Created, got {r1.status_code}. Response: {r1.text}"
    c1 = r1.json()
    assert c1.get("id") is not None, "Created comment must have an ID"
    assert c1.get("postId") == post_id, f"Expected postId to be {post_id}"
    assert c1.get("parentId") is None, "Expected parentId to be None"
    assert c1.get("text") == c1_payload["text"]
    assert c1.get("author") == c1_payload["author"]
    assert "createdAt" in c1, "Expected createdAt timestamp in response"
    c1_id = c1["id"]

    # 2. Create another top-level comment (to test sorting later)
    # Sleep slightly to ensure distinct timestamps if DB uses second resolution
    time.sleep(1)
    c2_payload = {
        "parentId": None,
        "text": "Second top-level comment",
        "author": "Bob"
    }
    r2 = requests.post(url, json=c2_payload, headers=headers)
    assert r2.status_code == 201, "Expected 201 Created for second top-level comment"
    c2 = r2.json()
    c2_id = c2["id"]

    # 3. Create a reply to the first top-level comment
    r3_payload = {
        "parentId": c1_id,
        "text": "Reply to first comment",
        "author": "Charlie"
    }
    r3 = requests.post(url, json=r3_payload, headers=headers)
    assert r3.status_code == 201, "Expected 201 Created for reply"
    c3 = r3.json()
    assert c3.get("parentId") == c1_id, f"Expected parentId to be {c1_id}"
    c3_id = c3["id"]

    # 4. Create a deeply nested reply (reply to the reply)
    time.sleep(1)
    r4_payload = {
        "parentId": c3_id,
        "text": "Deep reply",
        "author": "David"
    }
    r4 = requests.post(url, json=r4_payload, headers=headers)
    assert r4.status_code == 201, "Expected 201 Created for deep reply"
    c4 = r4.json()
    assert c4.get("parentId") == c3_id, f"Expected parentId to be {c3_id}"
    c4_id = c4["id"]

    # 5. Create another reply to the first top-level comment (to check chronological sorting of replies)
    time.sleep(1)
    r5_payload = {
        "parentId": c1_id,
        "text": "Second reply to first comment",
        "author": "Eve"
    }
    r5 = requests.post(url, json=r5_payload, headers=headers)
    assert r5.status_code == 201, "Expected 201 Created for second reply"
    c5 = r5.json()
    c5_id = c5["id"]

    # 6. Retrieve the comment tree and verify structure and sorting
    resp = requests.get(url, headers={"Accept": "application/json"})
    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"
    tree = resp.json()

    # We expect exactly 2 top-level comments, sorted chronologically (c1, then c2)
    assert len(tree) == 2, f"Expected exactly 2 top-level comments, got {len(tree)}"
    assert tree[0]["id"] == c1_id, f"Expected first top-level comment to be ID {c1_id}"
    assert tree[1]["id"] == c2_id, f"Expected second top-level comment to be ID {c2_id}"

    # Verify replies of c1
    c1_replies = tree[0].get("replies", [])
    assert len(c1_replies) == 2, f"Expected c1 to have exactly 2 replies, got {len(c1_replies)}"
    # Sorted chronologically: c3 (reply 1), then c5 (reply 2)
    assert c1_replies[0]["id"] == c3_id, f"Expected first reply to be {c3_id}"
    assert c1_replies[1]["id"] == c5_id, f"Expected second reply to be {c5_id}"

    # Verify deeply nested reply under c3
    c3_replies = c1_replies[0].get("replies", [])
    assert len(c3_replies) == 1, f"Expected c3 to have exactly 1 reply, got {len(c3_replies)}"
    assert c3_replies[0]["id"] == c4_id, f"Expected deep reply to be {c4_id}"
    assert len(c3_replies[0].get("replies", [])) == 0, "Expected c4 to have 0 replies"


def test_invalid_parent_id(start_app):
    """Verify that posting a reply with a non-existent parentId returns an error status code."""
    post_id = "post_invalid_test"
    url = f"{BASE_URL}/posts/{post_id}/comments"
    headers = {"Accept": "application/json", "Content-Type": "application/json"}

    payload = {
        "parentId": 999999,
        "text": "This reply has an invalid parentId",
        "author": "Ghost"
    }
    response = requests.post(url, json=payload, headers=headers)
    assert response.status_code in [400, 404], \
        f"Expected 400 Bad Request or 404 Not Found for invalid parentId, got {response.status_code}"


def test_html_rendering(start_app):
    """Verify that requesting GET /posts/:id/comments without Accept: application/json returns the HTML page containing the comments."""
    post_id = "post_html_test"
    url = f"{BASE_URL}/posts/{post_id}/comments"

    # First, seed a comment so we can assert its presence in the HTML
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    payload = {
        "parentId": None,
        "text": "Unique comment string for HTML verification",
        "author": "HtmlTester"
    }
    r = requests.post(url, json=payload, headers=headers)
    assert r.status_code == 201, "Failed to seed comment for HTML test"

    # Now request standard HTML page
    response = requests.get(url)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
    assert "text/html" in response.headers.get("Content-Type", ""), "Expected Content-Type to contain text/html"

    html_content = response.text
    assert "Unique comment string for HTML verification" in html_content, \
        "Expected seeded comment text to be rendered in the HTML response."
    assert "HtmlTester" in html_content, \
        "Expected seeded comment author to be rendered in the HTML response."
