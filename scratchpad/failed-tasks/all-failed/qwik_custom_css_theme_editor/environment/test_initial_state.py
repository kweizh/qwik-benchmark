import os
import shutil
import json
import pytest

PROJECT_DIR = "/home/user/qwik-app"

def test_node_and_npm_available():
    """Verify that Node.js and npm are installed and available in PATH."""
    assert shutil.which("node") is not None, "Node.js binary not found in PATH."
    assert shutil.which("npm") is not None, "npm binary not found in PATH."

def test_project_directory_exists():
    """Verify that the project directory exists and is a directory."""
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."

def test_package_json_exists_and_valid():
    """Verify that package.json exists and contains Qwik dependencies."""
    package_json_path = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json_path), f"package.json not found at {package_json_path}."

    with open(package_json_path, "r") as f:
        data = json.load(f)

    dependencies = data.get("dependencies", {})
    dev_dependencies = data.get("devDependencies", {})

    has_qwik = "@builder.io/qwik" in dependencies or "@builder.io/qwik" in dev_dependencies
    has_qwik_city = "@builder.io/qwik-city" in dependencies or "@builder.io/qwik-city" in dev_dependencies

    assert has_qwik, "package.json does not contain Qwik dependency."
    assert has_qwik_city, "package.json does not contain Qwik City dependency."

def test_node_modules_installed():
    """Verify that node_modules are installed."""
    node_modules_path = os.path.join(PROJECT_DIR, "node_modules")
    assert os.path.isdir(node_modules_path), f"node_modules directory not found at {node_modules_path}. Dependencies are not installed."
