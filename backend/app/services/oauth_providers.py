"""
Google / Facebook / LinkedIn "Sign in with..." for customer accounts.

Hand-rolled OAuth2 authorization-code flow (no new dependency — this codebase
already talks to third-party APIs directly via `requests`, e.g. Razorpay,
SMTP). Each provider needs a Client ID + Client Secret from its own developer
console, set via GOOGLE_CLIENT_ID/SECRET etc. in .env — until those are set,
`is_configured()` is False and the provider is simply not offered, so this
ships inert rather than broken.

Flow:
  1. GET /api/auth/customer/oauth/{provider}/start  → 302 to the provider's
     authorize URL, with a short-lived `state` token for CSRF protection.
  2. Provider redirects back to
     GET /api/auth/customer/oauth/{provider}/callback?code=...&state=...
  3. We exchange the code for an access token, fetch the user's profile,
     find-or-create a Customer by email, issue our own JWT, and redirect the
     browser to the frontend's /oauth-callback?token=... page.
"""
import secrets
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlencode

import requests
from cachetools import TTLCache

from app.core.config import settings

# short-lived state store — same acceptable-staleness tradeoff as app.core.cache
# (per-worker, not shared across uvicorn workers; a 5-minute OAuth round trip
# essentially never spans a redeploy)
_state_store: TTLCache = TTLCache(maxsize=1024, ttl=300)


@dataclass
class ProviderConfig:
    name: str
    authorize_url: str
    token_url: str
    userinfo_url: str
    scope: str
    client_id: Optional[str]
    client_secret: Optional[str]


def _providers() -> dict[str, ProviderConfig]:
    return {
        "google": ProviderConfig(
            name="Google",
            authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            userinfo_url="https://www.googleapis.com/oauth2/v3/userinfo",
            scope="openid email profile",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
        ),
        "facebook": ProviderConfig(
            name="Facebook",
            authorize_url="https://www.facebook.com/v19.0/dialog/oauth",
            token_url="https://graph.facebook.com/v19.0/oauth/access_token",
            userinfo_url="https://graph.facebook.com/me",
            scope="email public_profile",
            client_id=settings.FACEBOOK_CLIENT_ID,
            client_secret=settings.FACEBOOK_CLIENT_SECRET,
        ),
        "linkedin": ProviderConfig(
            # LinkedIn's "Sign In with LinkedIn using OpenID Connect" product —
            # normalized userinfo endpoint, same shape as Google's.
            name="LinkedIn",
            authorize_url="https://www.linkedin.com/oauth/v2/authorization",
            token_url="https://www.linkedin.com/oauth/v2/accessToken",
            userinfo_url="https://api.linkedin.com/v2/userinfo",
            scope="openid profile email",
            client_id=settings.LINKEDIN_CLIENT_ID,
            client_secret=settings.LINKEDIN_CLIENT_SECRET,
        ),
    }


def get_provider(provider: str) -> ProviderConfig:
    providers = _providers()
    if provider not in providers:
        raise ValueError(f"Unknown OAuth provider: {provider}")
    return providers[provider]


def is_configured(provider: str) -> bool:
    try:
        p = get_provider(provider)
    except ValueError:
        return False
    return bool(p.client_id and p.client_secret)


def configured_providers() -> list[str]:
    return [name for name in _providers() if is_configured(name)]


def redirect_uri(provider: str) -> str:
    return f"{settings.BACKEND_URL.rstrip('/')}/api/auth/customer/oauth/{provider}/callback"


def start_state(return_to: Optional[str] = None) -> str:
    token = secrets.token_urlsafe(24)
    _state_store[token] = return_to or "/"
    return token


def consume_state(token: str) -> Optional[str]:
    """Returns the stored return_to path, or None if the state is missing/expired/already used."""
    return _state_store.pop(token, None)


def build_authorize_url(provider: str, state: str) -> str:
    p = get_provider(provider)
    params = {
        "client_id": p.client_id,
        "redirect_uri": redirect_uri(provider),
        "scope": p.scope,
        "state": state,
        "response_type": "code",
    }
    if provider == "google":
        params["access_type"] = "online"
        params["prompt"] = "select_account"
    return f"{p.authorize_url}?{urlencode(params)}"


def exchange_code(provider: str, code: str) -> str:
    """Exchanges an authorization code for an access token. Returns the access token."""
    p = get_provider(provider)
    resp = requests.post(
        p.token_url,
        data={
            "client_id": p.client_id,
            "client_secret": p.client_secret,
            "code": code,
            "redirect_uri": redirect_uri(provider),
            "grant_type": "authorization_code",
        },
        headers={"Accept": "application/json"},
        timeout=12,
    )
    resp.raise_for_status()
    data = resp.json()
    if "access_token" not in data:
        raise RuntimeError(f"{p.name} did not return an access token: {data}")
    return data["access_token"]


def fetch_identity(provider: str, access_token: str) -> dict:
    """Returns {"email": str, "name": str, "provider_user_id": str} — normalized
    across providers so the callback route doesn't need to know their differences."""
    p = get_provider(provider)
    if provider == "facebook":
        resp = requests.get(
            p.userinfo_url,
            params={"fields": "id,name,email", "access_token": access_token},
            timeout=12,
        )
    else:
        resp = requests.get(p.userinfo_url, headers={"Authorization": f"Bearer {access_token}"}, timeout=12)
    resp.raise_for_status()
    data = resp.json()

    if provider == "google":
        return {"email": data.get("email"), "name": data.get("name") or data.get("email"), "provider_user_id": data["sub"]}
    if provider == "facebook":
        return {"email": data.get("email"), "name": data.get("name"), "provider_user_id": data["id"]}
    if provider == "linkedin":
        return {"email": data.get("email"), "name": data.get("name") or data.get("email"), "provider_user_id": data["sub"]}
    raise ValueError(f"Unknown OAuth provider: {provider}")
