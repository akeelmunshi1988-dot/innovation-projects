"""
Best-effort IP -> country lookup, used only to pick a sensible default display
currency for guests browsing before they've logged in or entered an address
(logged-in customers already have an authoritative Customer.country instead).

Source: ip-api.com — free, no API key, ~45 requests/minute, same free-tier
spirit as the exchange-rate API in fx_rates.py. Never authoritative: GST/export
status and anything that actually affects a price are still computed from a
real submitted address, never from this guess.
"""
import ipaddress
import logging
from typing import Optional

import requests

logger = logging.getLogger(__name__)

GEO_API_URL = "http://ip-api.com/json/{ip}"
_TIMEOUT_SECONDS = 4


def _is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return not (addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved)


def lookup_country(ip: str) -> Optional[str]:
    """Returns a country name matching frontend/src/utils/countries.ts's COUNTRIES
    list (e.g. "India", "United States"), or None if the IP is local/private or
    the lookup fails for any reason — callers should fall back to another signal,
    never block on this."""
    if not ip or not _is_public_ip(ip):
        return None
    try:
        resp = requests.get(
            GEO_API_URL.format(ip=ip),
            params={"fields": "status,country"},
            timeout=_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "success":
            return None
        return data.get("country") or None
    except requests.RequestException as e:
        logger.warning("Geo-IP lookup failed for %s: %s", ip, e)
        return None
    except ValueError as e:
        logger.warning("Geo-IP lookup: malformed response for %s: %s", ip, e)
        return None
