import json
import os
import queue
import socket
import subprocess
import threading

import pytest
import requests
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the dev server may listen on ::1 only while an AF_INET
# socket to 127.0.0.1 never connects -> readiness checks would hang until timeout.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

COUNTER_URL = f"{BASE_URL}/api/counter"
STREAM_URL = f"{BASE_URL}/api/counter/stream"


# --------------------------------------------------------------------------- #
# HTTP helpers
# --------------------------------------------------------------------------- #
def get_count():
    resp = requests.get(COUNTER_URL, timeout=30)
    assert resp.status_code == 200, (
        f"GET {COUNTER_URL} expected status 200, got {resp.status_code}: {resp.text}"
    )
    body = resp.json()
    assert "count" in body, f"GET {COUNTER_URL} body missing 'count': {body}"
    assert isinstance(body["count"], int), (
        f"GET {COUNTER_URL} 'count' must be an integer, got {type(body['count'])}: {body}"
    )
    return body["count"]


def post_delta(delta):
    resp = requests.post(COUNTER_URL, json={"delta": delta}, timeout=30)
    return resp


class SSEClient:
    """Reads a Server-Sent Events stream in a background thread and exposes the
    parsed ``count`` values from each ``data:`` frame through a queue."""

    def __init__(self, url):
        self.url = url
        self.q: "queue.Queue[dict]" = queue.Queue()
        self._resp = None
        self._stop = False
        self.content_type = None
        self._connected = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)

    def start(self, connect_timeout=60):
        self._thread.start()
        assert self._connected.wait(timeout=connect_timeout), (
            f"Timed out establishing SSE connection to {self.url}"
        )
        return self

    def _run(self):
        try:
            self._resp = requests.get(
                self.url,
                headers={"Accept": "text/event-stream"},
                stream=True,
                timeout=(30, 90),
            )
            self.content_type = self._resp.headers.get("Content-Type", "")
            self._connected.set()
            for raw in self._resp.iter_lines(decode_unicode=True):
                if self._stop:
                    break
                if not raw:
                    continue
                line = raw.strip()
                if line.startswith("data:"):
                    payload = line[len("data:"):].strip()
                    try:
                        self.q.put(json.loads(payload))
                    except json.JSONDecodeError:
                        # Ignore non-JSON data frames (e.g. comments/heartbeats).
                        pass
        except Exception as exc:  # noqa: BLE001
            self.q.put({"__error__": str(exc)})
            self._connected.set()

    def next_count(self, timeout=30):
        try:
            item = self.q.get(timeout=timeout)
        except queue.Empty:
            raise AssertionError(
                f"Timed out waiting for an SSE frame from {self.url}"
            )
        assert "__error__" not in item, f"SSE connection error: {item['__error__']}"
        assert "count" in item, f"SSE data frame missing 'count' key: {item}"
        return item["count"]

    def close(self):
        self._stop = True
        try:
            if self._resp is not None:
                self._resp.close()
        except Exception:  # noqa: BLE001
            pass


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()


@pytest.fixture(scope="session")
def start_app(xprocess):
    """Install dependencies (idempotent) and start the Qwik City SSR dev server."""
    install = subprocess.run(
        ["npm", "install"],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
        timeout=600,
    )
    assert install.returncode == 0, (
        f"`npm install` failed in {PROJECT_DIR}:\n{install.stdout}\n{install.stderr}"
    )

    class Starter(ProcessStarter):
        name = "qwik_dev_server"
        # `--host 127.0.0.1` forces the dev server to bind the IPv4 loopback so it
        # matches the address the readiness check and the tests connect to.
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
    printed_log_lines = 0

    def capture_logs(tag):
        nonlocal printed_log_lines
        with open(info.logpath, "r") as f:
            all_lines = f.readlines()
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


# --------------------------------------------------------------------------- #
# Tests
# --------------------------------------------------------------------------- #
def test_initial_counter_value(start_app):
    """Truth step 1: a fresh server starts with the shared counter at 0."""
    assert get_count() == 0, (
        "Expected the shared counter to start at 0 on a fresh server process."
    )


def test_stream_content_type_and_initial_frame(start_app):
    """Truth step 2: the SSE endpoint uses text/event-stream and emits the
    current value immediately on connect."""
    current = get_count()
    client = SSEClient(STREAM_URL).start()
    try:
        assert client.content_type.lower().startswith("text/event-stream"), (
            f"SSE endpoint Content-Type must start with 'text/event-stream', "
            f"got: {client.content_type!r}"
        )
        first = client.next_count(timeout=30)
        assert first == current, (
            f"First SSE frame should carry the current counter value {current}, got {first}."
        )
    finally:
        client.close()


def test_mutation_broadcasts_to_all_subscribers(start_app):
    """Truth step 3: a POST mutation is broadcast to every connected subscriber."""
    current = get_count()
    a = SSEClient(STREAM_URL).start()
    b = SSEClient(STREAM_URL).start()
    try:
        # Drain the initial frame each connection receives on connect.
        assert a.next_count(timeout=30) == current, "Connection A initial frame mismatch."
        assert b.next_count(timeout=30) == current, "Connection B initial frame mismatch."

        expected = current + 5
        resp = post_delta(5)
        assert resp.status_code == 200, (
            f"POST {COUNTER_URL} expected status 200, got {resp.status_code}: {resp.text}"
        )
        assert resp.json().get("count") == expected, (
            f"POST response should return updated count {expected}, got {resp.text}"
        )

        assert a.next_count(timeout=30) == expected, (
            f"Connection A did not receive broadcast value {expected}."
        )
        assert b.next_count(timeout=30) == expected, (
            f"Connection B did not receive broadcast value {expected}."
        )
    finally:
        a.close()
        b.close()


def test_negative_delta_and_shared_state(start_app):
    """Truth step 4: negative deltas work and state is shared across requests."""
    current = get_count()
    a = SSEClient(STREAM_URL).start()
    b = SSEClient(STREAM_URL).start()
    try:
        assert a.next_count(timeout=30) == current, "Connection A initial frame mismatch."
        assert b.next_count(timeout=30) == current, "Connection B initial frame mismatch."

        expected = current - 2
        resp = post_delta(-2)
        assert resp.status_code == 200, (
            f"POST {COUNTER_URL} expected status 200, got {resp.status_code}: {resp.text}"
        )
        assert resp.json().get("count") == expected, (
            f"POST response should return updated count {expected}, got {resp.text}"
        )

        assert a.next_count(timeout=30) == expected, (
            f"Connection A did not receive broadcast value {expected}."
        )
        assert b.next_count(timeout=30) == expected, (
            f"Connection B did not receive broadcast value {expected}."
        )
    finally:
        a.close()
        b.close()

    # State must be shared and persisted across independent requests.
    assert get_count() == expected, (
        f"GET {COUNTER_URL} should reflect the shared value {expected} after mutation."
    )


def test_new_connection_sees_latest_value(start_app):
    """Truth step 5: a newly opened connection immediately receives the current
    (non-initial) shared value."""
    current = get_count()
    client = SSEClient(STREAM_URL).start()
    try:
        first = client.next_count(timeout=30)
        assert first == current, (
            f"A newly opened SSE connection should immediately receive the current "
            f"shared value {current}, got {first}."
        )
    finally:
        client.close()


def test_browser_live_counter(start_app, browser_verifier):
    """Truth step 6: the home page renders a live #counter-value element that
    reflects the shared counter delivered over the EventSource subscription."""
    v0 = get_count()
    target = v0 + 7
    resp = post_delta(7)
    assert resp.status_code == 200, (
        f"POST {COUNTER_URL} expected status 200, got {resp.status_code}: {resp.text}"
    )
    assert resp.json().get("count") == target, (
        f"POST response should return updated count {target}, got {resp.text}"
    )

    reason = (
        "The Qwik City home page renders a live shared-counter widget. A component "
        "subscribes to the server's Server-Sent Events stream from the browser and "
        "displays the current shared counter value in an element with id "
        "'counter-value'."
    )
    truth = (
        f"Navigate to {BASE_URL}/ . Wait for the page to finish loading and become "
        f"interactive. Find the element with id 'counter-value'. Verify that it "
        f"exists and that its visible text is the integer {target} (the current "
        f"shared counter value delivered over the live stream)."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_browser_live_counter",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"
