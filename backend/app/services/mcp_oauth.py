"""Shared token primitives for the first-party MCP OAuth authorization server."""

import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import McpOAuthToken


READ_SCOPE = "catalog:read"
WRITE_SCOPE = "catalog:write"
VALID_SCOPES = {READ_SCOPE, WRITE_SCOPE}
DEFAULT_SCOPES = [READ_SCOPE, WRITE_SCOPE]


def token_hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def new_secret() -> str:
    return secrets.token_urlsafe(48)


def issue_token_pair(
    db: Session,
    *,
    client_id: str,
    staff_user_id: int,
    tenant_id: int,
    scopes: list[str],
    resource: str | None,
) -> tuple[str, str, int]:
    access = new_secret()
    refresh = new_secret()
    access_seconds = settings.MCP_OAUTH_ACCESS_TOKEN_MINUTES * 60
    now = datetime.utcnow()
    db.add_all([
        McpOAuthToken(
            token_hash=token_hash(access), token_type="access", client_id=client_id,
            staff_user_id=staff_user_id, tenant_id=tenant_id, scopes=scopes,
            resource=resource, expires_at=now + timedelta(seconds=access_seconds),
        ),
        McpOAuthToken(
            token_hash=token_hash(refresh), token_type="refresh", client_id=client_id,
            staff_user_id=staff_user_id, tenant_id=tenant_id, scopes=scopes,
            resource=resource,
            expires_at=now + timedelta(days=settings.MCP_OAUTH_REFRESH_TOKEN_DAYS),
        ),
    ])
    db.commit()
    return access, refresh, access_seconds


def valid_access_token(db: Session, raw: str, required_scope: str | None = None) -> McpOAuthToken | None:
    row = db.query(McpOAuthToken).filter(
        McpOAuthToken.token_hash == token_hash(raw),
        McpOAuthToken.token_type == "access",
        McpOAuthToken.revoked_at.is_(None),
        McpOAuthToken.expires_at > datetime.utcnow(),
    ).first()
    if not row or (required_scope and required_scope not in (row.scopes or [])):
        return None
    if settings.MCP_TENANT_ID is not None and row.tenant_id != settings.MCP_TENANT_ID:
        return None
    return row
