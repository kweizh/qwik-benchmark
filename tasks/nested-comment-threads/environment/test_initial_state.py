import os
import shutil
import subprocess

PROJECT_DIR = "/home/user/qwik-comments"


def test_node_available():
    assert shutil.which("node") is not None, "node binary not found in PATH."


def test_npm_available():
    assert shutil.which("npm") is not None, "npm binary not found in PATH."


def test_node_runs():
    result = subprocess.run(
        ["node", "--version"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"`node --version` failed: {result.stderr}"
    assert result.stdout.strip().startswith("v"), (
        f"Unexpected node version output: {result.stdout!r}"
    )


def test_project_dir_exists():
    assert os.path.isdir(PROJECT_DIR), (
        f"Project directory {PROJECT_DIR} does not exist."
    )
