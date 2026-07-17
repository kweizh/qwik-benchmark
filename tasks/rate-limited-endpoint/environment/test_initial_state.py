import json
import os
import shutil

PROJECT_DIR = "/home/user/qwik-app"


def test_node_available():
    assert shutil.which("node") is not None, "node binary not found in PATH."


def test_npm_available():
    assert shutil.which("npm") is not None, "npm binary not found in PATH."


def test_project_dir_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."


def test_package_json_exists():
    package_json = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json), f"{package_json} does not exist."


def test_package_json_has_qwik_city_dependency():
    package_json = os.path.join(PROJECT_DIR, "package.json")
    with open(package_json) as f:
        data = json.load(f)
    deps = {}
    deps.update(data.get("dependencies", {}))
    deps.update(data.get("devDependencies", {}))
    assert "@builder.io/qwik-city" in deps, (
        "Expected '@builder.io/qwik-city' to be a dependency of the scaffolded project."
    )
    assert "@builder.io/qwik" in deps, (
        "Expected '@builder.io/qwik' to be a dependency of the scaffolded project."
    )


def test_dependencies_installed():
    node_modules = os.path.join(PROJECT_DIR, "node_modules")
    assert os.path.isdir(node_modules), (
        f"{node_modules} does not exist; project dependencies must be installed."
    )
    qwik_city_pkg = os.path.join(node_modules, "@builder.io", "qwik-city", "package.json")
    assert os.path.isfile(qwik_city_pkg), (
        "Expected @builder.io/qwik-city to be installed under node_modules."
    )


def test_routes_directory_exists():
    routes_dir = os.path.join(PROJECT_DIR, "src", "routes")
    assert os.path.isdir(routes_dir), (
        f"Expected Qwik City routes directory at {routes_dir}."
    )
