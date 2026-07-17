import os
import socket
import sqlite3
import subprocess
import time
import pytest
import requests
from PIL import Image
from xprocess import ProcessStarter
from pochi_verifier import PochiVerifier

PROJECT_DIR = "/home/user/qwik-app"
PORT = 3000
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="session")
def browser_verifier():
    return PochiVerifier()

@pytest.fixture(scope="session")
def start_app(xprocess):
    """
    Starts the Qwik app using xprocess. Confirms readiness via port check.
    """
    class Starter(ProcessStarter):
        name = "start_qwik_app"
        # --host 127.0.0.1 forces Vite/Qwik to bind to IPv4 loopback
        args = ["npm", "run", "dev", "--", "--host", HOST]
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
                # Wait until the Qwik page actually loads or at least returns a valid status
                resp = requests.get(BASE_URL, timeout=5)
                return resp.status_code < 500
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
            print(f"============================== [{tag}: Begin] Captured {Starter.name} logfile ==============================")
            print("".join(new_lines))
            print(f"============================== [{tag}: End  ] Captured {Starter.name} logfile ==============================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def test_image_gallery_flow(start_app, browser_verifier, tmp_path):
    # 1. Create a temporary test image with dimensions 1000x1500 (width x height)
    test_image_name = "test_portrait_image.png"
    test_image_path = os.path.join(tmp_path, test_image_name)
    img = Image.new("RGB", (1000, 1500), color="blue")
    img.save(test_image_path)

    # 2. Upload the image to POST /gallery/upload
    upload_url = f"{BASE_URL}/gallery/upload"
    with open(test_image_path, "rb") as f:
        files = {"image": (test_image_name, f, "image/png")}
        # Disable automatic redirect following to verify the redirect status code (302/303)
        response = requests.post(upload_url, files=files, allow_redirects=False)

    assert response.status_code in [302, 303], \
        f"Expected redirect status code (302 or 303) from upload, got {response.status_code}. Response: {response.text}"

    redirect_location = response.headers.get("Location", "")
    assert "/gallery" in redirect_location, \
        f"Expected redirect location to contain '/gallery', got '{redirect_location}'"

    # 3. Verify Database Record via the /api/images endpoint
    api_url = f"{BASE_URL}/api/images"
    api_response = requests.get(api_url)
    assert api_response.status_code == 200, \
        f"Failed to fetch image list from API: {api_response.text}"

    images_list = api_response.json()
    assert len(images_list) > 0, "No images found in the API response after upload."

    # Find our uploaded image in the list
    uploaded_record = None
    for img_rec in images_list:
        if img_rec.get("original_name") == test_image_name:
            uploaded_record = img_rec
            break

    assert uploaded_record is not None, \
        f"Could not find uploaded image record with name '{test_image_name}' in database. Got list: {images_list}"

    assert "original_path" in uploaded_record, "Database record missing 'original_path'"
    assert "optimized_path" in uploaded_record, "Database record missing 'optimized_path'"
    assert "width" in uploaded_record, "Database record missing 'width'"
    assert "height" in uploaded_record, "Database record missing 'height'"

    # The maximum dimension must be 800px.
    # Since original is 1000x1500, ratio is 2/3.
    # So height should be 800, and width should be 800 * (1000/1500) = 533.33 -> 533 or 534.
    expected_height = 800
    expected_width_options = [533, 534]

    actual_width = uploaded_record["width"]
    actual_height = uploaded_record["height"]

    assert actual_height == expected_height, \
        f"Expected height to be {expected_height}, got {actual_height}"
    assert actual_width in expected_width_options, \
        f"Expected width to be in {expected_width_options}, got {actual_width}"

    # 4. Verify SQLite Database File and Table Content Directly
    db_path = os.path.join(PROJECT_DIR, "gallery.db")
    assert os.path.isfile(db_path), f"SQLite database file not found at {db_path}"

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='images';")
    table_exists = cursor.fetchone()
    assert table_exists is not None, "Table 'images' does not exist in SQLite database."

    cursor.execute("SELECT original_name, original_path, optimized_path, width, height FROM images WHERE original_name = ?;", (test_image_name,))
    db_row = cursor.fetchone()
    assert db_row is not None, f"No row found in SQLite database for image '{test_image_name}'"

    db_original_name, db_original_path, db_optimized_path, db_width, db_height = db_row
    assert db_original_name == test_image_name
    assert db_original_path.startswith("/gallery/original/")
    assert db_optimized_path.startswith("/gallery/optimized/")
    assert db_optimized_path.endswith(".webp")
    assert db_width in expected_width_options
    assert db_height == expected_height
    conn.close()

    # 5. Verify Files Exist in filesystem and are valid
    local_original_path = os.path.join(PROJECT_DIR, "public", db_original_path.lstrip("/"))
    local_optimized_path = os.path.join(PROJECT_DIR, "public", db_optimized_path.lstrip("/"))

    assert os.path.isfile(local_original_path), f"Original file not found on disk at {local_original_path}"
    assert os.path.isfile(local_optimized_path), f"Optimized file not found on disk at {local_optimized_path}"

    # Check that optimized file is a valid WebP and has the correct dimensions
    with Image.open(local_optimized_path) as opt_img:
        assert opt_img.format == "WEBP", f"Expected WebP format, got {opt_img.format}"
        assert opt_img.size[0] in expected_width_options, f"Expected WebP width in {expected_width_options}, got {opt_img.size[0]}"
        assert opt_img.size[1] == expected_height, f"Expected WebP height {expected_height}, got {opt_img.size[1]}"

    # 6. Verify HTML representation on /gallery via PochiVerifier
    reason = "The image gallery page must render the uploaded images, their original links, and their optimized dimensions."
    truth_spec = (
        f"Navigate to {BASE_URL}/gallery. "
        f"Verify that the page displays the uploaded image's original name '{test_image_name}'. "
        f"Verify that there is an image tag with src attribute matching '{db_optimized_path}'. "
        f"Verify that there is a link pointing to '{db_original_path}'. "
        f"Verify that the text displays the optimized dimensions (e.g. '{db_width}x{db_height}')."
    )

    result = browser_verifier.verify(
        reason=reason,
        truth=truth_spec,
        use_browser_agent=True,
        trajectory_dir="/logs/verifier/pochi/test_image_gallery_ui"
    )
    assert result.status == "pass", f"Browser verification failed: {result.reason}"
