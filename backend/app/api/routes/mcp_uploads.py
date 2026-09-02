"""Direct binary uploads authorized by short-lived grants issued through MCP."""

import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.models import McpCatalogUploadGrant
from app.services.catalog_image_storage import CATALOG_IMAGE_MAX_BYTES, store_catalog_image


router = APIRouter()


@router.post("/mcp/catalog-image-upload/{token}")
async def upload_catalog_image_direct(
    token: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Consume one presigned grant and store raw multipart image bytes."""
    if len(token) < 32 or len(token) > 128:
        raise HTTPException(status_code=404, detail="Upload grant not found")
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    grant = db.query(McpCatalogUploadGrant).filter(
        McpCatalogUploadGrant.token_hash == token_hash,
    ).with_for_update().first()
    if not grant:
        raise HTTPException(status_code=404, detail="Upload grant not found")
    now = datetime.now(timezone.utc)
    if grant.used_at is not None:
        raise HTTPException(status_code=410, detail="Upload grant has already been used")
    if grant.expires_at <= now:
        raise HTTPException(status_code=410, detail="Upload grant has expired")

    contents = await file.read(CATALOG_IMAGE_MAX_BYTES + 1)
    if len(contents) > CATALOG_IMAGE_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded image exceeds the 20 MB limit")
    try:
        result = store_catalog_image(contents, settings.BACKEND_URL)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    grant.used_at = now
    db.commit()
    return {**result, "original_filename": grant.filename, "tenant_id": grant.tenant_id}
