import base64
import os
import re
import socket
import subprocess

import pytest
import requests
from xprocess import ProcessStarter

PROJECT_DIR = "/home/user/qwik-gallery"
UPLOADS_DIR = os.path.join(PROJECT_DIR, "public", "uploads")
PORT = 3000
# Bind/connect over IPv4 explicitly. On Node 17+ `localhost` can resolve to the
# IPv6 loopback (::1), which would make the readiness check hang.
HOST = "127.0.0.1"
BASE_URL = f"http://{HOST}:{PORT}"

# A real, minimal 1x1 PNG image (well under the 2 MiB limit).
VALID_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC"
)
# A file that carries a valid PNG signature but exceeds the 2 MiB size limit.
OVERSIZED_PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * (2 * 1024 * 1024 + 512 * 1024)

# Artifacts produced by verification; must be cleared before checks run.
VERIFICATION_FILES = ["sunset.png", "notes.txt", "huge.png"]


@pytest.fixture(scope="session", autouse=True)
def clean_artifacts():
    """Remove leftover verification artifacts so each run starts clean."""
    for name in VERIFICATION_FILES:
        path = os.path.join(UPLOADS_DIR, name)
        if os.path.isfile(path):
            os.remove(path)
    yield


def test_production_build_succeeds():
    """The production build must compile cleanly; a server-only fs/path leak
    into the client bundle would fail the Vite client build."""
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
        timeout=600,
    )
    assert result.returncode == 0, (
        "'npm run build' failed (exit code "
        f"{result.returncode}).\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
    )


@pytest.fixture(scope="session")
def start_app(xprocess):
    """Starts the Qwik City dev server and waits until it is ready."""

    class Starter(ProcessStarter):
        name = "qwik_gallery"
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
        print(f"============================== [{tag}: Begin] {Starter.name} logfile ==============================")
        if skipped > 0:
            print(f"(skipped {skipped} already-printed lines)")
        print("".join(new_lines))
        print(f"============================== [{tag}: End  ] {Starter.name} logfile ==============================")

    started = False
    try:
        xprocess.ensure(Starter.name, Starter)
        started = True
    finally:
        capture_logs("STARTED" if started else "FAILED")

    yield

    capture_logs("TEARDOWN")
    info.terminate()


def _get_qaction_id():
    """GET the index page and extract the Qwik action query id from the form."""
    resp = requests.get(BASE_URL, timeout=30)
    assert resp.status_code == 200, (
        f"Expected GET {BASE_URL}/ to return 200, got {resp.status_code}."
    )
    assert 'name="image"' in resp.text or "name='image'" in resp.text, (
        "Expected the index page to contain a file input with the name 'image'."
    )
    match = re.search(r"qaction=([A-Za-z0-9_\-]+)", resp.text)
    assert match is not None, (
        "Could not find a Qwik action id (qaction=...) in the rendered form's "
        "action attribute on the index page."
    )
    return match.group(1)


def _upload(qid, field_name, filename, data, content_type):
    return requests.post(
        f"{BASE_URL}/?qaction={qid}",
        files={field_name: (filename, data, content_type)},
        headers={"Origin": BASE_URL},
        allow_redirects=True,
        timeout=60,
    )


def test_index_page_and_form(start_app):
    qid = _get_qaction_id()
    assert qid, "Expected a non-empty Qwik action id from the index page form."


def test_valid_image_upload_stored_and_shown(start_app):
    qid = _get_qaction_id()
    resp = _upload(qid, "image", "sunset.png", VALID_PNG_BYTES, "image/png")
    assert resp.status_code < 400, (
        f"Uploading a valid PNG returned HTTP {resp.status_code}."
    )

    stored = os.path.join(UPLOADS_DIR, "sunset.png")
    assert os.path.isfile(stored), (
        f"Expected the valid upload to be stored at {stored}, but it was not written."
    )

    page = requests.get(BASE_URL, timeout=30)
    assert page.status_code == 200, (
        f"Expected GET {BASE_URL}/ to return 200 after upload, got {page.status_code}."
    )
    assert "/uploads/sunset.png" in page.text, (
        "Expected the gallery to render an image with src '/uploads/sunset.png' "
        "after a successful upload."
    )

    served = requests.get(f"{BASE_URL}/uploads/sunset.png", timeout=30)
    assert served.status_code == 200, (
        "Expected the stored image to be served at "
        f"{BASE_URL}/uploads/sunset.png, got {served.status_code}."
    )


def test_wrong_file_type_rejected(start_app):
    qid = _get_qaction_id()
    _upload(qid, "image", "notes.txt", b"hello world", "text/plain")

    stored = os.path.join(UPLOADS_DIR, "notes.txt")
    assert not os.path.isfile(stored), (
        f"A non-image upload must be rejected, but a file was written at {stored}."
    )

    page = requests.get(BASE_URL, timeout=30)
    assert "notes.txt" not in page.text, (
        "The rejected non-image file 'notes.txt' must not appear in the gallery."
    )


def test_oversized_image_rejected(start_app):
    qid = _get_qaction_id()
    _upload(qid, "image", "huge.png", OVERSIZED_PNG_BYTES, "image/png")

    stored = os.path.join(UPLOADS_DIR, "huge.png")
    assert not os.path.isfile(stored), (
        "An image larger than 2 MiB must be rejected, but a file was written at "
        f"{stored}."
    )

    page = requests.get(BASE_URL, timeout=30)
    assert "huge.png" not in page.text, (
        "The rejected oversized file 'huge.png' must not appear in the gallery."
    )
