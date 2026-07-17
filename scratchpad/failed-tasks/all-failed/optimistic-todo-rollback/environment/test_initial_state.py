import json
import os
import shutil

PROJECT_DIR = "/home/user/optimistic-todo"


def test_node_available():
    assert shutil.which("node") is not None, "node binary not found in PATH."


def test_npm_available():
    assert shutil.which("npm") is not None, "npm binary not found in PATH."


def test_project_dir_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."


def test_package_json_exists_with_qwik_deps():
    pkg_path = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(pkg_path), f"package.json not found at {pkg_path}."
    with open(pkg_path) as f:
        pkg = json.load(f)
    deps = {}
    deps.update(pkg.get("dependencies", {}))
    deps.update(pkg.get("devDependencies", {}))
    assert "@builder.io/qwik" in deps, "Expected @builder.io/qwik in project dependencies."
    assert "@builder.io/qwik-city" in deps, "Expected @builder.io/qwik-city in project dependencies."


def test_dependencies_installed():
    node_modules = os.path.join(PROJECT_DIR, "node_modules")
    assert os.path.isdir(node_modules), f"node_modules not found at {node_modules}; dependencies are not installed."
    qwik_mod = os.path.join(node_modules, "@builder.io", "qwik")
    assert os.path.isdir(qwik_mod), "The @builder.io/qwik package is not installed in node_modules."


def test_vite_config_exists():
    candidates = [
        os.path.join(PROJECT_DIR, "vite.config.ts"),
        os.path.join(PROJECT_DIR, "vite.config.js"),
        os.path.join(PROJECT_DIR, "vite.config.mts"),
    ]
    assert any(os.path.isfile(p) for p in candidates), (
        "No vite config (vite.config.ts/js/mts) found in the project root."
    )


def test_routes_dir_exists():
    routes_dir = os.path.join(PROJECT_DIR, "src", "routes")
    assert os.path.isdir(routes_dir), f"Qwik City routes directory {routes_dir} does not exist."


def test_sqlite_driver_installed():
    node_modules = os.path.join(PROJECT_DIR, "node_modules")
    better_sqlite = os.path.join(node_modules, "better-sqlite3")
    assert os.path.isdir(better_sqlite), (
        "The better-sqlite3 package is not installed in node_modules; a local SQLite driver is required."
    )
