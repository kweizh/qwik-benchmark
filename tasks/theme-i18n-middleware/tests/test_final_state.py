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


def _extract_html_tag(html: str) -> str:
    """Return the opening <html ...> tag substring, or '' if not present."""
    match = re.search(r"<html\b[^>]*>", html, re.IGNORECASE | re.DOTALL)
    return match.group(0) if match else ""


def _attr_value(open_tag: str, attr: str):
    """Return the value of `attr` in an opening tag, or None if absent."""
    match = re.search(rf'{re.escape(attr)}="([^"]*)"', open_tag, re.IGNORECASE)
    return match.group(1) if match else None


@pytest.fixture(scope="session")
def start_app(xprocess):
    """Start the Qwik City SSR dev server and wait until it responds."""

    class Starter(ProcessStarter):
        name = "qwik_dev"
        # `--host 127.0.0.1` forces Vite to bind the IPv4 loopback so it matches
        # the address the readiness check and the tests connect to.
        args = ["npm", "run", "dev", "--", "--port", str(PORT), "--host", HOST]
        # CRITICAL: set `env` as a class attribute here, NEVER inside popen_kwargs,
        # otherwise Popen raises TypeError for a duplicate `env` keyword argument.
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
            # Port is open; confirm the SSR server actually returns HTML. The first
            # request triggers on-demand bundling, so allow generous time.
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
            all_lines = []
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


def test_default_ssr_light_english(start_app):
    """No cookies -> defaults: data-theme=light, lang=en, English copy only."""
    resp = requests.get(BASE_URL, timeout=60)
    assert resp.status_code == 200, f"GET / (no cookies) returned {resp.status_code}"
    html = resp.text
    open_tag = _extract_html_tag(html)
    assert open_tag, "No <html> opening tag found in the server response."
    assert _attr_value(open_tag, "data-theme") == "light", (
        f'Expected data-theme="light" on <html> by default, got: {open_tag}'
    )
    assert _attr_value(open_tag, "lang") == "en", (
        f'Expected lang="en" on <html> by default, got: {open_tag}'
    )
    assert "Preferences" in html, "Expected English title 'Preferences' in default page."
    assert "Hello" in html, "Expected English greeting 'Hello' in default page."
    assert 'data-theme="dark"' not in html, "Default page must not use the dark theme."
    assert "Preferencias" not in html, "Default (en) page must not contain Spanish 'Preferencias'."
    assert "Hola" not in html, "Default (en) page must not contain Spanish 'Hola'."


def test_cookies_dark_spanish(start_app):
    """theme=dark; locale=es -> dark theme + Spanish copy on first response."""
    resp = requests.get(
        BASE_URL, headers={"Cookie": "theme=dark; locale=es"}, timeout=60
    )
    assert resp.status_code == 200, f"GET / (dark/es) returned {resp.status_code}"
    html = resp.text
    open_tag = _extract_html_tag(html)
    assert open_tag, "No <html> opening tag found in the server response."
    assert _attr_value(open_tag, "data-theme") == "dark", (
        f'Expected data-theme="dark" for theme=dark cookie, got: {open_tag}'
    )
    assert _attr_value(open_tag, "lang") == "es", (
        f'Expected lang="es" for locale=es cookie, got: {open_tag}'
    )
    assert "Preferencias" in html, "Expected Spanish title 'Preferencias' for locale=es."
    assert "Hola" in html, "Expected Spanish greeting 'Hola' for locale=es."
    assert "Preferences" not in html, "Spanish (es) page must not contain English 'Preferences'."
    assert "Hello" not in html, "Spanish (es) page must not contain English 'Hello'."


def test_cookies_dark_english(start_app):
    """Cookies are resolved independently: dark theme but English locale."""
    resp = requests.get(
        BASE_URL, headers={"Cookie": "theme=dark; locale=en"}, timeout=60
    )
    assert resp.status_code == 200, f"GET / (dark/en) returned {resp.status_code}"
    html = resp.text
    open_tag = _extract_html_tag(html)
    assert open_tag, "No <html> opening tag found in the server response."
    assert _attr_value(open_tag, "data-theme") == "dark", (
        f'Expected data-theme="dark" for theme=dark cookie, got: {open_tag}'
    )
    assert _attr_value(open_tag, "lang") == "en", (
        f'Expected lang="en" for locale=en cookie, got: {open_tag}'
    )
    assert "Preferences" in html, "Expected English title 'Preferences' for locale=en."
    assert "Hello" in html, "Expected English greeting 'Hello' for locale=en."


def test_invalid_cookies_fall_back_to_defaults(start_app):
    """Invalid cookie values must fall back to light/en defaults."""
    resp = requests.get(
        BASE_URL, headers={"Cookie": "theme=neon; locale=fr"}, timeout=60
    )
    assert resp.status_code == 200, f"GET / (invalid cookies) returned {resp.status_code}"
    html = resp.text
    open_tag = _extract_html_tag(html)
    assert open_tag, "No <html> opening tag found in the server response."
    assert _attr_value(open_tag, "data-theme") == "light", (
        f'Expected fallback data-theme="light" for invalid theme cookie, got: {open_tag}'
    )
    assert _attr_value(open_tag, "lang") == "en", (
        f'Expected fallback lang="en" for invalid locale cookie, got: {open_tag}'
    )
    assert "Preferences" in html, "Expected English 'Preferences' after fallback."
    assert "Hello" in html, "Expected English 'Hello' after fallback."


def test_action_persists_preferences_round_trip(start_app):
    """Submitting the routeAction$ form must set theme/locale cookies (Path=/),
    and a subsequent request must reflect the new preferences."""
    session = requests.Session()

    # 1) Load the page fresh and locate the Qwik <Form> action URL.
    resp = session.get(BASE_URL, timeout=60)
    assert resp.status_code == 200, f"Initial GET / returned {resp.status_code}"
    action_paths = re.findall(r'<form\b[^>]*action="([^"]+)"', resp.text, re.IGNORECASE)
    qaction_paths = [p for p in action_paths if "qaction=" in p]
    assert qaction_paths, (
        f"Could not find a Qwik <Form> action (qaction) in the page. Forms found: {action_paths}"
    )
    action_path = qaction_paths[0].replace("&amp;", "&")
    action_url = action_path if action_path.startswith("http") else BASE_URL + action_path

    # 2) Submit the action (server-only, no JS). Origin header satisfies Qwik City CSRF.
    post_resp = session.post(
        action_url,
        data={"theme": "dark", "locale": "es"},
        headers={"Origin": BASE_URL},
        allow_redirects=False,
        timeout=60,
    )
    assert post_resp.status_code < 400, (
        f"Action POST failed with status {post_resp.status_code}: {post_resp.text[:500]}"
    )

    # The action must persist both preferences as cookies scoped to Path=/.
    theme_cookie = next((c for c in session.cookies if c.name == "theme"), None)
    locale_cookie = next((c for c in session.cookies if c.name == "locale"), None)
    assert theme_cookie is not None, "Action did not set a 'theme' cookie."
    assert theme_cookie.value == "dark", f"Expected theme cookie 'dark', got '{theme_cookie.value}'."
    assert theme_cookie.path == "/", f"Expected theme cookie Path=/, got '{theme_cookie.path}'."
    assert locale_cookie is not None, "Action did not set a 'locale' cookie."
    assert locale_cookie.value == "es", f"Expected locale cookie 'es', got '{locale_cookie.value}'."
    assert locale_cookie.path == "/", f"Expected locale cookie Path=/, got '{locale_cookie.path}'."

    # 3) Subsequent request (cookies replayed by the session) reflects the change.
    final = session.get(BASE_URL, timeout=60)
    assert final.status_code == 200, f"Follow-up GET / returned {final.status_code}"
    html = final.text
    open_tag = _extract_html_tag(html)
    assert open_tag, "No <html> opening tag in the follow-up response."
    assert _attr_value(open_tag, "data-theme") == "dark", (
        f'Expected persisted data-theme="dark" after action, got: {open_tag}'
    )
    assert _attr_value(open_tag, "lang") == "es", (
        f'Expected persisted lang="es" after action, got: {open_tag}'
    )
    assert "Preferencias" in html, "Expected Spanish 'Preferencias' after action persisted es locale."
    assert "Hola" in html, "Expected Spanish 'Hola' after action persisted es locale."
