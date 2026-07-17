import json
import os
import re
import socket
import subprocess
import time

import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1); forcing 127.0.0.1 keeps the readiness check and the tests
# aligned with the address Vite binds.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"
API_URL = f"{BASE_URL}/api/notepad"

MARK = "zrmark42"


# ---------------------------------------------------------------------------
# SSE helpers
# ---------------------------------------------------------------------------
def collect_events(resp, predicate, timeout_s):
    """Read Server-Sent Events from a streaming response.

    Returns the list of events collected so far as soon as ``predicate(event)``
    is True, or when the time budget expires. Each event is a dict with keys
    ``event`` (the SSE event name or None) and ``data`` (the concatenated data
    payload as a string).
    """
    deadline = time.time() + timeout_s
    current_name = None
    data_lines = []
    collected = []
    try:
        for raw in resp.iter_lines(decode_unicode=True):
            now = time.time()
            if raw is None:
                if now > deadline:
                    break
                continue
            if raw == "":
                if data_lines or current_name is not None:
                    ev = {"event": current_name, "data": "\n".join(data_lines)}
                    collected.append(ev)
                    if predicate(ev):
                        return collected
                    current_name = None
                    data_lines = []
                if now > deadline:
                    break
                continue
            if raw.startswith(":"):
                # SSE comment / keep-alive line.
                if now > deadline:
                    break
                continue
            if raw.startswith("event:"):
                current_name = raw[len("event:"):].strip()
            elif raw.startswith("data:"):
                data_lines.append(raw[len("data:"):].lstrip())
            if now > deadline:
                break
    except requests.exceptions.RequestException:
        pass
    return collected


def open_stream(read_timeout):
    return requests.get(
        API_URL,
        stream=True,
        headers={"Accept": "text/event-stream"},
        timeout=(5, read_timeout),
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def start_app(xprocess):
    class Starter(ProcessStarter):
        name = "qwik_notepad"
        # `npm run dev` maps to `vite --mode ssr`; extra args after `--` are
        # forwarded to Vite so it binds the IPv4 loopback on the expected port.
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
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

    yield

    capture_logs("TEARDOWN")
    info.terminate()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
def test_project_builds():
    """`npm run build` must compile without error (no server-only leak)."""
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
        timeout=600,
    )
    assert result.returncode == 0, (
        "npm run build failed.\n"
        f"STDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}"
    )


def test_sse_headers_and_initial_snapshot(start_app):
    resp = open_stream(read_timeout=15)
    try:
        content_type = resp.headers.get("Content-Type", "")
        assert content_type.startswith("text/event-stream"), (
            f"GET {API_URL} must return Content-Type text/event-stream, got: {content_type!r}"
        )
        events = collect_events(
            resp, predicate=lambda ev: ev["event"] == "snapshot", timeout_s=15
        )
    finally:
        resp.close()

    assert events, f"No SSE events were received from {API_URL} within the timeout."
    first = events[0]
    assert first["event"] == "snapshot", (
        f"The first SSE event must be a 'snapshot' event, got event name: {first['event']!r}"
    )
    payload = json.loads(first["data"])
    assert "text" in payload and isinstance(payload["text"], str), (
        f"The snapshot event data must be JSON with a string 'text' key, got: {first['data']!r}"
    )


def test_post_ack_and_state_persistence(start_app):
    new_text = f"hello-{MARK}"
    post = requests.post(
        API_URL,
        json={"text": new_text, "clientId": "writer"},
        timeout=10,
    )
    assert post.status_code == 200, (
        f"POST {API_URL} must return status 200, got {post.status_code}: {post.text}"
    )
    assert post.json() == {"ok": True}, (
        f"POST {API_URL} must respond with body {{\"ok\": true}}, got: {post.text}"
    )

    # A brand-new connection must receive the just-stored text as its snapshot.
    resp = open_stream(read_timeout=15)
    try:
        events = collect_events(
            resp, predicate=lambda ev: ev["event"] == "snapshot", timeout_s=15
        )
    finally:
        resp.close()

    assert events, "No snapshot event received on the fresh connection after POST."
    snapshot = next((e for e in events if e["event"] == "snapshot"), None)
    assert snapshot is not None, "Expected a 'snapshot' event on the fresh connection."
    payload = json.loads(snapshot["data"])
    assert payload.get("text") == new_text, (
        "The in-memory hub must remember the latest text. Expected snapshot text "
        f"{new_text!r}, got {payload.get('text')!r}"
    )


def test_realtime_broadcast_to_connected_client(start_app):
    reader = open_stream(read_timeout=15)
    try:
        # Consume the initial snapshot so we only look for the subsequent update.
        collect_events(
            reader, predicate=lambda ev: ev["event"] == "snapshot", timeout_s=15
        )

        broadcast_text = f"broadcast-{MARK}"
        post = requests.post(
            API_URL,
            json={"text": broadcast_text, "clientId": "writer"},
            timeout=10,
        )
        assert post.status_code == 200, (
            f"POST broadcast must return 200, got {post.status_code}: {post.text}"
        )

        events = collect_events(
            reader,
            predicate=lambda ev: ev["event"] == "update",
            timeout_s=15,
        )
    finally:
        reader.close()

    update = next((e for e in events if e["event"] == "update"), None)
    assert update is not None, (
        "The open SSE connection did not receive an 'update' event after a POST edit."
    )
    payload = json.loads(update["data"])
    assert payload.get("text") == broadcast_text, (
        f"Broadcast update text mismatch. Expected {broadcast_text!r}, got {payload.get('text')!r}"
    )
    assert payload.get("clientId") == "writer", (
        f"Broadcast update must carry the originating clientId 'writer', got {payload.get('clientId')!r}"
    )


def _read_index_route_source():
    routes_dir = os.path.join(PROJECT_DIR, "src", "routes")
    for root, _dirs, files in os.walk(routes_dir):
        for name in files:
            if not name.endswith((".tsx", ".jsx")):
                continue
            path = os.path.join(root, name)
            with open(path) as f:
                content = f.read()
            if "EventSource" in content and "useVisibleTask$" in content:
                return content
    # Fall back to the conventional index route file if present.
    for candidate in ("index.tsx", "index.jsx"):
        path = os.path.join(routes_dir, candidate)
        if os.path.isfile(path):
            with open(path) as f:
                return f.read()
    return None


def test_component_source_contract(start_app):
    content = _read_index_route_source()
    assert content is not None, (
        "Could not locate an index route component under src/routes."
    )
    assert "component$" in content, "The route must define a Qwik component with component$."
    assert "useVisibleTask$" in content, "The component must use useVisibleTask$ to open the SSE connection."
    assert "EventSource" in content, "The component must construct an EventSource for real-time updates."
    assert re.search(r"/api/notepad", content), "The EventSource must connect to the /api/notepad endpoint."
    assert re.search(r"useSignal|useStore", content), "The component must use reactive state (useSignal or useStore)."
    assert re.search(r"<textarea", content), "The component must render a <textarea> element."
    assert re.search(r"\.close\s*\(", content), "The component must close the EventSource in a cleanup callback."
