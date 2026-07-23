import math
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Query, Request
from fastapi.responses import StreamingResponse, FileResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import update as sa_update
from typing import Optional, List
from pydantic import Field, EmailStr
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
    shape:     str                  = Form("rect"),
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

    # Auto-crop background padding so the rug pattern fills the full warp boundary.
    # Sample the 4 corners to detect the background colour, then find the
    # bounding box of content that differs from it.
    def crop_to_content(img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
        corners = [gray[0, 0], gray[0, -1], gray[-1, 0], gray[-1, -1]]
        bg = float(np.median(corners))
        # Build a mask of pixels that differ from background by > threshold
        diff = np.abs(gray - bg)
        thresh = 18.0  # tolerance — keeps subtle textures, removes plain bg
        content = (diff > thresh).astype(np.uint8) * 255
        # Clean up noise
        content = cv2.morphologyEx(content, cv2.MORPH_OPEN,
                                   np.ones((5, 5), np.uint8))
        coords = cv2.findNonZero(content)
        if coords is None:
            return img                        # can't detect content, return as-is
        x, y, cw, ch = cv2.boundingRect(coords)
        # Add 1 % padding so edges aren't clipped
        pad_x = max(1, int(cw * 0.01))
        pad_y = max(1, int(ch * 0.01))
        x  = max(0, x  - pad_x);  y  = max(0, y  - pad_y)
        cw = min(img.shape[1] - x, cw + 2 * pad_x)
        ch = min(img.shape[0] - y, ch + 2 * pad_y)
        cropped = img[y:y+ch, x:x+cw]
        # Only use crop if it meaningfully reduces the image (> 3 % gain each axis)
        if cw < img.shape[1] * 0.97 or ch < img.shape[0] * 0.97:
            return cropped
        return img

    rug = crop_to_content(rug)

    # Resize rug to a standard rectangle
    rug_width, rug_height = 1200, 800
    rug = cv2.resize(rug, (rug_width, rug_height))

    h, w = room.shape[:2]

    pts_src = np.array([
        [0,         0],
        [rug_width, 0],
        [rug_width, rug_height],
        [0,         rug_height],
    ], dtype=np.float32)
    pts_dst    = np.array(corner_points[:4], dtype=np.float32)
    matrix     = cv2.getPerspectiveTransform(pts_src, pts_dst)
    warped_rug = cv2.warpPerspective(rug, matrix, (w, h))

    # Build flat mask in rug coordinate space then warp it
    flat_mask = np.zeros((rug_height, rug_width), dtype=np.uint8)
    if shape == "circle":
        cx, cy = rug_width // 2, rug_height // 2
        cv2.ellipse(flat_mask, (cx, cy), (cx - 10, cy - 10), 0, 0, 360, 255, -1)
    else:
        flat_mask[:] = 255

    mask = cv2.warpPerspective(flat_mask, matrix, (w, h))
    mask = cv2.GaussianBlur(mask, (31, 31), 15)

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

    # Shadow just outside the rug boundary
    shadow     = np.zeros_like(room)
    shadow_pts = np.array(corner_points, dtype=np.int32)
    cv2.fillConvexPoly(shadow, shadow_pts, (40, 40, 40))
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


@router.get("/customer/settings")
async def get_public_settings():
    """Public, unauthenticated feature flags the storefront needs before any customer session exists."""
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        return {
            "ai_assistant_enabled": tenant.ai_assistant_customer_enabled if tenant else True,
            "business_name": tenant.name if tenant else None,
            "logo_url": tenant.logo_url if tenant else None,
        }
    finally:
        db.close()


@router.get("/customer/showcase-videos")
async def get_public_showcase_videos():
    """Public, unauthenticated craftsmanship videos shown on the storefront homepage."""
    from app.models.models import ShowcaseVideo
    db = SessionLocal()
    try:
        videos = (
            db.query(ShowcaseVideo)
            .filter(ShowcaseVideo.is_active == True)
            .order_by(ShowcaseVideo.sort_order.asc(), ShowcaseVideo.id.asc())
            .all()
        )
        return [
            {
                "id": v.id,
                "title": v.title,
                "description": v.description,
                "video_url": v.video_url,
                "poster_url": v.poster_url,
                "is_intro": v.is_intro,
            }
            for v in videos
        ]
    finally:
        db.close()


@router.get("/customer/catalog")
async def get_public_catalog(sort: str = Query("newest")):
    from sqlalchemy import func as sqlfunc
    db = SessionLocal()
    try:
        q = db.query(RugCatalog).join(Material)
        if sort == "popular":
            from app.models.models import Quote as QuoteModel
            q = (
                q.outerjoin(QuoteModel, QuoteModel.rug_catalog_id == RugCatalog.id)
                .group_by(RugCatalog.id)
                .order_by(sqlfunc.count(QuoteModel.id).desc())
            )
        else:
            q = q.order_by(RugCatalog.id.desc())
        rugs = q.all()
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
    size_w: float = Field(..., gt=0, le=50)
    size_h: float = Field(..., gt=0, le=50)
    qty: int = Field(1, ge=1, le=10000)
    rush_order: bool = False
    shape: str = "rect"


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
            shape=body.shape,
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
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    company: Optional[str] = Field(None, max_length=200)
    rug_id: int
    size_w: float = Field(..., gt=0, le=50)
    size_h: float = Field(..., gt=0, le=50)
    qty: int = Field(1, ge=1, le=10000)
    rush_order: bool = False
    shape: str = "rect"
    notes: Optional[str] = Field(None, max_length=2000)


@router.post("/customer/request-quote")
async def request_quote(body: QuoteRequestBody, request: Request):
    db = SessionLocal()
    try:
        rug = db.query(RugCatalog).filter(RugCatalog.id == body.rug_id).first()
        if not rug:
            raise HTTPException(status_code=404, detail="Rug not found")

        tid = rug.tenant_id
        tenant = db.query(Tenant).filter(Tenant.id == tid).first()

        # Prefer authenticated customer so quotes appear in My Quotes
        customer = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from jose import jwt as _jwt, JWTError
                token = auth_header.split(" ")[1]
                payload = _jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
                if payload.get("type") == "customer":
                    customer = db.query(Customer).filter(
                        Customer.id == int(payload["sub"])
                    ).first()
            except Exception:
                pass

        # Fall back to email lookup / create for unauthenticated requests
        if not customer:
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
        shape = getattr(body, "shape", "rect") or "rect"
        engine = QuoteEngine(db, tenant_id=tid)
        calc = engine.calculate_quote(
            rug_id=body.rug_id,
            size_w=body.size_w,
            size_h=body.size_h,
            material_id=rug.material_id,
            qty=body.qty,
            rush_order=body.rush_order,
            shape=shape,
        )

        quote = Quote(
            tenant_id=tid,
            customer_id=customer.id,
            rug_catalog_id=body.rug_id,
            material_id=rug.material_id,
            custom_size_w=body.size_w,
            custom_size_h=body.size_h,
            rug_shape=shape,
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

        size_display = f"⌀ {body.size_w}m" if shape == "circle" else f"{body.size_w}m × {body.size_h}m"

        # Notify vendor by email (best-effort)
        try:
            if tenant:
                _notify_vendor_quote_request(db, quote, tenant, customer, rug, size_display)
        except Exception:
            pass

        return {
            "quote_id": quote.id,
            "customer_name": customer.name,
            "rug_name": rug.name,
            "final_price": quote.final_price,
            "size": size_display,
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

class OrderDetailsBase(BaseModel):
    rug_id: int
    size_w: float = Field(..., gt=0, le=50)
    size_h: float = Field(..., gt=0, le=50)
    qty: int = Field(1, ge=1, le=10000)
    rush_order: bool = False
    shape: str = "rect"
    notes: Optional[str] = Field(None, max_length=2000)
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    company: Optional[str] = Field(None, max_length=200)
    shipping_address: str = Field(..., min_length=5, max_length=1000)


@router.post("/customer/checkout/create-payment-order")
async def create_payment_order(body: OrderDetailsBase):
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment gateway not configured.")
    import razorpay as _rzp
    db = SessionLocal()
    try:
        rug = db.query(RugCatalog).filter(RugCatalog.id == body.rug_id).first()
        if not rug:
            raise HTTPException(status_code=404, detail="Rug not found")
        tid = rug.tenant_id
        material = db.query(Material).filter(Material.id == rug.material_id).first()
        if not material or not material.is_available:
            raise HTTPException(status_code=400, detail="Material is not available")
        total_sqm = body.size_w * body.size_h * body.qty
        if material.stock_meters < total_sqm:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Available: {material.stock_meters:.1f} sqm, Required: {total_sqm:.1f} sqm",
            )
        engine = QuoteEngine(db, tenant_id=tid)
        calc = engine.calculate_quote(
            rug_id=body.rug_id,
            size_w=body.size_w,
            size_h=body.size_h,
            material_id=rug.material_id,
            qty=body.qty,
            rush_order=body.rush_order,
            shape=getattr(body, "shape", "rect") or "rect",
        )
        if "error" in calc:
            raise HTTPException(status_code=400, detail=calc["error"])

        final_price = calc["final_price"]
        currency = calc.get("price_currency") or "INR"
        amount_smallest = int(round(final_price * 100))  # paise for INR

        client = _rzp.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        rzp_order = client.order.create({
            "amount": amount_smallest,
            "currency": currency,
            "receipt": f"rcpt_{uuid.uuid4().hex[:16]}",
            "payment_capture": 1,
        })

        lead_days = rug.lead_time_days or 21
        if body.rush_order:
            lead_days = max(7, lead_days // 2)

        return {
            "razorpay_order_id": rzp_order["id"],
            "amount_paise": amount_smallest,
            "currency": currency,
            "key_id": settings.RAZORPAY_KEY_ID,
            "final_price": final_price,
            "pre_gst_price": calc.get("pre_gst_price"),
            "gst_pct": calc.get("gst_pct"),
            "gst_amount": calc.get("gst_amount"),
            "price_currency": currency,
            "rug_name": rug.name,
            "estimated_days": lead_days,
        }
    finally:
        db.close()


class VerifyPaymentBody(OrderDetailsBase):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


@router.post("/customer/checkout/verify-payment")
async def verify_payment(body: VerifyPaymentBody, request: Request):
    from datetime import datetime, timedelta
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment gateway not configured.")
    import razorpay as _rzp
    client = _rzp.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": body.razorpay_order_id,
            "razorpay_payment_id": body.razorpay_payment_id,
            "razorpay_signature": body.razorpay_signature,
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Payment verification failed. Please contact support.")

    db = SessionLocal()
    try:
        rug = db.query(RugCatalog).filter(RugCatalog.id == body.rug_id).first()
        if not rug:
            raise HTTPException(status_code=404, detail="Rug not found")
        tid = rug.tenant_id
        tenant = db.query(Tenant).filter(Tenant.id == tid).first()
        material = db.query(Material).filter(Material.id == rug.material_id).first()
        if not material or not material.is_available:
            raise HTTPException(status_code=400, detail="Material unavailable")

        # Prefer authenticated customer so orders appear in My Orders
        customer = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from jose import jwt as _jwt
                payload = _jwt.decode(auth_header.split(" ")[1], settings.JWT_SECRET, algorithms=["HS256"])
                if payload.get("type") == "customer":
                    customer = db.query(Customer).filter(Customer.id == int(payload["sub"])).first()
            except Exception:
                pass
        if not customer:
            customer = db.query(Customer).filter(
                Customer.email == body.email, Customer.tenant_id == tid,
            ).first()
        if not customer:
            customer = Customer(
                tenant_id=tid, name=body.name, email=body.email,
                phone=body.phone, company=body.company,
            )
            db.add(customer)
            db.flush()

        shape = getattr(body, "shape", "rect") or "rect"
        engine = QuoteEngine(db, tenant_id=tid)
        calc = engine.calculate_quote(
            rug_id=body.rug_id, size_w=body.size_w, size_h=body.size_h,
            material_id=rug.material_id, qty=body.qty, rush_order=body.rush_order,
            shape=shape,
        )
        total_sqm = body.size_w * body.size_h * body.qty  # bounding box for stock deduction

        # Atomic check-and-deduct — prevents oversell under concurrent orders
        deducted = db.execute(
            sa_update(Material)
            .where(Material.id == rug.material_id, Material.stock_meters >= total_sqm)
            .values(stock_meters=Material.stock_meters - total_sqm)
        )
        db.flush()
        if deducted.rowcount == 0:
            raise HTTPException(status_code=400, detail="Insufficient stock — another order may have just reserved this material.")

        quote = Quote(
            tenant_id=tid, customer_id=customer.id, rug_catalog_id=body.rug_id,
            material_id=rug.material_id, custom_size_w=body.size_w, custom_size_h=body.size_h,
            rug_shape=shape,
            qty=body.qty, base_price=calc.get("subtotal"), final_price=calc.get("final_price"),
            price_currency=calc.get("price_currency") or (tenant.base_currency if tenant else "INR"),
            margin_pct=calc.get("profit_margin_pct"), gst_pct=calc.get("gst_pct"),
            rush_order=body.rush_order, status="accepted", notes=body.notes,
        )
        db.add(quote)
        db.flush()

        lead_days = rug.lead_time_days or 21
        if body.rush_order:
            lead_days = max(7, lead_days // 2)
        estimated_delivery = datetime.utcnow() + timedelta(days=lead_days)

        order = Order(
            tenant_id=tid, quote_id=quote.id, status="pending",
            shipping_address=body.shipping_address,
            estimated_delivery=estimated_delivery,
        )
        db.add(order)
        db.flush()

        size_display = f"⌀ {body.size_w}m" if shape == "circle" else f"{body.size_w}m × {body.size_h}m"
        db.add(InventoryTransaction(
            tenant_id=tid, material_id=material.id, qty_change=-total_sqm,
            transaction_type="used",
            notes=f"Order #{order.id} via Razorpay {body.razorpay_payment_id} — {rug.name} {size_display} ×{body.qty}",
        ))
        db.commit()

        return {
            "order_id": order.id, "quote_id": quote.id, "rug_name": rug.name,
            "size": size_display, "qty": body.qty,
            "pre_gst_price": calc.get("pre_gst_price"),
            "gst_pct": calc.get("gst_pct", 12.0), "gst_amount": calc.get("gst_amount"),
            "final_price": quote.final_price, "price_currency": quote.price_currency,
            "status": order.status,
            "estimated_delivery": estimated_delivery.strftime("%Y-%m-%d"),
            "lead_time_days": lead_days, "customer_name": customer.name,
            "shipping_address": body.shipping_address,
        }
    finally:
        db.close()


class CheckoutBody(OrderDetailsBase):
    pass  # inherits all validated fields from OrderDetailsBase


@router.post("/customer/checkout")
async def customer_checkout(body: CheckoutBody, request: Request):
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

        # Prefer authenticated customer so orders appear in My Orders
        customer = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from jose import jwt as _jwt
                payload = _jwt.decode(auth_header.split(" ")[1], settings.JWT_SECRET, algorithms=["HS256"])
                if payload.get("type") == "customer":
                    customer = db.query(Customer).filter(Customer.id == int(payload["sub"])).first()
            except Exception:
                pass
        if not customer:
            customer = db.query(Customer).filter(
                Customer.email == body.email, Customer.tenant_id == tid,
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
        shape = getattr(body, "shape", "rect") or "rect"
        engine = QuoteEngine(db, tenant_id=tid)
        calc = engine.calculate_quote(
            rug_id=body.rug_id,
            size_w=body.size_w,
            size_h=body.size_h,
            material_id=rug.material_id,
            qty=body.qty,
            rush_order=body.rush_order,
            shape=shape,
        )

        total_sqm = body.size_w * body.size_h * body.qty  # bounding box for stock deduction

        # Atomic check-and-deduct — prevents oversell under concurrent orders
        deducted = db.execute(
            sa_update(Material)
            .where(Material.id == rug.material_id, Material.stock_meters >= total_sqm)
            .values(stock_meters=Material.stock_meters - total_sqm)
        )
        db.flush()
        if deducted.rowcount == 0:
            raise HTTPException(status_code=400, detail="Insufficient stock — another order may have just reserved this material.")

        # Create accepted quote — snapshot margin and GST at time of order
        quote = Quote(
            tenant_id=tid,
            customer_id=customer.id,
            rug_catalog_id=body.rug_id,
            material_id=rug.material_id,
            custom_size_w=body.size_w,
            custom_size_h=body.size_h,
            rug_shape=shape,
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
        size_display = f"⌀ {body.size_w}m" if shape == "circle" else f"{body.size_w}m × {body.size_h}m"
        tx = InventoryTransaction(
            tenant_id=tid,
            material_id=material.id,
            qty_change=-total_sqm,
            transaction_type="used",
            notes=f"Order #{order.id} — {rug.name} {size_display} ×{body.qty}",
        )
        db.add(tx)
        db.commit()

        return {
            "order_id": order.id,
            "quote_id": quote.id,
            "rug_name": rug.name,
            "size": size_display,
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
async def get_customer_orders(
    email: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    sort_by: str = Query("date_desc"),
    size_min: Optional[float] = None,
    size_max: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    from datetime import datetime, timedelta
    db = SessionLocal()
    try:
        # Get all customer IDs with this email (handles duplicate records)
        same_email_ids = [
            c.id for c in db.query(Customer).filter(Customer.email == email).all()
        ]
        if not same_email_ids:
            return {"total": 0, "page": page, "page_size": page_size, "pages": 0, "items": []}
        base_q = (
            db.query(Order)
            .join(Quote, Order.quote_id == Quote.id)
            .filter(Quote.customer_id.in_(same_email_ids))
        )
        if status and status != 'all':
            base_q = base_q.filter(Order.status == status)
        if size_min is not None:
            base_q = base_q.filter(Quote.custom_size_w * Quote.custom_size_h >= size_min)
        if size_max is not None:
            base_q = base_q.filter(Quote.custom_size_w * Quote.custom_size_h <= size_max)
        if date_from:
            try:
                base_q = base_q.filter(Order.created_at >= datetime.strptime(date_from, "%Y-%m-%d"))
            except ValueError:
                pass
        if date_to:
            try:
                base_q = base_q.filter(Order.created_at < datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1))
            except ValueError:
                pass
        if sort_by == 'price_asc':
            order = Quote.final_price.asc()
        elif sort_by == 'price_desc':
            order = Quote.final_price.desc()
        elif sort_by == 'date_asc':
            order = Order.created_at.asc()
        else:
            order = Order.created_at.desc()
        total = base_q.count()
        orders = (
            base_q
            .order_by(order)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        result = []
        for o in orders:
            q = o.quote
            rug = q.rug_catalog if q else None
            mat = q.material if q else None
            fp = q.final_price if q else None
            gst = q.gst_pct if q else None
            pre_gst = round(fp / (1 + gst / 100), 2) if fp and gst else None
            gst_amount = round(fp - pre_gst, 2) if fp and pre_gst else None
            size_w = q.custom_size_w if q else None
            size_h = q.custom_size_h if q else None
            qty = q.qty if q else 1
            shape = (q.rug_shape or "rect") if q else "rect"
            if size_w and size_h:
                if shape == "circle":
                    import math as _math
                    size_sqm = round(_math.pi * (size_w / 2) ** 2, 4)
                elif shape == "oval":
                    import math as _math
                    size_sqm = round(_math.pi * (size_w / 2) * (size_h / 2), 4)
                else:
                    size_sqm = round(size_w * size_h, 4)
            else:
                size_sqm = None
            total_sqm = round(size_sqm * qty, 4) if size_sqm else None
            base_price = q.base_price if q else None
            price_per_piece = round(fp / qty, 2) if fp and qty else None
            base_price_per_sqm = round(base_price / total_sqm, 2) if base_price and total_sqm else None
            if size_w and size_h:
                if shape == "circle":
                    size_display = f"⌀ {size_w:g}m"
                elif shape == "oval":
                    size_display = f"{size_w:g}m × {size_h:g}m (oval)"
                else:
                    size_display = f"{size_w:g}m × {size_h:g}m"
            else:
                size_display = "—"
            result.append({
                "order_id": o.id,
                "quote_id": q.id if q else None,
                "status": o.status,
                "rug_name": rug.name if rug else "Custom Order",
                "material_name": mat.name if mat else None,
                "weave_type": rug.weave_type if rug else None,
                "rug_shape": shape,
                "size": size_display,
                "size_w": size_w,
                "size_h": size_h,
                "size_sqm": size_sqm,
                "total_sqm": total_sqm,
                "qty": qty,
                "base_price": base_price,
                "base_price_per_sqm": base_price_per_sqm,
                "price_per_piece": price_per_piece,
                "final_price": fp,
                "pre_gst_price": pre_gst,
                "gst_pct": gst,
                "gst_amount": gst_amount,
                "margin_pct": q.margin_pct if q else None,
                "price_currency": q.price_currency if q else "INR",
                "rush_order": q.rush_order if q else False,
                "manual_discount_pct": q.manual_discount_pct if q else None,
                "shipping_address": o.shipping_address,
                "estimated_delivery": o.estimated_delivery.strftime("%Y-%m-%d") if o.estimated_delivery else None,
                "created_at": o.created_at.strftime("%Y-%m-%d") if o.created_at else None,
            })
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": math.ceil(total / page_size) if total > 0 else 0,
            "items": result,
        }
    finally:
        db.close()


@router.get("/customer/orders/{order_id}/breakdown")
async def get_customer_order_breakdown(order_id: int, email: str):
    db = SessionLocal()
    try:
        same_email_ids = [
            c.id for c in db.query(Customer).filter(Customer.email == email).all()
        ]
        if not same_email_ids:
            raise HTTPException(status_code=404, detail="Order not found")
        order = (
            db.query(Order)
            .join(Quote, Order.quote_id == Quote.id)
            .filter(Order.id == order_id, Quote.customer_id.in_(same_email_ids))
            .first()
        )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        q = order.quote
        if not q or not q.rug_catalog_id or not q.material_id or not q.custom_size_w or not q.custom_size_h:
            raise HTTPException(status_code=422, detail="Order is missing required fields for calculation")
        engine = QuoteEngine(db, tenant_id=None)
        result = engine.calculate_quote(
            rug_id=q.rug_catalog_id,
            size_w=q.custom_size_w,
            size_h=q.custom_size_h,
            material_id=q.material_id,
            qty=q.qty or 1,
            rush_order=bool(q.rush_order),
            margin_override=q.margin_pct,
            gst_override=q.gst_pct,
            manual_discount_pct=q.manual_discount_pct,
            shape=q.rug_shape or "rect",
        )
        if "error" in result:
            raise HTTPException(status_code=422, detail=result["error"])
        mat = q.material
        rug = q.rug_catalog
        return {
            **result,
            "stored_final_price": q.final_price,
            "price_currency": q.price_currency or result.get("price_currency", "INR"),
            "material_name": mat.name if mat else None,
            "rug_name": rug.name if rug else "Custom Order",
            "weave_type": rug.weave_type if rug else None,
        }
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
            f"• ID {r.id} — {r.name}: material={r.material.name}, weave={r.weave_type or 'n/a'}, "
            f"pile={r.pile_height or 'n/a'}, base_price={r.base_price}/sqm, "
            f"lead_time={r.lead_time_days}d, sizes={', '.join(r.sizes) or 'custom'}. {r.description or ''}"
            for r in rugs
        ]
        catalog_text = "\n".join(catalog_lines)
    finally:
        db.close()

    system_prompt = f"""You are a friendly rug design consultant for LoomCraftRugs AI, a custom rug manufacturing studio.
Your role is to help customers choose the perfect rug and place their order seamlessly.

Our current collection (use exact IDs when calling tools):
{catalog_text}

Guidelines:
- Help customers choose rugs based on room type, style, traffic level, and budget
- Explain materials: wool (durable, warm, natural) · silk (luxurious, delicate, lustrous) · cotton (casual, easy-care) · synthetic (budget, indoor/outdoor, stain-resistant)
- Sizing guides: living room — all legs on rug; dining — 60 cm beyond table; bedroom — 45–60 cm beyond bed
- Lead times: machine-woven 7d · hand-tufted 21–30d · hand-knotted 35–60d
- When a customer has chosen a rug AND specified size/qty, use go_to_checkout to send them directly to pay
- When a customer wants a price estimate or is not ready to pay, use request_quote
- Always confirm size (width × height in metres) and quantity before calling go_to_checkout or request_quote
- Keep conversational replies concise (2–4 sentences)
- Do NOT reveal internal costs or supplier names

IMPORTANT — use provide_options whenever the customer has clear discrete choices. This applies to BOTH the checkout flow AND the quote request flow:

Rug selection (both flows):
- After recommending rugs: show each rug name as a button

Size selection (both flows):
- Show standard sizes from our catalog for that rug + "Custom size"

Quantity (both flows):
- Show "1 piece", "2 pieces", "4 pieces", "Other quantity"

Delivery type (both flows):
- Show "Standard delivery" and "Early delivery (+25% fee)"

Intent / next step — always confirm before taking action:
- If customer seems ready to order: "Proceed to checkout", "Request a quote first", "Browse more rugs"
- If customer wants a quote: "Yes, request a quote", "Actually place the order", "Change something"
- After explaining a rug: "Order this rug", "Request a quote", "See other options"

Rules:
- Max 4 options per message
- Always include an escape option like "Something else" or "Start over" when relevant
- Call provide_options in the same turn as your text reply, for EVERY question or confirmation step
- Do not call go_to_checkout or request_quote without first confirming intent via provide_options"""

    tools = [
        {
            "name": "go_to_checkout",
            "description": "Send the customer to the checkout page to pay immediately. Use this when the customer has confirmed a specific rug, size (width × height in metres), and quantity and is ready to place an order.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "rug_id":    {"type": "integer", "description": "Catalog ID of the chosen rug"},
                    "rug_name":  {"type": "string",  "description": "Name of the rug"},
                    "size_w":    {"type": "number",  "description": "Width in metres"},
                    "size_h":    {"type": "number",  "description": "Height/length in metres"},
                    "qty":       {"type": "integer", "description": "Number of pieces", "default": 1},
                    "rush_order":{"type": "boolean", "description": "True if customer needs early/priority delivery"},
                    "notes":     {"type": "string",  "description": "Special requirements mentioned by customer"},
                },
                "required": ["rug_id", "rug_name", "size_w", "size_h"],
            },
        },
        {
            "name": "request_quote",
            "description": "Send the customer to the rug detail page to request a formal quote. Use this when the customer wants a price estimate, is not ready to pay yet, or wants the vendor to review their requirements.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "rug_id":    {"type": "integer", "description": "Catalog ID of the chosen rug"},
                    "rug_name":  {"type": "string",  "description": "Name of the rug"},
                    "size_w":    {"type": "number",  "description": "Width in metres"},
                    "size_h":    {"type": "number",  "description": "Height/length in metres"},
                    "qty":       {"type": "integer", "description": "Number of pieces", "default": 1},
                    "rush_order":{"type": "boolean", "description": "True if early delivery is needed"},
                    "notes":     {"type": "string",  "description": "Special requirements"},
                },
                "required": ["rug_id", "rug_name", "size_w", "size_h"],
            },
        },
        {
            "name": "provide_options",
            "description": "Show the customer clickable quick-reply buttons so they don't have to type. Use whenever asking a question with clear discrete choices: rug selection, size, quantity, delivery type, or order confirmation. Max 4 options.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "options": {
                        "type": "array",
                        "maxItems": 4,
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string", "description": "Short button label shown to customer (2–5 words)"},
                                "value": {"type": "string", "description": "Exact message text sent when the customer clicks this button"},
                            },
                            "required": ["label", "value"],
                        },
                    },
                },
                "required": ["options"],
            },
        },
    ]

    client = _anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    session_id = body.session_id or str(uuid.uuid4())

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=768,
            system=system_prompt,
            tools=tools,
            messages=messages,
        )

        # Extract text blocks (may coexist with tool_use)
        text_blocks = [b for b in response.content if b.type == "text"]
        tool_blocks = [b for b in response.content if b.type == "tool_use"]
        reply_text = text_blocks[0].text if text_blocks else ""

        if tool_blocks:
            # provide_options may coexist with go_to_checkout / request_quote —
            # process action tools first, then options
            options_block = next((t for t in tool_blocks if t.name == "provide_options"), None)
            action_block  = next((t for t in tool_blocks if t.name in ("go_to_checkout", "request_quote")), None)

            # Return options-only turn (AI is asking a question with choices)
            if options_block and not action_block:
                raw_options = options_block.input.get("options", [])
                return {
                    "response": reply_text,
                    "options": raw_options,
                    "session_id": session_id,
                }

            # For action tools, also carry along any options if present
            tool = action_block
            inp = tool.input
            rug_id  = inp.get("rug_id")
            size_w  = float(inp.get("size_w", 0))
            size_h  = float(inp.get("size_h", 0))
            qty     = int(inp.get("qty", 1))
            rush    = bool(inp.get("rush_order", False))

            action: dict = {
                "type": "checkout" if tool.name == "go_to_checkout" else "quote",
                "rug_id":    rug_id,
                "rug_name":  inp.get("rug_name", ""),
                "size_w":    size_w,
                "size_h":    size_h,
                "qty":       qty,
                "rush_order": rush,
                "notes":     inp.get("notes"),
            }

            # For checkout: calculate real price so checkout page has accurate numbers
            if tool.name == "go_to_checkout" and rug_id and size_w and size_h:
                db2 = SessionLocal()
                try:
                    rug_rec = db2.query(RugCatalog).filter(RugCatalog.id == rug_id).first()
                    if rug_rec:
                        engine = QuoteEngine(db2, tenant_id=rug_rec.tenant_id)
                        calc = engine.calculate_quote(
                            rug_id=rug_id, size_w=size_w, size_h=size_h,
                            material_id=rug_rec.material_id, qty=qty, rush_order=rush,
                        )
                        lead_days = rug_rec.lead_time_days or 21
                        if rush:
                            lead_days = max(7, lead_days // 2)
                        action.update({
                            "estimated_price":  calc.get("final_price"),
                            "pre_gst_price":    calc.get("pre_gst_price"),
                            "gst_pct":          calc.get("gst_pct"),
                            "gst_amount":       calc.get("gst_amount"),
                            "price_currency":   calc.get("price_currency", "INR"),
                            "estimated_days":   lead_days,
                        })
                finally:
                    db2.close()

            if not reply_text:
                if tool.name == "go_to_checkout":
                    reply_text = f"I've set up checkout for the **{inp.get('rug_name')}** ({size_w}m × {size_h}m, qty {qty}). Click below to review and pay."
                else:
                    reply_text = f"I'll take you to request a quote for the **{inp.get('rug_name')}** ({size_w}m × {size_h}m)."

            extra_options = options_block.input.get("options", []) if options_block else []
            return {
                "response": reply_text,
                "session_id": session_id,
                "action": action,
                **({"options": extra_options} if extra_options else {}),
            }

        return {"response": reply_text, "session_id": session_id}

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
    status: Optional[str] = None,
    sort_by: str = Query("date_desc"),
    size_min: Optional[float] = None,
    size_max: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    from datetime import datetime, timedelta
    # Include quotes from all customer records with the same email
    # (handles duplicate records created by tenant-scoped vs auth-scoped customer creation)
    same_email_ids = [
        c.id for c in db.query(Customer).filter(Customer.email == current_customer.email).all()
    ]
    base_q = db.query(Quote).filter(Quote.customer_id.in_(same_email_ids))
    if rug_id is not None:
        base_q = base_q.filter(Quote.rug_catalog_id == rug_id)
    if status and status != 'all':
        base_q = base_q.filter(Quote.status == status)
    if size_min is not None:
        base_q = base_q.filter(Quote.custom_size_w * Quote.custom_size_h >= size_min)
    if size_max is not None:
        base_q = base_q.filter(Quote.custom_size_w * Quote.custom_size_h <= size_max)
    if date_from:
        try:
            base_q = base_q.filter(Quote.created_at >= datetime.strptime(date_from, "%Y-%m-%d"))
        except ValueError:
            pass
    if date_to:
        try:
            base_q = base_q.filter(Quote.created_at < datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1))
        except ValueError:
            pass
    total = base_q.count()
    action_needed = db.query(Quote).filter(
        Quote.customer_id.in_(same_email_ids),
        Quote.status == 'sent',
    ).count()
    if sort_by == 'price_asc':
        order = Quote.final_price.asc()
    elif sort_by == 'price_desc':
        order = Quote.final_price.desc()
    elif sort_by == 'date_asc':
        order = Quote.created_at.asc()
    else:
        order = Quote.created_at.desc()
    quotes = base_q.order_by(order).offset((page - 1) * page_size).limit(page_size).all()
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
            "base_price": q.base_price,
            "final_price": q.final_price,
            "price_currency": q.price_currency or "INR",
            "gst_pct": q.gst_pct,
            "gst_amount": round(
                q.final_price - round(q.final_price / (1 + (q.gst_pct or 0) / 100), 2), 2
            ) if q.final_price and q.gst_pct else None,
            "pre_gst_price": round(
                q.final_price / (1 + (q.gst_pct or 0) / 100), 2
            ) if q.final_price else None,
            "manual_discount_pct": q.manual_discount_pct,
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
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total > 0 else 0,
        "action_needed": action_needed,
        "items": result,
    }


MAX_REVIEW_REQUESTS = 5

@router.patch("/customer/quotes/{quote_id}/request-review")
def request_review(
    quote_id: int,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.customer_id.in_([c.id for c in db.query(Customer).filter(Customer.email == current_customer.email).all()]),
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
        tenant = db.query(Tenant).filter(Tenant.id == quote.tenant_id).first()
        if tenant:
            _notify_vendor_review_request(db, quote, tenant, current_customer, count + 1)
    except Exception:
        pass

    return {
        "quote_id": quote.id,
        "review_request_count": count + 1,
        "remaining": MAX_REVIEW_REQUESTS - (count + 1),
        "message": f"Review request #{count + 1} sent to our team. We'll get back to you shortly.",
    }


def _notify_vendor_quote_request(db: Session, quote: Quote, tenant, customer: Customer, rug: RugCatalog, size_display: str) -> None:
    from app.services import email_service

    to_email = email_service.vendor_recipient(tenant)
    if not to_email:
        return

    price_str = f"{quote.price_currency or tenant.base_currency} {quote.final_price:,.2f}" if quote.final_price is not None else "to be confirmed"
    notes_line = f"Customer notes: {quote.notes}\n" if quote.notes else ""
    phone_line = f", {customer.phone}" if customer.phone else ""

    subject, body_text, body_html = email_service.render_template(
        db, quote.tenant_id, "vendor_quote_request",
        {
            "tenant_name": tenant.name,
            "customer_name": customer.name,
            "customer_email": customer.email,
            "customer_phone_line": phone_line,
            "quote_id": quote.id,
            "rug_name": rug.name,
            "size": size_display,
            "qty": quote.qty,
            "price": price_str,
            "notes_line": notes_line,
        },
    )
    email_service.send_email(to_email, subject, body_text, body_html, reply_to=customer.email)


def _notify_vendor_review_request(db: Session, quote: Quote, tenant, customer: Customer, request_num: int) -> None:
    from app.services import email_service

    to_email = email_service.vendor_recipient(tenant)
    if not to_email:
        return

    rug_name = str(quote.rug_catalog.name) if quote.rug_catalog else f"Quote #{quote.id}"
    size_str = f"{quote.custom_size_w}m × {quote.custom_size_h}m" if quote.custom_size_w else "custom size"

    subject, body_text, body_html = email_service.render_template(
        db, quote.tenant_id, "vendor_review_request",
        {
            "tenant_name": tenant.name,
            "customer_name": customer.name,
            "customer_email": customer.email,
            "quote_id": quote.id,
            "rug_name": rug_name,
            "size": size_str,
            "status": quote.status,
            "request_num": request_num,
            "max_requests": MAX_REVIEW_REQUESTS,
        },
    )
    email_service.send_email(to_email, subject, body_text, body_html, reply_to=customer.email)


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
        Quote.customer_id.in_([c.id for c in db.query(Customer).filter(Customer.email == current_customer.email).all()]),
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

    if quote.expected_delivery_days is not None:
        lead_days = int(quote.expected_delivery_days)
    else:
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
        Quote.customer_id.in_([c.id for c in db.query(Customer).filter(Customer.email == current_customer.email).all()]),
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


class NegotiateRequest(BaseModel):
    proposed_price: Optional[float] = Field(None, gt=0)
    proposed_qty: Optional[int] = Field(None, ge=1, le=10000)
    remove_rush: Optional[bool] = None
    requested_lead_days: Optional[int] = Field(None, ge=1, le=365)
    message: str = Field("", max_length=2000)

@router.patch("/customer/quotes/{quote_id}/negotiate")
def negotiate_quote(
    quote_id: int,
    body: NegotiateRequest,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.customer_id.in_([c.id for c in db.query(Customer).filter(Customer.email == current_customer.email).all()]),
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if quote.status != "sent":
        raise HTTPException(status_code=400, detail="Can only negotiate quotes awaiting your response")

    parts = []
    if body.proposed_price is not None:
        parts.append(f"Counter-offer price: {quote.price_currency or 'INR'} {body.proposed_price:,.2f}")
    if body.proposed_qty is not None and body.proposed_qty != quote.qty:
        parts.append(f"Requested quantity: {body.proposed_qty} (was {quote.qty})")
    if body.remove_rush:
        parts.append("Remove early delivery fee — switch to standard delivery")
    if body.requested_lead_days is not None:
        parts.append(f"Requested lead time: {body.requested_lead_days} days")
    if body.message.strip():
        parts.append(body.message.strip())
    quote.customer_response_notes = " · ".join(parts) if parts else "Customer requested review"
    quote.status = "draft"   # back to vendor for review
    db.commit()
    return {"message": "Negotiation request sent to our team.", "quote_id": quote.id}


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
        supplier_name=tenant.name if tenant else "LoomCraftRugs",
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