import os
import sqlite3
import shutil
import pytest

PROJECT_DIR = "/home/user/qwik-app"
DB_PATH = os.path.join(PROJECT_DIR, "poll.db")

def test_node_and_npm_available():
    assert shutil.which("node") is not None, "Node.js binary not found in PATH."
    assert shutil.which("npm") is not None, "npm binary not found in PATH."

def test_project_directory_exists():
    assert os.path.isdir(PROJECT_DIR), f"Project directory {PROJECT_DIR} does not exist."

def test_database_exists():
    assert os.path.isfile(DB_PATH), f"Database file {DB_PATH} does not exist."

def test_database_initial_schema_and_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check table existence
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    assert "polls" in tables, "Table 'polls' is missing from the database."
    assert "options" in tables, "Table 'options' is missing from the database."
    assert "votes_log" in tables, "Table 'votes_log' is missing from the database."

    # Check pre-seeded polls
    cursor.execute("SELECT id, question FROM polls ORDER BY id;")
    polls = cursor.fetchall()
    assert len(polls) == 2, f"Expected 2 polls, found {len(polls)}."
    assert polls[0] == ("colors", "What is your favorite primary color?"), "Poll 'colors' data mismatch."
    assert polls[1] == ("frameworks", "What is your favorite frontend framework?"), "Poll 'frameworks' data mismatch."

    # Check pre-seeded options
    cursor.execute("SELECT id, poll_id, text, votes FROM options ORDER BY id;")
    options = cursor.fetchall()
    assert len(options) == 7, f"Expected 7 options, found {len(options)}."

    expected_options = [
        (1, "frameworks", "Qwik", 0),
        (2, "frameworks", "React", 0),
        (3, "frameworks", "Vue", 0),
        (4, "frameworks", "Svelte", 0),
        (5, "colors", "Red", 0),
        (6, "colors", "Blue", 0),
        (7, "colors", "Yellow", 0),
    ]
    for i, opt in enumerate(expected_options):
        assert options[i] == opt, f"Option at index {i} mismatch: expected {opt}, found {options[i]}."

    conn.close()
