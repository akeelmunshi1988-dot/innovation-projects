import base64
import json
import os
import uuid
from typing import List, Optional
from openai import OpenAI
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.api.routes.catalog import UPLOAD_DIR as RUG_UPLOAD_DIR
from app.models.models import (
    RugCatalog,
    Material,
    PromoCode,
    PricingRule,
    MOQRule,
    ProductionTimeline,
    PendingAiAction,
)
from app.schemas.schemas import (
    RugCatalogCreate,
    RugCatalogUpdate,
    MaterialCreate,
    MaterialUpdate,
    PromoCodeCreate,
    PromoCodeUpdate,
)
from app.services.quote_engine import QuoteEngine

OPENAI_MODEL = "gpt-4o-mini"

SYSTEM_PROMPT_TEMPLATE = """You are a knowledgeable rug manufacturing business assistant for {business_name}, helping vendor/admin staff (not customers).

You ONLY answer based on real data from our business systems. Never make up prices, timelines, stock levels, or availability — always call the appropriate tool to retrieve accurate information before answering.

Read capabilities:
- Look up the live catalog, materials, pricing rules, MOQ rules, and production timelines
- Generate accurate price quotes using the real quote engine
- Check material stock

Write capabilities — you can also propose creating, editing, or deleting catalog rugs, materials, and promo codes using the create_/update_/delete_ tools. These are DRAFTS ONLY: calling one of these tools never changes real data by itself — it stages a pending action that a human must review and confirm in the admin UI before anything actually happens. After calling a write tool:
- Clearly tell the user you've prepared a draft, summarize exactly what it will do, and say it needs their confirmation in the UI before it takes effect.
- Never say something "has been created/updated/deleted" — say it "is ready for you to confirm."
- If you don't have enough information for a required field (e.g. no material chosen for a new rug), ask the user rather than guessing a value.

Creating a rug with photos, in one pass: if the user gives you enough detail to create a catalog rug AND describes what it should look like, do the whole thing in this same turn — call generate_rug_image (once for the cover shot, again for each extra gallery angle they want) BEFORE calling create_rug_catalog_entry, then pass the resulting URLs as image_url / gallery_image_urls on that same create call. Don't ask the user to run these as separate steps, and don't ask them to supply an image URL themselves unless they say they already have specific photos to use instead of generating new ones. generate_rug_image runs immediately (it doesn't touch business data), so it needs no confirmation — only the resulting create_rug_catalog_entry draft does.

When asked about pricing, ALWAYS call calculate_quote with specific dimensions and material rather than estimating.
When asked about stock, ALWAYS call get_materials or check_material_stock.
When asked about lead times, ALWAYS call get_production_timeline.

Be professional, helpful, and concise. Format currency as INR unless told otherwise. Express measurements in meters and square meters, except catalog `sizes`, which are entered in feet (and optionally centimetres) exactly as the vendor would type them on the catalog form — never convert those."""


READ_TOOLS = [
    {
        "name": "get_catalog",
        "description": "Retrieve all rug catalog items with names, descriptions, base prices per sqm, available sizes, materials, weave types, and lead times.",
        "parameters": {
            "type": "object",
            "properties": {
                "filter_available": {
                    "type": "boolean",
                    "description": "If true, only return rugs whose primary material is available. Default false (return all).",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_materials",
        "description": "Retrieve materials with their id, stock levels, cost per sqm, type (wool/silk/cotton/synthetic), color, and availability status.",
        "parameters": {
            "type": "object",
            "properties": {
                "filter_available": {
                    "type": "boolean",
                    "description": "If true, only return materials that are currently available and in stock.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "calculate_quote",
        "description": "Calculate an accurate price quote for a rug order using the real quote engine. Returns itemized price breakdown, MOQ validation, material availability, and production timeline.",
        "parameters": {
            "type": "object",
            "properties": {
                "rug_id": {"type": "integer", "description": "The ID of the rug from the catalog."},
                "size_w": {"type": "number", "description": "Width of the rug in meters."},
                "size_h": {"type": "number", "description": "Height/length of the rug in meters."},
                "material_id": {"type": "integer", "description": "The ID of the material to use."},
                "qty": {"type": "integer", "description": "Number of rugs to order.", "default": 1},
                "rush_order": {"type": "boolean", "description": "Whether this is a rush order.", "default": False},
            },
            "required": ["rug_id", "size_w", "size_h", "material_id"],
        },
    },
    {
        "name": "check_material_stock",
        "description": "Check if a specific material has sufficient stock for an order, accounting for 10% waste factor.",
        "parameters": {
            "type": "object",
            "properties": {
                "material_id": {"type": "integer", "description": "The ID of the material to check."},
                "required_sqm": {"type": "number", "description": "Total square meters of material required (before waste factor)."},
            },
            "required": ["material_id", "required_sqm"],
        },
    },
    {
        "name": "get_production_timeline",
        "description": "Get the estimated production timeline in days for an order.",
        "parameters": {
            "type": "object",
            "properties": {
                "rug_type": {"type": "string", "description": "The type/weave type of the rug (e.g. 'hand-knotted', 'hand-tufted', 'standard', 'custom')."},
                "size_sqm": {"type": "number", "description": "Total square meters of one rug."},
                "qty": {"type": "integer", "description": "Number of rugs.", "default": 1},
                "rush_order": {"type": "boolean", "description": "Whether the order is a rush order.", "default": False},
            },
            "required": ["rug_type", "size_sqm"],
        },
    },
    {
        "name": "get_moq_rules",
        "description": "Retrieve Minimum Order Quantity (MOQ) rules for a specific rug type or all rug types.",
        "parameters": {
            "type": "object",
            "properties": {"rug_type": {"type": "string", "description": "The rug type to get MOQ rules for. Leave empty to get all MOQ rules."}},
            "required": [],
        },
    },
    {
        "name": "get_faq",
        "description": "Get frequently asked questions and answers about the business, ordering, shipping, customization, etc.",
        "parameters": {
            "type": "object",
            "properties": {"topic": {"type": "string", "description": "Topic to filter FAQs (e.g. 'shipping', 'custom orders', 'payment', 'returns', 'materials')."}},
            "required": [],
        },
    },
    {
        "name": "get_pricing_rules",
        "description": "Retrieve all pricing rules including bulk discounts, rush fees, size surcharges, and custom work rates.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
]


_RUG_SIZE_SCHEMA = {
    "type": "array",
    "description": "Vendor-entered standard sizes. cm is only ever a vendor-typed value, never computed from ft — omit it if unknown, never invent one.",
    "items": {
        "type": "object",
        "properties": {
            "ft": {"type": "string", "description": "Size in feet, e.g. '6x9'."},
            "cm": {"type": "string", "description": "Size in centimetres, e.g. '183x274'. Only set this if the user explicitly gave you a cm value — otherwise omit it."},
        },
        "required": ["ft"],
    },
}

_ROOM_TYPES = ["living_room", "bedroom", "dining_room", "entryway"]
_MOOD_TAGS = ["warm_earthy", "quiet_luxury", "modern_minimal", "bohemian", "bold_artistic", "timeless_traditional"]

WRITE_TOOLS = [
    {
        "name": "create_rug_catalog_entry",
        "description": "Propose adding a new rug to the catalog. Stages a draft for human confirmation — does not go live until confirmed.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
                "sizes": _RUG_SIZE_SCHEMA,
                "base_price": {"type": "number", "description": "Base price per square metre, in the tenant's base currency unless base_price_currency is given."},
                "base_price_currency": {"type": "string", "description": "3-letter currency code. Defaults to the tenant's base currency if omitted."},
                "material_id": {"type": "integer", "description": "id of an existing material (call get_materials first to find one)."},
                "pile_height": {"type": "string"},
                "weave_type": {"type": "string"},
                "lead_time_days": {"type": "integer", "default": 21},
                "hsn_code": {"type": "string", "default": "5703"},
                "room_types": {"type": "array", "items": {"type": "string", "enum": _ROOM_TYPES}, "description": "\"Shop by Space\" tags for the room(s) this rug suits."},
                "mood_tags": {"type": "array", "items": {"type": "string", "enum": _MOOD_TAGS}, "description": "\"Shop by Mood\" tags for this rug's style."},
                "image_url": {"type": "string", "description": "Cover photo URL — get one from generate_rug_image, or omit if none available yet."},
                "gallery_image_urls": {
                    "type": "array", "items": {"type": "string"},
                    "description": "Additional gallery photo URLs (from generate_rug_image or elsewhere), shown alongside the cover photo on the rug detail page.",
                },
            },
            "required": ["name", "sizes", "base_price", "material_id"],
        },
    },
    {
        "name": "generate_rug_image",
        "description": "Generates a photorealistic product photo of a rug from a text description using AI image generation. Returns a URL you can pass as image_url or in gallery_image_urls on create/update_rug_catalog_entry. Call this once per photo you want (e.g. once for the cover shot, again for each gallery angle) before proposing the catalog entry.",
        "parameters": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Describe the rug and shot precisely — pattern, colors, material/texture, weave style, and setting (e.g. 'top-down studio shot on white background' or 'in a modern living room'). Be specific; this is the only guidance the image model gets.",
                },
            },
            "required": ["prompt"],
        },
    },
    {
        "name": "update_rug_catalog_entry",
        "description": "Propose changing fields on an existing catalog rug. Only include fields that should change. Stages a draft for human confirmation.",
        "parameters": {
            "type": "object",
            "properties": {
                "rug_id": {"type": "integer"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "sizes": _RUG_SIZE_SCHEMA,
                "base_price": {"type": "number"},
                "base_price_currency": {"type": "string"},
                "material_id": {"type": "integer"},
                "pile_height": {"type": "string"},
                "weave_type": {"type": "string"},
                "lead_time_days": {"type": "integer"},
                "hsn_code": {"type": "string"},
                "room_types": {"type": "array", "items": {"type": "string", "enum": _ROOM_TYPES}, "description": "\"Shop by Space\" tags for the room(s) this rug suits."},
                "mood_tags": {"type": "array", "items": {"type": "string", "enum": _MOOD_TAGS}, "description": "\"Shop by Mood\" tags for this rug's style."},
                "image_url": {"type": "string"},
                "gallery_image_urls": {"type": "array", "items": {"type": "string"}, "description": "Adds these as additional gallery photos — does not remove existing ones."},
            },
            "required": ["rug_id"],
        },
    },
    {
        "name": "delete_rug_catalog_entry",
        "description": "Propose removing a rug from the catalog. Stages a draft for human confirmation.",
        "parameters": {"type": "object", "properties": {"rug_id": {"type": "integer"}}, "required": ["rug_id"]},
    },
    {
        "name": "create_material",
        "description": "Propose adding a new material to inventory. Stages a draft for human confirmation.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "type": {"type": "string", "description": "e.g. wool, silk, cotton, synthetic"},
                "color": {"type": "string"},
                "stock_meters": {"type": "number", "default": 0},
                "cost_per_sqm": {"type": "number"},
                "cost_currency": {"type": "string", "description": "Defaults to the tenant's base currency if omitted."},
                "is_available": {"type": "boolean", "default": True},
            },
            "required": ["name", "type", "color", "cost_per_sqm"],
        },
    },
    {
        "name": "update_material",
        "description": "Propose changing fields on an existing material. Only include fields that should change. Stages a draft for human confirmation.",
        "parameters": {
            "type": "object",
            "properties": {
                "material_id": {"type": "integer"},
                "name": {"type": "string"},
                "type": {"type": "string"},
                "color": {"type": "string"},
                "stock_meters": {"type": "number"},
                "cost_per_sqm": {"type": "number"},
                "cost_currency": {"type": "string"},
                "is_available": {"type": "boolean"},
            },
            "required": ["material_id"],
        },
    },
    {
        "name": "delete_material",
        "description": "Propose removing a material. Stages a draft for human confirmation. Note: this will fail at confirm time if any catalog rug still uses this material.",
        "parameters": {"type": "object", "properties": {"material_id": {"type": "integer"}}, "required": ["material_id"]},
    },
    {
        "name": "create_promo_code",
        "description": "Propose creating a new promo code. Stages a draft for human confirmation.",
        "parameters": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Will be uppercased automatically."},
                "discount_type": {"type": "string", "enum": ["percentage", "flat", "free_shipping"]},
                "discount_value": {"type": "number", "description": "Percentage (e.g. 10 for 10%) or flat amount. Not used for free_shipping."},
                "min_order_value": {"type": "number"},
                "max_uses": {"type": "integer"},
                "one_per_customer": {"type": "boolean", "default": False},
                "is_active": {"type": "boolean", "default": True},
            },
            "required": ["code", "discount_type"],
        },
    },
    {
        "name": "update_promo_code",
        "description": "Propose changing fields on an existing promo code. Only include fields that should change. Stages a draft for human confirmation.",
        "parameters": {
            "type": "object",
            "properties": {
                "promo_id": {"type": "integer"},
                "code": {"type": "string"},
                "discount_type": {"type": "string", "enum": ["percentage", "flat", "free_shipping"]},
                "discount_value": {"type": "number"},
                "min_order_value": {"type": "number"},
                "max_uses": {"type": "integer"},
                "one_per_customer": {"type": "boolean"},
                "is_active": {"type": "boolean"},
            },
            "required": ["promo_id"],
        },
    },
    {
        "name": "delete_promo_code",
        "description": "Propose deleting a promo code. Stages a draft for human confirmation.",
        "parameters": {"type": "object", "properties": {"promo_id": {"type": "integer"}}, "required": ["promo_id"]},
    },
]

TOOLS = [{"type": "function", "function": t} for t in READ_TOOLS + WRITE_TOOLS]


class AIAgent:
    def __init__(self, tenant_id: Optional[int] = None, staff_id: Optional[int] = None):
        if not settings.OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY is not set. Please add it to your .env file."
            )
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.tenant_id = tenant_id
        self.staff_id = staff_id
        self.session_id: Optional[str] = None
        self._staged_this_turn: List[dict] = []

    def _get_db(self) -> Session:
        return SessionLocal()

    def _get_business_name(self) -> str:
        from app.models.models import Tenant
        db = self._get_db()
        try:
            query = db.query(Tenant)
            if self.tenant_id is not None:
                query = query.filter(Tenant.id == self.tenant_id)
            tenant = query.first()
            return tenant.name if tenant else "our business"  # type: ignore[return-value]
        finally:
            db.close()

    # ── Read tools ───────────────────────────────────────────────────────────

    def _tool_get_catalog(self, filter_available: bool = False) -> str:
        db = self._get_db()
        try:
            rugs = db.query(RugCatalog).filter(RugCatalog.tenant_id == self.tenant_id).all()
            result = []
            for rug in rugs:
                mat = db.query(Material).filter(Material.id == rug.material_id).first()
                if filter_available and mat and not mat.is_available:
                    continue
                result.append({
                    "id": rug.id,
                    "name": rug.name,
                    "description": rug.description,
                    "sizes": rug.sizes,
                    "base_price_per_sqm": rug.base_price,
                    "primary_material": mat.name if mat else "Unknown",
                    "primary_material_id": rug.material_id,
                    "pile_height": rug.pile_height,
                    "weave_type": rug.weave_type,
                    "lead_time_days": rug.lead_time_days,
                })
            return json.dumps(result)
        finally:
            db.close()

    def _tool_get_materials(self, filter_available: bool = False) -> str:
        db = self._get_db()
        try:
            query = db.query(Material).filter(Material.tenant_id == self.tenant_id)
            if filter_available:
                query = query.filter(Material.is_available == True)
            materials = query.all()
            result = [
                {
                    "id": m.id, "name": m.name, "type": m.type, "color": m.color,
                    "stock_meters": m.stock_meters, "cost_per_sqm": m.cost_per_sqm,
                    "is_available": m.is_available,
                }
                for m in materials
            ]
            return json.dumps(result)
        finally:
            db.close()

    def _tool_calculate_quote(self, rug_id: int, size_w: float, size_h: float, material_id: int, qty: int = 1, rush_order: bool = False) -> str:
        db = self._get_db()
        try:
            engine = QuoteEngine(db, tenant_id=self.tenant_id)
            result = engine.calculate_quote(rug_id, size_w, size_h, material_id, qty, rush_order)
            return json.dumps(result)
        finally:
            db.close()

    def _tool_check_material_stock(self, material_id: int, required_sqm: float) -> str:
        db = self._get_db()
        try:
            engine = QuoteEngine(db, tenant_id=self.tenant_id)
            result = engine.check_material_stock(material_id, required_sqm)
            return json.dumps(result)
        finally:
            db.close()

    def _tool_get_production_timeline(self, rug_type: str, size_sqm: float, qty: int = 1, rush_order: bool = False) -> str:
        db = self._get_db()
        try:
            engine = QuoteEngine(db, tenant_id=self.tenant_id)
            days = engine._estimate_days(rug_type, size_sqm, qty, rush_order)
            timelines = db.query(ProductionTimeline).all()
            timeline_data = [
                {"order_type": t.order_type, "base_days": t.base_days, "complexity_multiplier_per_sqm": t.complexity_multiplier_per_sqm, "notes": t.notes}
                for t in timelines
            ]
            return json.dumps({
                "rug_type": rug_type, "size_sqm": size_sqm, "qty": qty, "rush_order": rush_order,
                "estimated_days": days, "available_timelines": timeline_data,
            })
        finally:
            db.close()

    def _tool_get_moq_rules(self, rug_type: Optional[str] = None) -> str:
        db = self._get_db()
        try:
            query = db.query(MOQRule)
            if rug_type:
                query = query.filter(MOQRule.rug_type == rug_type)
            rules = query.all()
            result = [{"id": r.id, "rug_type": r.rug_type, "minimum_sqm": r.minimum_sqm, "minimum_pieces": r.minimum_pieces, "notes": r.notes} for r in rules]
            return json.dumps(result)
        finally:
            db.close()

    def _tool_get_faq(self, topic: Optional[str] = None) -> str:
        faqs = [
            {"topic": "custom orders", "question": "Can you make custom sizes?", "answer": "Yes, we manufacture rugs in any custom size. Custom sizes (not in our standard catalog sizes) may have different lead times. Minimum order for custom rugs is 4 sqm."},
            {"topic": "custom orders", "question": "Can I choose my own colors and patterns?", "answer": "Yes. We offer full custom design services. Please share your design or inspiration and our team will work with you. Custom design orders require a 50% deposit upfront and have a minimum of 35 business days lead time."},
            {"topic": "materials", "question": "What types of wool do you use?", "answer": "We use Pakistani wool (durable, great for high-traffic areas), Tibetan wool (extra soft, luxury feel), and New Zealand wool blends. All wool is ethically sourced."},
            {"topic": "materials", "question": "Are your rugs safe for children and pets?", "answer": "Yes. We use non-toxic, natural dyes for all our rugs. Wool rugs are naturally hypoallergenic, flame resistant, and easy to clean."},
            {"topic": "shipping", "question": "Where do you ship?", "answer": "We ship worldwide. Domestic (US) shipping takes 3-5 business days after production. International shipping takes 7-14 business days. Freight options available for large orders."},
            {"topic": "shipping", "question": "What are your shipping costs?", "answer": "Shipping costs are calculated based on size, weight, and destination. Orders over $5,000 qualify for free domestic shipping. Contact us for international freight quotes."},
            {"topic": "payment", "question": "What payment methods do you accept?", "answer": "We accept wire transfer, credit cards (Visa, Mastercard, Amex), and PayPal for orders under $10,000. For larger orders, wire transfer or letter of credit is preferred."},
            {"topic": "payment", "question": "Do you require a deposit?", "answer": "Yes. We require a 50% deposit to start production, with the remaining 50% due before shipment. Rush orders require full payment upfront."},
            {"topic": "returns", "question": "What is your return policy?", "answer": "Standard catalog items can be returned within 30 days if unused and in original packaging (15% restocking fee applies). Custom orders are non-refundable once production begins."},
            {"topic": "moq", "question": "What is your minimum order quantity?", "answer": "For catalog rugs: minimum 2 pieces per style. For custom rugs: minimum 4 sqm. For bulk/wholesale orders (10+ pieces), discounts of 15% apply automatically."},
            {"topic": "rush orders", "question": "Can you do rush delivery?", "answer": "Yes. Rush orders (delivery in under 7 days from production start) carry a 25% surcharge. Rush delivery is subject to production capacity — please contact us to confirm availability."},
            {"topic": "quality", "question": "What quality checks do you perform?", "answer": "Every rug undergoes a 3-step quality check: dimensional accuracy (±2%), color consistency (compared to approved sample), and structural integrity (pile density, edge finishing). A QC certificate is provided with every order."},
        ]
        if topic:
            filtered = [f for f in faqs if topic.lower() in f["topic"].lower() or topic.lower() in f["question"].lower()]
            if not filtered:
                topics = sorted({f["topic"] for f in faqs})
                return json.dumps({"error": f"No FAQ matches '{topic}'.", "available_topics": topics})
            return json.dumps(filtered)
        return json.dumps(faqs)

    def _tool_get_pricing_rules(self) -> str:
        db = self._get_db()
        try:
            rules = db.query(PricingRule).all()
            result = [
                {"id": r.id, "name": r.name, "rule_type": r.rule_type, "min_qty": r.min_qty, "max_qty": r.max_qty, "multiplier": r.multiplier, "flat_fee": r.flat_fee, "description": r.description}
                for r in rules
            ]
            return json.dumps(result)
        finally:
            db.close()

    # ── Write tools — every one of these only ever stages a PendingAiAction,
    # never calls db.commit() on the target table. See PendingAiAction's
    # docstring and app/api/routes/chat.py's confirm/reject endpoints. ────────

    def _stage_action(self, db: Session, action_type: str, entity_type: str, entity_id: Optional[int], payload: dict, summary: str) -> str:
        action = PendingAiAction(
            tenant_id=self.tenant_id,
            session_id=self.session_id,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=payload,
            summary=summary,
            created_by_staff_id=self.staff_id,
        )
        db.add(action)
        db.commit()
        db.refresh(action)
        self._staged_this_turn.append({
            "id": action.id, "action_type": action.action_type, "entity_type": action.entity_type,
            "entity_id": action.entity_id, "payload": action.payload, "summary": action.summary,
            "status": action.status, "created_at": action.created_at.isoformat() if action.created_at else None,
        })
        return json.dumps({
            "status": "pending_confirmation",
            "pending_action_id": action.id,
            "summary": summary,
            "message": "Staged as a draft — the user must confirm this in the admin UI before it takes effect. It has NOT happened yet.",
        })

    def _tool_create_rug_catalog_entry(self, **kwargs) -> str:
        db = self._get_db()
        try:
            gallery_urls = kwargs.pop("gallery_image_urls", None) or []
            try:
                validated = RugCatalogCreate(**kwargs).model_dump()
            except ValidationError as e:
                return json.dumps({"error": f"Invalid rug data: {e}"})
            material = db.query(Material).filter(Material.id == validated["material_id"], Material.tenant_id == self.tenant_id).first()
            if not material:
                return json.dumps({"error": f"No material with id {validated['material_id']} found for this tenant. Call get_materials first."})
            if gallery_urls:
                validated["_gallery_image_urls"] = gallery_urls
            summary = f"Create catalog rug \"{validated['name']}\" — {material.name}, base price {validated['base_price']}"
            if gallery_urls:
                summary += f", {len(gallery_urls)} gallery photo{'s' if len(gallery_urls) != 1 else ''}"
            return self._stage_action(db, "create", "rug_catalog", None, validated, summary)
        finally:
            db.close()

    def _tool_update_rug_catalog_entry(self, rug_id: int, **kwargs) -> str:
        db = self._get_db()
        try:
            rug = db.query(RugCatalog).filter(RugCatalog.id == rug_id, RugCatalog.tenant_id == self.tenant_id).first()
            if not rug:
                return json.dumps({"error": f"No catalog rug with id {rug_id} found for this tenant."})
            gallery_urls = kwargs.pop("gallery_image_urls", None) or []
            try:
                validated = RugCatalogUpdate(**kwargs).model_dump(exclude_unset=True)
            except ValidationError as e:
                return json.dumps({"error": f"Invalid update data: {e}"})
            if not validated and not gallery_urls:
                return json.dumps({"error": "No fields to update were provided."})
            if gallery_urls:
                validated["_gallery_image_urls"] = gallery_urls
            summary_parts = [f"{k}={v}" for k, v in validated.items() if k != "_gallery_image_urls"]
            if gallery_urls:
                summary_parts.append(f"+{len(gallery_urls)} gallery photo{'s' if len(gallery_urls) != 1 else ''}")
            summary = f"Update catalog rug \"{rug.name}\" (id {rug_id}): {', '.join(summary_parts)}"
            return self._stage_action(db, "update", "rug_catalog", rug_id, validated, summary)
        finally:
            db.close()

    def _tool_generate_rug_image(self, prompt: str) -> str:
        """Real-time AI image generation — not a staged write. Doesn't touch any
        business data, so (unlike the create/update/delete tools) this runs
        immediately and returns a real URL the model can reference right away."""
        try:
            full_prompt = (
                f"Professional product photography of a rug: {prompt}. "
                "Photorealistic, sharp focus, natural lighting, no text or watermarks."
            )
            result = self.client.images.generate(model="gpt-image-1", prompt=full_prompt, size="1024x1024", n=1)
            b64 = result.data[0].b64_json
            if not b64:
                return json.dumps({"error": "Image generation returned no image data."})
            image_bytes = base64.b64decode(b64)
        except Exception as e:
            return json.dumps({"error": f"Image generation failed: {e}"})

        filename = f"{uuid.uuid4().hex}.png"
        os.makedirs(RUG_UPLOAD_DIR, exist_ok=True)
        filepath = os.path.join(RUG_UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(image_bytes)
        url = f"/static/rugs/{filename}"
        return json.dumps({"image_url": url, "message": "Generated — pass this URL as image_url or in gallery_image_urls."})

    def _tool_delete_rug_catalog_entry(self, rug_id: int) -> str:
        db = self._get_db()
        try:
            rug = db.query(RugCatalog).filter(RugCatalog.id == rug_id, RugCatalog.tenant_id == self.tenant_id).first()
            if not rug:
                return json.dumps({"error": f"No catalog rug with id {rug_id} found for this tenant."})
            summary = f"Delete catalog rug \"{rug.name}\" (id {rug_id})"
            return self._stage_action(db, "delete", "rug_catalog", rug_id, {}, summary)
        finally:
            db.close()

    def _tool_create_material(self, **kwargs) -> str:
        db = self._get_db()
        try:
            try:
                validated = MaterialCreate(**kwargs).model_dump()
            except ValidationError as e:
                return json.dumps({"error": f"Invalid material data: {e}"})
            summary = f"Create material \"{validated['name']}\" — {validated['type']}, {validated['color']}, cost {validated['cost_per_sqm']}/sqm"
            return self._stage_action(db, "create", "material", None, validated, summary)
        finally:
            db.close()

    def _tool_update_material(self, material_id: int, **kwargs) -> str:
        db = self._get_db()
        try:
            material = db.query(Material).filter(Material.id == material_id, Material.tenant_id == self.tenant_id).first()
            if not material:
                return json.dumps({"error": f"No material with id {material_id} found for this tenant."})
            try:
                validated = MaterialUpdate(**kwargs).model_dump(exclude_unset=True)
            except ValidationError as e:
                return json.dumps({"error": f"Invalid update data: {e}"})
            if not validated:
                return json.dumps({"error": "No fields to update were provided."})
            summary = f"Update material \"{material.name}\" (id {material_id}): {', '.join(f'{k}={v}' for k, v in validated.items())}"
            return self._stage_action(db, "update", "material", material_id, validated, summary)
        finally:
            db.close()

    def _tool_delete_material(self, material_id: int) -> str:
        db = self._get_db()
        try:
            material = db.query(Material).filter(Material.id == material_id, Material.tenant_id == self.tenant_id).first()
            if not material:
                return json.dumps({"error": f"No material with id {material_id} found for this tenant."})
            summary = f"Delete material \"{material.name}\" (id {material_id})"
            return self._stage_action(db, "delete", "material", material_id, {}, summary)
        finally:
            db.close()

    def _tool_create_promo_code(self, **kwargs) -> str:
        db = self._get_db()
        try:
            try:
                validated = PromoCodeCreate(**kwargs).model_dump()
            except ValidationError as e:
                return json.dumps({"error": f"Invalid promo code data: {e}"})
            summary = f"Create promo code \"{validated['code'].upper()}\" — {validated['discount_type']} {validated.get('discount_value') or ''}".strip()
            return self._stage_action(db, "create", "promo_code", None, validated, summary)
        finally:
            db.close()

    def _tool_update_promo_code(self, promo_id: int, **kwargs) -> str:
        db = self._get_db()
        try:
            promo = db.query(PromoCode).filter(PromoCode.id == promo_id, PromoCode.tenant_id == self.tenant_id).first()
            if not promo:
                return json.dumps({"error": f"No promo code with id {promo_id} found for this tenant."})
            try:
                validated = PromoCodeUpdate(**kwargs).model_dump(exclude_unset=True)
            except ValidationError as e:
                return json.dumps({"error": f"Invalid update data: {e}"})
            if not validated:
                return json.dumps({"error": "No fields to update were provided."})
            summary = f"Update promo code \"{promo.code}\" (id {promo_id}): {', '.join(f'{k}={v}' for k, v in validated.items())}"
            return self._stage_action(db, "update", "promo_code", promo_id, validated, summary)
        finally:
            db.close()

    def _tool_delete_promo_code(self, promo_id: int) -> str:
        db = self._get_db()
        try:
            promo = db.query(PromoCode).filter(PromoCode.id == promo_id, PromoCode.tenant_id == self.tenant_id).first()
            if not promo:
                return json.dumps({"error": f"No promo code with id {promo_id} found for this tenant."})
            summary = f"Delete promo code \"{promo.code}\" (id {promo_id})"
            return self._stage_action(db, "delete", "promo_code", promo_id, {}, summary)
        finally:
            db.close()

    _TOOL_DISPATCH = {
        "get_catalog": "_tool_get_catalog",
        "get_materials": "_tool_get_materials",
        "calculate_quote": "_tool_calculate_quote",
        "check_material_stock": "_tool_check_material_stock",
        "get_production_timeline": "_tool_get_production_timeline",
        "get_moq_rules": "_tool_get_moq_rules",
        "get_faq": "_tool_get_faq",
        "get_pricing_rules": "_tool_get_pricing_rules",
        "create_rug_catalog_entry": "_tool_create_rug_catalog_entry",
        "generate_rug_image": "_tool_generate_rug_image",
        "update_rug_catalog_entry": "_tool_update_rug_catalog_entry",
        "delete_rug_catalog_entry": "_tool_delete_rug_catalog_entry",
        "create_material": "_tool_create_material",
        "update_material": "_tool_update_material",
        "delete_material": "_tool_delete_material",
        "create_promo_code": "_tool_create_promo_code",
        "update_promo_code": "_tool_update_promo_code",
        "delete_promo_code": "_tool_delete_promo_code",
    }

    def _execute_tool(self, tool_name: str, tool_input: dict) -> str:
        method_name = self._TOOL_DISPATCH.get(tool_name)
        if not method_name:
            return json.dumps({"error": f"Unknown tool: {tool_name}"})
        try:
            return getattr(self, method_name)(**tool_input)
        except Exception as e:
            return json.dumps({"error": str(e)})

    def chat(self, messages: List[dict], session_id: Optional[str] = None) -> dict:
        self.session_id = session_id or str(uuid.uuid4())
        self._staged_this_turn = []

        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(business_name=self._get_business_name())
        openai_messages = [{"role": "system", "content": system_prompt}]
        openai_messages += [{"role": m["role"], "content": m["content"]} for m in messages]

        max_iterations = 10
        iteration = 0

        while iteration < max_iterations:
            iteration += 1
            response = self.client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=openai_messages,
                tools=TOOLS,
                max_tokens=1200,
            )
            msg = response.choices[0].message

            if not msg.tool_calls:
                return {
                    "response": msg.content or "I encountered an unexpected issue. Please try again.",
                    "session_id": self.session_id,
                    "pending_actions": self._staged_this_turn,
                }

            openai_messages.append({
                "role": "assistant",
                "content": msg.content,
                "tool_calls": [
                    {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in msg.tool_calls
                ],
            })

            for tc in msg.tool_calls:
                try:
                    args = json.loads(tc.function.arguments) if tc.function.arguments else {}
                except json.JSONDecodeError:
                    args = {}
                result = self._execute_tool(tc.function.name, args)
                openai_messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })

        return {
            "response": "I reached the maximum number of tool calls for this request. Please try a more specific question.",
            "session_id": self.session_id,
            "pending_actions": self._staged_this_turn,
        }
