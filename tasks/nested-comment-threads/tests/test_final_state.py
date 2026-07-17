import os
import socket
import sqlite3

import pytest
import requests
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/qwik-comments"
DB_PATH = "/home/user/qwik-comments/comments.db"
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the dev server may listen on ::1 only while an AF_INET
# socket to 127.0.0.1 never connects -> the readiness check would hang for the
# full timeout and raise a confusing TimeoutError.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"


@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()


@pytest.fixture(scope="session")
def start_app(xprocess):
    """Start the Qwik City dev server with a freshly seeded database."""
    # Ensure a clean, freshly seeded database before the app starts.
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    class Starter(ProcessStarter):
        name = "qwik_comments"
        # `--host 127.0.0.1` forces Vite to bind the IPv4 loopback so it matches
        # the address the readiness check and the browser tests connect to.
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
        # CRITICAL: set `env` as a class attribute here, NEVER inside `popen_kwargs`.
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
            # The first request triggers on-demand bundling, so allow more time.
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
            all_lines = []
        new_lines = all_lines[printed_log_lines:]
        skipped = printed_log_lines
        printed_log_lines = len(all_lines)
        print(f"===================== [{tag}: Begin] {Starter.name} logfile =====================")
        if skipped > 0:
            print(f"(skipped {skipped} already-printed lines)")
        print("".join(new_lines))
        print(f"===================== [{tag}: End  ] {Starter.name} logfile =====================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def _query_db(query, params=()):
    """Open the SQLite database read-only and run a query."""
    assert os.path.isfile(DB_PATH), f"SQLite database not found at {DB_PATH}"
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    try:
        conn.row_factory = sqlite3.Row
        cur = conn.execute(query, params)
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def _get_id(author, body):
    rows = _query_db(
        "SELECT id FROM comments WHERE author = ? AND body = ?",
        (author, body),
    )
    assert len(rows) == 1, (
        f"Expected exactly one comment by '{author}' with body '{body}', "
        f"found {len(rows)}."
    )
    return rows[0]["id"]


def test_initial_render_and_reply_counts(start_app, browser_verifier):
    reason = (
        "The homepage renders all comments as an arbitrarily deep nested tree "
        "loaded from the server, and each comment shows the total number of its "
        "nested replies (all descendants)."
    )
    truth = (
        f"Navigate to {BASE_URL}. Verify these four comments are all shown: "
        "a comment by 'alice' with text 'Welcome to the thread', a comment by "
        "'bob' with text 'Thanks alice!', a comment by 'carol' with text "
        "'Agreed, great start', and a comment by 'dave' with text 'Separate "
        "top-level thought'. Verify the tree is nested: bob's comment is a reply "
        "nested inside alice's comment, and carol's comment is a reply nested "
        "inside bob's comment, while dave's comment is a separate top-level "
        "comment (not nested under alice). Verify the displayed reply counts: "
        "alice's comment shows a total of 2 nested replies, bob's comment shows "
        "1 nested reply, carol's comment shows 0 replies, and dave's comment "
        "shows 0 replies. If a count is not visible as text, it is available in "
        "each comment element via the 'data-reply-count' attribute."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_initial_render_and_reply_counts",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"


def test_add_nested_reply(start_app, browser_verifier):
    reason = (
        "Submitting the reply form on a specific comment adds a nested child "
        "reply to that comment and updates the reply counts up the tree."
    )
    truth = (
        f"Navigate to {BASE_URL}. Locate the reply form that belongs to bob's "
        "comment ('Thanks alice!'). In that form, type 'erin' into the input "
        "named 'author' and 'Nice point bob' into the input named 'body', then "
        "submit the form. After submitting, verify a new comment by 'erin' with "
        "text 'Nice point bob' appears nested as a reply under bob's comment (at "
        "the same nesting level as carol's comment). Verify the reply counts "
        "update: bob's comment now shows a total of 2 nested replies and alice's "
        "comment now shows a total of 3 nested replies."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_add_nested_reply",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"


def test_reply_persisted_in_sqlite(start_app):
    # The previous browser test added erin as a reply to bob; verify persistence.
    bob_id = _get_id("bob", "Thanks alice!")
    erin_rows = _query_db(
        "SELECT id, parent_id, author, body FROM comments "
        "WHERE author = ? AND body = ?",
        ("erin", "Nice point bob"),
    )
    assert len(erin_rows) == 1, (
        "Expected exactly one persisted comment by 'erin' with body "
        f"'Nice point bob', found {len(erin_rows)}."
    )
    assert erin_rows[0]["parent_id"] == bob_id, (
        "Expected erin's reply to have parent_id equal to bob's id "
        f"({bob_id}), got {erin_rows[0]['parent_id']}."
    )
    total = _query_db("SELECT COUNT(*) AS n FROM comments")[0]["n"]
    assert total == 5, f"Expected exactly 5 comments in the database, found {total}."


def test_collapse_and_expand_subtree(start_app, browser_verifier):
    reason = (
        "Each comment that has replies provides a toggle control that collapses "
        "and expands its descendant subtree."
    )
    truth = (
        f"Navigate to {BASE_URL}. Find alice's comment ('Welcome to the thread') "
        "and click its collapse/expand toggle control (a button on alice's "
        "comment; it may carry a 'data-testid' attribute of 'toggle-<id>' where "
        "<id> is alice's comment id). After clicking to collapse, verify that "
        "the replies under alice (bob's comment 'Thanks alice!', carol's comment "
        "'Agreed, great start', and erin's comment 'Nice point bob') are no "
        "longer visible on the page, while dave's top-level comment ('Separate "
        "top-level thought') is still visible. Then click the same toggle again "
        "to expand, and verify that bob's, carol's, and erin's comments become "
        "visible again."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_collapse_and_expand_subtree",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"


def test_validation_rejects_empty_body(start_app, browser_verifier):
    reason = (
        "Replies are validated server-side with zod; a submission with an empty "
        "body is rejected with a visible error and is not persisted."
    )
    truth = (
        f"Navigate to {BASE_URL}. Locate the reply form that belongs to dave's "
        "comment ('Separate top-level thought'). In that form, type 'frank' into "
        "the input named 'author', leave the 'body' input empty, and submit the "
        "form. Verify that a validation error message is shown and that no new "
        "reply appears under dave's comment (dave's comment still shows 0 "
        "replies and there is no comment by 'frank' anywhere on the page)."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_validation_rejects_empty_body",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"


def test_invalid_submission_not_persisted(start_app):
    # The invalid submission (author 'frank', empty body) must not create a row.
    frank_rows = _query_db(
        "SELECT id FROM comments WHERE author = ?",
        ("frank",),
    )
    assert len(frank_rows) == 0, (
        "Expected no comment by 'frank' to be persisted after the invalid "
        f"submission, found {len(frank_rows)}."
    )
    total = _query_db("SELECT COUNT(*) AS n FROM comments")[0]["n"]
    assert total == 5, (
        f"Expected exactly 5 comments after the rejected submission, found {total}."
    )
