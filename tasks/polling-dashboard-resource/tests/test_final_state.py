import glob
import os
import re
import socket
import time

import pytest
import requests
from pochi_verifier import PochiVerifier
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the dev server may listen on ::1 only while an AF_INET
# socket to 127.0.0.1 never connects -> the readiness check would hang.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"
METRICS_URL = f"{BASE_URL}/api/metrics"

METRIC_TESTIDS = [
    "metric-request-count",
    "metric-cpu",
    "metric-memory",
    "metric-active-users",
]
BUTTON_TESTIDS = ["refresh-button", "toggle-button"]


@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()


@pytest.fixture(scope="session")
def start_app(xprocess):
    """Start the Qwik City dev server and wait until it is ready on PORT."""

    class Starter(ProcessStarter):
        name = "qwik_dev"
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
            # The first Vite dev request compiles on demand, so allow a generous timeout.
            try:
                resp = requests.get(BASE_URL, timeout=30)
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
        print(f"====================== [{tag}: Begin] {Starter.name} log ======================")
        if skipped > 0:
            print(f"(skipped {skipped} already-printed lines)")
        print("".join(new_lines))
        print(f"====================== [{tag}: End  ] {Starter.name} log ======================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def _get_metrics():
    resp = requests.get(METRICS_URL, timeout=30)
    return resp


def _assert_derivation(body):
    n = body["requestCount"]
    assert isinstance(n, (int, float)), f"requestCount must be numeric, got {n!r}"
    assert body["cpu"] == (n * 7) % 100, (
        f"cpu should equal (requestCount*7)%100 = {(n * 7) % 100} for requestCount={n}, got {body['cpu']}"
    )
    assert body["memory"] == (n * 13) % 100, (
        f"memory should equal (requestCount*13)%100 = {(n * 13) % 100} for requestCount={n}, got {body['memory']}"
    )
    assert body["activeUsers"] == (n * 3) % 250, (
        f"activeUsers should equal (requestCount*3)%250 = {(n * 3) % 250} for requestCount={n}, got {body['activeUsers']}"
    )


def test_endpoint_json_shape(start_app):
    """Truth step 1: endpoint returns 200 JSON with exactly the required numeric keys."""
    resp = _get_metrics()
    assert resp.status_code == 200, f"GET /api/metrics returned {resp.status_code}, expected 200."
    ctype = resp.headers.get("Content-Type", "")
    assert "application/json" in ctype, f"Expected application/json content-type, got '{ctype}'."
    body = resp.json()
    expected_keys = {"requestCount", "cpu", "memory", "activeUsers", "timestamp"}
    assert set(body.keys()) == expected_keys, (
        f"Response keys must be exactly {expected_keys}, got {set(body.keys())}."
    )
    for key in expected_keys:
        assert isinstance(body[key], (int, float)), f"Key '{key}' must be a number, got {body[key]!r}."


def test_deterministic_derivation(start_app):
    """Truth step 2: metric values are deterministically derived from requestCount."""
    body = _get_metrics().json()
    _assert_derivation(body)


def test_counter_increments_by_one(start_app):
    """Truth step 3: the in-memory counter increases by exactly 1 per GET."""
    a = _get_metrics().json()
    b = _get_metrics().json()
    assert b["requestCount"] == a["requestCount"] + 1, (
        f"requestCount should increment by 1 per GET: got {a['requestCount']} then {b['requestCount']}."
    )
    _assert_derivation(a)
    _assert_derivation(b)


def test_no_external_network_dependency(start_app):
    """Truth step 4: the endpoint source uses no external fetch and no Math.random."""
    endpoint_dir = os.path.join(PROJECT_DIR, "src", "routes", "api", "metrics")
    assert os.path.isdir(endpoint_dir), f"Expected metrics endpoint directory at {endpoint_dir}."
    sources = glob.glob(os.path.join(endpoint_dir, "index.*"))
    assert sources, f"Expected an endpoint source file (index.*) in {endpoint_dir}."
    combined = ""
    for path in sources:
        with open(path) as f:
            combined += f.read()
    assert "Math.random" not in combined, (
        "Endpoint must derive values deterministically and must not use Math.random."
    )
    external = re.search(r"https?://(?!127\.0\.0\.1|localhost)", combined)
    assert external is None, (
        f"Endpoint must not reference external URLs, found: {external.group(0) if external else ''}"
    )


def test_dashboard_ssr_renders_metrics(start_app):
    """Truth step 5: the dashboard SSR HTML contains the heading, testids, and buttons."""
    resp = requests.get(BASE_URL, timeout=30)
    assert resp.status_code == 200, f"GET / returned {resp.status_code}, expected 200."
    html = resp.text
    assert "Live Metrics Dashboard" in html, "SSR HTML missing 'Live Metrics Dashboard' heading text."
    for testid in METRIC_TESTIDS + BUTTON_TESTIDS:
        assert f'data-testid="{testid}"' in html or f"data-testid='{testid}'" in html, (
            f"SSR HTML missing element with data-testid='{testid}'."
        )
    # Because the resource resolves during SSR, the request-count element should contain a number.
    match = re.search(
        r'data-testid=["\']metric-request-count["\'][^>]*>([^<]*)', html
    )
    assert match is not None, "Could not locate the metric-request-count element content in SSR HTML."
    assert re.search(r"\d", match.group(1)), (
        f"metric-request-count should contain a numeric value after SSR, got: '{match.group(1).strip()}'."
    )


def test_browser_polling_pause_resume_refresh(start_app, browser_verifier):
    """Truth steps 6-8: automatic polling, pause/resume, and manual refresh behavior."""
    reason = (
        "The dashboard polls a local metrics endpoint every 2 seconds using a client-side "
        "timer, and offers manual refresh and pause/resume controls. The displayed request "
        "count reflects how many times fresh data has been fetched."
    )
    truth = (
        f"Navigate to {BASE_URL}. Read the number shown in the element with "
        "data-testid='metric-request-count' (call it A). Wait about 6 seconds without "
        "clicking anything, then read the number again (call it B); B must be strictly "
        "greater than A because the dashboard polls automatically every 2 seconds. "
        "Next, click the button with data-testid='toggle-button' to pause polling, read the "
        "current number (call it C), wait about 6 seconds, and read the number again (call it "
        "D); D must equal C because polling is paused. Then click the button with "
        "data-testid='toggle-button' again to resume, and while resumed also click the button "
        "with data-testid='refresh-button'; within a few seconds the number must increase "
        "above D, confirming both manual refresh and resumed automatic polling work."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_browser_polling_pause_resume_refresh",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"
