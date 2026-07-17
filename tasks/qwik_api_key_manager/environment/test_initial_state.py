import os
import shutil
import pytest

PROJECT_DIR = "/home/user/qwik-app"

def test_node_and_npm_available():
    assert shutil.which("node") is not None, "node is not available in PATH"
    assert shutil.which("npm") is not None, "npm is not available in PATH"

def test_project_directory_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist"

def test_initial_project_structure():
    package_json = os.path.join(PROJECT_DIR, "package.json")
    vite_config = os.path.join(PROJECT_DIR, "vite.config.ts")

    assert os.path.isfile(package_json), "package.json is missing from the project directory"
    assert os.path.isfile(vite_config), "vite.config.ts is missing from the project directory"

def test_task_files_do_not_exist_initially():
    # SQLite DB should not exist initially
    db_path = os.path.join(PROJECT_DIR, "db.sqlite")
    assert not os.path.exists(db_path), f"Database {db_path} should not exist before the task is started"

    # Task-specific routes should not exist initially
    routes_dir = os.path.join(PROJECT_DIR, "src", "routes")

    hello_api = os.path.join(routes_dir, "api", "v1", "hello")
    keys_api = os.path.join(routes_dir, "api", "v1", "developer", "keys")
    keys_ui = os.path.join(routes_dir, "developer", "keys")

    assert not os.path.exists(hello_api), "The API endpoint /api/v1/hello should not exist initially"
    assert not os.path.exists(keys_api), "The API endpoint /api/v1/developer/keys should not exist initially"
    assert not os.path.exists(keys_ui), "The UI page /developer/keys should not exist initially"
