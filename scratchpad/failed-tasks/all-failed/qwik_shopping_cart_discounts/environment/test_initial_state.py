import os
import shutil

PROJECT_DIR = "/home/user/qwik-app"

def test_node_and_npm_available():
    assert shutil.which("node") is not None, "Node.js binary not found in PATH."
    assert shutil.which("npm") is not None, "npm binary not found in PATH."

def test_project_dir_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."

def test_package_json_exists():
    package_json_path = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json_path), f"package.json not found at {package_json_path}."

def test_completed_files_do_not_exist():
    # The API endpoint route should not exist yet
    api_route_path = os.path.join(PROJECT_DIR, "src/routes/api/cart/index.ts")
    assert not os.path.exists(api_route_path), "Completed API route file should not exist in the initial state."

    # The user interface route should not exist yet
    ui_route_path = os.path.join(PROJECT_DIR, "src/routes/cart/index.tsx")
    assert not os.path.exists(ui_route_path), "Completed UI route file should not exist in the initial state."

    # Database should not be initialized yet (agent should initialize it)
    db_path = os.path.join(PROJECT_DIR, "db.sqlite")
    assert not os.path.exists(db_path), "Database file should not exist in the initial state."
