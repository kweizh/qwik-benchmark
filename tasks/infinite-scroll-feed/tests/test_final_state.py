import os
import re
import socket

import pytest
import requests
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the dev server would listen on ::1 only while an
# AF_INET socket to 127.0.0.1 never connects -> the readiness check would hang
# for the full timeout and raise a confusing TimeoutError.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

FEED_ITEM_RE = re.compile(r'data-testid=["\']feed-item["\']')


@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()


@pytest.fixture(scope="session")
def start_app(xprocess):
    """Starts the Qwik City dev server using xprocess and confirms readiness."""

    class Starter(ProcessStarter):
        name = "start_app"
        # `--host 127.0.0.1` forces Vite to bind the IPv4 loopback so it matches
        # the address the readiness check and the tests connect to.
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
            # Port is open; confirm the HTTP server actually responds. The first
            # request triggers on-demand bundling, so allow generous time.
            try:
                resp = requests.get(BASE_URL, timeout=60)
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


def test_initial_page_server_rendered(start_app):
    """The first page (Post #1..#10) must be present in the raw SSR HTML."""
    resp = requests.get(BASE_URL, timeout=60)
    assert resp.status_code == 200, (
        f"GET {BASE_URL} returned status {resp.status_code}, expected 200."
    )
    html = resp.text

    assert "Post #1" in html, (
        "Server-rendered HTML does not contain 'Post #1'; the initial page is "
        "not produced on the server via routeLoader$."
    )
    assert "Post #10" in html, (
        "Server-rendered HTML does not contain 'Post #10'; the full first page "
        "of 10 posts is not server-rendered."
    )

    item_count = len(FEED_ITEM_RE.findall(html))
    assert item_count == 10, (
        f"Expected exactly 10 elements with data-testid=\"feed-item\" in the "
        f"server-rendered HTML, found {item_count}."
    )


def test_only_first_page_server_rendered(start_app):
    """Later pages must NOT be in the raw SSR HTML (loaded lazily via server$)."""
    resp = requests.get(BASE_URL, timeout=60)
    assert resp.status_code == 200, (
        f"GET {BASE_URL} returned status {resp.status_code}, expected 200."
    )
    html = resp.text
    # Guard against a substring false-positive (e.g. 'Post #110'): match the
    # exact title with a non-digit / end boundary after it.
    assert re.search(r"Post #11(?!\d)", html) is None, (
        "Server-rendered HTML already contains 'Post #11'; subsequent pages "
        "should only be loaded on the client via the server$() RPC, not "
        "server-rendered on the initial request."
    )


def test_initial_client_state(start_app, browser_verifier):
    reason = (
        "The feed home page must show its first page of content immediately: "
        "exactly the first 10 posts, and no end-of-feed indicator yet."
    )
    truth = (
        f"Navigate to {BASE_URL} and wait for the page to become interactive. "
        "The page shows a feed of posts. Verify that exactly 10 feed post items "
        "are present (elements with attribute data-testid=\"feed-item\"), and "
        "that their titles are 'Post #1' through 'Post #10'. Verify that there "
        "is NO element with attribute data-testid=\"feed-end\" visible at this "
        "point (the end-of-feed indicator must not appear yet)."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_initial_client_state",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"


def test_infinite_scroll_loads_all(start_app, browser_verifier):
    reason = (
        "Scrolling to the bottom of the feed must progressively load more posts "
        "via cursor-based pagination (a server$() RPC triggered by an "
        "IntersectionObserver on a sentinel), appending new posts until the "
        "whole dataset of 47 posts has been loaded, then showing an "
        "end-of-feed indicator and stopping."
    )
    truth = (
        f"Navigate to {BASE_URL} and wait for the page to become interactive. "
        "Initially there are 10 feed post items (elements with "
        "data-testid=\"feed-item\"). Repeatedly scroll to the very bottom of the "
        "page (bringing the element with data-testid=\"feed-sentinel\" into view) "
        "and after each scroll wait a moment for more posts to load. As you "
        "scroll, the number of feed post items must increase beyond 10 (for "
        "example to 20, then 30, and so on). Keep scrolling until no more posts "
        "load. After all posts are loaded verify ALL of the following: (1) there "
        "are exactly 47 feed post items with titles 'Post #1' through 'Post #47', "
        "each appearing exactly once with no duplicates and none missing; (2) the "
        "post titled 'Post #47' is present; (3) an element with "
        "data-testid=\"feed-end\" is now present and its visible text contains "
        "the phrase 'End of feed'; (4) there is no longer any loading indicator "
        "(no element with data-testid=\"feed-loading\") visible."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_infinite_scroll_loads_all",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"
