import json
import os
import shutil

PROJECT_DIR = "/home/user/qwik-auth"


def test_node_available():
    assert shutil.which("node") is not None, "node binary not found in PATH."


def test_npm_available():
    assert shutil.which("npm") is not None, "npm binary not found in PATH."


def test_project_dir_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."


def test_package_json_exists():
    pkg = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(pkg), f"package.json not found at {pkg}."


def test_package_json_has_qwik_city_dependency():
    pkg = os.path.join(PROJECT_DIR, "package.json")
    with open(pkg) as f:
        data = json.load(f)
    deps = {}
    deps.update(data.get("dependencies", {}))
    deps.update(data.get("devDependencies", {}))
    assert "@builder.io/qwik-city" in deps, (
        "Expected '@builder.io/qwik-city' to be listed in package.json dependencies."
    )
    assert "@builder.io/qwik" in deps, (
        "Expected '@builder.io/qwik' to be listed in package.json dependencies."
    )


def test_package_json_has_better_sqlite3_dependency():
    pkg = os.path.join(PROJECT_DIR, "package.json")
    with open(pkg) as f:
        data = json.load(f)
    deps = {}
    deps.update(data.get("dependencies", {}))
    deps.update(data.get("devDependencies", {}))
    assert "better-sqlite3" in deps, (
        "Expected 'better-sqlite3' to be listed in package.json dependencies."
    )


def test_node_modules_installed():
    node_modules = os.path.join(PROJECT_DIR, "node_modules")
    assert os.path.isdir(node_modules), (
        "node_modules directory not found; dependencies are expected to be pre-installed."
    )


def test_qwik_city_installed():
    dep = os.path.join(PROJECT_DIR, "node_modules", "@builder.io", "qwik-city")
    assert os.path.isdir(dep), (
        "@builder.io/qwik-city is not installed in node_modules."
    )


def test_better_sqlite3_installed():
    dep = os.path.join(PROJECT_DIR, "node_modules", "better-sqlite3")
    assert os.path.isdir(dep), "better-sqlite3 is not installed in node_modules."


def test_routes_dir_exists():
    routes = os.path.join(PROJECT_DIR, "src", "routes")
    assert os.path.isdir(routes), (
        f"Expected the Qwik City routes directory to exist at {routes}."
    )
