import os
import shutil
import pytest

PROJECT_DIR = "/home/user/qwik-app"

def test_node_and_npm_available():
    assert shutil.which("node") is not None, "Node.js binary not found in PATH."
    assert shutil.which("npm") is not None, "npm binary not found in PATH."

def test_project_dir_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."

def test_package_json_exists():
    package_json = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json), f"package.json not found at {package_json}."

def test_routes_dir_exists():
    routes_dir = os.path.join(PROJECT_DIR, "src", "routes")
    assert os.path.isdir(routes_dir), f"Routes directory {routes_dir} does not exist."

def test_signup_route_not_yet_implemented():
    signup_dir = os.path.join(PROJECT_DIR, "src", "routes", "signup")
    # In the initial scaffolded state, the signup route should not be fully implemented.
    # If the directory exists, it shouldn't contain the full wizard code.
    signup_index = os.path.join(signup_dir, "index.tsx")
    if os.path.isfile(signup_index):
        with open(signup_index, "r", encoding="utf-8") as f:
            content = f.read()
        assert "Signup complete!" not in content, "Signup wizard seems to be already completed."
