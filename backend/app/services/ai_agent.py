import json
import uuid
from typing import List, Optional
import anthropic
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import (
    RugCatalog,
    Material,
    PricingRule,
    MOQRule,
    ProductionTimeline,
)
from app.services.quote_engine import QuoteEngine


SYSTEM_PROMPT = """You are a knowledgeable rug manufacturing business assistant for LoomCraftRugs AI.

You ONLY answer based on real data from our business systems. Never make up prices, timelines, or availability — always call the appropriate tool to retrieve accurate information before answering.

Your capabilities:
- Provide detailed product information from our live catalog
- Generate accurate price quotes using the real quote engine
- Check material availability from live inventory
- Explain MOQ (Minimum Order Quantity) rules
- Estimate production timelines
- Answer FAQs about our business

When a customer asks about pricing, ALWAYS call calculate_quote with their specific dimensions and material rather than estimating.
When asked about stock, ALWAYS call get_materials or check_material_stock.
When asked about lead times, ALWAYS call get_production_timeline.

Be professional, helpful, and concise. Format currency as USD. Express measurements in meters and square meters."""


TOOLS = [
    {
        "name": "get_catalog",
        "description": "Retrieve all rug catalog items with names, descriptions, base prices per sqm, available sizes, materials, weave types, and lead times.",
        "input_schema": {
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
        "description": "Retrieve materials with stock levels, cost per sqm, type (wool/silk/cotton/synthetic), and availability status.",
        "input_schema": {
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
        "input_schema": {
            "type": "object",
            "properties": {
                "rug_id": {
                    "type": "integer",
                    "description": "The ID of the rug from the catalog.",
                },
                "size_w": {
                    "type": "number",
                    "description": "Width of the rug in meters.",
                },
                "size_h": {
                    "type": "number",
                    "description": "Height/length of the rug in meters.",
                },
                "material_id": {
                    "type": "integer",
                    "description": "The ID of the material to use.",
                },
                "qty": {
                    "type": "integer",
                    "description": "Number of rugs to order.",
                    "default": 1,
                },
                "rush_order": {
                    "type": "boolean",
                    "description": "Whether this is an early delivery order (faster than estimated delivery, extra surcharge).",
                    "default": False,
                },
            },
            "required": ["rug_id", "size_w", "size_h", "material_id"],
        },
    },
    {
        "name": "check_material_stock",
        "description": "Check if a specific material has sufficient stock for an order, accounting for 10% waste factor.",
        "input_schema": {
            "type": "object",
            "properties": {
                "material_id": {
                    "type": "integer",
                    "description": "The ID of the material to check.",
                },
                "required_sqm": {
                    "type": "number",
                    "description": "The total square meters of material required (before waste factor).",
                },
            },
            "required": ["material_id", "required_sqm"],
        },
    },
    {
        "name": "get_production_timeline",
        "description": "Get the estimated production timeline in days for an order.",
        "input_schema": {
            "type": "object",
            "properties": {
                "rug_type": {
                    "type": "string",
                    "description": "The type/weave type of the rug (e.g. 'hand-knotted', 'hand-tufted', 'standard', 'custom').",
                },
                "size_sqm": {
                    "type": "number",
                    "description": "Total square meters of one rug.",
                },
                "qty": {
                    "type": "integer",
                    "description": "Number of rugs.",
                    "default": 1,
                },
                "rush_order": {
                    "type": "boolean",
                    "description": "Whether the order is an early delivery order.",
                    "default": False,
                },
            },
            "required": ["rug_type", "size_sqm"],
        },
    },
    {
        "name": "get_moq_rules",
        "description": "Retrieve Minimum Order Quantity (MOQ) rules for a specific rug type or all rug types.",
        "input_schema": {
            "type": "object",
            "properties": {
                "rug_type": {
                    "type": "string",
                    "description": "The rug type to get MOQ rules for. Leave empty to get all MOQ rules.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_faq",
        "description": "Get frequently asked questions and answers about the business, ordering, shipping, customization, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "Topic to filter FAQs (e.g. 'shipping', 'custom orders', 'payment', 'returns', 'materials').",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_pricing_rules",
        "description": "Retrieve all pricing rules including bulk discounts, rush fees, size surcharges, and custom work rates.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
]


class AIAgent:
    def __init__(self):
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError(
                "ANTHROPIC_API_KEY is not set. Please add it to your .env file."
            )
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _get_db(self) -> Session:
        return SessionLocal()

    def _tool_get_catalog(self, filter_available: bool = False) -> str:
        db = self._get_db()
        try:
            query = db.query(RugCatalog)
            rugs = query.all()
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
            return json.dumps(result, indent=2)
        finally:
            db.close()

    def _tool_get_materials(self, filter_available: bool = False) -> str:
        db = self._get_db()
        try:
            query = db.query(Material)
            if filter_available:
                query = query.filter(Material.is_available == True)
            materials = query.all()
            result = []
            for m in materials:
                result.append({
                    "id": m.id,
                    "name": m.name,
                    "type": m.type,
                    "color": m.color,
                    "stock_meters": m.stock_meters,
                    "cost_per_sqm": m.cost_per_sqm,
                    "is_available": m.is_available,
                })
            return json.dumps(result, indent=2)
        finally:
            db.close()

    def _tool_calculate_quote(
        self,
        rug_id: int,
        size_w: float,
        size_h: float,
        material_id: int,
        qty: int = 1,
        rush_order: bool = False,
    ) -> str:
        db = self._get_db()
        try:
            engine = QuoteEngine(db)
            result = engine.calculate_quote(rug_id, size_w, size_h, material_id, qty, rush_order)
            return json.dumps(result, indent=2)
        finally:
            db.close()

    def _tool_check_material_stock(self, material_id: int, required_sqm: float) -> str:
        db = self._get_db()
        try:
            engine = QuoteEngine(db)
            result = engine.check_material_stock(material_id, required_sqm)
            return json.dumps(result, indent=2)
        finally:
            db.close()

    def _tool_get_production_timeline(
        self,
        rug_type: str,
        size_sqm: float,
        qty: int = 1,
        rush_order: bool = False,
    ) -> str:
        db = self._get_db()
        try:
            engine = QuoteEngine(db)
            days = engine._estimate_days(rug_type, size_sqm, qty, rush_order)
            timelines = db.query(ProductionTimeline).all()
            timeline_data = [
                {
                    "order_type": t.order_type,
                    "base_days": t.base_days,
                    "complexity_multiplier_per_sqm": t.complexity_multiplier_per_sqm,
                    "notes": t.notes,
                }
                for t in timelines
            ]
            return json.dumps({
                "rug_type": rug_type,
                "size_sqm": size_sqm,
                "qty": qty,
                "rush_order": rush_order,
                "estimated_days": days,
                "available_timelines": timeline_data,
            }, indent=2)
        finally:
            db.close()

    def _tool_get_moq_rules(self, rug_type: Optional[str] = None) -> str:
        db = self._get_db()
        try:
            query = db.query(MOQRule)
            if rug_type:
                query = query.filter(MOQRule.rug_type == rug_type)
            rules = query.all()
            result = [
                {
                    "id": r.id,
                    "rug_type": r.rug_type,
                    "minimum_sqm": r.minimum_sqm,
                    "minimum_pieces": r.minimum_pieces,
                    "notes": r.notes,
                }
                for r in rules
            ]
            return json.dumps(result, indent=2)
        finally:
            db.close()

    def _tool_get_faq(self, topic: Optional[str] = None) -> str:
        faqs = [
            {
                "topic": "custom orders",
                "question": "Can you make custom sizes?",
                "answer": "Yes, we manufacture rugs in any custom size. Custom sizes (not in our standard catalog sizes) may have different lead times. Minimum order for custom rugs is 4 sqm.",
            },
            {
                "topic": "custom orders",
                "question": "Can I choose my own colors and patterns?",
                "answer": "Yes. We offer full custom design services. Please share your design or inspiration and our team will work with you. Custom design orders require a 50% deposit upfront and have a minimum of 35 business days lead time.",
            },
            {
                "topic": "materials",
                "question": "What types of wool do you use?",
                "answer": "We use Pakistani wool (durable, great for high-traffic areas), Tibetan wool (extra soft, luxury feel), and New Zealand wool blends. All wool is ethically sourced.",
            },
            {
                "topic": "materials",
                "question": "Are your rugs safe for children and pets?",
                "answer": "Yes. We use non-toxic, natural dyes for all our rugs. Wool rugs are naturally hypoallergenic, flame resistant, and easy to clean.",
            },
            {
                "topic": "shipping",
                "question": "Where do you ship?",
                "answer": "We ship worldwide. Domestic (US) shipping takes 3-5 business days after production. International shipping takes 7-14 business days. Freight options available for large orders.",
            },
            {
                "topic": "shipping",
                "question": "What are your shipping costs?",
                "answer": "Shipping costs are calculated based on size, weight, and destination. Orders over $5,000 qualify for free domestic shipping. Contact us for international freight quotes.",
            },
            {
                "topic": "payment",
                "question": "What payment methods do you accept?",
                "answer": "We accept wire transfer, credit cards (Visa, Mastercard, Amex), and PayPal for orders under $10,000. For larger orders, wire transfer or letter of credit is preferred.",
            },
            {
                "topic": "payment",
                "question": "Do you require a deposit?",
                "answer": "Yes. We require a 50% deposit to start production, with the remaining 50% due before shipment. Rush orders require full payment upfront.",
            },
            {
                "topic": "returns",
                "question": "What is your return policy?",
                "answer": "Standard catalog items can be returned within 30 days if unused and in original packaging (15% restocking fee applies). Custom orders are non-refundable once production begins.",
            },
            {
                "topic": "moq",
                "question": "What is your minimum order quantity?",
                "answer": "For catalog rugs: minimum 2 pieces per style. For custom rugs: minimum 4 sqm. For bulk/wholesale orders (10+ pieces), discounts of 15% apply automatically.",
            },
            {
                "topic": "early delivery orders",
                "question": "Can you do early delivery?",
                "answer": "Yes. Early delivery orders (delivery in under 7 days from production start) carry a 25% surcharge. Rush delivery is subject to production capacity — please contact us to confirm availability.",
            },
            {
                "topic": "quality",
                "question": "What quality checks do you perform?",
                "answer": "Every rug undergoes a 3-step quality check: dimensional accuracy (±2%), color consistency (compared to approved sample), and structural integrity (pile density, edge finishing). A QC certificate is provided with every order.",
            },
        ]

        if topic:
            filtered = [f for f in faqs if topic.lower() in f["topic"].lower() or topic.lower() in f["question"].lower()]
            return json.dumps(filtered if filtered else faqs, indent=2)
        return json.dumps(faqs, indent=2)

    def _tool_get_pricing_rules(self) -> str:
        db = self._get_db()
        try:
            rules = db.query(PricingRule).all()
            result = [
                {
                    "id": r.id,
                    "name": r.name,
                    "rule_type": r.rule_type,
                    "min_qty": r.min_qty,
                    "max_qty": r.max_qty,
                    "multiplier": r.multiplier,
                    "flat_fee": r.flat_fee,
                    "description": r.description,
                }
                for r in rules
            ]
            return json.dumps(result, indent=2)
        finally:
            db.close()

    def _execute_tool(self, tool_name: str, tool_input: dict) -> str:
        try:
            if tool_name == "get_catalog":
                return self._tool_get_catalog(**tool_input)
            elif tool_name == "get_materials":
                return self._tool_get_materials(**tool_input)
            elif tool_name == "calculate_quote":
                return self._tool_calculate_quote(**tool_input)
            elif tool_name == "check_material_stock":
                return self._tool_check_material_stock(**tool_input)
            elif tool_name == "get_production_timeline":
                return self._tool_get_production_timeline(**tool_input)
            elif tool_name == "get_moq_rules":
                return self._tool_get_moq_rules(**tool_input)
            elif tool_name == "get_faq":
                return self._tool_get_faq(**tool_input)
            elif tool_name == "get_pricing_rules":
                return self._tool_get_pricing_rules()
            else:
                return json.dumps({"error": f"Unknown tool: {tool_name}"})
        except Exception as e:
            return json.dumps({"error": str(e)})

    def chat(self, messages: List[dict], session_id: Optional[str] = None) -> dict:
        if not session_id:
            session_id = str(uuid.uuid4())

        # Convert messages to Anthropic format
        anthropic_messages = []
        for msg in messages:
            anthropic_messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })

        # Agentic loop
        max_iterations = 10
        iteration = 0

        while iteration < max_iterations:
            iteration += 1
            response = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=anthropic_messages,
            )

            if response.stop_reason == "end_turn":
                # Extract text content from response
                text_content = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        text_content += block.text
                return {"response": text_content, "session_id": session_id}

            if response.stop_reason == "tool_use":
                # Add assistant's response (which includes tool_use blocks) to conversation
                anthropic_messages.append({
                    "role": "assistant",
                    "content": response.content,
                })

                # Execute all tool calls and collect results
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        tool_result = self._execute_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": tool_result,
                        })

                # Add tool results to conversation
                anthropic_messages.append({
                    "role": "user",
                    "content": tool_results,
                })
                continue

            # Unexpected stop reason — return whatever we have
            text_content = ""
            for block in response.content:
                if hasattr(block, "text"):
                    text_content += block.text
            return {"response": text_content or "I encountered an unexpected issue. Please try again.", "session_id": session_id}

        return {
            "response": "I reached the maximum number of tool calls for this request. Please try a more specific question.",
            "session_id": session_id,
        }
