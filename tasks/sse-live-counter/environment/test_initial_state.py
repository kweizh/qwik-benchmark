import os
import shutil
import subprocess

HOME_DIR = "/home/user"


def test_node_available():
    assert shutil.which("node") is not None, "node binary not found in PATH."


def test_npm_available():
    assert shutil.which("npm") is not None, "npm binary not found in PATH."


def test_node_version_is_recent():
    node_path = shutil.which("node")
    assert node_path is not None, "node binary not found in PATH."
    result = subprocess.run(
        [node_path, "--version"], capture_output=True, text=True
    )
    assert result.returncode == 0, f"`node --version` failed: {result.stderr}"
    version = result.stdout.strip().lstrip("v")
    major = int(version.split(".")[0])
    assert major >= 18, f"Node.js major version must be >= 18, found {version}."


def test_home_directory_exists():
    assert os.path.isdir(HOME_DIR), f"Home directory {HOME_DIR} does not exist."
