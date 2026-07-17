import os
import shutil
import pytest

PROJECT_DIR = "/home/user/qwik-app"

def test_node_and_npm_available():
    """Verify that node and npm are installed and in the PATH."""
    assert shutil.which("node") is not None, "Node.js binary not found in PATH."
    assert shutil.which("npm") is not None, "npm binary not found in PATH."

def test_project_directory_exists():
    """Verify that the target project directory exists."""
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."

def test_package_json_exists():
    """Verify that package.json exists in the project directory."""
    package_json_path = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json_path), f"package.json not found at {package_json_path}."

def test_database_does_not_exist_initially():
    """Verify that the kanban.db database does not exist initially."""
    db_path = os.path.join(PROJECT_DIR, "kanban.db")
    assert not os.path.exists(db_path), f"Database {db_path} should not exist before the task starts."
