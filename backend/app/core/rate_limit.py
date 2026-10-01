"""Per-IP request rate limiting for public (unauthenticated) endpoints.

Usage — add as a route dependency:

    @router.post("/auth/customer/login", dependencies=[Depends(rate_limit("customer_login", (10, 300)))])

Each (limit, window_seconds) pair is a sliding window; a request is rejected
with 429 + Retry-After once any window is full.

Counters live in process memory, so like app/core/cache.py they are
per-worker: with the systemd deploy's `--workers 2` a client can get up to
2x the configured limit in the worst case. nginx `limit_req` (see
DEPLOYMENT.md) is the shared, authoritative layer in front of this one —
this is the backstop that still works if that config is missing.
"""
import threading
import time
from collections import deque
from typing import Deque, Dict, Tuple

from fastapi import HTTPException, Request

_LOOPBACK = {"127.0.0.1", "::1", "localhost"}
_lock = threading.Lock()
_hits: Dict[Tuple[str, str], Deque[float]] = {}
_last_sweep = 0.0
_SWEEP_EVERY = 300  # seconds between purges of idle keys
_MAX_WINDOW = 86400


def client_ip(request: Request) -> str:
    """The visitor's IP. nginx sets X-Real-IP to $remote_addr; only trust it
    when the direct peer is local (i.e. the request really came through nginx),
    so a client hitting the app directly can't spoof its way past the limit."""
    peer = request.client.host if request.client else ""
    if peer in _LOOPBACK or not peer:
        forwarded = request.headers.get("x-real-ip") or request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
        if forwarded:
            return forwarded
    return peer or "unknown"


def _sweep(now: float) -> None:
    global _last_sweep
    if now - _last_sweep < _SWEEP_EVERY:
        return
    _last_sweep = now
    for key in [k for k, q in _hits.items() if not q or now - q[-1] > _MAX_WINDOW]:
        del _hits[key]


def rate_limit(name: str, *windows: Tuple[int, int]):
    """Build a dependency allowing at most `limit` requests per `window_seconds`
    per client IP, for every (limit, window_seconds) pair given."""
    if not windows:
        raise ValueError("rate_limit needs at least one (limit, window_seconds) pair")
    longest = max(w for _, w in windows)

    def dependency(request: Request) -> None:
        now = time.monotonic()
        key = (name, client_ip(request))
        with _lock:
            _sweep(now)
            q = _hits.setdefault(key, deque())
            while q and now - q[0] > longest:
                q.popleft()
            for limit, window in windows:
                in_window = sum(1 for t in q if now - t <= window)
                if in_window >= limit:
                    oldest_in_window = next(t for t in q if now - t <= window)
                    retry_after = max(1, int(window - (now - oldest_in_window)) + 1)
                    raise HTTPException(
                        status_code=429,
                        detail="Too many requests — please wait a moment and try again.",
                        headers={"Retry-After": str(retry_after)},
                    )
            q.append(now)

    return dependency
