import shutil
import subprocess


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


def test_npm_runs():
    npm = shutil.which("npm")
    assert npm is not None, "npm binary not found in PATH."
    result = subprocess.run(
        [npm, "--version"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"`npm --version` failed: {result.stderr}"
