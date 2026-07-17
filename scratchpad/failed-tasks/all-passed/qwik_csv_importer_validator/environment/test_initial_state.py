import os
import shutil
import pytest

PROJECT_DIR = "/home/user/qwik-app"

def test_node_and_npm_available():
    assert shutil.which("node") is not None, "Node.js is not found in PATH."
    assert shutil.which("npm") is not None, "npm is not found in PATH."

def test_project_directory_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."

def test_basic_project_files_exist():
    package_json = os.path.join(PROJECT_DIR, "package.json")
    vite_config = os.path.join(PROJECT_DIR, "vite.config.ts")
    assert os.path.isfile(package_json), "package.json is missing in the initial state."
    assert os.path.isfile(vite_config), "vite.config.ts is missing in the initial state."

def test_sqlite_database_does_not_exist_initially():
    db_path = os.path.join(PROJECT_DIR, "database.sqlite")
    assert not os.path.exists(db_path), f"SQLite database {db_path} should not exist initially."
