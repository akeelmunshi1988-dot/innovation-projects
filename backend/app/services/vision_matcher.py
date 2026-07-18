import base64
import json
from typing import Optional
import anthropic
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import RugCatalog, Material
from app.services.quote_engine import QuoteEngine


VISION_SYSTEM_PROMPT = """You are an expert rug design analyst for LoomCraft AI, a premium rug manufacturer.

When shown an inspiration image (a room photo, a rug photo, a mood board, or any visual reference), analyze it and extract rug design attributes. Then match those attributes to the provided catalog and return the top 3 best matches with a clear explanation.

You must ALWAYS return a valid JSON object with this exact structure:
{
  "analysis": {
    "dominant_colors": ["color1", "color2", "color3"],
    "color_palette_mood": "warm/cool/neutral/earthy/vibrant/monochromatic",
    "pattern_style": "geometric/floral/traditional/abstract/modern/plain/medallion/tribal/scandinavian",
    "texture_feel": "plush/flat/medium/rustic/luxurious",
    "overall_aesthetic": "brief 1-sentence description"
  },
  "floor_region": {
    "x": <0-100, left edge of rug placement area as % of image width>,
    "y": <0-100, top edge of rug placement area as % of image height>,
    "width": <0-100, width of rug placement area as % of image width>,
    "height": <0-100, height of rug placement area as % of image height>
  },
  "matches": [
    {
      "rug_id": <integer>,
      "match_score": <0-100>,
      "match_reason": "why this rug matches the inspiration",
      "color_adaptation": "how colors from the catalog rug can complement the inspiration"
    }
  ]
}

For floor_region: identify the most natural rug placement area in the image (e.g. visible floor space, seating area, center of room). If the image is a close-up of a rug or mood board with no clear room, default to {"x": 10, "y": 40, "width": 80, "height": 50}.

Be honest about match quality. A match_score of 90+ means excellent fit, 70-89 means good fit, 50-69 means reasonable fit."""


def _get_catalog_summary(db: Session) -> list:
    rugs = db.query(RugCatalog).join(Material).filter(Material.is_available == True).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "weave_type": r.weave_type,
            "pile_height": r.pile_height,
            "material": r.material.name,
            "material_type": r.material.type,
            "base_price_per_sqm": r.base_price,
            "lead_time_days": r.lead_time_days,
        }
        for r in rugs
    ]


def analyze_and_match(
    image_bytes: bytes,
    media_type: str,
    size_w: float,
    size_h: float,
    qty: int = 1,
    budget_max: Optional[float] = None,
    rush_order: bool = False,
) -> dict:
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    db = SessionLocal()

    try:
        catalog = _get_catalog_summary(db)
        image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

        catalog_text = json.dumps(catalog, indent=2)
        user_message = f"""Here is an inspiration image from a customer.

Customer requirements:
- Desired size: {size_w}m × {size_h}m ({size_w * size_h:.1f} sqm)
- Quantity: {qty} piece(s)
- Rush order: {"Yes" if rush_order else "No"}
{f"- Maximum budget: ${budget_max:,.0f}" if budget_max else "- Budget: Not specified"}

Our available catalog:
{catalog_text}

Please analyze the inspiration image and return the top 3 matching rugs from our catalog as JSON."""

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            system=VISION_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": user_message},
                    ],
                }
            ],
        )

        raw = response.content[0].text.strip()
        # Extract JSON if wrapped in markdown code block
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        vision_result = json.loads(raw.strip())

        # Calculate real quotes for each match
        engine = QuoteEngine(db)
        enriched_matches = []

        for match in vision_result.get("matches", [])[:3]:
            rug_id = match.get("rug_id")
            rug = db.query(RugCatalog).filter(RugCatalog.id == rug_id).first()
            if not rug:
                continue

            quote = engine.calculate_quote(
                rug_id=rug_id,
                size_w=size_w,
                size_h=size_h,
                material_id=rug.material_id,
                qty=qty,
                rush_order=rush_order,
            )

            if budget_max and quote.get("final_price", 0) > budget_max:
                match["budget_note"] = f"Slightly over budget by ${quote['final_price'] - budget_max:,.0f}"

            enriched_matches.append({
                **match,
                "rug": {
                    "id": rug.id,
                    "name": rug.name,
                    "description": rug.description,
                    "weave_type": rug.weave_type,
                    "pile_height": rug.pile_height,
                    "material": rug.material.name,
                    "sizes": rug.sizes,
                    "lead_time_days": rug.lead_time_days,
                    "image_url": rug.image_url,
                },
                "quote": quote,
            })

        default_floor = {"x": 10, "y": 45, "width": 80, "height": 45}
        floor_region = vision_result.get("floor_region", default_floor)

        return {
            "analysis": vision_result.get("analysis", {}),
            "floor_region": floor_region,
            "matches": enriched_matches,
            "requested_size": {"width": size_w, "height": size_h, "sqm": round(size_w * size_h, 2)},
            "qty": qty,
        }

    finally:
        db.close()


# Simplified system prompt for room matching — floor region is pre-computed
ROOM_MATCH_SYSTEM_PROMPT = """You are an expert rug design analyst for LoomCraft AI, a premium rug manufacturer.

You will be shown a photo of an interior room. Analyze the room's style, colors, and atmosphere, then match it to the provided rug catalog.

You must ALWAYS return a valid JSON object with this exact structure:
{
  "analysis": {
    "dominant_colors": ["color1", "color2", "color3"],
    "color_palette_mood": "warm/cool/neutral/earthy/vibrant/monochromatic",
    "pattern_style": "geometric/floral/traditional/abstract/modern/plain/medallion/tribal/scandinavian",
    "texture_feel": "plush/flat/medium/rustic/luxurious",
    "overall_aesthetic": "brief 1-sentence description of the room style"
  },
  "matches": [
    {
      "rug_id": <integer>,
      "match_score": <0-100>,
      "match_reason": "why this rug suits this room style",
      "color_adaptation": "how the rug colors complement the room palette"
    }
  ]
}

Be specific about how each rug fits the room. A match_score of 90+ means excellent fit, 70-89 means good, 50-69 means reasonable."""


def analyze_and_match_room(
    room_id: str,
    room_name: str,
    room_style: str,
    image_url: str,
    floor_region: dict,
    size_w: float,
    size_h: float,
    qty: int = 1,
    budget_max: Optional[float] = None,
    rush_order: bool = False,
) -> dict:
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    db = SessionLocal()

    try:
        catalog = _get_catalog_summary(db)
        catalog_text = json.dumps(catalog, indent=2)

        user_message = f"""This is a photo of a {room_name} ({room_style}).

Customer requirements:
- Desired rug size: {size_w}m × {size_h}m ({size_w * size_h:.1f} sqm)
- Quantity: {qty} piece(s)
- Rush order: {"Yes" if rush_order else "No"}
{f"- Maximum budget: ${budget_max:,.0f}" if budget_max else "- Budget: Not specified"}

Our available catalog:
{catalog_text}

Analyze this room and recommend the top 3 rugs that would look best in this space. Return as JSON."""

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            system=ROOM_MATCH_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "url",
                                "url": image_url,
                            },
                        },
                        {"type": "text", "text": user_message},
                    ],
                }
            ],
        )

        raw = response.content[0].text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        vision_result = json.loads(raw.strip())

        engine = QuoteEngine(db)
        enriched_matches = []

        for match in vision_result.get("matches", [])[:3]:
            rug_id = match.get("rug_id")
            rug = db.query(RugCatalog).filter(RugCatalog.id == rug_id).first()
            if not rug:
                continue

            quote = engine.calculate_quote(
                rug_id=rug_id,
                size_w=size_w,
                size_h=size_h,
                material_id=rug.material_id,
                qty=qty,
                rush_order=rush_order,
            )

            if budget_max and quote.get("final_price", 0) > budget_max:
                match["budget_note"] = f"Slightly over budget by ${quote['final_price'] - budget_max:,.0f}"

            enriched_matches.append({
                **match,
                "rug": {
                    "id": rug.id,
                    "name": rug.name,
                    "description": rug.description,
                    "weave_type": rug.weave_type,
                    "pile_height": rug.pile_height,
                    "material": rug.material.name,
                    "sizes": rug.sizes,
                    "lead_time_days": rug.lead_time_days,
                    "image_url": rug.image_url,
                },
                "quote": quote,
            })

        return {
            "analysis": vision_result.get("analysis", {}),
            "floor_region": floor_region,   # pre-computed — no detection needed
            "matches": enriched_matches,
            "room_id": room_id,
            "room_name": room_name,
            "room_image_url": image_url,
            "requested_size": {"width": size_w, "height": size_h, "sqm": round(size_w * size_h, 2)},
            "qty": qty,
        }

    finally:
        db.close()