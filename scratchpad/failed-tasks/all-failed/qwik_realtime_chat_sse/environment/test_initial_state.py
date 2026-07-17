import os
import shutil
import pytest

PROJECT_DIR = "/home/user/qwik-app"

def test_node_available():
    """Verify that node is installed and available in PATH."""
    assert shutil.which("node") is not None, "Node.js binary not found in PATH."
    assert shutil.which("npm") is not None, "npm binary not found in PATH."

def test_project_directory_exists():
    """Verify that the project directory /home/user/qwik-app exists."""
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."

def test_package_json_exists():
    """Verify that package.json exists in the project directory."""
    package_json_path = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json_path), f"package.json not found at {package_json_path}."

def test_task_files_do_not_exist():
    """Verify that the completed task files do not exist initially."""
    db_path = os.path.join(PROJECT_DIR, "chat.db")
    assert not os.path.exists(db_path), f"Database file {db_path} should not exist initially."

    api_route_ts = os.path.join(PROJECT_DIR, "src/routes/api/messages/index.ts")
    api_route_tsx = os.path.join(PROJECT_DIR, "src/routes/api/messages/index.tsx")
    assert not os.path.exists(api_route_ts), f"API endpoint {api_route_ts} should not exist initially."
    assert not os.path.exists(api_route_tsx), f"API endpoint {api_route_tsx} should not exist initially."

    chat_route_ts = os.path.join(PROJECT_DIR, "src/routes/chat/index.ts")
    chat_route_tsx = os.path.join(PROJECT_DIR, "src/routes/chat/index.tsx")
    assert not os.path.exists(chat_route_ts), f"Chat page {chat_route_ts} should not exist initially."
    assert not os.path.exists(chat_route_tsx), f"Chat page {chat_route_tsx} should not exist initially."
