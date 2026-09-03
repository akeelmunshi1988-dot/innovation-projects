"""Private DreamRugsCreation MCP server for ChatGPT/Codex connectors."""

import base64
import binascii
import hashlib
import hmac
import ipaddress
import json
import mimetypes
import os
import socket
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from mcp.server.fastmcp import FastMCP
from mcp.types import ToolAnnotations

from app.api.routes.catalog import UPLOAD_DIR, add_rug_image_row, create_rug_row
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import Material, RugCatalog, McpCatalogUploadGrant
from app.schemas.schemas import PublicCatalogCreate
from app.services.mcp_oauth import READ_SCOPE, WRITE_SCOPE, valid_access_token
from app.services.catalog_image_storage import CATALOG_IMAGE_MAX_BYTES, store_catalog_image


CATALOG_UPLOAD_CHUNK_BYTES = 512 * 1024


mcp = FastMCP(
    "DreamRugsCreation Catalog",
    instructions=(
        "Manage the DreamRugsCreation rug catalog. Import every generated image first, "
        "collect or confirm the catalog questionnaire fields, then create the catalog item "
        "and associate the five room visualizers. Never publish before the user confirms."
    ),
    streamable_http_path="/",
    stateless_http=True,
    json_response=True,
)


def _tenant_id() -> int:
    if settings.MCP_TENANT_ID is None:
        raise RuntimeError("MCP_TENANT_ID is not configured")
    return settings.MCP_TENANT_ID


def _public_url(path: str) -> str:
    return f"{settings.BACKEND_URL.rstrip('/')}{path}"


def _decode_base64(value: str, *, max_bytes: int, field_name: str) -> bytes:
    encoded = value.strip()
    if encoded.startswith("data:"):
        header, separator, encoded = encoded.partition(",")
        if not separator or ";base64" not in header.lower():
            raise ValueError(f"{field_name} data URL must use base64 encoding")
    if len(encoded) > ((max_bytes + 2) // 3) * 4 + 4:
        raise ValueError(f"{field_name} exceeds its decoded size limit")
    try:
        contents = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError(f"{field_name} is not valid standard base64") from exc
    if len(contents) > max_bytes:
        raise ValueError(f"{field_name} exceeds its decoded size limit")
    return contents


def _store_catalog_image(contents: bytes) -> dict[str, Any]:
    return store_catalog_image(contents, settings.BACKEND_URL)


def _chunk_upload_dir(upload_id: str) -> Path:
    if len(upload_id) != 32 or any(char not in "0123456789abcdef" for char in upload_id):
        raise ValueError("Invalid chunked upload ID")
    return Path(settings.MCP_UPLOAD_TMP_DIR) / upload_id


def _safe_https_url(raw_url: str) -> str:
    parsed = urlparse(raw_url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("image_url must be a public HTTPS URL without embedded credentials")
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(parsed.hostname, parsed.port or 443)}
    except socket.gaierror as exc:
        raise ValueError("image_url hostname could not be resolved") from exc
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if not ip.is_global:
            raise ValueError("image_url must resolve only to public internet addresses")
    return raw_url


@mcp.tool(
    description="List available rug materials for the configured DreamRugsCreation tenant.",
    annotations=ToolAnnotations(readOnlyHint=True, openWorldHint=False),
)
def list_catalog_materials() -> list[dict[str, Any]]:
    db = SessionLocal()
    try:
        rows = db.query(Material).filter(Material.tenant_id == _tenant_id()).order_by(Material.name).all()
        return [
            {
                "id": row.id,
                "name": row.name,
                "type": row.type,
                "color": row.color,
                "available": row.is_available,
            }
            for row in rows
        ]
    finally:
        db.close()


@mcp.tool(
    description=(
        "Copy one publicly reachable generated rug image into DreamRugsCreation storage. "
        "Use this for the transparent vertical main image and each room visualizer, and keep "
        "the returned path for create_catalog_item."
    ),
    annotations=ToolAnnotations(readOnlyHint=False, idempotentHint=False, openWorldHint=True),
)
async def import_catalog_image(image_url: str, filename: str = "rug-image.png") -> dict[str, str]:
    safe_url = _safe_https_url(image_url)
    async with httpx.AsyncClient(timeout=120, follow_redirects=False) as client:
        response = await client.get(safe_url, headers={"Accept": "image/png,image/jpeg,image/webp"})
        response.raise_for_status()
        contents = response.content

    content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
    extensions = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    if content_type not in extensions:
        guessed = mimetypes.guess_type(filename)[0]
        content_type = guessed if guessed in extensions else ""
    if not content_type:
        raise ValueError("Downloaded file is not a supported JPEG, PNG, or WebP image")
    if len(contents) > 20 * 1024 * 1024:
        raise ValueError("Downloaded image exceeds the 20 MB limit")

    destination = Path(UPLOAD_DIR)
    destination.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{extensions[content_type]}"
    (destination / stored_name).write_bytes(contents)
    stored_path = f"/static/rugs/{stored_name}"
    return {"path": stored_path, "url": _public_url(stored_path)}


@mcp.tool(
    description=(
        "Create a one-time multipart upload URL for a local catalog image. Use this instead of base64 or chunk tools "
        "when the client can make a direct HTTP multipart POST. The URL expires in 10 minutes, accepts one field "
        "named 'file', permits JPEG/PNG/WebP up to 20 MB, and returns the stored catalog path and URL."
    ),
    annotations=ToolAnnotations(readOnlyHint=False, idempotentHint=False, openWorldHint=False),
)
def create_catalog_image_upload_url(filename: str) -> dict[str, Any]:
    if not filename or len(filename) > 255:
        raise ValueError("filename is required and must be 255 characters or fewer")
    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    db = SessionLocal()
    try:
        db.add(McpCatalogUploadGrant(
            token_hash=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
            tenant_id=_tenant_id(),
            filename=filename,
            expires_at=expires_at,
        ))
        db.commit()
    finally:
        db.close()
    return {
        "upload_url": f"{settings.BACKEND_URL.rstrip('/')}/api/mcp/catalog-image-upload/{raw_token}",
        "method": "POST",
        "content_type": "multipart/form-data",
        "file_field": "file",
        "max_bytes": CATALOG_IMAGE_MAX_BYTES,
        "expires_at": expires_at.isoformat(),
        "example": "curl -X POST -F 'file=@/absolute/path/image.png' '<upload_url>'",
    }


@mcp.tool(
    description=(
        "Upload one attached or generated catalog image directly into DreamRugsCreation storage. "
        "Pass the image bytes as standard base64 or a base64 data URL. Use this when an image has "
        "no public HTTPS URL and its encoded payload is small enough for one MCP message. For images "
        "larger than 2 MB, use start_catalog_image_upload, upload_catalog_image_chunk, and "
        "finish_catalog_image_upload instead. JPEG, PNG, and WebP are accepted up to 20 MB decoded."
    ),
    annotations=ToolAnnotations(readOnlyHint=False, idempotentHint=False, openWorldHint=False),
)
def upload_catalog_image(filename: str, image_base64: str) -> dict[str, Any]:
    if not filename or len(filename) > 255:
        raise ValueError("filename is required and must be 255 characters or fewer")
    return _store_catalog_image(_decode_base64(
        image_base64, max_bytes=CATALOG_IMAGE_MAX_BYTES, field_name="image_base64"
    ))


@mcp.tool(
    description=(
        "Start a chunked catalog-image upload when upload_catalog_image would exceed the MCP message limit. "
        "Provide the original filename, exact binary byte count, and optionally its lowercase SHA-256 hex digest. "
        "The result gives an upload_id, required chunk count, and 512 KiB decoded chunk size."
    ),
    annotations=ToolAnnotations(readOnlyHint=False, idempotentHint=False, openWorldHint=False),
)
def start_catalog_image_upload(filename: str, total_bytes: int, sha256: str | None = None) -> dict[str, Any]:
    if not filename or len(filename) > 255:
        raise ValueError("filename is required and must be 255 characters or fewer")
    if total_bytes < 1 or total_bytes > CATALOG_IMAGE_MAX_BYTES:
        raise ValueError("total_bytes must be between 1 byte and 20 MB")
    if sha256 is not None and (len(sha256) != 64 or any(c not in "0123456789abcdef" for c in sha256)):
        raise ValueError("sha256 must be a lowercase 64-character hexadecimal digest")
    upload_id = uuid.uuid4().hex
    upload_dir = _chunk_upload_dir(upload_id)
    upload_dir.mkdir(parents=True, exist_ok=False)
    total_chunks = (total_bytes + CATALOG_UPLOAD_CHUNK_BYTES - 1) // CATALOG_UPLOAD_CHUNK_BYTES
    metadata = {
        "filename": filename,
        "total_bytes": total_bytes,
        "total_chunks": total_chunks,
        "sha256": sha256,
    }
    (upload_dir / "metadata.json").write_text(json.dumps(metadata), encoding="utf-8")
    return {
        "upload_id": upload_id,
        "chunk_size_bytes": CATALOG_UPLOAD_CHUNK_BYTES,
        "total_chunks": total_chunks,
        "next_chunk_index": 0,
    }


@mcp.tool(
    description=(
        "Upload one base64 chunk for a chunked catalog image. Decode each consecutive 512 KiB slice of the "
        "original binary file separately; do not split an already-base64-encoded string. Chunk indexes start at 0. "
        "The final chunk may be smaller. Retry with the same index is safe only when the bytes are identical."
    ),
    annotations=ToolAnnotations(readOnlyHint=False, idempotentHint=True, openWorldHint=False),
)
def upload_catalog_image_chunk(upload_id: str, chunk_index: int, chunk_base64: str) -> dict[str, Any]:
    upload_dir = _chunk_upload_dir(upload_id)
    metadata_path = upload_dir / "metadata.json"
    if not metadata_path.is_file():
        raise ValueError("Chunked upload was not found or has expired")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if chunk_index < 0 or chunk_index >= metadata["total_chunks"]:
        raise ValueError("chunk_index is outside the expected range")
    contents = _decode_base64(
        chunk_base64, max_bytes=CATALOG_UPLOAD_CHUNK_BYTES, field_name="chunk_base64"
    )
    expected = CATALOG_UPLOAD_CHUNK_BYTES
    if chunk_index == metadata["total_chunks"] - 1:
        expected = metadata["total_bytes"] - CATALOG_UPLOAD_CHUNK_BYTES * chunk_index
    if len(contents) != expected:
        raise ValueError(f"Chunk {chunk_index} decoded to {len(contents)} bytes; expected {expected}")
    part_path = upload_dir / f"{chunk_index:06d}.part"
    if part_path.exists() and part_path.read_bytes() != contents:
        raise ValueError("A different payload was already stored for this chunk index")
    if not part_path.exists():
        part_path.write_bytes(contents)
    received = len(list(upload_dir.glob("*.part")))
    return {
        "upload_id": upload_id,
        "received_chunk_index": chunk_index,
        "received_chunks": received,
        "total_chunks": metadata["total_chunks"],
        "complete": received == metadata["total_chunks"],
    }


@mcp.tool(
    description=(
        "Finish a chunked catalog-image upload after every chunk is present. This verifies chunk completeness, "
        "exact byte count, optional SHA-256, and JPEG/PNG/WebP signature, then stores the final image and returns "
        "the /static/rugs/... path. Retain that path for create_catalog_item."
    ),
    annotations=ToolAnnotations(readOnlyHint=False, idempotentHint=False, openWorldHint=False),
)
def finish_catalog_image_upload(upload_id: str) -> dict[str, Any]:
    upload_dir = _chunk_upload_dir(upload_id)
    metadata_path = upload_dir / "metadata.json"
    if not metadata_path.is_file():
        raise ValueError("Chunked upload was not found or has expired")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    part_paths = [upload_dir / f"{index:06d}.part" for index in range(metadata["total_chunks"])]
    missing = [index for index, path in enumerate(part_paths) if not path.is_file()]
    if missing:
        raise ValueError(f"Chunked upload is incomplete; missing chunk indexes: {missing}")
    contents = b"".join(path.read_bytes() for path in part_paths)
    if len(contents) != metadata["total_bytes"]:
        raise ValueError("Combined upload byte count does not match total_bytes")
    digest = hashlib.sha256(contents).hexdigest()
    if metadata.get("sha256") and not hmac.compare_digest(digest, metadata["sha256"]):
        raise ValueError("Combined upload SHA-256 does not match the declared digest")
    result = _store_catalog_image(contents)
    for path in part_paths:
        path.unlink()
    metadata_path.unlink()
    upload_dir.rmdir()
    return result


@mcp.tool(
    description=(
        "Create and publish one catalog rug after the user has confirmed the questionnaire. "
        "Every item in sizes must include its manually calculated total price and expected delivery days for that size. "
        "main_image_path must be the upright, front-facing, transparent-background product image. "
        "gallery_image_paths should contain the five separately generated room visualizers in order."
    ),
    annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=False, openWorldHint=False),
)
def create_catalog_item(
    title: str,
    description: str,
    material_id: int,
    weave_type: str,
    sizes: list[dict[str, Any]],
    main_image_path: str,
    gallery_image_paths: list[str],
    base_price_currency: str = "INR",
    pile_height: str | None = None,
    lead_time_days: int = 21,
) -> dict[str, Any]:
    if len(gallery_image_paths) != 5:
        raise ValueError("Exactly five room visualizer image paths are required")
    all_paths = [main_image_path, *gallery_image_paths]
    if any(not path.startswith("/static/rugs/") for path in all_paths):
        raise ValueError("Import every image first; only /static/rugs/... paths are accepted")
    default_size = next((size for size in sizes if size.get("is_default")), sizes[0] if sizes else None)
    if not default_size or default_size.get("price") is None:
        raise ValueError("Each catalog item needs priced sizes and one default size")
    if any(not isinstance(size.get("lead_time_days", lead_time_days), int) or size.get("lead_time_days", lead_time_days) < 1 for size in sizes):
        raise ValueError("Each catalog size needs valid expected delivery days")
    sizes = [{**size, "lead_time_days": size.get("lead_time_days", lead_time_days)} for size in sizes]

    payload = PublicCatalogCreate.model_validate(
        {
            "name": title,
            "description": description,
            "sizes": sizes,
            "base_price": default_size["price"],
            "base_price_currency": base_price_currency,
            "material_id": material_id,
            "pile_height": pile_height,
            "weave_type": weave_type,
            "lead_time_days": default_size.get("lead_time_days", lead_time_days),
            "image_url": main_image_path,
            "room_types": ["living-room", "bedroom", "dining-room", "study", "entryway"],
            "mood_tags": [],
        }
    )

    db = SessionLocal()
    try:
        rug = create_rug_row(db, payload.model_dump(), _tenant_id())
        for sort_order, path in enumerate(gallery_image_paths, start=1):
            add_rug_image_row(db, rug.id, path, sort_order)
        db.refresh(rug)
        return {
            "id": rug.id,
            "slug": rug.slug,
            "title": rug.name,
            "catalog_url": f"{settings.FRONTEND_URL.rstrip('/')}/catalog/{rug.slug or rug.id}",
            "main_image_url": _public_url(rug.image_url),
            "gallery_image_urls": [_public_url(image.image_url) for image in rug.images],
        }
    finally:
        db.close()


@mcp.tool(
    description="Retrieve one catalog rug and its associated gallery images.",
    annotations=ToolAnnotations(readOnlyHint=True, openWorldHint=False),
)
def get_catalog_item(rug_id: int) -> dict[str, Any]:
    db = SessionLocal()
    try:
        rug = db.query(RugCatalog).filter(
            RugCatalog.id == rug_id,
            RugCatalog.tenant_id == _tenant_id(),
        ).first()
        if not rug:
            raise ValueError("Catalog rug not found")
        return {
            "id": rug.id,
            "slug": rug.slug,
            "title": rug.name,
            "description": rug.description,
            "material_id": rug.material_id,
            "weave_type": rug.weave_type,
            "sizes": rug.sizes,
            "base_price": rug.base_price,
            "base_price_currency": rug.base_price_currency,
            "main_image_url": _public_url(rug.image_url) if rug.image_url else None,
            "gallery_image_urls": [_public_url(image.image_url) for image in rug.images],
        }
    finally:
        db.close()


class ConnectorBearerAuth:
    """Accept OAuth access tokens, retaining the private token for diagnostics."""

    def __init__(self, app: Any):
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        # Reuse the already-provisioned catalog integration key unless a
        # connector-specific credential is configured for production.
        expected = settings.MCP_CONNECTOR_TOKEN or settings.CATALOG_API_KEY
        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        authorization = headers.get(b"authorization", b"").decode("latin-1")
        supplied = authorization[7:] if authorization.lower().startswith("bearer ") else ""
        static_valid = bool(expected and supplied and hmac.compare_digest(supplied, expected))
        oauth_valid = False
        if supplied and not static_valid:
            db = SessionLocal()
            try:
                token = valid_access_token(db, supplied)
                oauth_valid = bool(token and {READ_SCOPE, WRITE_SCOPE}.issubset(set(token.scopes or [])))
            finally:
                db.close()
        if not static_valid and not oauth_valid:
            body = b'{"error":"unauthorized connector"}'
            metadata_url = f'{settings.BACKEND_URL.rstrip("/")}/.well-known/oauth-protected-resource/mcp/'
            await send({
                "type": "http.response.start",
                "status": 401,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode()),
                    (b"www-authenticate", f'Bearer resource_metadata="{metadata_url}"'.encode()),
                ],
            })
            await send({"type": "http.response.body", "body": body})
            return
        await self.app(scope, receive, send)


mcp_http_app = ConnectorBearerAuth(mcp.streamable_http_app())
