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


def test_package_json_has_qwik_dependencies():
    package_json_path = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json_path), f"{package_json_path} does not exist."
    with open(package_json_path) as f:
        data = json.load(f)
    all_deps = {}
    all_deps.update(data.get("dependencies", {}))
    all_deps.update(data.get("devDependencies", {}))
    assert "@builder.io/qwik" in all_deps, "Expected '@builder.io/qwik' in package.json dependencies."
    assert "@builder.io/qwik-city" in all_deps, "Expected '@builder.io/qwik-city' in package.json dependencies."


def test_dependencies_installed():
    qwik_module = os.path.join(PROJECT_DIR, "node_modules", "@builder.io", "qwik")
    qwik_city_module = os.path.join(PROJECT_DIR, "node_modules", "@builder.io", "qwik-city")
    assert os.path.isdir(qwik_module), "node_modules/@builder.io/qwik not found; dependencies are not installed."
    assert os.path.isdir(qwik_city_module), "node_modules/@builder.io/qwik-city not found; dependencies are not installed."


def test_ssr_entry_scaffold_exists():
    entry_ssr = os.path.join(PROJECT_DIR, "src", "entry.ssr.tsx")
    root_tsx = os.path.join(PROJECT_DIR, "src", "root.tsx")
    assert os.path.isfile(entry_ssr), f"Expected scaffolded SSR entry at {entry_ssr}."
    assert os.path.isfile(root_tsx), f"Expected scaffolded root component at {root_tsx}."
