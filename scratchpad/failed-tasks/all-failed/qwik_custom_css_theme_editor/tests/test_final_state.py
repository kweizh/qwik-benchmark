import os
import re
import socket
import urllib.parse
import json
import requests
import pytest
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik application using xprocess. Confirms readiness via port check.
    """
    class Starter(ProcessStarter):
        name = "qwik_app"
        # Force host and port to avoid conflicts
        args = ["npm", "run", "dev", "--", "--host", HOST, "--port", str(PORT)]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 180
        terminate_on_interrupt = True

        def startup_check(self):
            """
            Check if the port is accepting connections and responding to HTTP requests.
            """
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            try:
                resp = requests.get(f"{BASE_URL}/theme", timeout=5)
                return resp.status_code == 200
            except requests.RequestException:
                return False

    info = xprocess.getinfo(Starter.name)
    printed_log_lines = 0

    def capture_logs(tag):
        nonlocal printed_log_lines
        if os.path.exists(info.logpath):
            with open(info.logpath, "r") as f:
                all_lines = f.readlines()
            new_lines = all_lines[printed_log_lines:]
            printed_log_lines = len(all_lines)
            print(f"=== [{tag}] Captured {Starter.name} logs ===")
            print("".join(new_lines))
            print("=========================================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def parse_css_variables(html_content):
    """
    Parses CSS custom properties from <style id="theme-variables"> inside <head>.
    """
    # Regex to find <style id="theme-variables">...</style>
    style_match = re.search(
        r'<style[^>]*id=["\']theme-variables["\'][^>]*>(.*?)</style>',
        html_content,
        re.DOTALL | re.IGNORECASE
    )
    if not style_match:
        return None

    style_content = style_match.group(1)
    variables = {}
    # Regex to capture --variable-name: value;
    var_matches = re.finditer(r'--([\w-]+)\s*:\s*([^;}\s]+)', style_content)
    for match in var_matches:
        variables[match.group(1)] = match.group(2).strip()
    return variables


def test_default_theme_no_cookie(start_app):
    """
    Verify that when no cookie is present, the default theme is applied.
    """
    response = requests.get(f"{BASE_URL}/theme")
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"

    html = response.text
    variables = parse_css_variables(html)

    assert variables is not None, "Could not find <style id=\"theme-variables\"> tag in the HTML response."

    assert variables.get("primary-color") == "#00bcd4", \
        f"Expected default --primary-color: #00bcd4, got {variables.get('primary-color')}"
    assert variables.get("font-size") == "16px", \
        f"Expected default --font-size: 16px, got {variables.get('font-size')}"
    assert variables.get("border-radius") == "4px", \
        f"Expected default --border-radius: 4px, got {variables.get('border-radius')}"


def test_theme_with_cookie(start_app):
    """
    Verify that the theme values are correctly parsed from the user_theme cookie and applied during SSR.
    """
    theme_data = {
        "primaryColor": "#ff5722",
        "fontSize": "20px",
        "borderRadius": "12px"
    }
    cookie_value = urllib.parse.quote(json.dumps(theme_data))
    cookies = {"user_theme": cookie_value}

    response = requests.get(f"{BASE_URL}/theme", cookies=cookies)
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"

    html = response.text
    variables = parse_css_variables(html)

    assert variables is not None, "Could not find <style id=\"theme-variables\"> tag in the HTML response."

    assert variables.get("primary-color") == "#ff5722", \
        f"Expected --primary-color: #ff5722 from cookie, got {variables.get('primary-color')}"
    assert variables.get("font-size") == "20px", \
        f"Expected --font-size: 20px from cookie, got {variables.get('font-size')}"
    assert variables.get("border-radius") == "12px", \
        f"Expected --border-radius: 12px from cookie, got {variables.get('border-radius')}"


def test_theme_form_populated(start_app):
    """
    Verify that form inputs are correctly populated with current theme values.
    """
    theme_data = {
        "primaryColor": "#ff5722",
        "fontSize": "20px",
        "borderRadius": "12px"
    }
    cookie_value = urllib.parse.quote(json.dumps(theme_data))
    cookies = {"user_theme": cookie_value}

    response = requests.get(f"{BASE_URL}/theme", cookies=cookies)
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"

    html = response.text

    # Check that input fields are populated with the correct values
    assert re.search(r'name=["\']primaryColor["\'][^>]*value=["\']#ff5722["\']', html, re.IGNORECASE) is not None, \
        "Form input 'primaryColor' was not populated with correct value '#ff5722'."
    assert re.search(r'name=["\']fontSize["\'][^>]*value=["\']20px["\']', html, re.IGNORECASE) is not None, \
        "Form input 'fontSize' was not populated with correct value '20px'."
    assert re.search(r'name=["\']borderRadius["\'][^>]*value=["\']12px["\']', html, re.IGNORECASE) is not None, \
        "Form input 'borderRadius' was not populated with correct value '12px'."


def test_theme_submission_success(start_app):
    """
    Verify that submitting valid values saves them to the user_theme cookie and redirects back to /theme.
    """
    data = {
        "primaryColor": "#00ff00",
        "fontSize": "18px",
        "borderRadius": "8px"
    }

    response = requests.post(f"{BASE_URL}/theme", data=data, allow_redirects=False)

    # Expect redirect
    assert response.status_code in [302, 303], f"Expected redirect status 302 or 303, got {response.status_code}"

    # Verify redirect location
    location = response.headers.get("Location", "")
    assert location.endswith("/theme") or location == "/theme", f"Expected redirect to /theme, got {location}"

    # Verify user_theme cookie was set correctly
    set_cookie = response.headers.get("Set-Cookie", "")
    assert "user_theme" in set_cookie, "Set-Cookie header does not contain 'user_theme'."

    # Extract and parse user_theme cookie
    cookie_match = re.search(r'user_theme=([^;]+)', set_cookie)
    assert cookie_match is not None, "Could not extract user_theme cookie value from Set-Cookie header."

    raw_cookie_val = urllib.parse.unquote(cookie_match.group(1))
    try:
        parsed_cookie = json.loads(raw_cookie_val)
    except json.JSONDecodeError:
        pytest.fail(f"Could not parse user_theme cookie as JSON: {raw_cookie_val}")

    assert parsed_cookie.get("primaryColor") == "#00ff00", f"Expected primaryColor #00ff00, got {parsed_cookie.get('primaryColor')}"
    assert parsed_cookie.get("fontSize") == "18px", f"Expected fontSize 18px, got {parsed_cookie.get('fontSize')}"
    assert parsed_cookie.get("borderRadius") == "8px", f"Expected borderRadius 8px, got {parsed_cookie.get('borderRadius')}"


def test_theme_submission_validation_errors(start_app):
    """
    Verify server-side validation rejects invalid values and returns 400 Bad Request with custom error messages.
    """
    # 1. Invalid primaryColor
    invalid_color_data = {
        "primaryColor": "red",  # invalid hex
        "fontSize": "18px",
        "borderRadius": "8px"
    }
    response = requests.post(f"{BASE_URL}/theme", data=invalid_color_data, allow_redirects=False)
    assert response.status_code == 400, f"Expected status 400 for invalid primaryColor, got {response.status_code}"
    assert "invalid primarycolor" in response.text.lower(), \
        f"Expected HTML response to contain 'invalid primaryColor', got: {response.text}"

    # 2. Invalid fontSize
    invalid_size_data = {
        "primaryColor": "#00ff00",
        "fontSize": "large",  # invalid length
        "borderRadius": "8px"
    }
    response = requests.post(f"{BASE_URL}/theme", data=invalid_size_data, allow_redirects=False)
    assert response.status_code == 400, f"Expected status 400 for invalid fontSize, got {response.status_code}"
    assert "invalid fontsize" in response.text.lower(), \
        f"Expected HTML response to contain 'invalid fontSize', got: {response.text}"

    # 3. Invalid borderRadius
    invalid_radius_data = {
        "primaryColor": "#00ff00",
        "fontSize": "18px",
        "borderRadius": "none"  # invalid radius
    }
    response = requests.post(f"{BASE_URL}/theme", data=invalid_radius_data, allow_redirects=False)
    assert response.status_code == 400, f"Expected status 400 for invalid borderRadius, got {response.status_code}"
    assert "invalid borderradius" in response.text.lower(), \
        f"Expected HTML response to contain 'invalid borderRadius', got: {response.text}"


def test_theme_reset(start_app):
    """
    Verify that posting to /theme/reset clears the user_theme cookie and redirects to /theme.
    """
    theme_data = {
        "primaryColor": "#ff5722",
        "fontSize": "20px",
        "borderRadius": "12px"
    }
    cookie_value = urllib.parse.quote(json.dumps(theme_data))
    cookies = {"user_theme": cookie_value}

    response = requests.post(f"{BASE_URL}/theme/reset", cookies=cookies, allow_redirects=False)

    # Expect redirect
    assert response.status_code in [302, 303], f"Expected redirect status 302 or 303, got {response.status_code}"

    # Verify redirect location
    location = response.headers.get("Location", "")
    assert location.endswith("/theme") or location == "/theme", f"Expected redirect to /theme, got {location}"

    # Verify user_theme cookie is cleared (Max-Age=0 or empty or expires in the past)
    set_cookie = response.headers.get("Set-Cookie", "")
    assert "user_theme" in set_cookie, "Set-Cookie header does not contain 'user_theme'."

    # Check if cleared
    is_cleared = "Max-Age=0" in set_cookie or "expires=" in set_cookie or "user_theme=;" in set_cookie or 'user_theme=""' in set_cookie
    assert is_cleared, f"Expected user_theme cookie to be cleared in Set-Cookie header, got: {set_cookie}"
