import os
import shutil

PROJECT_DIR = "/home/user/qwik-docs"


def test_node_available():
    assert shutil.which("node") is not None, "node binary not found in PATH."


def test_npm_available():
    assert shutil.which("npm") is not None, "npm binary not found in PATH."


def test_project_dir_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."


def test_package_json_exists_and_uses_qwik_city():
    package_json = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json), f"{package_json} does not exist."
    with open(package_json) as f:
        content = f.read()
    assert "@builder.io/qwik-city" in content, (
        "package.json should declare a dependency on @builder.io/qwik-city."
    )
    assert "@builder.io/qwik" in content, (
        "package.json should declare a dependency on @builder.io/qwik."
    )


def test_vite_config_exists():
    candidates = [
        os.path.join(PROJECT_DIR, "vite.config.ts"),
        os.path.join(PROJECT_DIR, "vite.config.mts"),
        os.path.join(PROJECT_DIR, "vite.config.js"),
    ]
    assert any(os.path.isfile(p) for p in candidates), (
        "A Vite config file (vite.config.ts) is expected in the scaffolded project."
    )


def test_routes_dir_exists():
    routes_dir = os.path.join(PROJECT_DIR, "src", "routes")
    assert os.path.isdir(routes_dir), (
        f"Qwik City routes directory {routes_dir} does not exist."
    )


def test_docs_data_module_exists():
    data_module = os.path.join(PROJECT_DIR, "src", "data", "docs.ts")
    assert os.path.isfile(data_module), (
        f"The provided local data module {data_module} does not exist."
    )


def test_docs_data_contains_reference_categories_and_titles():
    data_module = os.path.join(PROJECT_DIR, "src", "data", "docs.ts")
    with open(data_module) as f:
        content = f.read()

    expected_fragments = [
        "getting-started",
        "Getting Started",
        "installation",
        "Installation",
        "project-structure",
        "Project Structure",
        "components",
        "Components",
        "state",
        "State Management",
        "routing",
        "Routing",
        "layouts",
        "Nested Layouts",
    ]
    for fragment in expected_fragments:
        assert fragment in content, (
            f"Expected the provided docs data module to contain '{fragment}'."
        )
