import os
import shutil
import pytest

PROJECT_DIR = "/home/user/qwik-app"

def test_node_and_npm_available():
    assert shutil.which("node") is not None, "Node.js binary not found in PATH."
    assert shutil.which("npm") is not None, "npm binary not found in PATH."

def test_project_directory_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."

def test_package_json_exists():
    package_json = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json), f"package.json not found at {package_json}."

def test_completed_endpoint_does_not_exist_yet():
    # The api/data endpoint should not be implemented yet
    api_data_dir = os.path.join(PROJECT_DIR, "src", "routes", "api", "data")
    # It shouldn't exist, or if it does, it shouldn't have the rate limiting solution
    # We can just check that the specific middleware files (like plugin.ts or route handlers)
    # do not contain our specific rate limiting strings yet.
    plugin_path = os.path.join(PROJECT_DIR, "src", "routes", "plugin.ts")
    if os.path.isfile(plugin_path):
        with open(plugin_path, "r") as f:
            content = f.read()
        assert "X-RateLimit-Remaining" not in content, "Rate limiting already implemented in plugin.ts."
