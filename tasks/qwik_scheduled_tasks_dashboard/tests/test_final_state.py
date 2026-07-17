import os
import socket
import time
import requests
import pytest
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik application service using xprocess. Confirms readiness via port check.
    """
    class Starter(ProcessStarter):
        name = "start_app"
        # Force host and port to match the test requirements
        args = ["npm", "run", "dev", "--", "--host", HOST, "--port", str(PORT)]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 180
        terminate_on_interrupt = True

        def startup_check(self):
            """
            Check if the port is open and accepting HTTP connections.
            """
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            try:
                # Qwik City default route or /tasks route should respond with non-5xx
                resp = requests.get(f"{BASE_URL}/tasks", timeout=5)
                return resp.status_code < 500
            except requests.RequestException:
                # If /tasks is not ready yet, try root
                try:
                    resp = requests.get(BASE_URL, timeout=5)
                    return resp.status_code < 500
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


def test_api_crud_and_background_execution(start_app):
    """
    Test API endpoints for creating, retrieving, pausing, resuming, and triggering tasks,
    as well as verifying the background executor behavior.
    """
    # 1. Create a successful task via POST /api/tasks
    success_task_payload = {
        "id": "test-success-task",
        "name": "Test Success Task",
        "command": "echo 'success'",
        "interval_seconds": 3,
        "status": "ACTIVE"
    }
    create_resp = requests.post(f"{BASE_URL}/api/tasks", json=success_task_payload, timeout=5)
    assert create_resp.status_code == 201, f"Expected 201 Created, got {create_resp.status_code}. Response: {create_resp.text}"

    created_task = create_resp.json()
    assert created_task["id"] == "test-success-task", f"Expected task id to be 'test-success-task', got {created_task.get('id')}"
    assert created_task["status"] == "ACTIVE", f"Expected task status to be 'ACTIVE', got {created_task.get('status')}"

    # 2. Verify background execution logs 'SUCCESS'
    # Wait 7 seconds to allow at least 2 executions (at t=0, t=3, t=6 approx)
    time.sleep(7)

    history_resp = requests.get(f"{BASE_URL}/api/tasks/test-success-task/history", timeout=5)
    assert history_resp.status_code == 200, f"Expected 200 OK, got {history_resp.status_code}. Response: {history_resp.text}"
    history_logs = history_resp.json()
    assert isinstance(history_logs, list), f"Expected history to be a list, got {type(history_logs)}"
    assert len(history_logs) >= 2, f"Expected at least 2 executions, got {len(history_logs)}"
    for log in history_logs:
        assert log["task_id"] == "test-success-task", f"Expected task_id to be 'test-success-task', got {log.get('task_id')}"
        assert log["status"] == "SUCCESS", f"Expected status to be 'SUCCESS', got {log.get('status')}"
        assert "timestamp" in log, "Expected 'timestamp' key in history log"

    # 3. Create a failing task via POST /api/tasks
    fail_task_payload = {
        "id": "test-fail-task",
        "name": "Test Fail Task",
        "command": "exit 1",
        "interval_seconds": 3,
        "status": "ACTIVE"
    }
    create_fail_resp = requests.post(f"{BASE_URL}/api/tasks", json=fail_task_payload, timeout=5)
    assert create_fail_resp.status_code == 201, f"Expected 201 Created, got {create_fail_resp.status_code}. Response: {create_fail_resp.text}"

    # Wait 5 seconds to allow at least 1 execution of the failing task
    time.sleep(5)

    fail_history_resp = requests.get(f"{BASE_URL}/api/tasks/test-fail-task/history", timeout=5)
    assert fail_history_resp.status_code == 200, f"Expected 200 OK, got {fail_history_resp.status_code}. Response: {fail_history_resp.text}"
    fail_history_logs = fail_history_resp.json()
    assert len(fail_history_logs) >= 1, f"Expected at least 1 failing execution, got {len(fail_history_logs)}"
    for log in fail_history_logs:
        assert log["task_id"] == "test-fail-task"
        assert log["status"] == "FAILED", f"Expected status to be 'FAILED', got {log.get('status')}"

    # 4. Pause the successful task
    pause_resp = requests.post(f"{BASE_URL}/api/tasks/test-success-task/pause", timeout=5)
    assert pause_resp.status_code == 200, f"Expected 200 OK, got {pause_resp.status_code}. Response: {pause_resp.text}"
    assert pause_resp.json()["status"] == "PAUSED", f"Expected status to be 'PAUSED', got {pause_resp.json().get('status')}"

    # Record current count of logs
    history_resp_after_pause = requests.get(f"{BASE_URL}/api/tasks/test-success-task/history", timeout=5)
    initial_log_count = len(history_resp_after_pause.json())

    # Wait 6 seconds to ensure no new logs are added
    time.sleep(6)

    history_resp_later = requests.get(f"{BASE_URL}/api/tasks/test-success-task/history", timeout=5)
    later_log_count = len(history_resp_later.json())
    assert later_log_count == initial_log_count, f"Expected log count to remain {initial_log_count}, but it increased to {later_log_count}. Task was not paused correctly."

    # 5. Trigger task manually
    trigger_resp = requests.post(f"{BASE_URL}/api/tasks/test-success-task/trigger", timeout=5)
    assert trigger_resp.status_code == 200, f"Expected 200 OK, got {trigger_resp.status_code}. Response: {trigger_resp.text}"
    assert trigger_resp.json().get("triggered") is True, f"Expected triggered to be True, got {trigger_resp.json()}"

    # Verify a new history record has been added immediately
    history_resp_after_trigger = requests.get(f"{BASE_URL}/api/tasks/test-success-task/history", timeout=5)
    post_trigger_log_count = len(history_resp_after_trigger.json())
    assert post_trigger_log_count == initial_log_count + 1, f"Expected log count to be {initial_log_count + 1} after manual trigger, got {post_trigger_log_count}."


def test_html_dashboard_ui(start_app, browser_verifier):
    """
    Verify that the Qwik-based HTML dashboard at /tasks renders correctly
    and displays the task details and execution history.
    """
    reason = "The dashboard page at /tasks must render an HTML interface listing all active/paused tasks and their execution history logs."
    truth = (
        f"Navigate to {BASE_URL}/tasks. "
        "Verify that the page contains the text 'Test Success Task' and 'Test Fail Task'. "
        "Verify that there is a table or list showing execution logs with status 'SUCCESS' and 'FAILED'."
    )

    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_html_dashboard_ui"
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"
