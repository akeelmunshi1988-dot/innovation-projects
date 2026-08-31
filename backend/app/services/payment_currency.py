"""Currency helpers shared by Razorpay charge and refund flows."""

from decimal import Decimal, ROUND_HALF_UP
from typing import Mapping


SUPPORTED_PAYMENT_CURRENCIES = frozenset({
    "INR", "USD", "EUR", "GBP", "CAD", "AUD", "AED", "SGD", "CHF",
    "SAR", "QAR", "JPY", "NZD", "ZAR",
})
ZERO_DECIMAL_CURRENCIES = frozenset({"JPY"})


def normalized_payment_currency(value: str | None, fallback: str = "INR") -> str:
    currency = (value or fallback or "INR").strip().upper()
    if currency not in SUPPORTED_PAYMENT_CURRENCIES:
        raise ValueError(f"Payments in {currency} are not supported")
    return currency


def conversion_rate(
    from_currency: str,
    to_currency: str,
    base_currency: str,
    exchange_rates: Mapping[str, float] | None,
) -> float:
    """Return a multiplier using rates stored as target units per base unit."""
    source, target, base = from_currency.upper(), to_currency.upper(), base_currency.upper()
    if source == target:
        return 1.0
    rates = exchange_rates or {}
    source_rate = 1.0 if source == base else float(rates.get(source) or 0)
    target_rate = 1.0 if target == base else float(rates.get(target) or 0)
    if source_rate <= 0 or target_rate <= 0:
        raise ValueError(f"Exchange rate is not configured for {source} to {target}")
    return target_rate / source_rate


def convert_amount(amount: float, rate: float) -> float:
    return float((Decimal(str(amount)) * Decimal(str(rate))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def to_smallest_unit(amount: float, currency: str) -> int:
    """Convert major units to Razorpay's integer amount representation."""
    code = normalized_payment_currency(currency)
    multiplier = Decimal("1") if code in ZERO_DECIMAL_CURRENCIES else Decimal("100")
    return int((Decimal(str(amount)) * multiplier).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
