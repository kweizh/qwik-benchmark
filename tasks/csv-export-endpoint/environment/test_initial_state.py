import os
import shutil
import sqlite3

import pytest

PROJECT_DIR = "/home/user/qwik-app"
DB_PATH = os.path.join(PROJECT_DIR, "data", "reports.db")

EXPECTED_COLUMNS = ["id", "date", "category", "description", "amount"]


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
        content = f.read()
    assert "@builder.io/qwik-city" in content, "package.json does not reference @builder.io/qwik-city."
    assert "@builder.io/qwik" in content, "package.json does not reference @builder.io/qwik."
    assert "better-sqlite3" in content, "package.json does not reference better-sqlite3."


def test_vite_config_exists():
    vite_config = os.path.join(PROJECT_DIR, "vite.config.ts")
    assert os.path.isfile(vite_config), f"{vite_config} does not exist."


def test_node_modules_installed():
    node_modules = os.path.join(PROJECT_DIR, "node_modules")
    assert os.path.isdir(node_modules), "node_modules directory not found; dependencies are not installed."
    better_sqlite = os.path.join(node_modules, "better-sqlite3")
    assert os.path.isdir(better_sqlite), "better-sqlite3 is not installed in node_modules."


def test_database_file_exists():
    assert os.path.isfile(DB_PATH), f"SQLite database file {DB_PATH} does not exist."


def test_transactions_table_schema():
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.execute("PRAGMA table_info(transactions)")
        columns = [row[1] for row in cur.fetchall()]
    finally:
        conn.close()
    assert columns, "Table 'transactions' does not exist in the database."
    for col in EXPECTED_COLUMNS:
        assert col in columns, f"Column '{col}' is missing from the 'transactions' table."


def test_transactions_seed_rows():
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.execute("SELECT COUNT(*) FROM transactions")
        count = cur.fetchone()[0]
    finally:
        conn.close()
    assert count == 6, f"Expected 6 seeded rows in 'transactions', found {count}."
