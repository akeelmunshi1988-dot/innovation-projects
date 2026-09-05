"""OAuth 2.1-style authorization-code + PKCE server for ChatGPT MCP."""

import base64
import hashlib
import html
import json
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode, urlparse

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.core.auth import verify_password
from app.core.config import settings
from app.core.database import get_db
from app.models.models import (
    McpOAuthAuthorizationCode,
    McpOAuthAuthorizationRequest,
    McpOAuthClient,
    McpOAuthToken,
    StaffUser,
)
from app.services.mcp_oauth import DEFAULT_SCOPES, VALID_SCOPES, issue_token_pair, new_secret, token_hash


router = APIRouter()


def _base_url() -> str:
    return settings.BACKEND_URL.rstrip("/")


def _resource_url() -> str:
    return f"{_base_url()}/mcp/"


def _oauth_error(error: str, description: str, status: int = 400) -> JSONResponse:
    return JSONResponse({"error": error, "error_description": description}, status_code=status)


_HTTPS_REDIRECT_HOSTS = ("chatgpt.com", "claude.ai", "claude.com")


def _valid_redirect_uri(uri: str) -> bool:
    parsed = urlparse(uri)
    if parsed.fragment or not parsed.hostname:
        return False
    if parsed.scheme == "https" and any(
        parsed.hostname == host or parsed.hostname.endswith(f".{host}") for host in _HTTPS_REDIRECT_HOSTS
    ):
        return True
    return parsed.scheme == "http" and parsed.hostname in {"127.0.0.1", "localhost"}


@router.get("/.well-known/oauth-protected-resource/mcp/")
@router.get("/.well-known/oauth-protected-resource/mcp")
@router.get("/.well-known/oauth-protected-resource")
def protected_resource_metadata():
    return {
        "resource": _resource_url(),
        "authorization_servers": [_base_url()],
        "scopes_supported": sorted(VALID_SCOPES),
        "bearer_methods_supported": ["header"],
        "resource_name": "DreamRugsCreation Catalog MCP",
    }


@router.get("/.well-known/oauth-authorization-server")
def authorization_server_metadata():
    base = _base_url()
    return {
        "issuer": base,
        "authorization_endpoint": f"{base}/oauth/authorize",
        "token_endpoint": f"{base}/oauth/token",
        "registration_endpoint": f"{base}/oauth/register",
        "revocation_endpoint": f"{base}/oauth/revoke",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "token_endpoint_auth_methods_supported": ["none"],
        "code_challenge_methods_supported": ["S256"],
        "scopes_supported": sorted(VALID_SCOPES),
    }


@router.post("/oauth/register", status_code=201)
async def register_client(request: Request, db: Session = Depends(get_db)):
    try:
        body = await request.json()
    except (json.JSONDecodeError, ValueError):
        return _oauth_error("invalid_client_metadata", "A JSON registration document is required")
    redirect_uris = body.get("redirect_uris") or []
    if not isinstance(redirect_uris, list) or not redirect_uris or any(not _valid_redirect_uri(str(uri)) for uri in redirect_uris):
        return _oauth_error("invalid_redirect_uri", "Only ChatGPT HTTPS or local-loopback callbacks are accepted")
    if body.get("token_endpoint_auth_method", "none") != "none":
        return _oauth_error("invalid_client_metadata", "This server registers public PKCE clients only")
    client_id = f"mcp_{secrets.token_urlsafe(24)}"
    row = McpOAuthClient(
        client_id=client_id,
        client_name=str(body.get("client_name") or "ChatGPT MCP")[:200],
        redirect_uris=[str(uri) for uri in redirect_uris],
    )
    db.add(row)
    db.commit()
    return {
        "client_id": client_id,
        "client_id_issued_at": int(datetime.utcnow().timestamp()),
        "client_name": row.client_name,
        "redirect_uris": row.redirect_uris,
        "grant_types": ["authorization_code", "refresh_token"],
        "response_types": ["code"],
        "token_endpoint_auth_method": "none",
    }


@router.get("/oauth/authorize", response_class=HTMLResponse)
def authorize(
    response_type: str,
    client_id: str,
    redirect_uri: str,
    code_challenge: str,
    code_challenge_method: str = "S256",
    scope: str | None = None,
    state: str | None = None,
    resource: str | None = None,
    db: Session = Depends(get_db),
):
    client = db.query(McpOAuthClient).filter(McpOAuthClient.client_id == client_id).first()
    if not client or redirect_uri not in client.redirect_uris:
        raise HTTPException(400, "Unknown OAuth client or redirect URI")
    if response_type != "code" or code_challenge_method != "S256" or not code_challenge:
        raise HTTPException(400, "Authorization code with S256 PKCE is required")
    scopes = (scope or " ".join(DEFAULT_SCOPES)).split()
    if not scopes or not set(scopes).issubset(VALID_SCOPES):
        raise HTTPException(400, "Invalid OAuth scope")
    transaction = new_secret()
    db.add(McpOAuthAuthorizationRequest(
        transaction_hash=token_hash(transaction), client_id=client_id,
        redirect_uri=redirect_uri, state=state, scopes=scopes,
        code_challenge=code_challenge, resource=resource or _resource_url(),
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    ))
    db.commit()
    scope_labels = ", ".join(html.escape(item) for item in scopes)
    return HTMLResponse(f"""<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>Authorize DreamRugsCreation</title><style>body{{font-family:system-ui;background:#f6f1e8;margin:0;padding:32px}}main{{max-width:460px;margin:auto;background:white;padding:28px;border-radius:16px;box-shadow:0 8px 32px #0002}}label{{display:block;margin-top:16px}}input{{box-sizing:border-box;width:100%;padding:12px;margin-top:6px}}button{{width:100%;padding:13px;margin-top:22px;background:#222;color:white;border:0;border-radius:8px}}small{{color:#555}}</style></head><body><main><h1>Connect ChatGPT</h1><p>Sign in with an active DreamRugsCreation staff account and approve catalog access.</p><small>Requested permissions: {scope_labels}</small><form method=\"post\" action=\"/oauth/authorize\"><input type=\"hidden\" name=\"transaction\" value=\"{html.escape(transaction)}\"><label>Email<input name=\"email\" type=\"email\" required autocomplete=\"username\"></label><label>Password<input name=\"password\" type=\"password\" required autocomplete=\"current-password\"></label><button type=\"submit\">Sign in and authorize</button></form></main></body></html>""")


@router.post("/oauth/authorize")
def authorize_submit(
    transaction: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    pending = db.query(McpOAuthAuthorizationRequest).filter(
        McpOAuthAuthorizationRequest.transaction_hash == token_hash(transaction),
        McpOAuthAuthorizationRequest.used_at.is_(None),
        McpOAuthAuthorizationRequest.expires_at > datetime.utcnow(),
    ).first()
    if not pending:
        raise HTTPException(400, "Authorization request expired; return to ChatGPT and try again")
    user = db.query(StaffUser).filter(
        StaffUser.email == email.strip().lower(), StaffUser.is_active == True,  # noqa: E712
    ).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password")
    if settings.MCP_TENANT_ID is not None and user.tenant_id != settings.MCP_TENANT_ID:
        raise HTTPException(403, "This account cannot authorize the catalog connector")
    raw_code = new_secret()
    pending.used_at = datetime.utcnow()
    db.add(McpOAuthAuthorizationCode(
        code_hash=token_hash(raw_code), client_id=pending.client_id,
        staff_user_id=user.id, tenant_id=user.tenant_id,
        redirect_uri=pending.redirect_uri, scopes=pending.scopes,
        code_challenge=pending.code_challenge, resource=pending.resource,
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    ))
    db.commit()
    query = {"code": raw_code}
    if pending.state:
        query["state"] = pending.state
    return RedirectResponse(f"{pending.redirect_uri}{'&' if '?' in pending.redirect_uri else '?'}{urlencode(query)}", status_code=303)


def _pkce_s256(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


@router.post("/oauth/token")
async def exchange_token(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    grant_type = str(form.get("grant_type") or "")
    client_id = str(form.get("client_id") or "")
    client = db.query(McpOAuthClient).filter(McpOAuthClient.client_id == client_id).first()
    if not client:
        return _oauth_error("invalid_client", "Unknown OAuth client", 401)
    if grant_type == "authorization_code":
        raw_code = str(form.get("code") or "")
        verifier = str(form.get("code_verifier") or "")
        redirect_uri = str(form.get("redirect_uri") or "")
        code = db.query(McpOAuthAuthorizationCode).filter(
            McpOAuthAuthorizationCode.code_hash == token_hash(raw_code),
            McpOAuthAuthorizationCode.client_id == client_id,
            McpOAuthAuthorizationCode.used_at.is_(None),
            McpOAuthAuthorizationCode.expires_at > datetime.utcnow(),
        ).first()
        if not code or redirect_uri != code.redirect_uri or not verifier or not secrets.compare_digest(_pkce_s256(verifier), code.code_challenge):
            return _oauth_error("invalid_grant", "Invalid, expired, or already-used authorization code")
        code.used_at = datetime.utcnow()
        db.commit()
        response_scopes = code.scopes
        access, refresh, expires_in = issue_token_pair(
            db, client_id=client_id, staff_user_id=code.staff_user_id,
            tenant_id=code.tenant_id, scopes=code.scopes, resource=code.resource,
        )
    elif grant_type == "refresh_token":
        raw_refresh = str(form.get("refresh_token") or "")
        old = db.query(McpOAuthToken).filter(
            McpOAuthToken.token_hash == token_hash(raw_refresh),
            McpOAuthToken.token_type == "refresh", McpOAuthToken.client_id == client_id,
            McpOAuthToken.revoked_at.is_(None), McpOAuthToken.expires_at > datetime.utcnow(),
        ).first()
        if not old:
            return _oauth_error("invalid_grant", "Invalid or expired refresh token")
        requested = str(form.get("scope") or "").split() or old.scopes
        if not set(requested).issubset(set(old.scopes or [])):
            return _oauth_error("invalid_scope", "Refresh cannot expand granted scopes")
        old.revoked_at = datetime.utcnow()
        db.commit()
        response_scopes = requested
        access, refresh, expires_in = issue_token_pair(
            db, client_id=client_id, staff_user_id=old.staff_user_id,
            tenant_id=old.tenant_id, scopes=requested, resource=old.resource,
        )
        code = old
    else:
        return _oauth_error("unsupported_grant_type", "Use authorization_code or refresh_token")
    return {
        "access_token": access, "token_type": "Bearer", "expires_in": expires_in,
        "refresh_token": refresh, "scope": " ".join(response_scopes),
    }


@router.post("/oauth/revoke")
async def revoke_token(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    raw = str(form.get("token") or "")
    client_id = str(form.get("client_id") or "")
    row = db.query(McpOAuthToken).filter(
        McpOAuthToken.token_hash == token_hash(raw), McpOAuthToken.client_id == client_id,
    ).first()
    if row and row.revoked_at is None:
        row.revoked_at = datetime.utcnow()
        db.commit()
    return JSONResponse({}, status_code=200)
