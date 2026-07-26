"""
Python port of frontend/src/utils/size.ts's fmtDim/fmtDims — keeps every
backend-rendered size display (invoice PDFs, invoice emails) consistent with
the vendor's default_size_unit setting (ft/cm), the same source of truth the
customer-facing order/quote pages already use. Shared so a fix here can't be
missed in one of the (currently two) places invoices get generated.
"""

_FT_PER_M = 1 / 0.3048


def fmt_dim(value_m: float, unit: str) -> str:
    if unit == "cm":
        return str(round(value_m * 100))
    return f"{value_m * _FT_PER_M:.1f}"


def fmt_dims(w_m: float, h_m: float, unit: str, shape: str = "rect") -> str:
    w = fmt_dim(w_m, unit)
    if shape == "circle":
        return f"⌀ {w} {unit}"
    h = fmt_dim(h_m, unit)
    if shape == "oval":
        return f"{w}x{h} {unit} (oval)"
    return f"{w}x{h} {unit}"
