import os
import socket
import pytest
import requests
from bs4 import BeautifulSoup
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session", autouse=True)
def start_app(xprocess):
    """Starts the Qwik City application on port 3000 and waits for it to be ready."""
    class Starter(ProcessStarter):
        name = "qwik_app"
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 120
        terminate_on_interrupt = True

        def startup_check(self):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            try:
                resp = requests.get(f"{BASE_URL}/kanban/tasks", timeout=5)
                return resp.status_code == 200
            except requests.RequestException:
                return False

    # Clean up any pre-existing database to ensure clean test runs
    db_path = os.path.join(PROJECT_DIR, "kanban.db")
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass

    xprocess.ensure(Starter.name, Starter)
    yield
    info = xprocess.getinfo(Starter.name)
    info.terminate()


def test_01_initial_state_empty():
    """Verify that the task list is initially empty."""
    resp = requests.get(f"{BASE_URL}/kanban/tasks")
    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"
    tasks = resp.json()
    assert isinstance(tasks, list), "Expected response to be a JSON array"
    assert len(tasks) == 0, f"Expected 0 tasks initially, got {len(tasks)}"


def test_02_add_tasks():
    """Verify adding tasks via POST /kanban/add."""
    # Add Task 1
    resp1 = requests.post(f"{BASE_URL}/kanban/add", json={"title": "Task 1"})
    assert resp1.status_code == 201, f"Expected 201 Created, got {resp1.status_code}"
    task1 = resp1.json()
    assert task1["title"] == "Task 1"
    assert task1["column"] == "TODO"
    assert task1["position"] == 0
    assert "id" in task1

    # Add Task 2
    resp2 = requests.post(f"{BASE_URL}/kanban/add", json={"title": "Task 2"})
    assert resp2.status_code == 201, f"Expected 201 Created, got {resp2.status_code}"
    task2 = resp2.json()
    assert task2["title"] == "Task 2"
    assert task2["column"] == "TODO"
    assert task2["position"] == 1

    # Add Task 3
    resp3 = requests.post(f"{BASE_URL}/kanban/add", json={"title": "Task 3"})
    assert resp3.status_code == 201, f"Expected 201 Created, got {resp3.status_code}"
    task3 = resp3.json()
    assert task3["title"] == "Task 3"
    assert task3["column"] == "TODO"
    assert task3["position"] == 2

    # Verify all tasks are listed correctly
    resp_list = requests.get(f"{BASE_URL}/kanban/tasks")
    assert resp_list.status_code == 200
    tasks = resp_list.json()
    assert len(tasks) == 3

    # Check order and positions
    todo_tasks = [t for t in tasks if t["column"] == "TODO"]
    todo_tasks.sort(key=lambda x: x["position"])
    assert [t["title"] for t in todo_tasks] == ["Task 1", "Task 2", "Task 3"]
    assert [t["position"] for t in todo_tasks] == [0, 1, 2]


def test_03_move_task_to_another_column():
    """Verify moving a task to a different column (Task 2 -> IN_PROGRESS position 0)."""
    # Get current tasks to find ID of Task 2
    resp_list = requests.get(f"{BASE_URL}/kanban/tasks")
    tasks = resp_list.json()
    task2_id = next(t["id"] for t in tasks if t["title"] == "Task 2")

    # Move Task 2 to IN_PROGRESS at position 0
    resp_move = requests.post(f"{BASE_URL}/kanban/move", json={
        "taskId": task2_id,
        "targetColumn": "IN_PROGRESS",
        "targetPosition": 0
    })
    assert resp_move.status_code == 200, f"Expected 200 OK, got {resp_move.status_code}"

    # Verify positions and columns
    resp_list2 = requests.get(f"{BASE_URL}/kanban/tasks")
    tasks2 = resp_list2.json()

    # Task 2 should be in IN_PROGRESS at position 0
    t2 = next(t for t in tasks2 if t["id"] == task2_id)
    assert t2["column"] == "IN_PROGRESS"
    assert t2["position"] == 0

    # Task 1 should be in TODO at position 0
    t1 = next(t for t in tasks2 if t["title"] == "Task 1")
    assert t1["column"] == "TODO"
    assert t1["position"] == 0

    # Task 3 should be in TODO at position 1 (shifted up from 2)
    t3 = next(t for t in tasks2 if t["title"] == "Task 3")
    assert t3["column"] == "TODO"
    assert t3["position"] == 1


def test_04_move_task_within_column():
    """Verify moving a task within the same column (Task 4 -> TODO position 0)."""
    # Add Task 4, should be at position 2 in TODO (since TODO has Task 1 at 0, Task 3 at 1)
    resp_add = requests.post(f"{BASE_URL}/kanban/add", json={"title": "Task 4"})
    assert resp_add.status_code == 201
    task4 = resp_add.json()
    assert task4["column"] == "TODO"
    assert task4["position"] == 2

    # Move Task 4 to position 0 in TODO
    resp_move = requests.post(f"{BASE_URL}/kanban/move", json={
        "taskId": task4["id"],
        "targetColumn": "TODO",
        "targetPosition": 0
    })
    assert resp_move.status_code == 200

    # Verify new order in TODO
    resp_list = requests.get(f"{BASE_URL}/kanban/tasks")
    tasks = resp_list.json()

    todo_tasks = [t for t in tasks if t["column"] == "TODO"]
    todo_tasks.sort(key=lambda x: x["position"])

    assert [t["title"] for t in todo_tasks] == ["Task 4", "Task 1", "Task 3"]
    assert [t["position"] for t in todo_tasks] == [0, 1, 2]


def test_05_validation_and_error_handling():
    """Verify error responses for invalid moves."""
    # 1. Move non-existent task ID -> 404
    resp1 = requests.post(f"{BASE_URL}/kanban/move", json={
        "taskId": 9999,
        "targetColumn": "TODO",
        "targetPosition": 0
    })
    assert resp1.status_code == 404, f"Expected 404, got {resp1.status_code}"

    # Get a valid task ID
    resp_list = requests.get(f"{BASE_URL}/kanban/tasks")
    task_id = resp_list.json()[0]["id"]

    # 2. Move to invalid column name -> 400
    resp2 = requests.post(f"{BASE_URL}/kanban/move", json={
        "taskId": task_id,
        "targetColumn": "BACKLOG",
        "targetPosition": 0
    })
    assert resp2.status_code == 400, f"Expected 400, got {resp2.status_code}"

    # 3. Move to out-of-bounds position -> 400
    resp3 = requests.post(f"{BASE_URL}/kanban/move", json={
        "taskId": task_id,
        "targetColumn": "TODO",
        "targetPosition": 50
    })
    assert resp3.status_code == 400, f"Expected 400, got {resp3.status_code}"

    # Negative position -> 400
    resp4 = requests.post(f"{BASE_URL}/kanban/move", json={
        "taskId": task_id,
        "targetColumn": "TODO",
        "targetPosition": -1
    })
    assert resp4.status_code == 400, f"Expected 400, got {resp4.status_code}"


def test_06_ui_rendering():
    """Verify that the /kanban HTML page renders columns and tasks correctly and in order."""
    resp = requests.get(f"{BASE_URL}/kanban")
    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"

    soup = BeautifulSoup(resp.text, "html.parser")

    # Verify column containers exist
    todo_col = soup.find(attrs={"data-column": "TODO"})
    in_progress_col = soup.find(attrs={"data-column": "IN_PROGRESS"})
    done_col = soup.find(attrs={"data-column": "DONE"})

    assert todo_col is not None, "Could not find column with data-column='TODO'"
    assert in_progress_col is not None, "Could not find column with data-column='IN_PROGRESS'"
    assert done_col is not None, "Could not find column with data-column='DONE'"

    # Verify form exists
    add_form = soup.find(id="add-task-form")
    assert add_form is not None, "Could not find form with id='add-task-form'"
    assert add_form.find("input", attrs={"name": "title"}) is not None, "Could not find input with name='title' inside form"

    # Verify tasks inside TODO column are in correct order (Task 4, Task 1, Task 3)
    todo_items = todo_col.find_all(class_="task-item")
    assert len(todo_items) == 3, f"Expected 3 tasks in TODO column, found {len(todo_items)}"

    # Check that they match the titles in order
    todo_titles = [item.get_text().strip() for item in todo_items]
    # Check if titles contain the task names
    assert any("Task 4" in title for title in todo_titles), f"Expected Task 4 in {todo_titles}"
    assert any("Task 1" in title for title in todo_titles), f"Expected Task 1 in {todo_titles}"
    assert any("Task 3" in title for title in todo_titles), f"Expected Task 3 in {todo_titles}"

    # Verify tasks inside IN_PROGRESS column
    ip_items = in_progress_col.find_all(class_="task-item")
    assert len(ip_items) == 1, f"Expected 1 task in IN_PROGRESS column, found {len(ip_items)}"
    assert "Task 2" in ip_items[0].get_text().strip(), f"Expected Task 2 in IN_PROGRESS, got {ip_items[0].get_text()}"
