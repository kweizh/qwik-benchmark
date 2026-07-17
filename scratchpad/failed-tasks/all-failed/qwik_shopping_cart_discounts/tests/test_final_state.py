import os
import sqlite3
import socket
import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-app"
DB_PATH = os.path.join(PROJECT_DIR, "db.sqlite")
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
        args = ["npm", "run", "dev", "--", "--host", HOST]
        env = os.environ.copy()
        popen_kwargs = {
            "cwd": PROJECT_DIR,
            "text": True,
        }
        timeout = 120
        terminate_on_interrupt = True

        def startup_check(self):
            """
            Check if the port is open and accepting connections.
            """
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((HOST, PORT)) != 0:
                    return False
            try:
                # Try to hit the cart API to ensure the server is fully ready
                resp = requests.get(f"{BASE_URL}/api/cart", timeout=5)
                return resp.status_code == 200
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
        print(f"=== [{tag}] App Logs ===")
        print("".join(new_lines))
        print("========================")

    try:
        xprocess.ensure(Starter.name, Starter)
        capture_logs("STARTED")
    except Exception as e:
        capture_logs("FAILED")
        raise e

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def test_database_initialization():
    """
    Verify that the SQLite database exists and is populated with the correct tables and seed data.
    """
    assert os.path.isfile(DB_PATH), f"Database file not found at {DB_PATH}"

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Verify tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    for expected_table in ["Product", "Coupon", "CartItem", "ActiveCoupon"]:
        assert expected_table in tables, f"Table '{expected_table}' is missing from the database."

    # Verify Products are seeded
    cursor.execute("SELECT id, name, price FROM Product ORDER BY id;")
    products = cursor.fetchall()
    expected_products = [
        (1, "Wireless Mouse", 25.0),
        (2, "Mechanical Keyboard", 80.0),
        (3, "USB-C Cable", 10.0)
    ]
    assert len(products) == len(expected_products), f"Expected {len(expected_products)} products, got {len(products)}."
    for actual, expected in zip(products, expected_products):
        assert actual[0] == expected[0], f"Product ID mismatch: expected {expected[0]}, got {actual[0]}"
        assert actual[1] == expected[1], f"Product name mismatch: expected '{expected[1]}', got '{actual[1]}'"
        assert abs(actual[2] - expected[2]) < 1e-5, f"Product price mismatch: expected {expected[2]}, got {actual[2]}"

    # Verify Coupons are seeded
    cursor.execute("SELECT code, type, value, minSpend FROM Coupon ORDER BY code;")
    coupons = {row[0]: {"type": row[1], "value": row[2], "minSpend": row[3]} for row in cursor.fetchall()}

    expected_coupons = {
        "PERCENT15": {"type": "PERCENT", "value": 15.0, "minSpend": 50.0},
        "FLAT20": {"type": "FIXED", "value": 20.0, "minSpend": 100.0},
        "KEYBOARDSBOGO": {"type": "BOGO", "value": 2.0, "minSpend": 0.0}
    }

    assert len(coupons) == len(expected_coupons), "Coupon count mismatch."
    for code, expected in expected_coupons.items():
        assert code in coupons, f"Coupon '{code}' is missing."
        assert coupons[code]["type"] == expected["type"], f"Coupon '{code}' type mismatch: expected {expected['type']}, got {coupons[code]['type']}"
        assert abs(coupons[code]["value"] - expected["value"]) < 1e-5, f"Coupon '{code}' value mismatch."
        assert abs(coupons[code]["minSpend"] - expected["minSpend"]) < 1e-5, f"Coupon '{code}' minSpend mismatch."

    conn.close()


def test_api_empty_cart(start_app):
    """
    Verify that clearing the cart results in an empty cart state.
    """
    # Clear the cart first
    resp = requests.post(f"{BASE_URL}/api/cart", json={"action": "clear"})
    assert resp.status_code == 200, f"Clear cart action failed: {resp.text}"

    # Verify GET /api/cart returns empty cart
    resp = requests.get(f"{BASE_URL}/api/cart")
    assert resp.status_code == 200, f"GET /api/cart failed: {resp.text}"
    data = resp.json()

    assert data["items"] == [], "Expected cart items to be empty."
    assert abs(data["subtotal"] - 0.0) < 1e-5, "Expected subtotal to be 0.0."
    assert data["coupon"] is None, "Expected coupon to be null."
    assert abs(data["discount"] - 0.0) < 1e-5, "Expected discount to be 0.0."
    assert abs(data["total"] - 0.0) < 1e-5, "Expected total to be 0.0."
    assert data["error"] is None, "Expected error to be null."


def test_api_cart_updates(start_app):
    """
    Verify updating item quantities in the cart.
    """
    # Add Wireless Mouse x2 (Price: 25.0 each)
    resp = requests.post(f"{BASE_URL}/api/cart", json={"action": "update", "productId": 1, "quantity": 2})
    assert resp.status_code == 200, f"Update quantity failed: {resp.text}"
    data = resp.json()

    assert len(data["items"]) == 1, "Expected 1 item in cart."
    item = data["items"][0]
    assert item["productId"] == 1
    assert item["name"] == "Wireless Mouse"
    assert item["quantity"] == 2
    assert abs(item["price"] - 25.0) < 1e-5
    assert abs(item["total"] - 50.0) < 1e-5
    assert abs(data["subtotal"] - 50.0) < 1e-5
    assert abs(data["total"] - 50.0) < 1e-5

    # Add USB-C Cable x1 (Price: 10.0)
    resp = requests.post(f"{BASE_URL}/api/cart", json={"action": "update", "productId": 3, "quantity": 1})
    assert resp.status_code == 200, f"Update quantity failed: {resp.text}"
    data = resp.json()

    assert len(data["items"]) == 2, "Expected 2 items in cart."
    # Items must be sorted by productId ascending
    assert data["items"][0]["productId"] == 1
    assert data["items"][1]["productId"] == 3

    assert data["items"][1]["name"] == "USB-C Cable"
    assert data["items"][1]["quantity"] == 1
    assert abs(data["items"][1]["total"] - 10.0) < 1e-5
    assert abs(data["subtotal"] - 60.0) < 1e-5
    assert abs(data["total"] - 60.0) < 1e-5


def test_api_coupon_percent(start_app):
    """
    Verify applying a PERCENT coupon.
    """
    # Apply PERCENT15 coupon (15% off, minSpend 50.0). Subtotal is 60.0.
    resp = requests.post(f"{BASE_URL}/api/cart", json={"action": "applyCoupon", "code": "PERCENT15"})
    assert resp.status_code == 200, f"Apply coupon failed: {resp.text}"
    data = resp.json()

    assert data["coupon"] is not None, "Expected coupon to be applied."
    assert data["coupon"]["code"] == "PERCENT15"
    assert data["coupon"]["type"] == "PERCENT"
    assert abs(data["discount"] - 9.0) < 1e-5, f"Expected discount to be 9.0, got {data['discount']}"
    assert abs(data["total"] - 51.0) < 1e-5, f"Expected total to be 51.0, got {data['total']}"
    assert data["error"] is None, f"Expected no error, got {data['error']}"


def test_api_coupon_invalidation(start_app):
    """
    Verify that decreasing quantity below minSpend invalidates the coupon.
    """
    # Decrease Wireless Mouse quantity to 1. Subtotal becomes 1 * 25.0 + 1 * 10.0 = 35.0.
    # Since 35.0 < minSpend (50.0), PERCENT15 must be invalidated/removed.
    resp = requests.post(f"{BASE_URL}/api/cart", json={"action": "update", "productId": 1, "quantity": 1})
    assert resp.status_code == 200, f"Update quantity failed: {resp.text}"
    data = resp.json()

    assert data["coupon"] is None, "Expected coupon to be invalidated and removed."
    assert abs(data["subtotal"] - 35.0) < 1e-5
    assert abs(data["discount"] - 0.0) < 1e-5
    assert abs(data["total"] - 35.0) < 1e-5
    assert data["error"] == "Minimum spend not met", f"Expected 'Minimum spend not met' error, got: {data['error']}"


def test_api_invalid_coupon(start_app):
    """
    Verify applying a non-existent coupon.
    """
    resp = requests.post(f"{BASE_URL}/api/cart", json={"action": "applyCoupon", "code": "INVALIDCODE"})
    assert resp.status_code == 200, f"Apply coupon failed: {resp.text}"
    data = resp.json()

    assert data["coupon"] is None, "Expected coupon to remain null."
    assert abs(data["discount"] - 0.0) < 1e-5
    assert data["error"] == "Invalid coupon code", f"Expected 'Invalid coupon code' error, got: {data['error']}"


def test_api_coupon_fixed(start_app):
    """
    Verify applying a FIXED coupon.
    """
    # Add Mechanical Keyboard x1 (Price: 80.0). Subtotal is 35.0 + 80.0 = 115.0.
    resp = requests.post(f"{BASE_URL}/api/cart", json={"action": "update", "productId": 2, "quantity": 1})
    assert resp.status_code == 200, f"Update quantity failed: {resp.text}"

    # Apply FLAT20 coupon ($20 off, minSpend 100.0). Subtotal is 115.0.
    resp = requests.post(f"{BASE_URL}/api/cart", json={"action": "applyCoupon", "code": "FLAT20"})
    assert resp.status_code == 200, f"Apply coupon failed: {resp.text}"
    data = resp.json()

    assert data["coupon"] is not None
    assert data["coupon"]["code"] == "FLAT20"
    assert data["coupon"]["type"] == "FIXED"
    assert abs(data["discount"] - 20.0) < 1e-5
    assert abs(data["total"] - 95.0) < 1e-5
    assert data["error"] is None


def test_api_coupon_bogo(start_app):
    """
    Verify applying a BOGO coupon.
    """
    # Clear the cart first
    requests.post(f"{BASE_URL}/api/cart", json={"action": "clear"})

    # Add Mechanical Keyboard x3 (Price: 80.0 each). Subtotal is 240.0.
    resp = requests.post(f"{BASE_URL}/api/cart", json={"action": "update", "productId": 2, "quantity": 3})
    assert resp.status_code == 200

    # Apply KEYBOARDSBOGO coupon (BOGO on product ID 2, minSpend 0.0).
    resp = requests.post(f"{BASE_URL}/api/cart", json={"action": "applyCoupon", "code": "KEYBOARDSBOGO"})
    assert resp.status_code == 200, f"Apply BOGO coupon failed: {resp.text}"
    data = resp.json()

    assert data["coupon"] is not None
    assert data["coupon"]["code"] == "KEYBOARDSBOGO"
    assert data["coupon"]["type"] == "BOGO"
    assert abs(data["discount"] - 80.0) < 1e-5, f"Expected BOGO discount to be 80.0 (1 free keyboard out of 3), got {data['discount']}"
    assert abs(data["total"] - 160.0) < 1e-5, f"Expected total to be 160.0, got {data['total']}"
    assert data["error"] is None


def test_ui_html_page(start_app):
    """
    Verify that GET /cart renders the correct HTML containing cart details.
    """
    resp = requests.get(f"{BASE_URL}/cart")
    assert resp.status_code == 200, f"GET /cart failed: {resp.text}"
    html_content = resp.text

    # The page should show the items and recalculated totals
    assert "Mechanical Keyboard" in html_content, "UI page missing item name 'Mechanical Keyboard'"
    assert "240" in html_content, "UI page missing subtotal value '240'"
    assert "80" in html_content, "UI page missing discount value '80'"
    assert "160" in html_content, "UI page missing total value '160'"
