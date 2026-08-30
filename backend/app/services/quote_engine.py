from sqlalchemy.orm import Session
from app.models.models import RugCatalog, Material, PricingRule, MOQRule, ProductionTimeline, Tenant
from typing import Optional
import math
import re


def _parse_catalog_dimensions(value: object, metres_per_unit: float) -> Optional[tuple[float, float]]:
    if not isinstance(value, str):
        return None
    parts = re.split(r"\s*[x×]\s*", value.strip().lower())
    if len(parts) != 2:
        return None
    try:
        return float(parts[0]) * metres_per_unit, float(parts[1]) * metres_per_unit
    except ValueError:
        return None


def _catalog_size_price(rug: RugCatalog, size_w: float, size_h: float) -> Optional[float]:
    """Return the vendor-entered total price for the requested standard size."""
    tolerance_m = 0.025
    for size in rug.sizes or []:
        if not isinstance(size, dict) or size.get("price") is None:
            continue
        dimensions = _parse_catalog_dimensions(size.get("ft"), 0.3048)
        if dimensions is None:
            dimensions = _parse_catalog_dimensions(size.get("cm"), 0.01)
        if dimensions is None:
            continue
        width, height = dimensions
        direct = abs(width - size_w) <= tolerance_m and abs(height - size_h) <= tolerance_m
        rotated = abs(width - size_h) <= tolerance_m and abs(height - size_w) <= tolerance_m
        if direct or rotated:
            return float(size["price"])
    return None


class QuoteEngine:
    def __init__(self, db: Session, tenant_id: Optional[int] = None):
        self.db = db
        self.tenant_id = tenant_id

    def calculate_quote(
        self,
        rug_id: int,
        size_w: float,
        size_h: float,
        material_id: int,
        qty: int = 1,
        rush_order: bool = False,
        margin_override: Optional[float] = None,
        gst_override: Optional[float] = None,
        manual_discount_pct: Optional[float] = None,
        shape: str = "rect",
    ) -> dict:
        rug_query = self.db.query(RugCatalog).filter(RugCatalog.id == rug_id)
        if self.tenant_id is not None:
            rug_query = rug_query.filter(RugCatalog.tenant_id == self.tenant_id)
        rug = rug_query.first()
        if not rug:
            return {"error": f"Rug catalog ID {rug_id} not found"}

        mat_query = self.db.query(Material).filter(Material.id == material_id)
        if self.tenant_id is not None:
            mat_query = mat_query.filter(Material.tenant_id == self.tenant_id)
        material = mat_query.first()
        if not material:
            return {"error": f"Material ID {material_id} not found"}

        # Load tenant for margin and rush settings
        tenant = (
            self.db.query(Tenant).filter(Tenant.id == self.tenant_id).first()
            if self.tenant_id is not None else None
        )
        default_margin = (tenant.default_profit_margin_pct or 40.0) if tenant else 40.0  # type: ignore[operator]
        tenant_rush_pct = (tenant.rush_surcharge_pct or 25.0) if tenant else 25.0  # type: ignore[operator]
        large_format_threshold = (tenant.large_format_threshold_sqm or 20.0) if tenant else 20.0  # type: ignore[operator]
        large_format_pct = (tenant.large_format_surcharge_pct or 5.0) if tenant else 5.0  # type: ignore[operator]
        if margin_override is not None:
            default_margin = margin_override

        # Base calculations — size_sqm is actual rug area (shape-aware)
        if shape == "circle":
            # size_w is the diameter; area = π * r²
            size_sqm = round(math.pi * (size_w / 2) ** 2, 4)
        elif shape == "oval":
            # size_w × size_h are the two diameters; area = π * a * b where a, b are semi-axes
            size_sqm = round(math.pi * (size_w / 2) * (size_h / 2), 4)
        else:
            size_sqm = round(size_w * size_h, 4)
        total_sqm = round(size_sqm * qty, 4)
        # Material requirement uses bounding box (fabric is always cut from rectangles)
        bounding_sqm = round(size_w * size_h * qty, 4)
        waste_factor = 1.10  # 10% weaving/trim waste on bounding box
        required_sqm = round(bounding_sqm * waste_factor, 4)

        # Convert material cost to base_currency before all calculations
        mat_cost_base = self._to_base(
            float(material.cost_per_sqm),  # type: ignore[arg-type]
            material.cost_currency or tenant.base_currency if tenant else str(material.cost_currency or "INR"),
            tenant,
        )

        # Catalog price is the authoritative selling rate for catalog rugs.
        # Material cost and margin remain available for stock/cost reporting,
        # but must never replace a vendor-entered catalog price.
        size_price = _catalog_size_price(rug, size_w, size_h)
        if size_price is None:
            return {"error": "This rug does not have a total price configured for the requested size"}
        catalog_price_per_piece = round(
            self._to_base(
                size_price,
                rug.base_price_currency or (tenant.base_currency if tenant else "INR"),
                tenant,
            ),
            4,
        )
        # Report the realized margin implied by the authoritative total price. This
        # keeps existing quote/order breakdown consumers useful without using
        # the margin to calculate the selling price.
        estimated_material_cost_per_piece = mat_cost_base * (bounding_sqm / qty) * waste_factor
        margin_pct = (
            round(((catalog_price_per_piece / estimated_material_cost_per_piece) - 1) * 100, 2)
            if estimated_material_cost_per_piece > 0 else 0.0
        )
        # Retained as a derived compatibility/reporting field; it is not used
        # to calculate the purchase price.
        base_price_per_sqm = round(catalog_price_per_piece / size_sqm, 2) if size_sqm > 0 else 0.0
        subtotal = round(catalog_price_per_piece * qty, 2)

        # Check material availability
        material_available = material.is_available and material.stock_meters >= required_sqm
        if not material.is_available:
            material_message = f"{material.name} is currently unavailable."
        elif material.stock_meters < required_sqm:
            material_message = (
                f"Insufficient stock: need {required_sqm:.1f} sqm (incl. 10% waste), "
                f"only {material.stock_meters:.1f} sqm available."
            )
        else:
            material_message = f"Stock sufficient: {material.stock_meters:.1f} sqm available, need {required_sqm:.1f} sqm."

        # MOQ check
        moq_rule = (
            self.db.query(MOQRule)
            .filter(MOQRule.rug_type == rug.weave_type)
            .first()
        )
        if not moq_rule:
            moq_rule = self.db.query(MOQRule).filter(MOQRule.rug_type == "catalog").first()

        moq_met = True
        moq_message = "MOQ requirements met."
        if moq_rule:
            if moq_rule.minimum_sqm and total_sqm < moq_rule.minimum_sqm:
                moq_met = False
                moq_message = (
                    f"MOQ not met: minimum {moq_rule.minimum_sqm} sqm required, "
                    f"you ordered {total_sqm:.2f} sqm."
                )
            elif moq_rule.minimum_pieces and qty < moq_rule.minimum_pieces:
                moq_met = False
                moq_message = (
                    f"MOQ not met: minimum {moq_rule.minimum_pieces} pieces required, "
                    f"you ordered {qty}."
                )

        # Pricing rules
        bulk_discount = 0.0
        manual_discount = 0.0
        rush_surcharge = 0.0
        size_surcharge = 0.0
        pricing_rules_applied = []

        # Determine if rush actually saves delivery time
        standard_days = self._estimate_days(rug.weave_type or "standard", size_sqm, qty, rush_order=False)
        rush_candidate_days = self._estimate_days(rug.weave_type or "standard", size_sqm, qty, rush_order=True)
        rush_saves_time = rush_candidate_days < standard_days  # False when floor kicks in (e.g. 7-day rugs)
        rush_effective = rush_order and rush_saves_time

        # Rush surcharge only when it genuinely reduces delivery time
        if rush_effective:
            rush_surcharge = round(subtotal * (tenant_rush_pct / 100), 2)
            pricing_rules_applied.append({
                "rule": f"Rush surcharge ({tenant_rush_pct:.0f}%)",
                "type": "rush_fee",
                "amount": rush_surcharge,
                "description": f"Priority production: +{tenant_rush_pct:.0f}% on subtotal",
            })

        all_rules = self.db.query(PricingRule).all()
        for rule in all_rules:
            if rule.rule_type == "bulk_discount":
                min_q = rule.min_qty or 0
                max_q = rule.max_qty or float("inf")
                if min_q <= qty <= max_q and rule.multiplier:
                    discount_amount = round(subtotal * (1 - rule.multiplier), 2)
                    bulk_discount = discount_amount
                    pricing_rules_applied.append({
                        "rule": rule.name,
                        "type": "bulk_discount",
                        "amount": -discount_amount,
                        "description": rule.description,
                    })

            elif rule.rule_type == "size_multiplier":
                pass  # large format surcharge is now tenant-configured below

        # Manual discount (vendor-set per-quote)
        if manual_discount_pct and manual_discount_pct > 0:
            manual_discount = round(subtotal * (manual_discount_pct / 100), 2)
            pricing_rules_applied.append({
                "rule": f"Manual discount ({manual_discount_pct:.1f}%)",
                "type": "manual_discount",
                "amount": -manual_discount,
                "description": f"Vendor applied {manual_discount_pct:.1f}% discount",
            })

        # Large format surcharge from tenant settings
        if large_format_pct > 0 and size_sqm > large_format_threshold:
            surcharge = round(subtotal * (large_format_pct / 100), 2)
            size_surcharge = surcharge
            pricing_rules_applied.append({
                "rule": f"Large format surcharge ({large_format_pct:.0f}%)",
                "type": "size_multiplier",
                "amount": surcharge,
                "description": f"Rugs exceeding {large_format_threshold:.0f} sqm per piece: +{large_format_pct:.0f}% on subtotal",
            })

        computed_price = round(subtotal - bulk_discount - manual_discount + rush_surcharge + size_surcharge, 2)

        # GST — tenant.gst_inclusive is the single on/off switch for tax on quotes/orders.
        # Off: no GST is calculated at all. On: the computed price already includes GST
        # (back it out for the tax breakdown) rather than adding it on top.
        gst_inclusive = bool(tenant.gst_inclusive) if tenant else False

        if not gst_inclusive:
            gst_pct = 0.0
            pre_gst_price = computed_price
            gst_amount = 0.0
            final_price = computed_price
        else:
            gst_pct = gst_override if gst_override is not None else ((tenant.default_gst_pct or 12.0) if tenant else 12.0)
            final_price = computed_price
            pre_gst_price = round(final_price / (1 + gst_pct / 100), 2) if gst_pct else final_price
            gst_amount = round(final_price - pre_gst_price, 2)
        price_per_piece = round(final_price / qty, 2) if qty > 0 else 0.0

        # Production timeline — use rush days only when rush is effective
        estimated_days = rush_candidate_days if rush_effective else standard_days

        breakdown = [
            {
                "label": f"Catalog price ({catalog_price_per_piece:.2f} × {qty} piece{'s' if qty != 1 else ''})",
                "amount": subtotal,
            }
        ]
        breakdown.extend(pricing_rules_applied)
        if gst_inclusive:
            breakdown.append({
                "label": f"GST ({gst_pct:.0f}%)",
                "amount": 0.0,
                "description": f"Included in the price above — GST portion is {gst_amount:.2f}",
            })

        return {
            "shape": shape,
            "size_sqm": size_sqm,
            "total_sqm": total_sqm,
            "catalog_price_per_piece": catalog_price_per_piece,
            "base_price_per_sqm": base_price_per_sqm,
            "material_cost_per_sqm": mat_cost_base,
            "profit_margin_pct": margin_pct,
            "subtotal": subtotal,
            "bulk_discount": bulk_discount,
            "manual_discount": manual_discount,
            "rush_surcharge": rush_surcharge,
            "size_surcharge": size_surcharge,
            "pre_gst_price": pre_gst_price,
            "gst_pct": gst_pct,
            "gst_amount": gst_amount,
            "gst_inclusive": gst_inclusive,
            "final_price": final_price,
            "price_per_piece": price_per_piece,
            "price_currency": tenant.base_currency if tenant else "INR",
            "moq_met": moq_met,
            "moq_message": moq_message,
            "material_available": material_available,
            "material_message": material_message,
            "estimated_days": estimated_days,
            "standard_days": standard_days,
            "rush_days": rush_candidate_days,
            "rush_available": rush_saves_time,
            "breakdown": breakdown,
        }

    def calculate_custom_quote(
        self,
        quote,
        material_id: int,
        margin_override: Optional[float] = None,
        size_w: Optional[float] = None,
        size_h: Optional[float] = None,
        discount_pct: Optional[float] = None,
        shape: Optional[str] = None,
        shipping_cost: Optional[float] = None,
    ) -> dict:
        """Prices a custom rug request (no catalog rug) once the vendor assigns a
        material — same margin-over-material-cost math as calculate_quote(), sized
        to the quote's own custom dimensions/qty/shape/rush flag/discount, but with
        no RugCatalog to read weave_type from, so MOQ rules and the weave-specific
        production timeline don't apply.

        size_w/size_h/discount_pct/shape default to the quote's own persisted values
        when omitted — callers that just want to preview an in-progress edit (not
        yet saved to the quote) pass them explicitly instead."""
        mat_query = self.db.query(Material).filter(Material.id == material_id)
        if self.tenant_id is not None:
            mat_query = mat_query.filter(Material.tenant_id == self.tenant_id)
        material = mat_query.first()
        if not material:
            return {"error": f"Material ID {material_id} not found"}

        size_w = size_w if size_w is not None else quote.custom_size_w
        size_h = size_h if size_h is not None else quote.custom_size_h
        if not size_w or not size_h:
            return {"error": "Quote is missing size information"}
        qty = quote.qty or 1
        shape = shape or quote.rug_shape or "rect"
        discount_pct = discount_pct if discount_pct is not None else quote.manual_discount_pct
        shipping_cost = shipping_cost if shipping_cost is not None else (quote.shipping_cost or 0.0)

        tenant = (
            self.db.query(Tenant).filter(Tenant.id == self.tenant_id).first()
            if self.tenant_id is not None else None
        )
        default_margin = (tenant.default_profit_margin_pct or 40.0) if tenant else 40.0  # type: ignore[operator]
        tenant_rush_pct = (tenant.rush_surcharge_pct or 25.0) if tenant else 25.0  # type: ignore[operator]
        margin_pct = margin_override if margin_override is not None else default_margin

        if shape == "circle":
            size_sqm = round(math.pi * (size_w / 2) ** 2, 4)
        elif shape == "oval":
            size_sqm = round(math.pi * (size_w / 2) * (size_h / 2), 4)
        else:
            size_sqm = round(size_w * size_h, 4)
        total_sqm = round(size_sqm * qty, 4)
        bounding_sqm = round(size_w * size_h * qty, 4)
        required_sqm = round(bounding_sqm * 1.10, 4)

        mat_cost_base = self._to_base(
            float(material.cost_per_sqm),  # type: ignore[arg-type]
            material.cost_currency or (tenant.base_currency if tenant else "INR"),
            tenant,
        )
        effective_price_per_sqm = round(mat_cost_base * (1 + margin_pct / 100), 4)
        base_price_per_sqm = round(effective_price_per_sqm, 2)
        subtotal = round(effective_price_per_sqm * total_sqm, 2)

        material_available = material.is_available and material.stock_meters >= required_sqm
        if not material.is_available:
            material_message = f"{material.name} is currently unavailable."
        elif material.stock_meters < required_sqm:
            material_message = (
                f"Insufficient stock: need {required_sqm:.1f} sqm (incl. 10% waste), "
                f"only {material.stock_meters:.1f} sqm available."
            )
        else:
            material_message = f"Stock sufficient: {material.stock_meters:.1f} sqm available, need {required_sqm:.1f} sqm."

        pricing_rules_applied = []
        rush_surcharge = 0.0
        if quote.rush_order:
            rush_surcharge = round(subtotal * (tenant_rush_pct / 100), 2)
            pricing_rules_applied.append({
                "rule": f"Rush surcharge ({tenant_rush_pct:.0f}%)",
                "type": "rush_fee",
                "amount": rush_surcharge,
                "description": f"Priority production: +{tenant_rush_pct:.0f}% on subtotal",
            })

        manual_discount = 0.0
        if discount_pct:
            manual_discount = round(subtotal * (discount_pct / 100), 2)
            pricing_rules_applied.append({
                "rule": f"Manual discount ({discount_pct:.1f}%)",
                "type": "manual_discount",
                "amount": -manual_discount,
                "description": f"Vendor applied {discount_pct:.1f}% discount",
            })

        computed_price = round(subtotal - manual_discount + rush_surcharge, 2)

        # GST — off: no tax calculated at all; on: computed_price already includes
        # GST, back it out for the breakdown (matches calculate_quote()'s semantics).
        gst_inclusive = bool(tenant.gst_inclusive) if tenant else False
        if not gst_inclusive:
            gst_pct = 0.0
            pre_gst_price = computed_price
            gst_amount = 0.0
            final_price = computed_price
        else:
            gst_pct = (tenant.default_gst_pct or 12.0) if tenant else 12.0
            final_price = computed_price
            pre_gst_price = round(final_price / (1 + gst_pct / 100), 2) if gst_pct else final_price
            gst_amount = round(final_price - pre_gst_price, 2)

        # Shipping — a flat pass-through cost, added after GST rather than folded
        # into the margin-priced subtotal (it isn't marked up or taxed like the
        # rug itself).
        final_price = round(final_price + shipping_cost, 2)

        breakdown = [
            {
                "label": (
                    f"Selling rate ({base_price_per_sqm:.2f}/sqm × {total_sqm:.2f} sqm {shape} area) "
                    f"[{margin_pct:.0f}% margin on {float(material.cost_per_sqm):.2f}/sqm material]"  # type: ignore[arg-type]
                ),
                "amount": subtotal,
            }
        ]
        breakdown.extend(pricing_rules_applied)
        if gst_inclusive:
            breakdown.append({
                "label": f"GST ({gst_pct:.0f}%)",
                "amount": 0.0,
                "description": f"Included in the price above — GST portion is {gst_amount:.2f}",
            })
        if shipping_cost:
            breakdown.append({
                "rule": "Shipping",
                "type": "shipping",
                "amount": shipping_cost,
                "description": "Flat shipping charge added to the quoted price",
            })

        return {
            "shape": shape,
            "size_sqm": size_sqm,
            "total_sqm": total_sqm,
            "base_price_per_sqm": base_price_per_sqm,
            "material_cost_per_sqm": mat_cost_base,
            "profit_margin_pct": margin_pct,
            "subtotal": subtotal,
            "bulk_discount": 0.0,
            "manual_discount": manual_discount,
            "rush_surcharge": rush_surcharge,
            "size_surcharge": 0.0,
            "shipping_cost": shipping_cost,
            "pre_gst_price": pre_gst_price,
            "gst_pct": gst_pct,
            "gst_amount": gst_amount,
            "gst_inclusive": gst_inclusive,
            "final_price": final_price,
            "price_per_piece": round(final_price / qty, 2) if qty > 0 else final_price,
            "price_currency": tenant.base_currency if tenant else "INR",
            "moq_met": True,
            "moq_message": "Custom rug request — MOQ rules don't apply.",
            "material_available": material_available,
            "material_message": material_message,
            "estimated_days": quote.expected_delivery_days or 21,
            "breakdown": breakdown,
        }

    def _to_base(self, amount: float, from_currency: str, tenant) -> float:
        """Convert amount from from_currency → tenant.base_currency using stored rates."""
        if not tenant or not from_currency or from_currency == tenant.base_currency:
            return amount
        rates = tenant.exchange_rates or {}
        from_rate = rates.get(from_currency)
        if not from_rate:
            return amount  # unknown rate — use raw value
        return amount / from_rate

    def _estimate_days(self, order_type: str, size_sqm: float, qty: int, rush_order: bool) -> int:
        timeline = (
            self.db.query(ProductionTimeline)
            .filter(ProductionTimeline.order_type == order_type)
            .first()
        )
        if not timeline:
            timeline = (
                self.db.query(ProductionTimeline)
                .filter(ProductionTimeline.order_type == "standard")
                .first()
            )
        if not timeline:
            return 21

        base = timeline.base_days
        complexity_extra = math.ceil(timeline.complexity_multiplier_per_sqm * size_sqm * qty)
        total = base + complexity_extra

        if rush_order:
            rush_timeline = (
                self.db.query(ProductionTimeline)
                .filter(ProductionTimeline.order_type == "rush")
                .first()
            )
            if rush_timeline:
                multiplier = rush_timeline.complexity_multiplier_per_sqm or 0.7
                total = math.ceil(total * multiplier)
            else:
                total = math.ceil(total * 0.7)

        return max(total, 7)  # minimum 7 days

    def check_material_stock(self, material_id: int, required_sqm: float) -> dict:
        material = self.db.query(Material).filter(Material.id == material_id).first()
        if not material:
            return {"available": False, "message": f"Material ID {material_id} not found"}

        buffer_sqm = round(required_sqm * 1.10, 2)
        available = material.is_available and material.stock_meters >= buffer_sqm

        return {
            "material_id": material.id,
            "material_name": material.name,
            "stock_meters": material.stock_meters,
            "required_sqm": required_sqm,
            "required_with_waste": buffer_sqm,
            "available": available,
            "message": (
                f"Sufficient stock available ({material.stock_meters:.1f} sqm on hand)."
                if available
                else f"Insufficient stock: {material.stock_meters:.1f} sqm available, {buffer_sqm:.1f} sqm needed."
            ),
        }


def build_manual_price_result(quote, tenant) -> dict:
    """Builds a calculate_quote()-shaped dict for quotes with no catalog rug/material —
    custom rug requests, priced by the vendor typing in a flat final_price, plus any
    catalog quote whose linked rug/material was later removed. There's no cost basis
    (no material.cost_per_sqm, no margin) to recompute an itemized breakdown from, so
    this just backs GST out of the stored final_price instead of pricing from scratch."""
    final_price = quote.final_price or 0.0
    gst_inclusive = bool(tenant.gst_inclusive) if tenant else False

    if not gst_inclusive:
        gst_pct = 0.0
        pre_gst_price = final_price
        gst_amount = 0.0
    else:
        gst_pct = quote.gst_pct if quote.gst_pct is not None else ((tenant.default_gst_pct or 12.0) if tenant else 12.0)
        pre_gst_price = round(final_price / (1 + gst_pct / 100), 2) if gst_pct else final_price
        gst_amount = round(final_price - pre_gst_price, 2)

    size_w = quote.custom_size_w or 0.0
    size_h = quote.custom_size_h or 0.0
    qty = quote.qty or 1
    size_sqm = round(size_w * size_h, 4) if size_w and size_h else 0.0
    total_sqm = round(size_sqm * qty, 4)
    base_price_per_sqm = round(pre_gst_price / total_sqm, 2) if total_sqm > 0 else 0.0

    breakdown = [{
        "label": "Custom Rug Request — Agreed Price",
        "amount": pre_gst_price,
        "description": "Manually priced by the vendor — no catalog rug/material to itemize.",
    }]
    if gst_inclusive:
        breakdown.append({
            "label": f"GST ({gst_pct:.0f}%)",
            "amount": 0.0,
            "description": f"Included in the price above — GST portion is {gst_amount:.2f}",
        })

    return {
        "shape": quote.rug_shape or "rect",
        "size_sqm": size_sqm,
        "total_sqm": total_sqm,
        "base_price_per_sqm": base_price_per_sqm,
        "material_cost_per_sqm": 0.0,
        "profit_margin_pct": 0.0,
        "subtotal": pre_gst_price,
        "bulk_discount": 0.0,
        "manual_discount": 0.0,
        "rush_surcharge": 0.0,
        "size_surcharge": 0.0,
        "pre_gst_price": pre_gst_price,
        "gst_pct": gst_pct,
        "gst_amount": gst_amount,
        "gst_inclusive": gst_inclusive,
        "final_price": final_price,
        "price_per_piece": round(final_price / qty, 2) if qty > 0 else final_price,
        "price_currency": quote.price_currency or (tenant.base_currency if tenant else "INR"),
        "moq_met": True,
        "moq_message": "Custom rug request — MOQ rules don't apply.",
        "material_available": True,
        "material_message": "Custom rug request — no catalog material to check stock for.",
        "estimated_days": quote.expected_delivery_days or 21,
        "breakdown": breakdown,
    }
