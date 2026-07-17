import html
import os
import re
import socket
import subprocess

import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-fts-search"
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the dev server may listen on ::1 only while an AF_INET
# socket to 127.0.0.1 never connects -> readiness check would hang until timeout.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

SEEDED_TITLES = [
    "Introduction to SQLite",
    "Full Text Search with FTS5",
    "Getting Started with Qwik",
    "Reactive State in Qwik",
    "Building REST APIs",
    "Database Indexing Basics",
    "Server Side Rendering",
    "Web Performance Tips",
]


def strip_tags(raw_html: str) -> str:
    """Return the visible text of an HTML document with whitespace collapsed."""
    no_tags = re.sub(r"<[^>]+>", " ", raw_html)
    unescaped = html.unescape(no_tags)
    return re.sub(r"\s+", " ", unescaped).strip()


def fetch(query: str | None):
    params = {} if query is None else {"q": query}
    resp = requests.get(BASE_URL, params=params, timeout=30)
    assert resp.status_code == 200, (
        f"GET {BASE_URL} with q={query!r} returned status {resp.status_code}"
    )
    return resp.text


@pytest.fixture(scope="session")
def start_app(xprocess):
    """Start the Qwik City SSR dev server and wait until it responds."""

    class Starter(ProcessStarter):
        name = "qwik_fts_search"
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
            # The first request triggers on-demand SSR bundling; allow time for it.
            try:
                resp = requests.get(BASE_URL, timeout=30)
                return resp.status_code < 500
            except requests.RequestException:
                return False

    info = xprocess.getinfo(Starter.name)
    printed = 0

    def capture_logs(tag):
        nonlocal printed
        with open(info.logpath, "r") as f:
            lines = f.readlines()
        new_lines = lines[printed:]
        skipped = printed
        printed = len(lines)
        print(f"===== [{tag}: Begin] {Starter.name} log =====")
        if skipped:
            print(f"(skipped {skipped} already-printed lines)")
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


def test_empty_query_state(start_app):
    """No `q` param: prompt to enter a search term, no results shown."""
    text = strip_tags(fetch(None))
    assert "Enter a search term" in text, (
        f"Expected empty-query prompt 'Enter a search term' on '/', got: {text[:400]}"
    )


def test_basic_match_and_count(start_app):
    """q=qwik matches exactly the two Qwik documents."""
    raw = fetch("qwik")
    text = strip_tags(raw)
    assert "2 results" in text, (
        f"Expected '2 results' for q=qwik, got: {text[:500]}"
    )
    assert "Getting Started with Qwik" in text, (
        "Expected title 'Getting Started with Qwik' in q=qwik results."
    )
    assert "Reactive State in Qwik" in text, (
        "Expected title 'Reactive State in Qwik' in q=qwik results."
    )
    assert "<mark" in raw.lower(), (
        "Expected at least one <mark> highlight element in q=qwik results."
    )


def test_body_term_match_count(start_app):
    """q=performance matches the three documents that mention 'performance'."""
    text = strip_tags(fetch("performance"))
    assert "3 results" in text, (
        f"Expected '3 results' for q=performance, got: {text[:500]}"
    )
    for title in ["Database Indexing Basics", "Server Side Rendering", "Web Performance Tips"]:
        assert title in text, (
            f"Expected title '{title}' in q=performance results."
        )


def test_bm25_ranking_order(start_app):
    """q=sqlite: the doc with the term in title+body ranks above the body-only doc."""
    text = strip_tags(fetch("sqlite"))
    assert "2 results" in text, (
        f"Expected '2 results' for q=sqlite, got: {text[:500]}"
    )
    idx_intro = text.find("Introduction to SQLite")
    idx_indexing = text.find("Database Indexing Basics")
    assert idx_intro != -1, "Expected 'Introduction to SQLite' in q=sqlite results."
    assert idx_indexing != -1, "Expected 'Database Indexing Basics' in q=sqlite results."
    assert idx_intro < idx_indexing, (
        "Expected 'Introduction to SQLite' (title+body match) to rank before "
        "'Database Indexing Basics' (body-only match) by BM25 rank."
    )
    # A 1-based rank position should be shown for each of the two results.
    assert re.search(r"\b1\b", text) and re.search(r"\b2\b", text), (
        f"Expected 1-based rank positions (1 and 2) shown in q=sqlite results, got: {text[:500]}"
    )


def test_no_results_state(start_app):
    """q=zebra matches nothing: no-results message, no seeded titles listed."""
    text = strip_tags(fetch("zebra"))
    assert "No results found" in text, (
        f"Expected 'No results found' for q=zebra, got: {text[:500]}"
    )
    for title in SEEDED_TITLES:
        assert title not in text, (
            f"Did not expect any seeded title ('{title}') in q=zebra results."
        )


def test_highlight_is_fts5_output(start_app):
    """q=database renders FTS5 highlight output wrapping the matched term in <mark>."""
    raw = fetch("database").lower()
    assert "<mark" in raw, (
        "Expected <mark> highlight tags in q=database results."
    )
    assert re.search(r"<mark[^>]*>\s*database\s*</mark>", raw), (
        "Expected the matched term 'database' wrapped in a <mark> element."
    )


def test_server_only_isolation():
    """The client bundle must not contain the better-sqlite3 server-only driver."""
    build = subprocess.run(
        ["npm", "run", "build"],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
        timeout=300,
    )
    assert build.returncode == 0, (
        f"'npm run build' failed:\nstdout:\n{build.stdout[-2000:]}\nstderr:\n{build.stderr[-2000:]}"
    )
    client_dir = os.path.join(PROJECT_DIR, "dist")
    assert os.path.isdir(client_dir), (
        f"Expected client build output directory at {client_dir} after build."
    )
    offending = []
    for root, _dirs, files in os.walk(client_dir):
        for name in files:
            if not name.endswith(".js"):
                continue
            path = os.path.join(root, name)
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    if "better-sqlite3" in f.read():
                        offending.append(path)
            except OSError:
                continue
    assert not offending, (
        "Server-only driver 'better-sqlite3' leaked into client bundle(s): "
        f"{offending}"
    )
