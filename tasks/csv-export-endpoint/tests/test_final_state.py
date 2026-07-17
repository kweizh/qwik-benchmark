import csv
import io
import os
import re
import socket

import pytest
import requests
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/qwik-app"
PORT = 5173
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the dev server would listen on ::1 only while an AF_INET
# socket to 127.0.0.1 never connects -> readiness checks would hang.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"
EXPORT_URL = f"{BASE_URL}/reports/export"
REPORTS_URL = f"{BASE_URL}/reports"

REQUEST_TIMEOUT = 90


@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()


@pytest.fixture(scope="session")
def start_app(xprocess):
    class Starter(ProcessStarter):
        name = "start_app"
        # `--host 127.0.0.1` forces Vite to bind the IPv4 loopback so it matches the
        # address the readiness check and the tests connect to.
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
        # CRITICAL: set `env` as a class attribute here, NEVER inside `popen_kwargs`.
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
            try:
                resp = requests.get(BASE_URL, timeout=30)
                return resp.status_code < 500
            except requests.RequestException:
                return False

    info = xprocess.getinfo(Starter.name)
    printed_log_lines = 0

    def capture_logs(tag):
        nonlocal printed_log_lines
        with open(info.logpath, "r") as f:
            all_lines = f.readlines()
        new_lines = all_lines[printed_log_lines:]
        skipped = printed_log_lines
        printed_log_lines = len(all_lines)
        print(f"===================== [{tag}: Begin] {Starter.name} logfile =====================")
        if skipped > 0:
            print(f"(skipped {skipped} already-printed lines)")
        print("".join(new_lines))
        print(f"===================== [{tag}: End  ] {Starter.name} logfile =====================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def _parse_csv_rows(text):
    """Parse CSV text with a strict RFC 4180 reader and drop trailing empty rows."""
    rows = list(csv.reader(io.StringIO(text)))
    return [r for r in rows if r != [] and r != [""]]


def test_export_headers(start_app):
    resp = requests.get(EXPORT_URL, timeout=REQUEST_TIMEOUT)
    assert resp.status_code == 200, f"GET /reports/export returned {resp.status_code}, expected 200."

    content_type = resp.headers.get("Content-Type", "")
    assert "text/csv" in content_type.lower(), (
        f"Expected Content-Type to contain 'text/csv', got '{content_type}'."
    )

    disposition = resp.headers.get("Content-Disposition", "")
    assert "attachment" in disposition.lower(), (
        f"Expected Content-Disposition to be an attachment, got '{disposition}'."
    )
    assert "filename" in disposition.lower(), (
        f"Expected Content-Disposition to include a filename, got '{disposition}'."
    )
    assert ".csv" in disposition.lower(), (
        f"Expected Content-Disposition filename to end in .csv, got '{disposition}'."
    )


def test_export_csv_no_filter(start_app):
    resp = requests.get(EXPORT_URL, timeout=REQUEST_TIMEOUT)
    assert resp.status_code == 200, f"GET /reports/export returned {resp.status_code}, expected 200."

    body = resp.content.decode("utf-8")

    # RFC 4180 requires CRLF between records.
    assert "\r\n" in body, "Expected CSV records to be separated by CRLF (\\r\\n)."

    # Fields with commas must be quoted; internal double quotes must be doubled.
    assert '"Coffee, tea, and snacks"' in body, (
        "Expected the comma-containing description to be wrapped in double quotes."
    )
    assert '"Taxi to ""Airport"""' in body, (
        "Expected the quote-containing description to be quoted with doubled inner quotes."
    )

    rows = _parse_csv_rows(body)
    expected = [
        ["id", "date", "category", "description", "amount"],
        ["1", "2024-01-05", "food", "Coffee, tea, and snacks", "12.5"],
        ["2", "2024-01-15", "travel", 'Taxi to "Airport"', "40"],
        ["3", "2024-02-03", "food", "Groceries", "100"],
        ["4", "2024-02-20", "office", "Notebook\nand pens", "8.75"],
        ["5", "2024-03-10", "travel", "Train ticket", "55.2"],
        ["6", "2024-03-25", "food", 'Dinner, drinks, and "dessert"', "88.9"],
    ]
    assert rows == expected, f"Unfiltered CSV rows did not match expected.\nGot: {rows}\nExpected: {expected}"


def test_export_category_filter(start_app):
    resp = requests.get(EXPORT_URL, params={"category": "food"}, timeout=REQUEST_TIMEOUT)
    assert resp.status_code == 200, f"GET /reports/export?category=food returned {resp.status_code}."

    rows = _parse_csv_rows(resp.content.decode("utf-8"))
    assert rows[0] == ["id", "date", "category", "description", "amount"], (
        f"Expected header row first, got {rows[0]}."
    )
    data_ids = [r[0] for r in rows[1:]]
    assert data_ids == ["1", "3", "6"], (
        f"Expected only food rows with ids 1,3,6 in order, got ids {data_ids}."
    )


def test_export_date_range_filter(start_app):
    resp = requests.get(
        EXPORT_URL, params={"from": "2024-02-01", "to": "2024-02-28"}, timeout=REQUEST_TIMEOUT
    )
    assert resp.status_code == 200, f"GET /reports/export with date range returned {resp.status_code}."

    rows = _parse_csv_rows(resp.content.decode("utf-8"))
    data_ids = [r[0] for r in rows[1:]]
    assert data_ids == ["3", "4"], (
        f"Expected rows with ids 3,4 for Feb 2024 date range, got ids {data_ids}."
    )


def test_export_combined_filter(start_app):
    resp = requests.get(
        EXPORT_URL,
        params={"from": "2024-02-01", "to": "2024-03-31", "category": "travel"},
        timeout=REQUEST_TIMEOUT,
    )
    assert resp.status_code == 200, f"GET /reports/export with combined filter returned {resp.status_code}."

    rows = _parse_csv_rows(resp.content.decode("utf-8"))
    data_rows = rows[1:]
    assert len(data_rows) == 1, f"Expected exactly one row for combined filter, got {len(data_rows)}."
    assert data_rows[0][0] == "5", f"Expected id 5 for combined filter, got id {data_rows[0][0]}."
    assert data_rows[0][3] == "Train ticket", (
        f"Expected description 'Train ticket', got '{data_rows[0][3]}'."
    )


def _extract_hrefs(html):
    return re.findall(r'href="([^"]*)"', html)


def test_report_page_unfiltered(start_app):
    resp = requests.get(REPORTS_URL, timeout=REQUEST_TIMEOUT)
    assert resp.status_code == 200, f"GET /reports returned {resp.status_code}, expected 200."

    html = resp.text
    for desc in ["Groceries", "Train ticket", "Coffee, tea, and snacks"]:
        assert desc in html, f"Expected the report page to list description '{desc}'."

    assert "Download CSV" in html, "Expected a 'Download CSV' link on the report page."
    hrefs = _extract_hrefs(html)
    assert any("/reports/export" in h for h in hrefs), (
        f"Expected a link pointing at /reports/export, found hrefs: {hrefs}."
    )


def test_report_page_filtered_link_carries_filters(start_app):
    resp = requests.get(REPORTS_URL, params={"category": "food"}, timeout=REQUEST_TIMEOUT)
    assert resp.status_code == 200, f"GET /reports?category=food returned {resp.status_code}."

    html = resp.text
    assert "Groceries" in html, "Expected a food row 'Groceries' to be listed when filtering by category=food."
    assert "Train ticket" not in html, (
        "Did not expect the travel row 'Train ticket' when filtering by category=food."
    )

    hrefs = _extract_hrefs(html)
    export_hrefs = [h for h in hrefs if "/reports/export" in h]
    assert export_hrefs, f"Expected a Download CSV link to /reports/export, found hrefs: {hrefs}."
    assert any("category=food" in h for h in export_hrefs), (
        f"Expected the Download CSV link to carry category=food, got: {export_hrefs}."
    )


def test_report_page_browser(start_app, browser_verifier):
    reason = (
        "The /reports page must render transactions from the local SQLite database and, when "
        "filtered by category, list only the matching rows along with a working 'Download CSV' link."
    )
    truth = (
        f"Navigate to {REPORTS_URL}?category=food. Verify that the page lists the food transaction "
        "descriptions including 'Coffee, tea, and snacks' and 'Groceries'. Verify that a link with the "
        "visible text 'Download CSV' is present on the page."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_report_page_browser",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"
