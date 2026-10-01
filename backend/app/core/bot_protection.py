"""Bot checks for public form submissions (sign-up, password reset, enquiries, quotes).

The frontend's useBotProtection hook sends two headers with each protected
submission — headers rather than body fields so the same dependency works for
JSON and multipart forms alike:

- X-Form-Trap: value of a hidden "website" honeypot input. Real visitors never
  see it, so anything non-empty means an auto-filling bot.
- X-Turnstile-Token: Cloudflare Turnstile token. Only enforced when
  TURNSTILE_SECRET_KEY is configured; unset disables the check (safe default,
  same convention as INDIA_ACCESS_KEYS).
"""
import logging

import requests
from fastapi import HTTPException, Request

from app.core.config import settings
from app.core.rate_limit import client_ip

logger = logging.getLogger("loomcraft")

_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_human(request: Request) -> None:
    if request.headers.get("x-form-trap", "").strip():
        logger.info("bot_protection honeypot_tripped path=%s ip=%s", request.url.path, client_ip(request))
        raise HTTPException(status_code=400, detail="Submission rejected.")

    secret = settings.TURNSTILE_SECRET_KEY
    if not secret:
        return

    token = request.headers.get("x-turnstile-token", "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Please complete the verification check and try again.")

    try:
        resp = requests.post(
            _SITEVERIFY_URL,
            data={"secret": secret, "response": token, "remoteip": client_ip(request)},
            timeout=5,
        )
        result = resp.json()
    except (requests.RequestException, ValueError):
        # Cloudflare unreachable: let the request through rather than block every
        # real customer during an outage — the per-IP rate limits still apply.
        logger.warning("bot_protection turnstile_unreachable path=%s", request.url.path)
        return

    if not result.get("success"):
        logger.info(
            "bot_protection turnstile_failed path=%s ip=%s codes=%s",
            request.url.path, client_ip(request), result.get("error-codes"),
        )
        raise HTTPException(status_code=400, detail="Verification failed — please refresh the page and try again.")
