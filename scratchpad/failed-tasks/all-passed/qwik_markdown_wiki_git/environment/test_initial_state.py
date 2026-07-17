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
    assert os.path.isfile(package_json), f"package.json not found in {PROJECT_DIR}."

def test_vite_config_exists():
    vite_config = os.path.join(PROJECT_DIR, "vite.config.ts")
    assert os.path.isfile(vite_config) or os.path.isfile(os.path.join(PROJECT_DIR, "vite.config.js")), \
        "Vite configuration file (vite.config.ts/js) not found."
