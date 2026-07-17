import json
import os
import shutil

import pytest

PROJECT_DIR = "/home/user/qwik-blog"


def test_node_available():
    assert shutil.which("node") is not None, "node binary not found in PATH."


def test_npm_available():
    assert shutil.which("npm") is not None, "npm binary not found in PATH."


def test_project_dir_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."


def test_package_json_exists():
    pkg = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(pkg), f"package.json not found at {pkg}."


def test_dependencies_declared():
    pkg = os.path.join(PROJECT_DIR, "package.json")
    with open(pkg) as f:
        data = json.load(f)
    all_deps = {}
    all_deps.update(data.get("dependencies", {}))
    all_deps.update(data.get("devDependencies", {}))
    for dep in ["@builder.io/qwik", "@builder.io/qwik-city", "prisma", "@prisma/client"]:
        assert dep in all_deps, f"Expected dependency '{dep}' to be declared in package.json."


def test_node_modules_installed():
    node_modules = os.path.join(PROJECT_DIR, "node_modules")
    assert os.path.isdir(node_modules), (
        f"node_modules not found at {node_modules}; dependencies should be pre-installed."
    )
    qwik_city = os.path.join(node_modules, "@builder.io", "qwik-city")
    assert os.path.isdir(qwik_city), (
        "@builder.io/qwik-city is not installed in node_modules."
    )


def test_prisma_installed():
    prisma_cli = os.path.join(PROJECT_DIR, "node_modules", ".bin", "prisma")
    assert os.path.isfile(prisma_cli) or os.path.islink(prisma_cli), (
        "The prisma CLI is not installed in the project's node_modules/.bin."
    )


def test_routes_directory_exists():
    routes_dir = os.path.join(PROJECT_DIR, "src", "routes")
    assert os.path.isdir(routes_dir), (
        f"Qwik City routes directory {routes_dir} does not exist; the base project should be scaffolded."
    )
