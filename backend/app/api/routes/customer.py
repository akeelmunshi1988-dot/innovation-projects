from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import StreamingResponse, FileResponse, Response
from sqlalchemy.orm import Session
from typing import Optional, List
import io
import cv2
import numpy as np
import uuid
import os
import json
import requests as _requests
from pydantic import BaseModel
import anthropic as _anthropic
from app.services.vision_matcher import analyze_and_match, analyze_and_match_room
from app.services.quote_engine import QuoteEngine
from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.core.auth import get_current_customer
from app.models.models import RugCatalog, Material, Customer, Quote, Order, InventoryTransaction, Tenant
from app.data.room_presets import ROOM_PRESETS, ROOM_PRESETS_BY_ID
from app.services import room_composer
from app.services.invoice_generator import generate_invoice_pdf
from app.schemas.schemas import QuoteCustomerRespondRequest

router = APIRouter()

# ── Directories for uploaded / generated images ───────────────────────────────
_BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
UPLOAD_DIR = os.path.join(_BASE, 'uploads')
OUTPUT_DIR = os.path.join(_BASE, 'outputs')
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


_FRONTEND_PUBLIC = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'frontend', 'public')
)

def _load_rug_from_catalog(image_url: str) -> np.ndarray:
    if image_url.startswith("/"):
        path = os.path.join(_FRONTEND_PUBLIC, image_url.lstrip("/"))
        img = cv2.imread(path)
        if img is None:
            raise HTTPException(status_code=404, detail=f"Rug image not found: {path}")
    else:
        r = _requests.get(image_url, timeout=15)
        arr = np.frombuffer(r.content, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode rug image")
    return img


# ── Rug replacement endpoint ──────────────────────────────────────────────────

@router.post("/replace-rug")
async def replace_rug(
    roomImage: UploadFile = File(...),
    rugImage:  Optional[UploadFile] = File(None),
    rug_id:    Optional[int]        = Form(None),
    corners:   str                  = Form(...),
):
    if rugImage is None and rug_id is None:
        raise HTTPException(status_code=400, detail="Provide either rugImage or rug_id.")

    corner_points = json.loads(corners)
    if len(corner_points) != 4:
        raise HTTPException(status_code=400, detail="Exactly 4 corner points required.")

    # Save room image
    room_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{roomImage.filename}")
    with open(room_path, "wb") as f:
        f.write(await roomImage.read())
    room = cv2.imread(room_path)
    if room is None:
        raise HTTPException(status_code=400, detail="Could not read room image.")

    # Load rug — from catalog by ID or from uploaded file
    if rug_id is not None:
        db = SessionLocal()
        try:
            rug_record = db.query(RugCatalog).filter(RugCatalog.id == rug_id).first()
            if not rug_record:
                raise HTTPException(status_code=404, detail="Rug not found in catalog.")
            if not rug_record.image_url:
                raise HTTPException(status_code=400, detail="Selected rug has no image.")
            rug = _load_rug_from_catalog(rug_record.image_url)
        finally:
            db.close()
    else:
        rug_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{rugImage.filename}")
        with open(rug_path, "wb") as f:
            f.write(await rugImage.read())
        rug = cv2.imread(rug_path)
        if rug is None:
            raise HTTPException(status_code=400, detail="Could not read rug image.")

    # Resize rug to a standard rectangle
    rug_width, rug_height = 1200, 800
    rug = cv2.resize(rug, (rug_width, rug_height))

    # Source rectangle corners
    pts_src = np.array([
        [0,         0],
        [rug_width, 0],
        [rug_width, rug_height],
        [0,         rug_height],
    ], dtype=np.float32)

    # Destination corners from the user's canvas clicks (image-space coords)
    pts_dst = np.array(corner_points, dtype=np.float32)

    # Perspective warp
    matrix     = cv2.getPerspectiveTransform(pts_src, pts_dst)
    h, w       = room.shape[:2]
    warped_rug = cv2.warpPerspective(rug, matrix, (w, h))

    # Feathered mask (soft edges)
    gray        = cv2.cvtColor(warped_rug, cv2.COLOR_BGR2GRAY)
    _, mask     = cv2.threshold(gray, 1, 255, cv2.THRESH_BINARY)
    mask        = cv2.GaussianBlur(mask, (31, 31), 15)

    mask_f     = mask.astype(float) / 255.0
    mask_inv_f = 1.0 - mask_f
    room_f     = room.astype(float)
    rug_f      = warped_rug.astype(float)

    # Blend rug onto room
    for c in range(3):
        room_f[:, :, c] = (
            mask_inv_f * room_f[:, :, c] +
            mask_f     * rug_f[:, :, c]
        )

    final = room_f.astype(np.uint8)

    # Realistic shadow just outside the rug quad
    shadow = np.zeros_like(room)
    cv2.fillConvexPoly(shadow, pts_dst.astype(int), (40, 40, 40))
    shadow = cv2.GaussianBlur(shadow, (101, 101), 50)
    final  = cv2.addWeighted(final, 1.0, shadow, 0.22, 0)

    # Save result
    out_name = f"{uuid.uuid4()}.jpg"
    out_path = os.path.join(OUTPUT_DIR, out_name)
    cv2.imwrite(out_path, final, [cv2.IMWRITE_JPEG_QUALITY, 95])

    return {"imageUrl": f"/api/output/{out_name}"}


@router.get("/output/{filename}")
async def get_output(filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="image/jpeg")

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.get("/customer/catalog")
async def get_public_catalog():
    db = SessionLocal()
    try:
        rugs = db.query(RugCatalog).join(Material).all()
        return [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "weave_type": r.weave_type,
                "pile_height": r.pile_height,
                "material": r.material.name,
                "material_type": r.material.type,
                "sizes": r.sizes,
                "base_price_per_sqm": r.base_price,
                "base_price_currency": r.base_price_currency,
                "lead_time_days": r.lead_time_days,
                "image_url": r.image_url,
                "available": r.material.is_available,
            }
            for r in rugs
        ]
    finally:
        db.close()


@router.get("/customer/catalog/{rug_id}")
async def get_public_rug(rug_id: int):
    db = SessionLocal()
    try:
        r = db.query(RugCatalog).join(Material).filter(RugCatalog.id == rug_id).first()
        if not r:
            raise HTTPException(status_code=404, detail="Rug not found")
        return {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "weave_type": r.weave_type,
            "pile_height": r.pile_height,
            "material": r.material.name,
            "material_type": r.material.type,
            "material_color": r.material.color,
            "sizes": r.sizes,
            "base_price_per_sqm": r.base_price,
            "base_price_currency": r.base_price_currency,
            "lead_time_days": r.lead_time_days,
            "image_url": r.image_url,
            "available": r.material.is_available,
        }
    finally:
        db.close()


class EstimateRequest(BaseModel):
    size_w: float
    size_h: float
    qty: int = 1
    rush_order: bool = False


@router.post("/customer/catalog/{rug_id}/estimate")
async def estimate_rug_price(rug_id: int, body: EstimateRequest):
    db = SessionLocal()
    try:
        rug = db.query(RugCatalog).filter(RugCatalog.id == rug_id).first()
        if not rug:
            raise HTTPException(status_code=404, detail="Rug not found")
        tenant = db.query(Tenant).filter(Tenant.id == rug.tenant_id).first() if rug.tenant_id else None
        engine = QuoteEngine(db, tenant_id=rug.tenant_id)
        result = engine.calculate_quote(
            rug_id=rug.id,
            size_w=body.size_w,
            size_h=body.size_h,
            material_id=rug.material_id,
            qty=body.qty,
            rush_order=body.rush_order,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    finally:
        db.close()


@router.post("/customer/inspire")
async def inspire_match(
    image: UploadFile = File(...),
    size_w: float = Form(...),
    size_h: float = Form(...),
    qty: int = Form(1),
    budget_max: Optional[float] = Form(None),
    rush_order: bool = Form(False),
):
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {image.content_type}. Use JPEG, PNG, or WebP.")

    image_bytes = await image.read()
    if len(image_bytes) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large. Maximum size is 10 MB.")

    if size_w <= 0 or size_h <= 0:
        raise HTTPException(status_code=400, detail="Size dimensions must be greater than 0.")
    if qty < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1.")

    try:
        result = analyze_and_match(
            image_bytes=image_bytes,
            media_type=image.content_type,
            size_w=size_w,
            size_h=size_h,
            qty=qty,
            budget_max=budget_max,
            rush_order=rush_order,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/customer/rooms")
async def get_rooms():
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "style": r["style"],
            "thumbnail_url": r["thumbnail_url"],
        }
        for r in ROOM_PRESETS
    ]


class RoomInspireRequest(BaseModel):
    room_id: str
    size_w: float
    size_h: float
    qty: int = 1
    budget_max: Optional[float] = None
    rush_order: bool = False


@router.post("/customer/inspire-room")
async def inspire_from_room(body: RoomInspireRequest):
    room = ROOM_PRESETS_BY_ID.get(body.room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room '{body.room_id}' not found.")
    if body.size_w <= 0 or body.size_h <= 0:
        raise HTTPException(status_code=400, detail="Size dimensions must be greater than 0.")
    if body.qty < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1.")

    try:
        result = analyze_and_match_room(
            room_id=room["id"],
            room_name=room["name"],
            room_style=room["style"],
            image_url=room["image_url"],
            floor_region=room["floor_region"],
            size_w=body.size_w,
            size_h=body.size_h,
            qty=body.qty,
            budget_max=body.budget_max,
            rush_order=body.rush_order,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


class QuoteRequestBody(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    rug_id: int
    size_w: float
    size_h: float
    qty: int = 1
    rush_order: bool = False
    notes: Optional[str] = None


@router.post("/customer/request-quote")
async def request_quote(body: QuoteRequestBody):
    db = SessionLocal()
    try:
        rug = db.query(RugCatalog).filter(RugCatalog.id == body.rug_id).first()
        if not rug:
            raise HTTPException(status_code=404, detail="Rug not found")

        tid = rug.tenant_id
        tenant = db.query(Tenant).filter(Tenant.id == tid).first()

        # Find or create customer scoped to this tenant
        customer = db.query(Customer).filter(
            Customer.email == body.email,
            Customer.tenant_id == tid,
        ).first()
        if not customer:
            customer = Customer(
                tenant_id=tid,
                name=body.name,
                email=body.email,
                phone=body.phone,
                company=body.company,
            )
            db.add(customer)
            db.flush()

        # Deduplicate: return existing open quote for same customer + rug + dimensions
        existing = db.query(Quote).filter(
            Quote.customer_id == customer.id,
            Quote.rug_catalog_id == body.rug_id,
            Quote.custom_size_w == body.size_w,
            Quote.custom_size_h == body.size_h,
            Quote.qty == body.qty,
            Quote.rush_order == body.rush_order,
            Quote.status.in_(["draft", "sent"]),
        ).first()

        if existing:
            db.close()
            return {
                "quote_id": existing.id,
                "customer_name": customer.name,
                "rug_name": rug.name,
                "final_price": existing.final_price,
                "size": f"{body.size_w}m × {body.size_h}m",
                "lead_time_days": rug.lead_time_days,
                "message": "You already have an open quote for this rug and size.",
            }

        # Calculate real price
        engine = QuoteEngine(db, tenant_id=tid)
        calc = engine.calculate_quote(
            rug_id=body.rug_id,
            size_w=body.size_w,
            size_h=body.size_h,
            material_id=rug.material_id,
            qty=body.qty,
            rush_order=body.rush_order,
        )

        quote = Quote(
            tenant_id=tid,
            customer_id=customer.id,
            rug_catalog_id=body.rug_id,
            material_id=rug.material_id,
            custom_size_w=body.size_w,
            custom_size_h=body.size_h,
            qty=body.qty,
            base_price=calc.get("subtotal"),
            final_price=calc.get("final_price"),
            price_currency=calc.get("price_currency") or (tenant.base_currency if tenant else "INR"),
            margin_pct=calc.get("profit_margin_pct"),
            gst_pct=calc.get("gst_pct"),
            rush_order=body.rush_order,
            status="draft",
            notes=body.notes,
        )
        db.add(quote)
        db.commit()
        db.refresh(quote)

        return {
            "quote_id": quote.id,
            "customer_name": customer.name,
            "rug_name": rug.name,
            "final_price": quote.final_price,
            "size": f"{body.size_w}m × {body.size_h}m",
            "lead_time_days": rug.lead_time_days,
            "message": "Your quote request has been received. Our team will contact you shortly to confirm details.",
        }
    finally:
        db.close()


# ── Customer AI Chat ─────────────────────────────────────────────────────────

class CustomerChatMessage(BaseModel):
    role: str
    content: str

# ── Customer Checkout ─────────────────────────────────────────────────────────

class CheckoutBody(BaseModel):
    rug_id: int
    size_w: float
    size_h: float
    qty: int = 1
    rush_order: bool = False
    notes: Optional[str] = None
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    shipping_address: str


@router.post("/customer/checkout")
async def customer_checkout(body: CheckoutBody):
    from datetime import datetime, timedelta
    db = SessionLocal()
    try:
        rug = db.query(RugCatalog).filter(RugCatalog.id == body.rug_id).first()
        if not rug:
            raise HTTPException(status_code=404, detail="Rug not found")

        tid = rug.tenant_id
        tenant = db.query(Tenant).filter(Tenant.id == tid).first()

        material = db.query(Material).filter(Material.id == rug.material_id).first()
        if not material or not material.is_available:
            raise HTTPException(status_code=400, detail="Material is not available")

        # Find or create customer
        customer = db.query(Customer).filter(
            Customer.email == body.email,
            Customer.tenant_id == tid,
        ).first()
        if not customer:
            customer = Customer(
                tenant_id=tid,
                name=body.name,
                email=body.email,
                phone=body.phone,
                company=body.company,
            )
            db.add(customer)
            db.flush()

        # Calculate price
        engine = QuoteEngine(db, tenant_id=tid)
        calc = engine.calculate_quote(
            rug_id=body.rug_id,
            size_w=body.size_w,
            size_h=body.size_h,
            material_id=rug.material_id,
            qty=body.qty,
            rush_order=body.rush_order,
        )

        if not calc.get("moq_met", True):
            raise HTTPException(status_code=400, detail=calc.get("moq_message", "Minimum order quantity not met"))

        total_sqm = body.size_w * body.size_h * body.qty
        if material.stock_meters < total_sqm:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Available: {material.stock_meters:.1f} sqm, Required: {total_sqm:.1f} sqm",
            )

        # Create accepted quote — snapshot margin and GST at time of order
        quote = Quote(
            tenant_id=tid,
            customer_id=customer.id,
            rug_catalog_id=body.rug_id,
            material_id=rug.material_id,
            custom_size_w=body.size_w,
            custom_size_h=body.size_h,
            qty=body.qty,
            base_price=calc.get("subtotal"),
            final_price=calc.get("final_price"),
            price_currency=calc.get("price_currency") or (tenant.base_currency if tenant else "INR"),
            margin_pct=calc.get("profit_margin_pct"),
            gst_pct=calc.get("gst_pct"),
            rush_order=body.rush_order,
            status="accepted",
            notes=body.notes,
        )
        db.add(quote)
        db.flush()

        # Estimate delivery
        lead_days = rug.lead_time_days or 21
        if body.rush_order:
            lead_days = max(7, lead_days // 2)
        estimated_delivery = datetime.utcnow() + timedelta(days=lead_days)

        order = Order(
            tenant_id=tid,
            quote_id=quote.id,
            status="pending",
            shipping_address=body.shipping_address,
            estimated_delivery=estimated_delivery,
        )
        db.add(order)
        db.flush()

        # Deduct inventory
        material.stock_meters = material.stock_meters - total_sqm
        tx = InventoryTransaction(
            tenant_id=tid,
            material_id=material.id,
            qty_change=-total_sqm,
            transaction_type="used",
            notes=f"Order #{order.id} — {rug.name} {body.size_w}×{body.size_h}m ×{body.qty}",
        )
        db.add(tx)
        db.commit()

        return {
            "order_id": order.id,
            "quote_id": quote.id,
            "rug_name": rug.name,
            "size": f"{body.size_w}m × {body.size_h}m",
            "qty": body.qty,
            "pre_gst_price": calc.get("pre_gst_price"),
            "gst_pct": calc.get("gst_pct", 12.0),
            "gst_amount": calc.get("gst_amount"),
            "final_price": quote.final_price,
            "price_currency": quote.price_currency,
            "status": order.status,
            "estimated_delivery": estimated_delivery.strftime("%Y-%m-%d"),
            "lead_time_days": lead_days,
            "customer_name": customer.name,
            "shipping_address": body.shipping_address,
        }
    finally:
        db.close()


# ── Customer My Orders ────────────────────────────────────────────────────────

@router.get("/customer/orders")
async def get_customer_orders(email: str):
    db = SessionLocal()
    try:
        customer = db.query(Customer).filter(Customer.email == email).first()
        if not customer:
            return []
        orders = (
            db.query(Order)
            .join(Quote, Order.quote_id == Quote.id)
            .filter(Quote.customer_id == customer.id)
            .order_by(Order.created_at.desc())
            .all()
        )
        result = []
        for o in orders:
            q = o.quote
            rug = q.rug_catalog if q else None
            result.append({
                "order_id": o.id,
                "quote_id": q.id if q else None,
                "status": o.status,
                "rug_name": rug.name if rug else "Custom Order",
                "size": f"{q.custom_size_w:g}m × {q.custom_size_h:g}m" if q and q.custom_size_w and q.custom_size_h else "—",
                "qty": q.qty if q else 1,
                "final_price": q.final_price if q else None,
                "price_currency": q.price_currency if q else "INR",
                "rush_order": q.rush_order if q else False,
                "shipping_address": o.shipping_address,
                "estimated_delivery": o.estimated_delivery.strftime("%Y-%m-%d") if o.estimated_delivery else None,
                "created_at": o.created_at.strftime("%Y-%m-%d") if o.created_at else None,
            })
        return result
    finally:
        db.close()


class CustomerChatRequest(BaseModel):
    messages: List[CustomerChatMessage]
    session_id: Optional[str] = None


@router.post("/customer/chat")
async def customer_chat(body: CustomerChatRequest):
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured. Please add ANTHROPIC_API_KEY to the backend .env file.")

    db = SessionLocal()
    try:
        rugs = db.query(RugCatalog).join(Material).all()
        catalog_lines = [
            f"• {r.name}: material={r.material.name}, weave={r.weave_type}, "
            f"pile={r.pile_height}, lead time={r.lead_time_days} days, "
            f"sizes available={', '.join(r.sizes)}. {r.description or ''}"
            for r in rugs
        ]
        catalog_text = "\n".join(catalog_lines)
    finally:
        db.close()

    system_prompt = f"""You are a friendly rug design consultant for LoomCraft AI, a custom rug manufacturing studio.
Your role is to help customers choose the perfect rug for their space.

Our current collection:
{catalog_text}

Guidelines:
- Help customers choose rugs based on room type, style, traffic level, and budget
- Explain materials: wool (durable, warm, natural) · silk (luxurious, delicate, lustrous) · cotton (casual, easy-care) · synthetic (budget, indoor/outdoor, stain-resistant)
- Weave types: hand-knotted (most durable, heirloom quality) · hand-tufted (soft, good value) · flatweave (thin, reversible, easy-clean) · machine-woven (affordable, fast)
- Pile height: high pile = cozy/bedroom; low pile = easy-clean/high-traffic; flat = minimalist/dining
- Sizing guides: living room — front legs of sofa on rug, or all legs on; dining — rug extends 60 cm beyond table on all sides; bedroom — extends 45–60 cm beyond bed sides
- Lead times vary: machine-woven 7 days, hand-tufted 21–30 days, hand-knotted 35–60 days
- When asked for a specific price, encourage the customer to use the "Find Your Perfect Rug" AI room-matching tool on this page or click "Request Formal Quote" on any matched rug — this gives them an accurate price for their exact size
- Keep answers concise (2–4 sentences). End with one helpful follow-up question to understand their needs better
- Do NOT reveal internal material costs or supplier names"""

    client = _anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=system_prompt,
            messages=messages,
        )
        return {
            "response": response.content[0].text,
            "session_id": body.session_id or str(uuid.uuid4()),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


# ── Virtual Try-On endpoint ────────────────────────────────────────────────────

@router.get("/customer/room-preview")
async def get_room_preview(rug_id: Optional[int] = None, opacity: float = 0.90):
    """
    Returns a JPEG image of the fixed luxury living room.
    If rug_id is provided, the corresponding rug is perspective-composited onto the floor.
    """
    opacity = max(0.3, min(1.0, opacity))

    try:
        if rug_id is None:
            jpeg = room_composer.room_only()
        else:
            db = SessionLocal()
            try:
                rug = db.query(RugCatalog).filter(RugCatalog.id == rug_id).first()
                if not rug:
                    raise HTTPException(status_code=404, detail="Rug not found")
                if not rug.image_url:
                    jpeg = room_composer.room_only()
                else:
                    jpeg = room_composer.compose(rug.image_url, opacity)
            finally:
                db.close()

        return StreamingResponse(
            io.BytesIO(jpeg),
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=3600"},
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {e}")


# ── Customer Quote Management (authenticated) ─────────────────────────────────

@router.get("/customer/quotes")
def get_customer_quotes(
    rug_id: Optional[int] = None,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    q = db.query(Quote).filter(Quote.customer_id == current_customer.id)
    if rug_id is not None:
        q = q.filter(Quote.rug_catalog_id == rug_id)
    quotes = q.order_by(Quote.created_at.desc()).all()
    result = []
    for q in quotes:
        rug = q.rug_catalog
        result.append({
            "quote_id": q.id,
            "status": q.status,
            "rug_id": q.rug_catalog_id,
            "rug_name": rug.name if rug else "Custom Order",
            "rug_image_url": rug.image_url if rug else None,
            "size": (
                f"{q.custom_size_w:g}m × {q.custom_size_h:g}m"
                if q.custom_size_w and q.custom_size_h else "—"
            ),
            "size_w": q.custom_size_w,
            "size_h": q.custom_size_h,
            "qty": q.qty,
            "final_price": q.final_price,
            "price_currency": q.price_currency or "INR",
            "gst_pct": q.gst_pct,
            "rush_order": q.rush_order,
            "notes": q.notes,
            "vendor_notes": q.vendor_notes,
            "customer_response_notes": q.customer_response_notes,
            "created_at": q.created_at.strftime("%Y-%m-%d") if q.created_at else None,
            "has_order": q.order is not None,
            "order_id": q.order.id if q.order else None,
            "lead_time_days": rug.lead_time_days if rug else None,
            "review_request_count": int(q.review_request_count or 0),
        })
    return result


MAX_REVIEW_REQUESTS = 5

@router.patch("/customer/quotes/{quote_id}/request-review")
def request_review(
    quote_id: int,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.customer_id == current_customer.id,
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if quote.status != "draft":
        raise HTTPException(status_code=400, detail="Review can only be requested while the quote is under review.")

    count = int(quote.review_request_count or 0)
    if count >= MAX_REVIEW_REQUESTS:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum of {MAX_REVIEW_REQUESTS} review requests reached for this quote.",
        )

    quote.review_request_count = count + 1
    db.commit()

    # Notify vendor by email (best-effort)
    try:
        from app.api.routes.quotes import _send_quote_notification
        tenant = db.query(Tenant).filter(Tenant.id == quote.tenant_id).first()
        if tenant:
            _notify_vendor_review_request(quote, tenant, current_customer, count + 1)
    except Exception:
        pass

    return {
        "quote_id": quote.id,
        "review_request_count": count + 1,
        "remaining": MAX_REVIEW_REQUESTS - (count + 1),
        "message": f"Review request #{count + 1} sent to our team. We'll get back to you shortly.",
    }


def _notify_vendor_review_request(quote: Quote, tenant, customer: Customer, request_num: int) -> None:
    from app.core.config import settings
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    smtp_host = settings.SMTP_HOST
    smtp_user = settings.SMTP_USERNAME
    smtp_pass = settings.SMTP_PASSWORD
    smtp_from = settings.SMTP_FROM_EMAIL
    if not smtp_host or not smtp_user or not smtp_pass or not smtp_from:
        return

    rug_name = str(quote.rug_catalog.name) if quote.rug_catalog else f"Quote #{quote.id}"
    customer_name = str(customer.name)
    tenant_name = str(tenant.name)
    to_email = smtp_from  # notify the vendor (from address = vendor inbox)

    subject = f"[Review Request #{request_num}] {customer_name} — {rug_name}"
    body = (
        f"Hello {tenant_name} team,\n\n"
        f"{customer_name} ({customer.email}) has requested a review of Quote #{quote.id}.\n\n"
        f"Rug: {rug_name}\n"
        f"Size: {quote.custom_size_w}m × {quote.custom_size_h}m\n"
        f"Status: {quote.status}\n"
        f"Review Request: #{request_num} of {MAX_REVIEW_REQUESTS}\n\n"
        f"Please log in to the admin panel to review and update the quote.\n\n"
        f"— LoomCraft System"
    )

    msg = MIMEMultipart()
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{smtp_from}>"
    msg["To"] = to_email
    msg["Reply-To"] = str(customer.email)
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(smtp_host, settings.SMTP_PORT) as smtp:
            smtp.ehlo(); smtp.starttls()
            smtp.login(smtp_user, smtp_pass)
            smtp.send_message(msg)
    except Exception:
        pass


@router.patch("/customer/quotes/{quote_id}/accept")
def accept_quote(
    quote_id: int,
    body: QuoteCustomerRespondRequest,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    from datetime import datetime, timedelta
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.customer_id == current_customer.id,
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if quote.status != "sent":
        raise HTTPException(status_code=400, detail=f"Quote cannot be accepted in its current status: '{quote.status}'")
    if quote.order:
        raise HTTPException(status_code=400, detail="An order already exists for this quote")

    quote.status = "accepted"
    if body.customer_response_notes:
        quote.customer_response_notes = body.customer_response_notes

    rug = quote.rug_catalog
    lead_days = (rug.lead_time_days if rug else 21) or 21
    if quote.rush_order:
        lead_days = max(7, lead_days // 2)

    order = Order(
        tenant_id=quote.tenant_id,
        quote_id=quote.id,
        status="pending",
        estimated_delivery=datetime.utcnow() + timedelta(days=lead_days),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return {
        "message": "Quote accepted. Your order has been placed.",
        "order_id": order.id,
        "quote_id": quote.id,
        "estimated_delivery": order.estimated_delivery.strftime("%Y-%m-%d") if order.estimated_delivery else None,
    }


@router.patch("/customer/quotes/{quote_id}/reject")
def reject_quote(
    quote_id: int,
    body: QuoteCustomerRespondRequest,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.customer_id == current_customer.id,
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if quote.status != "sent":
        raise HTTPException(status_code=400, detail=f"Quote cannot be rejected in its current status: '{quote.status}'")

    quote.status = "rejected"
    if body.customer_response_notes:
        quote.customer_response_notes = body.customer_response_notes
    db.commit()
    return {"message": "Quote rejected.", "quote_id": quote.id}


# ── Customer Invoice Download (authenticated) ─────────────────────────────────

@router.get("/customer/orders/{order_id}/invoice")
def download_customer_invoice(
    order_id: int,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .join(Quote, Order.quote_id == Quote.id)
        .filter(Order.id == order_id, Quote.customer_id == current_customer.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    quote = order.quote
    if not quote or not quote.final_price or not quote.custom_size_w or not quote.custom_size_h:
        raise HTTPException(status_code=422, detail="Order is missing required details to generate an invoice.")

    rug = quote.rug_catalog
    if not rug:
        raise HTTPException(status_code=422, detail="Order has no associated rug.")

    tenant = db.query(Tenant).filter(Tenant.id == quote.tenant_id).first()
    size_sqm = round(quote.custom_size_w * quote.custom_size_h, 4)
    qty = quote.qty or 1
    total_sqm = size_sqm * qty
    invoice_currency = tenant.currency if tenant else "INR"
    rate_per_sqm = round(quote.final_price / total_sqm, 2) if total_sqm > 0 else 0.0
    size_desc = f"{quote.custom_size_w}×{quote.custom_size_h}m ({size_sqm:.2f}m²)"

    pdf_bytes = generate_invoice_pdf(
        quote_id=quote.id,
        invoice_type="proforma",
        supplier_name=tenant.name if tenant else "LoomCraft",
        supplier_address=tenant.address if tenant else "India",
        supplier_gstin=tenant.gstin if tenant else None,
        supplier_state_code=tenant.state_code if tenant else None,
        lut_number=tenant.lut_number if tenant else None,
        buyer_name=current_customer.name,
        buyer_company=current_customer.company,
        buyer_address=current_customer.address,
        buyer_gstin=current_customer.gstin,
        buyer_state_code=current_customer.state_code,
        is_export_buyer=current_customer.is_export_buyer or False,
        rug_name=rug.name,
        hsn_code=rug.hsn_code or "5703",
        size_desc=size_desc,
        qty=qty,
        rate_per_sqm=rate_per_sqm,
        size_sqm=size_sqm,
        currency=invoice_currency,
    )

    filename = f"invoice-order-{order_id:04d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )