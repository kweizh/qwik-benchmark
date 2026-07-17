import os
import re
import socket
import subprocess

import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), so the web server would listen on ::1 only while an
# AF_INET socket to 127.0.0.1 never connects -> the readiness check would hang.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

ALL_SLUGS = [
    "intro-to-qwik",
    "typescript-basics",
    "qwik-with-typescript",
    "css-grid-guide",
    "web-performance-tips",
    "qwik-performance",
]
ALL_TAGS = ["javascript", "typescript", "qwik", "css", "performance"]


def _find_articles(html):
    """Return the set of slugs rendered as data-article elements."""
    return set(re.findall(r'data-article="([^"]+)"', html))


def _find_active_tags(html):
    return set(re.findall(r'data-active-tag="([^"]+)"', html))


def _find_detail_tags(html):
    return set(re.findall(r'data-tag="([^"]+)"', html))


def _facet_count(html, tag):
    """Return the data-count integer for a given data-facet tag, or None."""
    # Attribute order may vary, so try both orderings.
    m = re.search(
        r'data-facet="' + re.escape(tag) + r'"[^>]*?data-count="(\d+)"', html
    )
    if m is None:
        m = re.search(
            r'data-count="(\d+)"[^>]*?data-facet="' + re.escape(tag) + r'"', html
        )
    return int(m.group(1)) if m else None


def _get(path):
    return requests.get(BASE_URL + path, timeout=30)


@pytest.fixture(scope="session")
def start_app(xprocess):
    # Ensure dependencies are installed and the app is built before serving.
    install = subprocess.run(
        ["npm", "install"], cwd=PROJECT_DIR, capture_output=True, text=True, timeout=900
    )
    assert install.returncode == 0, f"'npm install' failed:\n{install.stdout}\n{install.stderr}"
    build = subprocess.run(
        ["npm", "run", "build"], cwd=PROJECT_DIR, capture_output=True, text=True, timeout=900
    )
    assert build.returncode == 0, f"'npm run build' failed:\n{build.stdout}\n{build.stderr}"

    class Starter(ProcessStarter):
        name = "qwik_app"
        args = ["npm", "run", "preview", "--", "--host", HOST, "--port", str(PORT)]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 180
        terminate_on_interrupt = True

        def startup_check(self):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            try:
                resp = requests.get(BASE_URL + "/articles", timeout=20)
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
        printed_log_lines = len(all_lines)
        print(f"===== [{tag}] {Starter.name} log =====")
        print("".join(new_lines))
        print(f"===== [{tag}] end log =====")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def test_no_filter_lists_all_articles(start_app):
    resp = _get("/articles")
    assert resp.status_code == 200, f"GET /articles returned {resp.status_code}"
    articles = _find_articles(resp.text)
    assert articles == set(ALL_SLUGS), (
        f"Expected all 6 slugs with no filter, got: {sorted(articles)}"
    )


def test_no_filter_article_links(start_app):
    resp = _get("/articles")
    assert resp.status_code == 200, f"GET /articles returned {resp.status_code}"
    for slug in ALL_SLUGS:
        assert f'/articles/{slug}' in resp.text, (
            f"Expected a link to /articles/{slug} on the listing page."
        )


def test_no_filter_facet_counts(start_app):
    resp = _get("/articles")
    assert resp.status_code == 200, f"GET /articles returned {resp.status_code}"
    expected = {
        "javascript": 4,
        "typescript": 2,
        "qwik": 3,
        "css": 1,
        "performance": 2,
    }
    for tag, count in expected.items():
        actual = _facet_count(resp.text, tag)
        assert actual == count, (
            f"Facet count for '{tag}' with no filter expected {count}, got {actual}."
        )


def test_and_filter_two_tags(start_app):
    resp = _get("/articles?tag=javascript&tag=qwik")
    assert resp.status_code == 200, f"GET filtered articles returned {resp.status_code}"
    articles = _find_articles(resp.text)
    assert articles == {"intro-to-qwik", "qwik-with-typescript"}, (
        f"AND filter javascript+qwik expected 2 articles, got: {sorted(articles)}"
    )


def test_and_filter_two_tags_active_filters(start_app):
    resp = _get("/articles?tag=javascript&tag=qwik")
    assert resp.status_code == 200, f"GET filtered articles returned {resp.status_code}"
    active = _find_active_tags(resp.text)
    assert {"javascript", "qwik"}.issubset(active), (
        f"Expected active filters javascript and qwik, got: {sorted(active)}"
    )


def test_and_filter_two_tags_facet_counts(start_app):
    resp = _get("/articles?tag=javascript&tag=qwik")
    assert resp.status_code == 200, f"GET filtered articles returned {resp.status_code}"
    expected = {
        "javascript": 2,
        "typescript": 1,
        "qwik": 2,
        "css": 0,
        "performance": 0,
    }
    for tag, count in expected.items():
        actual = _facet_count(resp.text, tag)
        assert actual == count, (
            f"Facet count for '{tag}' over filtered set expected {count}, got {actual}."
        )


def test_and_filter_three_tags(start_app):
    resp = _get("/articles?tag=javascript&tag=typescript&tag=qwik")
    assert resp.status_code == 200, f"GET filtered articles returned {resp.status_code}"
    articles = _find_articles(resp.text)
    assert articles == {"qwik-with-typescript"}, (
        f"AND filter of 3 tags expected only qwik-with-typescript, got: {sorted(articles)}"
    )


def test_filter_no_matches(start_app):
    resp = _get("/articles?tag=css&tag=qwik")
    assert resp.status_code == 200, f"GET filtered articles returned {resp.status_code}"
    articles = _find_articles(resp.text)
    assert articles == set(), (
        f"AND filter css+qwik should match no articles, got: {sorted(articles)}"
    )


def test_detail_page_multi_tag(start_app):
    resp = _get("/articles/qwik-with-typescript")
    assert resp.status_code == 200, f"GET detail page returned {resp.status_code}"
    assert "Qwik with TypeScript" in resp.text, "Detail page missing article title."
    tags = _find_detail_tags(resp.text)
    assert tags == {"javascript", "typescript", "qwik"}, (
        f"Detail page tags expected javascript/typescript/qwik, got: {sorted(tags)}"
    )


def test_detail_page_single_tag(start_app):
    resp = _get("/articles/css-grid-guide")
    assert resp.status_code == 200, f"GET detail page returned {resp.status_code}"
    assert "CSS Grid Guide" in resp.text, "Detail page missing article title."
    tags = _find_detail_tags(resp.text)
    assert tags == {"css"}, f"Detail page tags expected only css, got: {sorted(tags)}"


def test_unknown_slug_returns_404(start_app):
    resp = _get("/articles/does-not-exist")
    assert resp.status_code == 404, (
        f"Unknown article slug should return 404, got {resp.status_code}"
    )
