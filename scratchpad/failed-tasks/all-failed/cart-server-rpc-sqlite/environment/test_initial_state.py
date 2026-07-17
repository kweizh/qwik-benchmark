import os
import shutil
import subprocess

HOME_DIR = "/home/user"


def test_home_directory_exists():
    assert os.path.isdir(HOME_DIR), f"Home directory {HOME_DIR} does not exist."


def test_node_available():
    node_path = shutil.which("node")
    assert node_path is not None, "node binary not found in PATH."
    result = subprocess.run(
        ["node", "--version"], capture_output=True, text=True
    )
    assert result.returncode == 0, (
        f"'node --version' failed with output: {result.stderr}"
    )


def test_npm_available():
    npm_path = shutil.which("npm")
    assert npm_path is not None, "npm binary not found in PATH."
    result = subprocess.run(
        ["npm", "--version"], capture_output=True, text=True
    )
    assert result.returncode == 0, (
        f"'npm --version' failed with output: {result.stderr}"
    )


def test_npx_available():
    npx_path = shutil.which("npx")
    assert npx_path is not None, "npx binary not found in PATH."
