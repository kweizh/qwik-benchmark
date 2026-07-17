import os
import shutil
import subprocess

PROJECT_DIR = "/home/user/qwik-app"


def test_node_available():
    assert shutil.which("node") is not None, "node binary not found in PATH."


def test_npm_available():
    assert shutil.which("npm") is not None, "npm binary not found in PATH."


def test_node_version_is_recent_enough():
    result = subprocess.run(
        ["node", "--version"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, "Failed to run 'node --version'."
    version = result.stdout.strip().lstrip("v")
    major = int(version.split(".")[0])
    assert major >= 18, f"Node.js major version must be >= 18, found {version}."


def test_project_directory_exists():
    assert os.path.isdir(
        PROJECT_DIR
    ), f"Project directory {PROJECT_DIR} does not exist."
