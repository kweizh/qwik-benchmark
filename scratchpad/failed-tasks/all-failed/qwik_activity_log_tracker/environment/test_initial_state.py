import os
import shutil
import json
import pytest

PROJECT_DIR = "/home/user/qwik-app"

def test_node_available():
    """Verify Node.js and npm are installed and in PATH."""
    assert shutil.which("node") is not None, "Node.js binary not found in PATH."
    assert shutil.which("npm") is not None, "npm binary not found in PATH."

def test_project_directory_exists():
    """Verify the project directory exists."""
    assert os.path.isdir(PROJECT_DIR), f"Project directory '{PROJECT_DIR}' does not exist."

def test_package_json_exists_and_valid():
    """Verify package.json exists and contains Qwik dependencies."""
    pkg_path = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(pkg_path), f"package.json not found in '{PROJECT_DIR}'."

    with open(pkg_path, "r") as f:
        pkg_data = json.load(f)

    deps = pkg_data.get("dependencies", {})
    dev_deps = pkg_data.get("devDependencies", {})

    has_qwik = "@builder.io/qwik" in deps or "@builder.io/qwik" in dev_deps
    has_qwik_city = "@builder.io/qwik-city" in deps or "@builder.io/qwik-city" in dev_deps

    assert has_qwik, "Qwik dependency (@builder.io/qwik) is missing in package.json."
    assert has_qwik_city, "Qwik City dependency (@builder.io/qwik-city) is missing in package.json."

def test_vite_config_exists():
    """Verify Vite configuration file exists."""
    vite_config_ts = os.path.join(PROJECT_DIR, "vite.config.ts")
    vite_config_js = os.path.join(PROJECT_DIR, "vite.config.js")
    assert os.path.isfile(vite_config_ts) or os.path.isfile(vite_config_js), \
        "Vite configuration file (vite.config.ts/js) not found."

def test_database_does_not_exist():
    """Verify the database file does not exist initially."""
    db_path = os.path.join(PROJECT_DIR, "activity.db")
    assert not os.path.exists(db_path), f"Database file '{db_path}' already exists, but should not in the initial state."
