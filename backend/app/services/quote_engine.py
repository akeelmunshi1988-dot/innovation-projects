from sqlalchemy.orm import Session
from app.models.models import RugCatalog, Material, PricingRule, MOQRule, ProductionTimeline, Tenant
from typing import Optional
import math


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

        # Base calculations
        size_sqm = round(size_w * size_h, 4)
        total_sqm = round(size_sqm * qty, 4)
        waste_factor = 1.10  # 10% waste
        required_sqm = round(total_sqm * waste_factor, 4)

        # Convert material cost to base_currency before all calculations
        mat_cost_base = self._to_base(
            float(material.cost_per_sqm),  # type: ignore[arg-type]
            material.cost_currency or tenant.base_currency if tenant else str(material.cost_currency or "INR"),
            tenant,
        )

        # Effective selling price: use override (stored on quote) first, then rug-level, then tenant default
        margin_pct = margin_override if margin_override is not None else (
            rug.profit_margin_pct if rug.profit_margin_pct is not None else default_margin  # type: ignore[operator]
        )
        effective_price_per_sqm = round(mat_cost_base * (1 + margin_pct / 100), 4)
        base_price_per_sqm = round(effective_price_per_sqm, 2)
        subtotal = round(effective_price_per_sqm * total_sqm, 2)

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

        # Rush surcharge from tenant settings
        if rush_order:
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

        pre_gst_price = round(subtotal - bulk_discount - manual_discount + rush_surcharge + size_surcharge, 2)

        # GST — use override if provided (preserves rate from when order was placed)
        gst_pct = gst_override if gst_override is not None else ((tenant.default_gst_pct or 12.0) if tenant else 12.0)
        gst_amount = round(pre_gst_price * gst_pct / 100, 2)
        final_price = round(pre_gst_price + gst_amount, 2)
        price_per_piece = round(final_price / qty, 2) if qty > 0 else 0.0

        # Production timeline
        estimated_days = self._estimate_days(rug.weave_type or "standard", size_sqm, qty, rush_order)

        breakdown = [
            {
                "label": (
                    f"Selling rate ({base_price_per_sqm:.2f}/sqm × {total_sqm:.2f} sqm) "
                    f"[{margin_pct:.0f}% margin on {float(material.cost_per_sqm):.2f}/sqm material]"  # type: ignore[arg-type]
                ),
                "amount": subtotal,
            }
        ]
        breakdown.extend(pricing_rules_applied)
        breakdown.append({
            "label": f"GST ({gst_pct:.0f}%)",
            "amount": gst_amount,
            "description": f"Goods & Services Tax at {gst_pct:.0f}% on pre-tax total",
        })

        return {
            "size_sqm": size_sqm,
            "total_sqm": total_sqm,
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
            "final_price": final_price,
            "price_per_piece": price_per_piece,
            "price_currency": tenant.base_currency if tenant else "INR",
            "moq_met": moq_met,
            "moq_message": moq_message,
            "material_available": material_available,
            "material_message": material_message,
            "estimated_days": estimated_days,
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
