import os
import shutil
import json
import pytest

PROJECT_DIR = "/home/user/qwik-app"

def test_node_and_npm_available():
    assert shutil.which("node") is not None, "node binary not found in PATH."
    assert shutil.which("npm") is not None, "npm binary not found in PATH."

def test_project_dir_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."

def test_package_json_valid():
    package_json_path = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json_path), f"package.json not found at {package_json_path}."

    with open(package_json_path, "r") as f:
        data = json.load(f)

    deps = data.get("dependencies", {})
    dev_deps = data.get("devDependencies", {})

    assert "@builder.io/qwik" in deps or "@builder.io/qwik" in dev_deps, \
        "Qwik core dependency should be present in package.json."
    assert "@builder.io/qwik-city" in deps or "@builder.io/qwik-city" in dev_deps, \
        "Qwik City dependency should be present in package.json."

def test_comments_route_does_not_exist_yet():
    comments_route_dir = os.path.join(PROJECT_DIR, "src", "routes", "posts")
    # The route should not be fully implemented or exists yet
    if os.path.isdir(comments_route_dir):
        # If it exists, ensure that the comments index file is not present yet
        comments_file = os.path.join(comments_route_dir, "[id]", "comments", "index.tsx")
        assert not os.path.exists(comments_file), f"Comments route index file {comments_file} should not exist yet."
