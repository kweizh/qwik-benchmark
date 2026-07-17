import os
import socket
import subprocess
from html.parser import HTMLParser

import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-docs"
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the web server may listen on ::1 only while an AF_INET
# socket to 127.0.0.1 never connects -> the readiness check would hang.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"


class NavExtractor(HTMLParser):
    """Extracts the concatenated text and anchors within the first <nav> element
    that carries a matching aria-label attribute."""

    def __init__(self, target_label):
        super().__init__()
        self.target_label = target_label
        self.in_nav = False
        self.nav_level = 0
        self.text_parts = []
        self.anchors = []  # list of {"href", "aria_current", "text"}
        self._cur = None

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "nav":
            if not self.in_nav and d.get("aria-label") == self.target_label:
                self.in_nav = True
                self.nav_level = 1
                return
            if self.in_nav:
                self.nav_level += 1
        if self.in_nav and tag == "a":
            self._cur = {
                "href": d.get("href", "") or "",
                "aria_current": d.get("aria-current"),
                "text": "",
            }
            self.anchors.append(self._cur)

    def handle_startendtag(self, tag, attrs):
        # Handle self-closing anchors defensively (rare).
        self.handle_starttag(tag, attrs)
        if tag == "a":
            self._cur = None

    def handle_endtag(self, tag):
        if tag == "a" and self._cur is not None:
            self._cur = None
        if tag == "nav" and self.in_nav:
            self.nav_level -= 1
            if self.nav_level == 0:
                self.in_nav = False

    def handle_data(self, data):
        if self.in_nav:
            self.text_parts.append(data)
            if self._cur is not None:
                self._cur["text"] += data

    @property
    def joined_text(self):
        return " ".join(p.strip() for p in self.text_parts if p.strip())

    @property
    def found(self):
        return bool(self.text_parts) or bool(self.anchors)


def _norm_href(href):
    if not href:
        return ""
    # Ignore trailing slash differences (Qwik City defaults to trailing slashes).
    base = href.split("?")[0].split("#")[0]
    if len(base) > 1:
        base = base.rstrip("/")
    return base


def extract_nav(html, label):
    parser = NavExtractor(label)
    parser.feed(html)
    return parser


def fetch(path):
    return requests.get(f"{BASE_URL}{path}", timeout=30)


@pytest.fixture(scope="session")
def deps_installed():
    result = subprocess.run(
        ["npm", "install"],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
        timeout=600,
    )
    print("npm install stdout:\n", result.stdout[-4000:])
    print("npm install stderr:\n", result.stderr[-4000:])
    assert result.returncode == 0, f"npm install failed: {result.stderr[-2000:]}"
    return True


@pytest.fixture(scope="session")
def start_app(xprocess, deps_installed):
    class Starter(ProcessStarter):
        name = "qwik_docs_app"
        # `npm run preview` builds the production bundle and serves it. The task
        # requires the preview server to listen on port 3000.
        args = ["npm", "run", "preview"]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 600
        terminate_on_interrupt = True

        def startup_check(self):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            try:
                resp = requests.get(f"{BASE_URL}/docs", timeout=30)
                return resp.status_code < 500
            except requests.RequestException:
                return False

    info = xprocess.getinfo(Starter.name)
    printed = 0

    def capture_logs(tag):
        nonlocal printed
        try:
            with open(info.logpath, "r") as f:
                lines = f.readlines()
        except OSError:
            return
        new = lines[printed:]
        printed = len(lines)
        print(f"===== [{tag}] {Starter.name} log begin =====")
        print("".join(new))
        print(f"===== [{tag}] {Starter.name} log end =====")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield
    capture_logs("TEARDOWN")
    info.terminate()


def test_docs_root_lists_categories_and_sidebar(start_app):
    resp = fetch("/docs")
    assert resp.status_code == 200, f"GET /docs expected 200, got {resp.status_code}"
    html = resp.text

    breadcrumb = extract_nav(html, "breadcrumb")
    assert breadcrumb.found, "No <nav aria-label=\"breadcrumb\"> found on /docs."
    assert "Docs" in breadcrumb.joined_text, (
        f"Breadcrumb on /docs should contain 'Docs'. Got: {breadcrumb.joined_text!r}"
    )

    sidebar = extract_nav(html, "sidebar")
    assert sidebar.found, "No <nav aria-label=\"sidebar\"> found on /docs."
    href_to_text = {_norm_href(a["href"]): a["text"].strip() for a in sidebar.anchors}

    for slug, title in [
        ("/docs/getting-started", "Getting Started"),
        ("/docs/components", "Components"),
        ("/docs/routing", "Routing"),
    ]:
        assert slug in href_to_text, (
            f"Sidebar should contain a link to {slug}. Found hrefs: {list(href_to_text)}"
        )
        assert title in href_to_text[slug], (
            f"Sidebar link {slug} should be labeled '{title}', got {href_to_text[slug]!r}"
        )


def test_category_page_breadcrumb_and_active_highlight(start_app):
    resp = fetch("/docs/getting-started")
    assert resp.status_code == 200, (
        f"GET /docs/getting-started expected 200, got {resp.status_code}"
    )
    html = resp.text

    breadcrumb = extract_nav(html, "breadcrumb")
    assert breadcrumb.found, "No breadcrumb nav on /docs/getting-started."
    text = breadcrumb.joined_text
    assert "Docs" in text and "Getting Started" in text, (
        f"Breadcrumb should contain 'Docs' and 'Getting Started'. Got: {text!r}"
    )
    assert text.index("Docs") < text.index("Getting Started"), (
        f"Breadcrumb order should be Docs then Getting Started. Got: {text!r}"
    )
    # Human title must be used, not the raw slug.
    assert "getting-started" not in text, (
        f"Breadcrumb should show the human title, not the slug 'getting-started'. Got: {text!r}"
    )

    sidebar = extract_nav(html, "sidebar")
    assert sidebar.found, "No sidebar nav on /docs/getting-started."
    by_href = {_norm_href(a["href"]): a for a in sidebar.anchors}

    active = by_href.get("/docs/getting-started")
    assert active is not None, "Sidebar missing link to /docs/getting-started."
    assert active["aria_current"] == "page", (
        "The active category link (/docs/getting-started) must carry aria-current=\"page\"."
    )

    for other in ["/docs/components", "/docs/routing"]:
        link = by_href.get(other)
        assert link is not None, f"Sidebar missing link to {other}."
        assert link["aria_current"] != "page", (
            f"Inactive sidebar link {other} must NOT carry aria-current=\"page\"."
        )

    # The category page lists its child pages by title.
    assert "Installation" in html, "Category page should list the 'Installation' page title."
    assert "Project Structure" in html, (
        "Category page should list the 'Project Structure' page title."
    )


def test_leaf_page_breadcrumb_and_content(start_app):
    resp = fetch("/docs/getting-started/installation")
    assert resp.status_code == 200, (
        f"GET /docs/getting-started/installation expected 200, got {resp.status_code}"
    )
    html = resp.text

    breadcrumb = extract_nav(html, "breadcrumb")
    assert breadcrumb.found, "No breadcrumb nav on leaf page."
    text = breadcrumb.joined_text
    for label in ["Docs", "Getting Started", "Installation"]:
        assert label in text, f"Breadcrumb should contain '{label}'. Got: {text!r}"
    assert (
        text.index("Docs") < text.index("Getting Started") < text.index("Installation")
    ), f"Breadcrumb order should be Docs > Getting Started > Installation. Got: {text!r}"

    # The page renders its stored body text.
    assert "Install Qwik using the create-qwik CLI." in html, (
        "Leaf page should render the stored body text for the 'installation' page."
    )


def test_second_leaf_in_different_category(start_app):
    resp = fetch("/docs/components/state")
    assert resp.status_code == 200, (
        f"GET /docs/components/state expected 200, got {resp.status_code}"
    )
    html = resp.text

    breadcrumb = extract_nav(html, "breadcrumb")
    assert breadcrumb.found, "No breadcrumb nav on /docs/components/state."
    text = breadcrumb.joined_text
    for label in ["Docs", "Components", "State Management"]:
        assert label in text, f"Breadcrumb should contain '{label}'. Got: {text!r}"
    assert (
        text.index("Docs") < text.index("Components") < text.index("State Management")
    ), f"Breadcrumb order should be Docs > Components > State Management. Got: {text!r}"

    sidebar = extract_nav(html, "sidebar")
    by_href = {_norm_href(a["href"]): a for a in sidebar.anchors}
    active = by_href.get("/docs/components")
    assert active is not None, "Sidebar missing link to /docs/components."
    assert active["aria_current"] == "page", (
        "On /docs/components/state the /docs/components sidebar link must be active."
    )


def test_unknown_category_returns_404(start_app):
    resp = fetch("/docs/does-not-exist")
    assert resp.status_code == 404, (
        f"Unknown category should return HTTP 404, got {resp.status_code}"
    )


def test_unknown_slug_returns_404(start_app):
    resp = fetch("/docs/getting-started/does-not-exist")
    assert resp.status_code == 404, (
        f"Unknown slug should return HTTP 404, got {resp.status_code}"
    )
