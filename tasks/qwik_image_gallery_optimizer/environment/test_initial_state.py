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

def test_database_does_not_exist():
    db_path = os.path.join(PROJECT_DIR, "gallery.db")
    assert not os.path.exists(db_path), f"Database {db_path} should not exist before the task is executed."

def test_public_gallery_does_not_exist():
    gallery_dir = os.path.join(PROJECT_DIR, "public", "gallery")
    assert not os.path.exists(gallery_dir), f"Gallery directory {gallery_dir} should not exist before the task is executed."
