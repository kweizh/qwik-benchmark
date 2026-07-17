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


def test_package_json_exists_with_qwik_city():
    package_json = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json), f"{package_json} does not exist."
    with open(package_json) as f:
        data = json.load(f)
    deps = {}
    deps.update(data.get("dependencies", {}))
    deps.update(data.get("devDependencies", {}))
    assert "@builder.io/qwik" in deps, "Expected @builder.io/qwik in package.json dependencies."
    assert "@builder.io/qwik-city" in deps, (
        "Expected @builder.io/qwik-city in package.json dependencies."
    )


def test_vite_config_exists():
    candidates = [
        os.path.join(PROJECT_DIR, "vite.config.ts"),
        os.path.join(PROJECT_DIR, "vite.config.js"),
        os.path.join(PROJECT_DIR, "vite.config.mts"),
    ]
    assert any(os.path.isfile(c) for c in candidates), (
        "Expected a vite config file in the project root."
    )


def test_routes_dir_exists():
    routes_dir = os.path.join(PROJECT_DIR, "src", "routes")
    assert os.path.isdir(routes_dir), f"Expected Qwik City routes directory at {routes_dir}."


def test_dependencies_installed():
    node_modules = os.path.join(PROJECT_DIR, "node_modules")
    assert os.path.isdir(node_modules), (
        f"Expected dependencies to be installed at {node_modules}."
    )


def test_metrics_endpoint_not_yet_created():
    # The executor is expected to CREATE the metrics endpoint; it must not exist yet.
    endpoint_dir = os.path.join(PROJECT_DIR, "src", "routes", "api", "metrics")
    assert not os.path.exists(endpoint_dir), (
        f"The metrics endpoint {endpoint_dir} should not exist in the initial state."
    )
