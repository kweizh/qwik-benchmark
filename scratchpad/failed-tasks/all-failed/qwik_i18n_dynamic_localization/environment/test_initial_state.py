import os
import shutil
import json
import pytest

PROJECT_DIR = "/home/user/qwik-app"

def test_node_and_npm_available():
    assert shutil.which("node") is not None, "node binary not found in PATH."
    assert shutil.which("npm") is not None, "npm binary not found in PATH."

def test_project_directory_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."

def test_package_json_exists():
    package_json_path = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json_path), f"{package_json_path} does not exist."

    with open(package_json_path, "r") as f:
        data = json.load(f)
    assert "@builder.io/qwik" in data.get("dependencies", {}), "Qwik dependency is missing in package.json."
    assert "@builder.io/qwik-city" in data.get("dependencies", {}), "Qwik City dependency is missing in package.json."

def test_translation_files_exist():
    locales_dir = os.path.join(PROJECT_DIR, "locales")
    assert os.path.isdir(locales_dir), f"Locales directory {locales_dir} does not exist."

    en_json_path = os.path.join(locales_dir, "en.json")
    fr_json_path = os.path.join(locales_dir, "fr.json")

    assert os.path.isfile(en_json_path), f"Translation file {en_json_path} does not exist."
    assert os.path.isfile(fr_json_path), f"Translation file {fr_json_path} does not exist."

    with open(en_json_path, "r") as f:
        en_data = json.load(f)
    assert "dashboard" in en_data, "dashboard key missing in en.json"
    assert "profile" in en_data, "profile key missing in en.json"

    with open(fr_json_path, "r") as f:
        fr_data = json.load(f)
    assert "dashboard" in fr_data, "dashboard key missing in fr.json"
    assert "profile" in fr_data, "profile key missing in fr.json"
