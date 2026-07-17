import os
import re
import socket
import subprocess
from html.parser import HTMLParser
from urllib.parse import urljoin

import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-blog"
DIST_DIR = os.path.join(PROJECT_DIR, "dist")
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the dev server would listen on ::1 only while an
# AF_INET socket to 127.0.0.1 never connects -> readiness checks would hang.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

SEED_POSTS = [
    ("Welcome to Qwik", "Qwik delivers instant-loading web applications through resumability."),
    ("Understanding Resumability", "Resumability lets the app pause on the server and resume on the client without hydration."),
    ("Server-Side Data with routeLoader", "routeLoader fetches data on the server before rendering the route."),
]

NEW_TITLE = "Fine-grained Reactivity"
NEW_CONTENT = "Signals update only the DOM nodes that reference them."

FORBIDDEN_CLIENT_STRINGS = ["PrismaClient", "@prisma/client", "better-sqlite3"]


class _FormCollector(HTMLParser):
    """Collects every <form> with its action attribute and the set of field
    names (input/textarea/select) declared inside it."""

    def __init__(self):
        super().__init__()
        self.forms = []  # list of dicts: {"action": str, "fields": set[str]}
        self._current = None

    def handle_starttag(self, tag, attrs):
        attrs_d = {k: (v or "") for k, v in attrs}
        if tag == "form":
            self._current = {"action": attrs_d.get("action", ""), "fields": set()}
        elif tag in ("input", "textarea", "select") and self._current is not None:
            name = attrs_d.get("name")
            if name:
                self._current["fields"].add(name)

    def handle_endtag(self, tag):
        if tag == "form" and self._current is not None:
            self.forms.append(self._current)
            self._current = None


def _find_create_form(html):
    parser = _FormCollector()
    parser.feed(html)
    for form in parser.forms:
        if "title" in form["fields"] and "content" in form["fields"]:
            return form
    return None


def _post_ids(html):
    """Return the ordered list of post ids referenced by /posts/<id> links."""
    ids = []
    for m in re.finditer(r'href="[^"]*?/posts/(\d+)"', html):
        pid = int(m.group(1))
        if pid not in ids:
            ids.append(pid)
    return ids


@pytest.fixture(scope="session")
def start_app(xprocess):
    class Starter(ProcessStarter):
        name = "qwik_blog"
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
            try:
                resp = requests.get(BASE_URL, timeout=30)
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
        except OSError:
            return
        new_lines = all_lines[printed:]
        printed = len(all_lines)
        print(f"===== [{tag}: Begin] {Starter.name} log =====")
        print("".join(new_lines))
        print(f"===== [{tag}: End] {Starter.name} log =====")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def test_client_bundle_has_no_db_leak():
    """A production client build must succeed and must not contain server-only
    DB references (Prisma / SQLite driver)."""
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
        timeout=600,
    )
    assert result.returncode == 0, (
        f"'npm run build' failed (exit {result.returncode}).\n"
        f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
    )
    assert os.path.isdir(DIST_DIR), f"Client build output directory {DIST_DIR} was not created."

    offenders = []
    for root, _dirs, files in os.walk(DIST_DIR):
        for fname in files:
            if not fname.endswith((".js", ".mjs", ".cjs")):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except OSError:
                continue
            for needle in FORBIDDEN_CLIENT_STRINGS:
                if needle in content:
                    offenders.append((fpath, needle))

    assert not offenders, (
        "Server-only database code leaked into the client bundle. "
        f"Found forbidden references: {offenders}"
    )


def test_home_lists_seeded_posts(start_app):
    resp = requests.get(BASE_URL + "/", timeout=30)
    assert resp.status_code == 200, f"GET / returned {resp.status_code}, expected 200."
    html = resp.text

    for title, _content in SEED_POSTS:
        assert title in html, f"Expected seeded post title '{title}' to appear on the home page."

    for pid in (1, 2, 3):
        assert re.search(rf'href="[^"]*?/posts/{pid}"', html), (
            f"Expected a hyperlink to /posts/{pid} on the home page."
        )

    idx_newest = html.find("Server-Side Data with routeLoader")
    idx_oldest = html.find("Welcome to Qwik")
    assert idx_newest != -1 and idx_oldest != -1, "Seeded titles not found for ordering check."
    assert idx_newest < idx_oldest, (
        "Posts are not ordered newest-first: the most recent seeded post "
        "'Server-Side Data with routeLoader' (id 3) should appear before "
        "'Welcome to Qwik' (id 1)."
    )


def test_single_post_detail_route(start_app):
    resp = requests.get(BASE_URL + "/posts/1", timeout=30)
    assert resp.status_code == 200, f"GET /posts/1 returned {resp.status_code}, expected 200."
    html = resp.text
    assert SEED_POSTS[0][0] in html, "Post detail page for id 1 is missing its title."
    assert SEED_POSTS[0][1] in html, "Post detail page for id 1 is missing its content."


def test_missing_post_returns_404(start_app):
    resp = requests.get(BASE_URL + "/posts/999999", timeout=30)
    assert resp.status_code == 404, (
        f"GET /posts/999999 returned {resp.status_code}, expected 404 for a non-existent post."
    )


def test_create_post_via_form(start_app):
    home = requests.get(BASE_URL + "/", timeout=30)
    assert home.status_code == 200, f"GET / returned {home.status_code}."
    form = _find_create_form(home.text)
    assert form is not None, (
        "Could not find a <form> containing inputs named 'title' and 'content' on the home page."
    )
    action_url = urljoin(BASE_URL + "/", form["action"] or "/")

    post_resp = requests.post(
        action_url,
        data={"title": NEW_TITLE, "content": NEW_CONTENT},
        headers={
            "Origin": BASE_URL,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout=30,
        allow_redirects=True,
    )
    assert post_resp.status_code == 200, (
        f"Submitting the create form returned {post_resp.status_code}, expected 200."
    )

    home_after = requests.get(BASE_URL + "/", timeout=30)
    assert home_after.status_code == 200
    assert NEW_TITLE in home_after.text, (
        f"Newly created post '{NEW_TITLE}' does not appear on the home page after submission."
    )

    # The new post must be reachable at its own /posts/<id> detail page.
    found = False
    for pid in _post_ids(home_after.text):
        detail = requests.get(BASE_URL + f"/posts/{pid}", timeout=30)
        if detail.status_code == 200 and NEW_TITLE in detail.text and NEW_CONTENT in detail.text:
            found = True
            break
    assert found, (
        f"Could not find a /posts/<id> detail page containing the created post "
        f"'{NEW_TITLE}' with its content."
    )


def test_invalid_submission_rejected_by_zod(start_app):
    home = requests.get(BASE_URL + "/", timeout=30)
    assert home.status_code == 200
    form = _find_create_form(home.text)
    assert form is not None, "Create form not found on the home page."
    action_url = urljoin(BASE_URL + "/", form["action"] or "/")

    count_before = len(_post_ids(home.text))

    requests.post(
        action_url,
        data={"title": "", "content": "short"},
        headers={
            "Origin": BASE_URL,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout=30,
        allow_redirects=True,
    )

    home_after = requests.get(BASE_URL + "/", timeout=30)
    assert home_after.status_code == 200
    count_after = len(_post_ids(home_after.text))
    assert count_after == count_before, (
        "An invalid submission (empty title / too-short content) created a new post; "
        f"post count changed from {count_before} to {count_after}. Server-side zod$ "
        "validation should have rejected it."
    )
