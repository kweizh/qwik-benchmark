import json
import os
import socket

import pytest
import requests
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/app"
PACKAGE_JSON = os.path.join(PROJECT_DIR, "package.json")
SRC_DIR = os.path.join(PROJECT_DIR, "src")
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the dev server may listen on ::1 only while an AF_INET
# socket to 127.0.0.1 never connects -> the readiness check would hang.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"
PRODUCTS_URL = f"{BASE_URL}/products"


@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()


@pytest.fixture(scope="session")
def start_app(xprocess):
    """Start the Qwik City dev server and confirm readiness on the target port."""

    class Starter(ProcessStarter):
        name = "start_app"
        # Force IPv4 loopback binding and the required port.
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
            # The first request triggers on-demand bundling and SQLite seeding,
            # so allow a generous timeout.
            try:
                resp = requests.get(PRODUCTS_URL, timeout=30)
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
        print(f"===== [{tag}: Begin] {Starter.name} logfile =====")
        if skipped > 0:
            print(f"(skipped {skipped} already-printed lines)")
        print("".join(new_lines))
        print(f"===== [{tag}: End] {Starter.name} logfile =====")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def _get_html(url):
    resp = requests.get(url, timeout=30)
    assert resp.status_code == 200, f"GET {url} returned status {resp.status_code}"
    return resp.text


# ---------------------------------------------------------------------------
# Section A: Data source / implementation checks
# ---------------------------------------------------------------------------

def test_better_sqlite3_is_dependency():
    with open(PACKAGE_JSON) as f:
        pkg = json.load(f)
    deps = {}
    deps.update(pkg.get("dependencies", {}) or {})
    deps.update(pkg.get("devDependencies", {}) or {})
    assert "better-sqlite3" in deps, (
        "better-sqlite3 must be listed as a dependency in package.json."
    )


def _iter_source_files():
    for root, _dirs, files in os.walk(SRC_DIR):
        for name in files:
            if name.endswith((".ts", ".tsx", ".js", ".jsx")):
                yield os.path.join(root, name)


def test_source_uses_route_loader_and_sqlite():
    found_loader = False
    found_sqlite = False
    for path in _iter_source_files():
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
        except (OSError, UnicodeDecodeError):
            continue
        if "routeLoader$" in content:
            found_loader = True
        if "better-sqlite3" in content:
            found_sqlite = True
    assert found_loader, "Expected a routeLoader$ (server-side loader) in the project source."
    assert found_sqlite, "Expected the project source to import better-sqlite3 for SQLite access."


def test_sqlite_database_file_created(start_app):
    # Trigger at least one request so on-demand seeding runs.
    _get_html(PRODUCTS_URL)
    db_found = False
    for root, _dirs, files in os.walk(PROJECT_DIR):
        if os.sep + "node_modules" + os.sep in root + os.sep:
            continue
        for name in files:
            if name.endswith((".db", ".sqlite", ".sqlite3")):
                db_found = True
                break
        if db_found:
            break
    assert db_found, "Expected a local SQLite database file to exist under the project."


# ---------------------------------------------------------------------------
# Section B: Default view
# ---------------------------------------------------------------------------

def test_default_view(start_app):
    html = _get_html(PRODUCTS_URL)
    assert "Total: 24" in html, "Default view must show 'Total: 24'."
    assert "Page 1 of 3" in html, "Default view must show 'Page 1 of 3'."
    assert "Alpha Keyboard" in html, "Default page 1 must contain 'Alpha Keyboard'."
    assert "Kappa Rug" in html, "Default page 1 must contain 'Kappa Rug'."
    assert "Nano Charger" not in html, (
        "Default page 1 must NOT contain 'Nano Charger' (it belongs to page 2)."
    )


# ---------------------------------------------------------------------------
# Section C: Pagination
# ---------------------------------------------------------------------------

def test_pagination_page_2(start_app):
    html = _get_html(f"{PRODUCTS_URL}?page=2")
    assert "Page 2 of 3" in html, "Page 2 must show 'Page 2 of 3'."
    assert "Nano Charger" in html, "Page 2 must contain 'Nano Charger'."
    assert "Alpha Keyboard" not in html, "Page 2 must NOT contain 'Alpha Keyboard'."


def test_pagination_custom_page_size(start_app):
    html = _get_html(f"{PRODUCTS_URL}?pageSize=5&page=2")
    assert "Total: 24" in html, "Custom page size view must show 'Total: 24'."
    assert "Page 2 of 5" in html, "pageSize=5 page=2 must show 'Page 2 of 5'."
    assert "Epsilon Cookbook" in html, "pageSize=5 page=2 must contain 'Epsilon Cookbook'."
    assert "Kappa Rug" in html, "pageSize=5 page=2 must contain 'Kappa Rug'."
    assert "Alpha Keyboard" not in html, (
        "pageSize=5 page=2 must NOT contain 'Alpha Keyboard' (page 1)."
    )
    assert "Nano Charger" not in html, (
        "pageSize=5 page=2 must NOT contain 'Nano Charger' (page 3)."
    )


# ---------------------------------------------------------------------------
# Section D: Searching (case-insensitive substring on name)
# ---------------------------------------------------------------------------

def test_search_book(start_app):
    html = _get_html(f"{PRODUCTS_URL}?q=book")
    assert "Total: 2" in html, "Search q=book must show 'Total: 2'."
    assert "Delta Notebook" in html, "Search q=book must contain 'Delta Notebook'."
    assert "Epsilon Cookbook" in html, "Search q=book must contain 'Epsilon Cookbook'."
    assert "Alpha Keyboard" not in html, "Search q=book must NOT contain 'Alpha Keyboard'."


def test_search_case_insensitive(start_app):
    html = _get_html(f"{PRODUCTS_URL}?q=BOOK")
    assert "Total: 2" in html, "Search q=BOOK must show 'Total: 2' (case-insensitive)."
    assert "Delta Notebook" in html, "Search q=BOOK must contain 'Delta Notebook'."
    assert "Epsilon Cookbook" in html, "Search q=BOOK must contain 'Epsilon Cookbook'."


# ---------------------------------------------------------------------------
# Section E: Sorting
# ---------------------------------------------------------------------------

def test_sort_price_desc(start_app):
    html = _get_html(f"{PRODUCTS_URL}?sort=price&dir=desc")
    idx_gamma = html.find("Gamma Monitor")
    idx_drone = html.find("Toy Drone")
    assert idx_gamma != -1, "sort=price desc must contain 'Gamma Monitor'."
    assert idx_drone != -1, "sort=price desc must contain 'Toy Drone'."
    assert idx_gamma < idx_drone, (
        "sort=price desc must list 'Gamma Monitor' (199.00) before 'Toy Drone' (120.00)."
    )


def test_sort_price_asc(start_app):
    html = _get_html(f"{PRODUCTS_URL}?sort=price&dir=asc")
    idx_tau = html.find("Tau Journal")
    idx_zeta = html.find("Zeta Novel")
    assert idx_tau != -1, "sort=price asc must contain 'Tau Journal'."
    assert idx_zeta != -1, "sort=price asc must contain 'Zeta Novel'."
    assert idx_tau < idx_zeta, (
        "sort=price asc must list 'Tau Journal' (8.50) before 'Zeta Novel' (9.99)."
    )


# ---------------------------------------------------------------------------
# Section F: Browser verification (URL as source of truth + interactions)
# ---------------------------------------------------------------------------

def test_debounced_search_updates_url(start_app, browser_verifier):
    reason = (
        "The products table has a debounced search box. Typing into it must update the "
        "'q' URL query parameter (URL is the source of truth), and the server re-queries "
        "and re-renders the filtered results."
    )
    truth = (
        f"Navigate to {PRODUCTS_URL}. Locate the search text input and type 'book' into it. "
        "Wait about 1 second for the debounce to settle. Verify the browser URL query string "
        "now includes 'q=book'. Verify the table shows only two products: 'Delta Notebook' and "
        "'Epsilon Cookbook', and that the text 'Total: 2' is visible on the page."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_debounced_search_updates_url",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"


def test_sort_header_and_pagination(start_app, browser_verifier):
    reason = (
        "The products table has clickable sortable column headers and pagination controls. "
        "Clicking a column header sorts by that column and toggles direction; clicking Next "
        "moves to the next page. All state is reflected in the URL query string."
    )
    truth = (
        f"Navigate to {PRODUCTS_URL}. Click the 'Price' column header once and verify the URL "
        "query string includes 'sort=price' with ascending direction and that the first data "
        "row in the table is 'Tau Journal'. Click the 'Price' column header again and verify the "
        "direction becomes descending in the URL and the first data row becomes 'Gamma Monitor'. "
        f"Then navigate to {PRODUCTS_URL} again and click the 'Next' pagination control: verify "
        "the URL query string includes 'page=2' and that the page shows the text 'Page 2 of 3'."
    )
    result = browser_verifier.verify(
        reason=reason,
        truth=truth,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_sort_header_and_pagination",
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"
