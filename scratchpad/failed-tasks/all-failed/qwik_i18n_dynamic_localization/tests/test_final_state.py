import os
import socket
import subprocess
import pytest
import requests
from bs4 import BeautifulSoup
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik application using xprocess and confirms readiness via port check.
    """
    class Starter(ProcessStarter):
        name = "qwik_app"
        # Run dev server on 127.0.0.1 on port 3000
        args = ["npm", "run", "dev", "--", "--host", HOST, "--port", str(PORT)]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 120
        terminate_on_interrupt = True

        def startup_check(self):
            """
            Check if the server is accepting connections on the specified port.
            """
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            try:
                # Make sure the server actually responds to HTTP requests
                resp = requests.get(BASE_URL, allow_redirects=True, timeout=5)
                return resp.status_code < 500
            except requests.RequestException:
                return False

    info = xprocess.getinfo(Starter.name)
    printed_log_lines = 0

    def capture_logs(tag):
        nonlocal printed_log_lines
        if not os.path.exists(info.logpath):
            return
        with open(info.logpath, "r") as f:
            all_lines = f.readlines()
        new_lines = all_lines[printed_log_lines:]
        printed_log_lines = len(all_lines)
        print(f"=== [{tag}] Captured {Starter.name} logs ===")
        print("".join(new_lines))
        print(f"=== [{tag} End] ===")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def test_default_redirect_no_cookie_no_prefix(start_app):
    """
    1. Verify Default Redirect (No Cookie, No Prefix):
       - Sending GET to /dashboard should redirect to /en/dashboard with 302
       - Should set locale=en cookie
    """
    session = requests.Session()
    resp = session.get(f"{BASE_URL}/dashboard", allow_redirects=False)

    assert resp.status_code == 302, f"Expected 302 status code, got {resp.status_code}"
    assert resp.headers.get("Location") == "/en/dashboard", f"Expected Location to be /en/dashboard, got {resp.headers.get('Location')}"

    # Check Set-Cookie header
    cookies = resp.cookies.get_dict()
    assert cookies.get("locale") == "en", f"Expected locale cookie to be 'en', got {cookies.get('locale')}"


def test_cookie_redirect_with_cookie_no_prefix(start_app):
    """
    2. Verify Cookie-based Redirect (With Cookie, No Prefix):
       - Accessing /dashboard with cookie locale=fr should redirect to /fr/dashboard
    """
    cookies = {"locale": "fr"}
    resp = requests.get(f"{BASE_URL}/dashboard", cookies=cookies, allow_redirects=False)

    assert resp.status_code == 302, f"Expected 302 status code, got {resp.status_code}"
    assert resp.headers.get("Location") == "/fr/dashboard", f"Expected Location to be /fr/dashboard, got {resp.headers.get('Location')}"


def test_dashboard_content_english(start_app):
    """
    3. Verify Dashboard Content (English):
       - /en/dashboard?name=Charlie -> <h1>Dashboard</h1>, <p>Welcome to your dashboard, Charlie!</p>
       - /en/dashboard -> <p>Welcome to your dashboard, Guest!</p>
    """
    # With name parameter
    resp = requests.get(f"{BASE_URL}/en/dashboard?name=Charlie")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"

    soup = BeautifulSoup(resp.text, "html.parser")
    h1 = soup.find("h1")
    assert h1 is not None, "Could not find <h1> on dashboard page"
    assert h1.text.strip() == "Dashboard", f"Expected <h1> to be 'Dashboard', got '{h1.text.strip()}'"

    p_welcome = soup.find(lambda tag: tag.name == "p" and "Welcome to your dashboard" in tag.text)
    assert p_welcome is not None, "Could not find welcome <p> tag"
    assert p_welcome.text.strip() == "Welcome to your dashboard, Charlie!", f"Expected welcome text to match, got '{p_welcome.text.strip()}'"

    # Without name parameter
    resp_no_name = requests.get(f"{BASE_URL}/en/dashboard")
    assert resp_no_name.status_code == 200
    soup_no_name = BeautifulSoup(resp_no_name.text, "html.parser")
    p_welcome_guest = soup_no_name.find(lambda tag: tag.name == "p" and "Welcome to your dashboard" in tag.text)
    assert p_welcome_guest is not None
    assert p_welcome_guest.text.strip() == "Welcome to your dashboard, Guest!", f"Expected welcome text to match, got '{p_welcome_guest.text.strip()}'"


def test_dashboard_content_french(start_app):
    """
    4. Verify Dashboard Content (French):
       - /fr/dashboard?name=Charlie -> <h1>Tableau de bord</h1>, <p>Bienvenue sur votre tableau de bord, Charlie!</p>
       - /fr/dashboard -> <p>Bienvenue sur votre tableau de bord, invité!</p>
    """
    # With name parameter
    resp = requests.get(f"{BASE_URL}/fr/dashboard?name=Charlie")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"

    soup = BeautifulSoup(resp.text, "html.parser")
    h1 = soup.find("h1")
    assert h1 is not None, "Could not find <h1> on dashboard page"
    assert h1.text.strip() == "Tableau de bord", f"Expected <h1> to be 'Tableau de bord', got '{h1.text.strip()}'"

    p_welcome = soup.find(lambda tag: tag.name == "p" and "Bienvenue sur votre tableau de bord" in tag.text)
    assert p_welcome is not None, "Could not find welcome <p> tag"
    assert p_welcome.text.strip() == "Bienvenue sur votre tableau de bord, Charlie!", f"Expected welcome text to match, got '{p_welcome.text.strip()}'"

    # Without name parameter
    resp_no_name = requests.get(f"{BASE_URL}/fr/dashboard")
    assert resp_no_name.status_code == 200
    soup_no_name = BeautifulSoup(resp_no_name.text, "html.parser")
    p_welcome_guest = soup_no_name.find(lambda tag: tag.name == "p" and "Bienvenue sur votre tableau de bord" in tag.text)
    assert p_welcome_guest is not None
    assert p_welcome_guest.text.strip() == "Bienvenue sur votre tableau de bord, invité!", f"Expected welcome text to match, got '{p_welcome_guest.text.strip()}'"


def test_profile_content_english_and_french(start_app):
    """
    5. Verify Profile Content (English & French)
    """
    # English
    resp_en = requests.get(f"{BASE_URL}/en/profile")
    assert resp_en.status_code == 200
    soup_en = BeautifulSoup(resp_en.text, "html.parser")
    h1_en = soup_en.find("h1")
    assert h1_en is not None
    assert h1_en.text.strip() == "User Profile"

    email_el_en = soup_en.find(lambda tag: tag.name in ["p", "div"] and "Email Address: user@example.com" in tag.text)
    assert email_el_en is not None, "Could not find translated email element in English profile"

    # French
    resp_fr = requests.get(f"{BASE_URL}/fr/profile")
    assert resp_fr.status_code == 200
    soup_fr = BeautifulSoup(resp_fr.text, "html.parser")
    h1_fr = soup_fr.find("h1")
    assert h1_fr is not None
    assert h1_fr.text.strip() == "Profil de l'utilisateur"

    email_el_fr = soup_fr.find(lambda tag: tag.name in ["p", "div"] and "Adresse e-mail: user@example.com" in tag.text)
    assert email_el_fr is not None, "Could not find translated email element in French profile"


def test_language_switcher_and_cookie_update(start_app):
    """
    6. Verify Language Switcher existence and behavior:
       - Elements with id="switch-en" and id="switch-fr" must exist.
       - Accessing /fr/dashboard with an 'en' cookie should update the cookie to 'fr'
    """
    # Verify elements exist on English Dashboard
    resp = requests.get(f"{BASE_URL}/en/dashboard")
    assert resp.status_code == 200
    soup = BeautifulSoup(resp.text, "html.parser")

    switch_en = soup.find(id="switch-en")
    switch_fr = soup.find(id="switch-fr")
    assert switch_en is not None, "Language switcher for English (id='switch-en') is missing"
    assert switch_fr is not None, "Language switcher for French (id='switch-fr') is missing"

    # Verify that requesting /fr/dashboard with cookie locale=en updates the cookie to 'fr'
    # This simulates navigating to a French prefix, which must sync the cookie.
    cookies = {"locale": "en"}
    resp_sync = requests.get(f"{BASE_URL}/fr/dashboard", cookies=cookies, allow_redirects=False)

    # Check if a Set-Cookie header is sent to update the cookie to 'fr'
    set_cookie_header = resp_sync.headers.get("Set-Cookie", "")
    assert "locale=fr" in set_cookie_header, f"Expected cookie to be updated to 'fr' when accessing French prefix, got Set-Cookie: '{set_cookie_header}'"
