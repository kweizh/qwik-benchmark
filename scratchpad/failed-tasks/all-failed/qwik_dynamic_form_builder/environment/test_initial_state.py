import os
import shutil
import sqlite3
import pytest

PROJECT_DIR = "/home/user/qwik-app"
DB_PATH = os.path.join(PROJECT_DIR, "form_builder.sqlite")

def test_node_available():
    assert shutil.which("node") is not None, "Node.js binary not found in PATH."
    assert shutil.which("npm") is not None, "npm binary not found in PATH."

def test_project_dir_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."
    package_json = os.path.join(PROJECT_DIR, "package.json")
    assert os.path.isfile(package_json), f"package.json not found at {package_json}."

def test_database_and_tables_exist():
    assert os.path.isfile(DB_PATH), f"SQLite database file not found at {DB_PATH}."

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check forms table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='forms';")
    assert cursor.fetchone() is not None, "Table 'forms' does not exist in the database."

    # Check submissions table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='submissions';")
    assert cursor.fetchone() is not None, "Table 'submissions' does not exist in the database."

    # Check pre-seeded form contact_form
    cursor.execute("SELECT schema FROM forms WHERE id='contact_form';")
    row = cursor.fetchone()
    assert row is not None, "Pre-seeded form 'contact_form' not found in 'forms' table."

    conn.close()
