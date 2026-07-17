import json
import os
import shutil

PROJECT_DIR = "/home/user/qwik-gallery"


def test_node_available():
    assert shutil.which("node") is not None, "node binary not found in PATH."


def test_npm_available():
    assert shutil.which("npm") is not None, "npm binary not found in PATH."


def test_project_dir_exists():
    assert os.path.isdir(PROJECT_DIR), (
        f"Expected the pre-scaffolded Qwik City project at {PROJECT_DIR}, "
        "but the directory does not exist."
    )


def test_package_json_present_with_qwik_city():
    package_json = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json), (
        f"Expected {package_json} to exist in the scaffolded project."
    )
    with open(package_json) as f:
        data = json.load(f)
    deps = {}
    deps.update(data.get("dependencies", {}) or {})
    deps.update(data.get("devDependencies", {}) or {})
    assert "@builder.io/qwik-city" in deps, (
        "Expected '@builder.io/qwik-city' to be listed as a dependency in package.json, "
        f"but found: {sorted(deps.keys())}"
    )
    assert "@builder.io/qwik" in deps, (
        "Expected '@builder.io/qwik' to be listed as a dependency in package.json, "
        f"but found: {sorted(deps.keys())}"
    )


def test_dependencies_installed():
    node_modules = os.path.join(PROJECT_DIR, "node_modules", "@builder.io", "qwik-city")
    assert os.path.isdir(node_modules), (
        "Expected project dependencies to be installed "
        f"(missing {node_modules}). The environment should have run 'npm install'."
    )


def test_routes_directory_exists():
    routes_dir = os.path.join(PROJECT_DIR, "src", "routes")
    assert os.path.isdir(routes_dir), (
        f"Expected the Qwik City routes directory at {routes_dir} to exist."
    )
