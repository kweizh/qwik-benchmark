import os
import shutil
import pytest

PROJECT_DIR = "/home/user/qwik-app"

def test_node_available():
    assert shutil.which("node") is not None, "Node.js is not installed or not in PATH."
    assert shutil.which("npm") is not None, "npm is not installed or not in PATH."

def test_project_dir_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."

def test_package_json_exists():
    package_json = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json), f"package.json not found at {package_json}."

    with open(package_json, "r") as f:
        content = f.read()
    assert "qwik" in content, "package.json does not seem to contain qwik dependency."

def test_vite_config_exists():
    vite_config = os.path.join(PROJECT_DIR, "vite.config.ts")
    assert os.path.isfile(vite_config), f"vite.config.ts not found at {vite_config}."
