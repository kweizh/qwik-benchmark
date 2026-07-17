import json
import os
import shutil

PROJECT_DIR = "/home/user/app"
DATA_FILE = os.path.join(PROJECT_DIR, "data", "products.json")
PACKAGE_JSON = os.path.join(PROJECT_DIR, "package.json")


def test_node_available():
    assert shutil.which("node") is not None, "node binary not found in PATH."


def test_npm_available():
    assert shutil.which("npm") is not None, "npm binary not found in PATH."


def test_project_dir_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."


def test_package_json_exists():
    assert os.path.isfile(PACKAGE_JSON), f"package.json not found at {PACKAGE_JSON}."


def test_qwik_city_dependency_present():
    with open(PACKAGE_JSON) as f:
        pkg = json.load(f)
    deps = {}
    deps.update(pkg.get("dependencies", {}) or {})
    deps.update(pkg.get("devDependencies", {}) or {})
    assert "@builder.io/qwik-city" in deps, (
        "@builder.io/qwik-city must be a dependency of the pre-scaffolded project."
    )
    assert "@builder.io/qwik" in deps, (
        "@builder.io/qwik must be a dependency of the pre-scaffolded project."
    )


def test_better_sqlite3_dependency_present():
    with open(PACKAGE_JSON) as f:
        pkg = json.load(f)
    deps = {}
    deps.update(pkg.get("dependencies", {}) or {})
    deps.update(pkg.get("devDependencies", {}) or {})
    assert "better-sqlite3" in deps, (
        "better-sqlite3 must be listed as a dependency in the pre-scaffolded project."
    )


def test_node_modules_installed():
    node_modules = os.path.join(PROJECT_DIR, "node_modules")
    assert os.path.isdir(node_modules), (
        "node_modules directory not found; dependencies should be pre-installed."
    )
    assert os.path.isdir(os.path.join(node_modules, "better-sqlite3")), (
        "better-sqlite3 is not installed in node_modules."
    )


def test_products_dataset_exists_and_valid():
    assert os.path.isfile(DATA_FILE), f"Dataset file {DATA_FILE} does not exist."
    with open(DATA_FILE) as f:
        data = json.load(f)
    assert isinstance(data, list), "products.json must contain a JSON array."
    assert len(data) == 24, f"Expected 24 products in dataset, found {len(data)}."
    required_keys = {"id", "name", "category", "price", "stock"}
    for row in data:
        assert isinstance(row, dict), "Each product entry must be a JSON object."
        assert required_keys.issubset(row.keys()), (
            f"Each product must contain keys {sorted(required_keys)}; got {sorted(row.keys())}."
        )


def test_products_route_not_yet_implemented():
    # The executor is expected to create this route; it must not already exist.
    candidates = [
        os.path.join(PROJECT_DIR, "src", "routes", "products", "index.tsx"),
        os.path.join(PROJECT_DIR, "src", "routes", "products", "index.ts"),
    ]
    for path in candidates:
        assert not os.path.exists(path), (
            f"Route {path} already exists; the starting environment must not contain the solution."
        )
