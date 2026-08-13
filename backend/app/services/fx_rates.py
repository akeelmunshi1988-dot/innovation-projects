"""
Live foreign-exchange rates, so Business Settings → Currency doesn't require the
vendor to know or manually track exchange rates for every country a customer
might order from.

Source: open.er-api.com — free, no API key, updates once daily, and (unlike
ECB-based feeds such as Frankfurter) covers the Gulf-peg currencies this app's
country list needs (AED/SAR/QAR) alongside the major floating currencies.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

import requests

logger = logging.getLogger(__name__)

FX_API_URL = "https://open.er-api.com/v6/latest/{base}"
_TIMEOUT_SECONDS = 8


def fetch_live_rates(base_currency: str) -> Optional[dict]:
    """Returns {"CUR": rate, ...} — units of each foreign currency per 1 unit of
    base_currency, matching Tenant.exchange_rates' existing convention. Returns
    None on any network/API failure so callers can leave existing rates untouched
    rather than wiping them out on a transient outage."""
    try:
        resp = requests.get(
            FX_API_URL.format(base=base_currency),
            headers={"User-Agent": "DreamRugsCreation/1.0"},
            timeout=_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("result") != "success" or "rates" not in data:
            logger.warning("FX rate refresh: unexpected response for base=%s: %s", base_currency, data.get("result"))
            return None
        rates = dict(data["rates"])
        rates.pop(base_currency, None)  # base-to-base is always 1, not meaningful to store
        return rates
    except requests.RequestException as e:
        logger.warning("FX rate refresh failed for base=%s: %s", base_currency, e)
        return None
    except (ValueError, KeyError) as e:
        logger.warning("FX rate refresh: malformed response for base=%s: %s", base_currency, e)
        return None


def refresh_tenant_rates(db, tenant) -> bool:
    """Fetches live rates for one tenant's base_currency and writes them onto the
    Tenant row (commits). Returns True if the refresh succeeded. Does not touch
    tenants with exchange_rates_auto=False (vendor has opted into manual control)."""
    if not tenant.exchange_rates_auto:
        return False
    rates = fetch_live_rates(tenant.base_currency or "INR")
    if rates is None:
        return False
    tenant.exchange_rates = rates
    tenant.exchange_rates_updated_at = datetime.now(timezone.utc)
    db.commit()
    return True
