"""Shared validation and storage for catalog images from HTTP and MCP uploads."""

import hashlib
import os
import uuid
from pathlib import Path
from typing import Any

CATALOG_IMAGE_MAX_BYTES = 20 * 1024 * 1024
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "static", "rugs")


def catalog_image_type(contents: bytes) -> tuple[str, str]:
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"
    if contents.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"
    if len(contents) >= 12 and contents[:4] == b"RIFF" and contents[8:12] == b"WEBP":
        return "image/webp", ".webp"
    raise ValueError("Uploaded bytes are not a supported JPEG, PNG, or WebP image")


def store_catalog_image(contents: bytes, public_base_url: str) -> dict[str, Any]:
    if not contents:
        raise ValueError("Uploaded image is empty")
    if len(contents) > CATALOG_IMAGE_MAX_BYTES:
        raise ValueError("Uploaded image exceeds the 20 MB limit")
    content_type, extension = catalog_image_type(contents)
    destination = Path(UPLOAD_DIR)
    destination.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{extension}"
    temporary = destination / f".{stored_name}.tmp"
    temporary.write_bytes(contents)
    temporary.replace(destination / stored_name)
    stored_path = f"/static/rugs/{stored_name}"
    return {
        "path": stored_path,
        "url": f"{public_base_url.rstrip('/')}{stored_path}",
        "filename": stored_name,
        "content_type": content_type,
        "bytes": len(contents),
        "sha256": hashlib.sha256(contents).hexdigest(),
    }
