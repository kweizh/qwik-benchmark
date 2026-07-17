import os
import re
import socket

import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the dev server may listen on ::1 only while an AF_INET
# socket to 127.0.0.1 never connects -> the readiness check would hang for the
# full timeout and raise a confusing TimeoutError.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

COLUMNS = ["todo", "doing", "done"]

SEED = {
    "todo": [(1, "Design landing page"), (2, "Write unit tests"), (3, "Set up CI")],
    "doing": [(4, "Implement auth"), (5, "Refactor store")],
    "done": [(6, "Project scaffolding")],
}


# --------------------------------------------------------------------------- #
# Service fixture
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session")
def start_app(xprocess):
    class Starter(ProcessStarter):
        name = "kanban_app"
        # Force the Vite/Qwik dev server to bind the IPv4 loopback so it matches
        # the address the readiness check and tests connect to.
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 240
        terminate_on_interrupt = True

        def startup_check(self):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            # The first request triggers on-demand dev bundling, so allow a
            # generous timeout. Accept any non-5xx status.
            try:
                resp = requests.get(BASE_URL, timeout=60)
                return resp.status_code < 500
            except requests.RequestException:
                return False

    info = xprocess.getinfo(Starter.name)
    printed_log_lines = 0

    def capture_logs(tag):
        nonlocal printed_log_lines
        try:
            with open(info.logpath, "r") as f:
                all_lines = f.readlines()
        except FileNotFoundError:
            return
        new_lines = all_lines[printed_log_lines:]
        skipped = printed_log_lines
        printed_log_lines = len(all_lines)
        print(
            f"===================== [{tag}: Begin] {Starter.name} logfile ====================="
        )
        if skipped > 0:
            print(f"(skipped {skipped} already-printed lines)")
        print("".join(new_lines))
        print(
            f"===================== [{tag}: End  ] {Starter.name} logfile ====================="
        )

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


# --------------------------------------------------------------------------- #
# HTTP helpers
# --------------------------------------------------------------------------- #
def reset_board():
    resp = requests.post(f"{BASE_URL}/api/reset", timeout=30)
    assert (
        resp.status_code == 200
    ), f"POST /api/reset expected 200, got {resp.status_code}: {resp.text[:500]}"
    return resp.json()


def get_board():
    resp = requests.get(f"{BASE_URL}/api/board", timeout=30)
    assert (
        resp.status_code == 200
    ), f"GET /api/board expected 200, got {resp.status_code}: {resp.text[:500]}"
    return resp.json()


def move(card_id=None, to_column=None, to_index=None):
    body = {}
    if card_id is not None:
        body["cardId"] = card_id
    if to_column is not None:
        body["toColumn"] = to_column
    if to_index is not None:
        body["toIndex"] = to_index
    return requests.post(f"{BASE_URL}/api/move", json=body, timeout=30)


def move_ok(card_id, to_column, to_index):
    resp = move(card_id, to_column, to_index)
    assert (
        resp.status_code == 200
    ), f"POST /api/move expected 200, got {resp.status_code}: {resp.text[:500]}"
    return resp.json()


def column_ids(board, col):
    assert col in board, f"Board response missing column '{col}': {board}"
    return [c["id"] for c in board[col]]


def column_titles(board, col):
    return [c["title"] for c in board[col]]


def assert_contiguous_positions(board):
    for col in COLUMNS:
        positions = [c["position"] for c in board[col]]
        expected = list(range(len(positions)))
        assert positions == expected, (
            f"Column '{col}' positions must be contiguous 0..n-1 ascending, "
            f"got {positions}"
        )


# --------------------------------------------------------------------------- #
# HTML helpers (SSR / routeLoader$ rehydration)
# --------------------------------------------------------------------------- #
def get_html():
    resp = requests.get(BASE_URL, timeout=60)
    assert (
        resp.status_code == 200
    ), f"GET / expected 200, got {resp.status_code}"
    return resp.text


def column_slice(html, col):
    starts = {}
    for c in COLUMNS:
        idx = html.find(f'data-column="{c}"')
        assert idx >= 0, f'Missing column container data-column="{c}" in rendered HTML'
        starts[c] = idx
    this = starts[col]
    later = [s for c, s in starts.items() if s > this]
    end = min(later) if later else len(html)
    return html[this:end]


def card_ids_in_slice(slice_html):
    return [int(m) for m in re.findall(r'data-card-id="(\d+)"', slice_html)]


# --------------------------------------------------------------------------- #
# Tests
# --------------------------------------------------------------------------- #
def test_seed_board(start_app):
    board = reset_board()
    board = get_board()
    assert column_ids(board, "todo") == [1, 2, 3], f"todo ids wrong: {board['todo']}"
    assert column_titles(board, "todo") == [
        "Design landing page",
        "Write unit tests",
        "Set up CI",
    ], f"todo titles wrong: {board['todo']}"
    assert column_ids(board, "doing") == [4, 5], f"doing ids wrong: {board['doing']}"
    assert column_titles(board, "doing") == [
        "Implement auth",
        "Refactor store",
    ], f"doing titles wrong: {board['doing']}"
    assert column_ids(board, "done") == [6], f"done ids wrong: {board['done']}"
    assert column_titles(board, "done") == [
        "Project scaffolding"
    ], f"done titles wrong: {board['done']}"
    assert_contiguous_positions(board)


def test_move_across_columns(start_app):
    reset_board()
    returned = move_ok(card_id=1, to_column="doing", to_index=1)
    assert column_ids(returned, "todo") == [2, 3], f"returned todo wrong: {returned['todo']}"
    assert column_ids(returned, "doing") == [
        4,
        1,
        5,
    ], f"returned doing wrong: {returned['doing']}"
    assert_contiguous_positions(returned)

    board = get_board()
    assert column_ids(board, "todo") == [2, 3], f"persisted todo wrong: {board['todo']}"
    assert column_ids(board, "doing") == [
        4,
        1,
        5,
    ], f"persisted doing wrong: {board['doing']}"
    assert column_titles(board, "doing") == [
        "Implement auth",
        "Design landing page",
        "Refactor store",
    ], f"persisted doing titles wrong: {board['doing']}"
    assert column_ids(board, "done") == [6], f"persisted done wrong: {board['done']}"
    assert_contiguous_positions(board)


def test_reorder_within_column(start_app):
    reset_board()
    move_ok(card_id=3, to_column="todo", to_index=0)
    board = get_board()
    assert column_ids(board, "todo") == [3, 1, 2], f"todo order wrong: {board['todo']}"
    assert column_titles(board, "todo") == [
        "Set up CI",
        "Design landing page",
        "Write unit tests",
    ], f"todo titles wrong: {board['todo']}"
    assert column_ids(board, "doing") == [4, 5], f"doing changed unexpectedly: {board['doing']}"
    assert column_ids(board, "done") == [6], f"done changed unexpectedly: {board['done']}"
    assert_contiguous_positions(board)


def test_clamp_out_of_range_index(start_app):
    reset_board()
    move_ok(card_id=6, to_column="todo", to_index=99)
    board = get_board()
    assert column_ids(board, "todo") == [
        1,
        2,
        3,
        6,
    ], f"todo after clamp wrong: {board['todo']}"
    assert column_ids(board, "done") == [], f"done should be empty: {board['done']}"
    assert_contiguous_positions(board)


def test_persistence_and_rehydration_html(start_app):
    reset_board()
    move_ok(card_id=6, to_column="todo", to_index=99)
    html = get_html()

    todo_slice = column_slice(html, "todo")
    todo_ids = card_ids_in_slice(todo_slice)
    assert 3 in todo_ids and 6 in todo_ids, (
        f"Expected card ids 3 and 6 in the rendered todo column, got {todo_ids}"
    )
    assert todo_ids.index(6) > todo_ids.index(3), (
        f"Card 6 (Project scaffolding) must render after card 3 (Set up CI) in "
        f"the todo column; got order {todo_ids}"
    )
    assert "Project scaffolding" in todo_slice, (
        "Rendered todo column must contain the title 'Project scaffolding'"
    )

    done_slice = column_slice(html, "done")
    assert card_ids_in_slice(done_slice) == [], (
        "The done column must render no cards after the move, "
        f"got {card_ids_in_slice(done_slice)}"
    )


def test_error_handling(start_app):
    reset_board()

    resp_404 = move(card_id=999, to_column="todo", to_index=0)
    assert resp_404.status_code == 404, (
        f"Moving a non-existent card must return 404, got {resp_404.status_code}"
    )

    resp_missing = move(to_column="todo", to_index=0)
    assert resp_missing.status_code == 400, (
        f"Missing cardId must return 400, got {resp_missing.status_code}"
    )

    resp_bad_col = move(card_id=1, to_column="backlog", to_index=0)
    assert resp_bad_col.status_code == 400, (
        f"Invalid toColumn must return 400, got {resp_bad_col.status_code}"
    )


def test_rendered_board_ssr(start_app):
    reset_board()
    html = get_html()

    for col, cards in SEED.items():
        slice_html = column_slice(html, col)
        ids = card_ids_in_slice(slice_html)
        expected_ids = [cid for cid, _ in cards]
        assert ids == expected_ids, (
            f"Rendered column '{col}' card order wrong: expected {expected_ids}, got {ids}"
        )
        # Titles render in order within the column.
        last_pos = -1
        for _, title in cards:
            pos = slice_html.find(title)
            assert pos >= 0, f"Title '{title}' not rendered in column '{col}'"
            assert pos > last_pos, (
                f"Title '{title}' rendered out of order in column '{col}'"
            )
            last_pos = pos
        # Cards must be draggable.
        assert "draggable" in slice_html, (
            f"Cards in column '{col}' must be draggable (missing 'draggable' attribute)"
        )
