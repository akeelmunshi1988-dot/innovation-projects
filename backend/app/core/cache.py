"""
Small in-process TTL cache for read-heavy, infrequently-changing API responses
(public storefront catalog/showcase/settings reads, admin dashboard stats).

Deliberately explicit rather than a decorator: writes across the route files
are scattered (each does its own db.commit()), so invalidation is a single
visible cache_clear(namespace) call placed right after the relevant commit —
easy to audit, same spirit as the existing manual bust_cache() in
app/services/room_composer.py, just with real TTL expiry via cachetools.

Deployment note: the production systemd unit runs uvicorn with --workers 2.
Each worker process has its own cache, so a write on one worker does not
instantly clear the other worker's cached copy of the same data — staleness
is bounded by the TTL below, not eliminated. Acceptable for a low-traffic
storefront; revisit with a shared cache (e.g. Redis) if that stops being true.
"""
from cachetools import TTLCache

_TTL_SECONDS = {
    "catalog": 90,
    "showcase_videos": 90,
    "workshop_photos": 90,
    "testimonials": 90,
    "gallery_items": 90,
    "settings": 60,
    "tenant": 60,
    "dashboard_stats": 45,
}

_caches: dict[str, TTLCache] = {
    namespace: TTLCache(maxsize=256, ttl=ttl) for namespace, ttl in _TTL_SECONDS.items()
}


def cache_get(namespace: str, key: str = "default"):
    return _caches[namespace].get(key)


def cache_set(namespace: str, value, key: str = "default") -> None:
    _caches[namespace][key] = value


def cache_clear(namespace: str) -> None:
    _caches[namespace].clear()
