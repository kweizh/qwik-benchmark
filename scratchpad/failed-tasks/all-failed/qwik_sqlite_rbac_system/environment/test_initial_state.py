import os
import shutil
import pytest

PROJECT_DIR = "/home/user/qwik-app"

def test_node_and_npm_available():
    assert shutil.which("node") is not None, "Node.js binary not found in PATH."
    assert shutil.which("npm") is not None, "npm binary not found in PATH."

def test_project_directory_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."

def test_initial_project_files_exist():
    package_json = os.path.join(PROJECT_DIR, "package.json")
    vite_config = os.path.join(PROJECT_DIR, "vite.config.ts")
    assert os.path.isfile(package_json), "package.json not found in project directory."
    assert os.path.isfile(vite_config), "vite.config.ts not found in project directory."
