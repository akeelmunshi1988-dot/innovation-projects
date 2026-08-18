"""
Python port of frontend/src/utils/size.ts's fmtDim/fmtDims — keeps every
backend-rendered size display consistent with the same formatting/rounding
conventions the customer-facing order/quote pages already use.

`fmt_dims(..., unit)` respects a given display unit (typically the tenant's
`default_size_unit`) — used for on-site/API display.

`email_dims_display(...)` is for outbound emails/invoices specifically: it
always shows both units, since the recipient may not share the tenant's
on-site unit preference, and prefers the vendor's admin-entered cm value for
catalog-preset sizes over a computed conversion.
"""

_FT_PER_M = 1 / 0.3048


def fmt_dim(value_m: float, unit: str) -> str:
    if unit == "cm":
        return str(round(value_m * 100))
    return f"{value_m * _FT_PER_M:.1f}"


def fmt_dims(w_m: float, h_m: float, unit: str, shape: str = "rect") -> str:
    if unit == "both":
        return f"{fmt_dims(w_m, h_m, 'ft', shape)} ({fmt_dims(w_m, h_m, 'cm', shape)})"
    w = fmt_dim(w_m, unit)
    if shape == "circle":
        return f"⌀ {w} {unit}"
    h = fmt_dim(h_m, unit)
    if shape == "oval":
        return f"{w}x{h} {unit} (oval)"
    return f"{w}x{h} {unit}"


def _parse_ft_pair(ft: str) -> tuple[float, float] | None:
    parts = ft.split("x")
    if len(parts) != 2:
        return None
    try:
        return float(parts[0].strip()), float(parts[1].strip())
    except ValueError:
        return None


def email_dims_display(w_m: float | None, h_m: float | None, shape: str = "rect", rug_catalog=None) -> str:
    """Size display for outbound emails/invoices — always shows both units.

    For a rug picked from the catalog at one of its vendor-managed preset
    sizes, the cm figure comes verbatim from the vendor's own admin-entered
    cm value for that preset (same rule as the storefront catalog display:
    cm is never auto-converted, only ever vendor-typed) — if the vendor
    hasn't filled in cm for that size, only ft is shown, matching what the
    customer themselves would have seen on the catalog page.

    Falls back to a computed ft<->cm conversion only for dimensions that
    don't match any catalog preset — i.e. genuinely custom/bespoke
    measurements, which have no vendor-entered cm value to reference.
    """
    if w_m is None:
        return "custom size"

    if rug_catalog is not None and shape == "rect" and h_m is not None:
        for size in (rug_catalog.sizes or []):
            ft = size.get("ft") if isinstance(size, dict) else None
            pair = _parse_ft_pair(ft) if ft else None
            if not pair:
                continue
            ft_w_m, ft_h_m = pair[0] * 0.3048, pair[1] * 0.3048
            if abs(ft_w_m - w_m) < 0.005 and abs(ft_h_m - h_m) < 0.005:
                cm = size.get("cm") if isinstance(size, dict) else None
                return f"{ft} ft ({cm} cm)" if cm else f"{ft} ft"

    return fmt_dims(w_m, h_m, "both", shape)
