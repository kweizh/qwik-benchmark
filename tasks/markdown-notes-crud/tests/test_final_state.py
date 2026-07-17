import os
import re
import socket
from html.parser import HTMLParser

import pytest
import requests
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/qwik-notes"
PORT = 5173
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the dev server would listen on ::1 only while an
# AF_INET socket to 127.0.0.1 never connects -> the readiness check would hang
# for the full timeout and raise a confusing TimeoutError.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"
NOTES_URL = f"{BASE_URL}/notes"


class _NoteLinkParser(HTMLParser):
    """Collect anchors whose href points at /notes/<id> and their text."""

    def __init__(self):
        super().__init__()
        self._current_href = None
        self._current_text = []
        self.links = []  # list of (href, text)

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            href = dict(attrs).get("href", "")
            if href and re.match(r"^/notes/\d+/?$", href.split("?")[0]):
                self._current_href = href.split("?")[0].rstrip("/")
                self._current_text = []

    def handle_data(self, data):
        if self._current_href is not None:
            self._current_text.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self._current_href is not None:
            text = "".join(self._current_text).strip()
            self.links.append((self._current_href, text))
            self._current_href = None
            self._current_text = []


def _get_note_links():
    resp = requests.get(NOTES_URL, timeout=30)
    assert resp.status_code == 200, (
        f"GET {NOTES_URL} returned {resp.status_code}, expected 200."
    )
    parser = _NoteLinkParser()
    parser.feed(resp.text)
    return parser.links


def _find_href_by_title(title):
    for href, text in _get_note_links():
        if text == title:
            return href
    return None


@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()


@pytest.fixture(scope="session")
def start_app(xprocess):
    class Starter(ProcessStarter):
        name = "qwik_notes"
        # `npm run dev` maps to `vite --mode ssr`; the extra args force the dev
        # server onto a deterministic IPv4 host/port that the tests connect to.
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
        # CRITICAL: set `env` as a class attribute here, NEVER inside
        # `popen_kwargs`. Otherwise, `Popen` raises `TypeError: got multiple
        # values for keyword argument 'env'`.
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
            # The first request triggers on-demand bundling by Vite, so allow a
            # generous timeout. Accept any non-5xx status.
            try:
                resp = requests.get(NOTES_URL, timeout=60)
                return resp.status_code < 500
            except requests.RequestException:
                return False

    info = xprocess.getinfo(Starter.name)
    printed_log_lines = 0

    def capture_logs(tag):
        nonlocal printed_log_lines
        with open(info.logpath, "r") as f:
            all_lines = f.readlines()
        new_lines = all_lines[printed_log_lines:]
        skipped = printed_log_lines
        printed_log_lines = len(all_lines)
        print(f"==================== [{tag}: Begin] {Starter.name} log ====================")
        if skipped > 0:
            print(f"(skipped {skipped} already-printed lines)")
        print("".join(new_lines))
        print(f"==================== [{tag}: End  ] {Starter.name} log ====================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def test_notes_list_loads(start_app):
    """Truth step 1: /notes loads with status 200."""
    resp = requests.get(NOTES_URL, timeout=30)
    assert resp.status_code == 200, (
        f"GET {NOTES_URL} returned {resp.status_code}, expected 200."
    )


def test_create_notes_via_browser(start_app, browser_verifier):
    """Truth step 2: create notes through the Qwik create form (routeAction$)."""
    reason = (
        "The /notes page must let a user create a new note via a form backed by a "
        "Qwik City routeAction$, persist it to SQLite, and show it in the list "
        "loaded by a routeLoader$."
    )
    truth = (
        f"Navigate to {NOTES_URL}. Using the create-note form on the page, add a "
        "note with title 'Grocery List' and content:\n"
        "# Shopping\n\n- Milk\n- Eggs\n"
        "Submit the form. Then add a second note with title 'Danger' and content:\n"
        "Hello <script>window.__xss=1</script> world\n"
        f"Submit that form too. Finally verify that {NOTES_URL} shows two links, one "
        "with the text 'Grocery List' and one with the text 'Danger'."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_create_notes_via_browser",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"

    # Sanity check via HTTP that both notes are now present.
    titles = [text for _, text in _get_note_links()]
    assert "Grocery List" in titles, (
        f"'Grocery List' link not found on /notes after creation; got {titles}"
    )
    assert "Danger" in titles, (
        f"'Danger' link not found on /notes after creation; got {titles}"
    )


def test_detail_renders_sanitized_markdown_html(start_app):
    """Truth step 3: /notes/<id> renders Markdown as real HTML elements."""
    href = _find_href_by_title("Grocery List")
    assert href is not None, "Could not find the 'Grocery List' note link on /notes."
    resp = requests.get(BASE_URL + href, timeout=30)
    assert resp.status_code == 200, (
        f"GET {BASE_URL + href} returned {resp.status_code}, expected 200."
    )
    html = resp.text
    assert re.search(r"<h1[^>]*>\s*Shopping", html), (
        "Expected the Markdown '# Shopping' to render as an <h1> element with text "
        "'Shopping' on the note detail page."
    )
    assert "<li" in html, "Expected the Markdown list to render as <li> elements."
    assert "Milk" in html and "Eggs" in html, (
        "Expected list item text 'Milk' and 'Eggs' to appear on the detail page."
    )
    # The raw Markdown source must not be shown verbatim (i.e. it was converted).
    assert "# Shopping" not in html, (
        "Found raw '# Shopping' Markdown text; content was not converted to HTML."
    )


def test_detail_sanitizes_dangerous_html(start_app):
    """Truth step 4: dangerous <script> content is stripped/neutralized."""
    href = _find_href_by_title("Danger")
    assert href is not None, "Could not find the 'Danger' note link on /notes."
    resp = requests.get(BASE_URL + href, timeout=30)
    assert resp.status_code == 200, (
        f"GET {BASE_URL + href} returned {resp.status_code}, expected 200."
    )
    html = resp.text
    # Surrounding text must still be visible.
    assert "Hello" in html and "world" in html, (
        "Expected the sanitized note content text 'Hello' and 'world' to be visible."
    )
    # The injected script must not survive as an executable, unescaped tag.
    assert "<script>window.__xss=1</script>" not in html, (
        "The injected <script> from the note content was NOT sanitized; it appears "
        "verbatim in the rendered HTML (XSS vulnerability)."
    )
    assert "<script>window.__xss" not in html, (
        "An unescaped <script> tag from the note content survived sanitization."
    )


def test_create_validation_rejects_blank_title(start_app, browser_verifier):
    """Truth step 5: zod$ validation rejects a blank title."""
    before = [text for _, text in _get_note_links()]
    reason = (
        "Creating a note must be validated server-side with zod$. Submitting the "
        "create form with a blank title must be rejected without writing to the "
        "database, and the form should indicate a validation error."
    )
    truth = (
        f"Navigate to {NOTES_URL}. In the create-note form, leave the title field "
        "empty and type 'this should be rejected' into the content field, then submit "
        "the form. Verify that the submission is rejected: no new note is added to the "
        "list and the page shows a validation error (or otherwise indicates the title "
        "is required) instead of creating a note."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_create_validation_rejects_blank_title",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"

    after = [text for _, text in _get_note_links()]
    assert len(after) == len(before), (
        f"A note was created despite a blank title. Before: {before}, After: {after}"
    )


def test_edit_updates_note_via_browser(start_app, browser_verifier):
    """Truth step 6: edit page updates a note via routeAction$."""
    reason = (
        "The /notes/<id>/edit page must load the existing note into a form and update "
        "it through a Qwik City routeAction$, reflecting the change everywhere."
    )
    truth = (
        f"Navigate to {NOTES_URL} and open the editor for the note titled "
        "'Grocery List' (via its edit page at /notes/<id>/edit). Verify the form is "
        "pre-filled with the title 'Grocery List'. Change the title field to "
        "'Weekly Groceries' and submit the form. Then verify that the note now shows "
        f"the title 'Weekly Groceries', and that on {NOTES_URL} a link with text "
        "'Weekly Groceries' now exists while 'Grocery List' no longer appears."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_edit_updates_note_via_browser",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"

    titles = [text for _, text in _get_note_links()]
    assert "Weekly Groceries" in titles, (
        f"'Weekly Groceries' not found on /notes after edit; got {titles}"
    )
    assert "Grocery List" not in titles, (
        f"'Grocery List' should be gone after rename; got {titles}"
    )


def test_delete_note_via_browser(start_app, browser_verifier):
    """Truth step 7: delete removes a note via routeAction$."""
    reason = (
        "The /notes list must let a user delete a note through a Qwik City "
        "routeAction$, removing it from SQLite and from the list."
    )
    truth = (
        f"Navigate to {NOTES_URL}. Delete the note titled 'Danger' using its delete "
        f"control/button on the list. Then verify that on {NOTES_URL} there is no "
        "longer any link with the text 'Danger'."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_delete_note_via_browser",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"

    titles = [text for _, text in _get_note_links()]
    assert "Danger" not in titles, (
        f"'Danger' note should be deleted; still present: {titles}"
    )


def test_unknown_note_returns_404(start_app):
    """Truth step 8: an unknown note id responds with HTTP 404."""
    resp = requests.get(f"{BASE_URL}/notes/999999", timeout=30)
    assert resp.status_code == 404, (
        f"GET /notes/999999 returned {resp.status_code}, expected 404 for an unknown "
        "note id."
    )
