import os
import re
import socket
import time

import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 8787
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1); using 127.0.0.1 everywhere keeps the server, readiness
# probe, and test clients on the same address.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"
API_URL = f"{BASE_URL}/api/data"
STATUS_URL = f"{BASE_URL}/status"

# The Vite dev server compiles routes on-demand, so the very first request to a
# route can be slow. Allow a generous per-request timeout.
REQUEST_TIMEOUT = 60


def _xff(ip):
    return {"X-Forwarded-For": ip}


def _clean_html(text):
    """Strip HTML comments (Qwik SSR text markers), tags, and collapse whitespace."""
    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _assert_rate_limit_headers(resp):
    headers = resp.headers
    assert "X-RateLimit-Limit" in headers, (
        f"Missing X-RateLimit-Limit header. Got headers: {dict(headers)}"
    )
    assert headers["X-RateLimit-Limit"] == "5", (
        f"Expected X-RateLimit-Limit=5, got {headers.get('X-RateLimit-Limit')!r}"
    )
    assert "X-RateLimit-Remaining" in headers, (
        f"Missing X-RateLimit-Remaining header. Got headers: {dict(headers)}"
    )
    assert "X-RateLimit-Reset" in headers, (
        f"Missing X-RateLimit-Reset header. Got headers: {dict(headers)}"
    )
    reset_val = headers["X-RateLimit-Reset"]
    try:
        reset_int = int(reset_val)
    except (TypeError, ValueError):
        pytest.fail(f"X-RateLimit-Reset is not an integer: {reset_val!r}")
    assert reset_int >= 0, f"X-RateLimit-Reset must be non-negative, got {reset_int}"


@pytest.fixture(scope="session")
def start_app(xprocess):
    class Starter(ProcessStarter):
        name = "qwik_rate_limited"
        # Start the Qwik City dev server bound to IPv4 loopback on the fixed port.
        args = ["npm", "run", "dev", "--", "--host", HOST, "--port", str(PORT)]
        # CRITICAL: set `env` as a class attribute here, never inside popen_kwargs.
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
                resp = requests.get(BASE_URL, timeout=20)
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
        except OSError:
            return
        new_lines = all_lines[printed_log_lines:]
        skipped = printed_log_lines
        printed_log_lines = len(all_lines)
        print(f"===== [{tag}: Begin] {Starter.name} log =====")
        if skipped > 0:
            print(f"(skipped {skipped} already-printed lines)")
        print("".join(new_lines))
        print(f"===== [{tag}: End] {Starter.name} log =====")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    # Warm up on-demand compilation of both routes using a throwaway IP so the
    # rolling-window counting tests below are not skewed by first-request latency.
    for _ in range(3):
        try:
            requests.get(API_URL, headers=_xff("192.0.2.254"), timeout=REQUEST_TIMEOUT)
            requests.get(STATUS_URL, headers=_xff("192.0.2.254"), timeout=REQUEST_TIMEOUT)
            break
        except requests.RequestException:
            time.sleep(2)

    yield BASE_URL

    capture_logs("TEARDOWN")
    info.terminate()


def test_allowed_requests_and_block(start_app):
    """Truth steps 1 & 2: first 5 GETs succeed with decreasing remaining; 6th is 429."""
    ip = "203.0.113.10"
    expected_remaining = [4, 3, 2, 1, 0]
    for i, expected in enumerate(expected_remaining):
        resp = requests.get(API_URL, headers=_xff(ip), timeout=REQUEST_TIMEOUT)
        assert resp.status_code == 200, (
            f"Request #{i + 1} for {ip} expected 200, got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert body.get("method") == "GET", (
            f"Expected JSON method 'GET', got {body.get('method')!r}"
        )
        assert body.get("remaining") == expected, (
            f"Request #{i + 1}: expected remaining={expected}, got {body.get('remaining')!r}"
        )
        _assert_rate_limit_headers(resp)
        assert resp.headers["X-RateLimit-Remaining"] == str(expected), (
            f"Request #{i + 1}: expected X-RateLimit-Remaining header "
            f"{str(expected)!r}, got {resp.headers.get('X-RateLimit-Remaining')!r}"
        )

    # 6th request must be blocked.
    resp = requests.get(API_URL, headers=_xff(ip), timeout=REQUEST_TIMEOUT)
    assert resp.status_code == 429, (
        f"6th request for {ip} expected 429, got {resp.status_code}: {resp.text}"
    )
    body = resp.json()
    assert "error" in body, f"Expected an 'error' key in 429 body, got {body!r}"
    _assert_rate_limit_headers(resp)
    assert resp.headers["X-RateLimit-Remaining"] == "0", (
        f"Expected X-RateLimit-Remaining=0 on block, got "
        f"{resp.headers.get('X-RateLimit-Remaining')!r}"
    )
    assert "Retry-After" in resp.headers, (
        f"Missing Retry-After header on 429. Got: {dict(resp.headers)}"
    )
    try:
        retry_after = int(resp.headers["Retry-After"])
    except (TypeError, ValueError):
        pytest.fail(f"Retry-After is not an integer: {resp.headers.get('Retry-After')!r}")
    assert retry_after >= 1, f"Retry-After must be >= 1, got {retry_after}"


def test_per_ip_isolation(start_app):
    """Truth step 3: blocking one IP must not affect a different IP."""
    blocked_ip = "203.0.113.11"
    other_ip = "198.51.100.20"

    # Exhaust the blocked IP's quota.
    for _ in range(5):
        requests.get(API_URL, headers=_xff(blocked_ip), timeout=REQUEST_TIMEOUT)
    resp = requests.get(API_URL, headers=_xff(blocked_ip), timeout=REQUEST_TIMEOUT)
    assert resp.status_code == 429, (
        f"Expected {blocked_ip} to be blocked (429), got {resp.status_code}"
    )

    # A different IP still has its own fresh quota.
    resp = requests.get(API_URL, headers=_xff(other_ip), timeout=REQUEST_TIMEOUT)
    assert resp.status_code == 200, (
        f"Independent IP {other_ip} expected 200, got {resp.status_code}: {resp.text}"
    )
    body = resp.json()
    assert body.get("remaining") == 4, (
        f"Independent IP {other_ip} expected remaining=4, got {body.get('remaining')!r}"
    )


def test_post_is_rate_limited(start_app):
    """Truth step 4: POST requests are limited by the same limiter."""
    ip = "203.0.113.30"
    expected_remaining = [4, 3, 2, 1, 0]
    for i, expected in enumerate(expected_remaining):
        resp = requests.post(
            API_URL, headers=_xff(ip), json={}, timeout=REQUEST_TIMEOUT
        )
        assert resp.status_code == 200, (
            f"POST #{i + 1} for {ip} expected 200, got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert body.get("method") == "POST", (
            f"Expected JSON method 'POST', got {body.get('method')!r}"
        )
        assert body.get("remaining") == expected, (
            f"POST #{i + 1}: expected remaining={expected}, got {body.get('remaining')!r}"
        )

    resp = requests.post(API_URL, headers=_xff(ip), json={}, timeout=REQUEST_TIMEOUT)
    assert resp.status_code == 429, (
        f"6th POST for {ip} expected 429, got {resp.status_code}: {resp.text}"
    )


def test_status_page_reports_and_does_not_consume(start_app):
    """Truth step 5: status page reflects quota and does not consume it."""
    ip = "203.0.113.40"

    # Fresh client: full quota.
    resp = requests.get(STATUS_URL, headers=_xff(ip), timeout=REQUEST_TIMEOUT)
    assert resp.status_code == 200, (
        f"/status expected 200, got {resp.status_code}: {resp.text}"
    )
    cleaned = _clean_html(resp.text)
    assert re.search(r"Limit:\s*5", cleaned), (
        f"Expected '/status' page to contain 'Limit: 5'. Cleaned text: {cleaned!r}"
    )
    assert re.search(r"Remaining:\s*5", cleaned), (
        f"Expected fresh client '/status' to show 'Remaining: 5'. Cleaned text: {cleaned!r}"
    )

    # Consume two requests -> remaining becomes 3.
    for _ in range(2):
        r = requests.get(API_URL, headers=_xff(ip), timeout=REQUEST_TIMEOUT)
        assert r.status_code == 200, f"Setup GET expected 200, got {r.status_code}"

    # Viewing status twice must both report Remaining: 3 (peek only, no consumption).
    for view in range(2):
        resp = requests.get(STATUS_URL, headers=_xff(ip), timeout=REQUEST_TIMEOUT)
        assert resp.status_code == 200, (
            f"/status view #{view + 1} expected 200, got {resp.status_code}"
        )
        cleaned = _clean_html(resp.text)
        assert re.search(r"Remaining:\s*3", cleaned), (
            f"/status view #{view + 1} expected 'Remaining: 3' (status must not "
            f"consume quota). Cleaned text: {cleaned!r}"
        )


def test_window_resets_after_retry_after(start_app):
    """Truth step 6: after the window elapses, requests are allowed again."""
    ip = "203.0.113.50"
    for _ in range(5):
        r = requests.get(API_URL, headers=_xff(ip), timeout=REQUEST_TIMEOUT)
        assert r.status_code == 200, f"Setup GET expected 200, got {r.status_code}"

    resp = requests.get(API_URL, headers=_xff(ip), timeout=REQUEST_TIMEOUT)
    assert resp.status_code == 429, (
        f"Expected block (429) after exhausting quota, got {resp.status_code}"
    )
    retry_after = int(resp.headers["Retry-After"])

    time.sleep(retry_after + 2)

    resp = requests.get(API_URL, headers=_xff(ip), timeout=REQUEST_TIMEOUT)
    assert resp.status_code == 200, (
        f"After waiting {retry_after + 2}s the window should reset and allow "
        f"requests again, but got {resp.status_code}: {resp.text}"
    )
