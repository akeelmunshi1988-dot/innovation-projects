import math
import re
from datetime import datetime
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
from app.services.quote_engine import QuoteEngine, build_manual_price_result
from app.services.promo_engine import find_valid_promo, compute_discount, record_redemption, PromoError
from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.core.cache import cache_get, cache_set
from app.core.auth import get_current_customer
from app.models.models import RugCatalog, Material, Customer, Quote, Order, OrderItem, OrderStatusHistory, InventoryTransaction, Tenant, PaymentAttempt
from app.data.room_presets import ROOM_PRESETS, ROOM_PRESETS_BY_ID
from app.services import room_composer
from app.services import ai_realism
from app.services import geo_ip
from app.services.invoice_generator import generate_invoice_pdf
from app.services.size_format import fmt_dims as _fmt_dims, email_dims_display
from app.schemas.schemas import QuoteCustomerRespondRequest
from app.core.logging_config import logger
from app.api.routes.orders import _cancel_order_and_refund, _cancellation_eligibility_payload

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
_STATIC_DIR = os.path.join(_BASE, 'static')  # backend-served uploads (admin-uploaded catalog/showcase/workshop images)

def _load_rug_from_catalog(image_url: str) -> np.ndarray:
    if image_url.startswith("/static/"):
        # Admin-uploaded images (catalog, showcase, workshop) — served by the backend, not the frontend.
        path = os.path.join(_STATIC_DIR, image_url[len("/static/"):])
        img = cv2.imread(path)
        if img is None:
            raise HTTPException(status_code=404, detail=f"Rug image not found: {path}")
    elif image_url.startswith("/"):
        # Bundled demo/seed images shipped with the frontend (e.g. /rugs/rug-abstract.jpg).
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
    ai_enhance: bool                = Form(False),
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
            tenant = db.query(Tenant).first()
            rug_record = db.query(RugCatalog).filter(RugCatalog.id == rug_id, RugCatalog.tenant_id == (tenant.id if tenant else None)).first()
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

    # Auto-crop background padding so the rug pattern fills the full warp boundary,
    # and return a silhouette mask of the actual rug content alongside it. A plain
    # bounding-box crop alone still leaves background-colour pixels wherever the
    # rug isn't a perfect axis-aligned rectangle (fringe that's narrower than the
    # body, a slightly rotated studio photo, an oval rug) — those leftover pixels
    # (often black studio backdrops) then get warped straight onto the floor as
    # dark wedges. The mask lets the compositor skip exactly those pixels instead
    # of pasting the whole rectangle.
    def crop_to_content(img: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
        corners = [gray[0, 0], gray[0, -1], gray[-1, 0], gray[-1, -1]]
        bg = float(np.median(corners))
        # Build a mask of pixels that differ from background by > threshold
        diff = np.abs(gray - bg)
        thresh = 18.0  # tolerance — keeps subtle textures, removes plain bg
        content = (diff > thresh).astype(np.uint8) * 255
        # Bridge small gaps (fine dark motifs on light rugs, thin fringe threads)
        # so the silhouette is one solid blob instead of a speckled mask.
        content = cv2.morphologyEx(content, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
        content = cv2.morphologyEx(content, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))

        contours, _ = cv2.findContours(content, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return img, np.full(img.shape[:2], 255, dtype=np.uint8)  # can't detect content, use as-is
        # Largest contour only — ignores stray noise/reflections detected elsewhere in the photo
        largest = max(contours, key=cv2.contourArea)
        silhouette = np.zeros_like(content)
        cv2.drawContours(silhouette, [largest], -1, 255, thickness=cv2.FILLED)

        x, y, cw, ch = cv2.boundingRect(largest)
        # Add 1 % padding so edges aren't clipped
        pad_x = max(1, int(cw * 0.01))
        pad_y = max(1, int(ch * 0.01))
        x  = max(0, x  - pad_x);  y  = max(0, y  - pad_y)
        cw = min(img.shape[1] - x, cw + 2 * pad_x)
        ch = min(img.shape[0] - y, ch + 2 * pad_y)
        cropped = img[y:y+ch, x:x+cw]
        cropped_mask = silhouette[y:y+ch, x:x+cw]
        # Only use crop if it meaningfully reduces the image (> 3 % gain each axis)
        if cw < img.shape[1] * 0.97 or ch < img.shape[0] * 0.97:
            return cropped, cropped_mask
        return img, np.full(img.shape[:2], 255, dtype=np.uint8)

    rug, rug_content_mask = crop_to_content(rug)

    h, w = room.shape[:2]
    pts_dst = np.array(corner_points[:4], dtype=np.float32)

    # Match the rug's brightness/warmth to this exact room photo's floor lighting
    # (sampled from the marked area) before warping — the single biggest lever for
    # making the composite look placed rather than pasted on.
    rug = room_composer.match_lighting(rug, room, pts_dst, strength=0.3)

    # Size the working canvas from the rug's own aspect ratio and from how
    # large it will actually appear in the room photo, instead of a fixed
    # 1200x800 box: a fixed box either squashed non-3:2 rug photos before
    # the warp (visible pattern distortion), or forced an upscale — and
    # therefore blur — whenever the marked area on a high-res room photo
    # (phone photos are often 3000-4000px) was bigger than 1200x800.
    dst_w = max(
        float(np.linalg.norm(pts_dst[1] - pts_dst[0])),
        float(np.linalg.norm(pts_dst[2] - pts_dst[3])),
    )
    dst_h = max(
        float(np.linalg.norm(pts_dst[3] - pts_dst[0])),
        float(np.linalg.norm(pts_dst[2] - pts_dst[1])),
    )
    if shape == "circle":
        # Center-crop to a square so the circular mask sits on undistorted
        # content instead of stretching a rectangular photo — most rug
        # photography is shot with the main medallion/pattern roughly
        # centred, so this keeps whichever part of the photo the circle
        # will actually show. (A radial/polar remap was tried here first,
        # but it only reads as a "round rug" for patterns with strong
        # bilateral symmetry; on a typical dense, non-radial oriental
        # pattern it smears into an unusable swirl.)
        rh, rw = rug.shape[:2]
        side = min(rh, rw)
        y0 = (rh - side) // 2
        x0 = (rw - side) // 2
        rug = rug[y0:y0 + side, x0:x0 + side]
        rug_content_mask = rug_content_mask[y0:y0 + side, x0:x0 + side]

        diameter = int(min(max(max(dst_w, dst_h) * 1.25, side), 2400))
        resize_interp = cv2.INTER_AREA if diameter < side else cv2.INTER_LANCZOS4
        rug = cv2.resize(rug, (diameter, diameter), interpolation=resize_interp)
        rug_content_mask = cv2.resize(rug_content_mask, (diameter, diameter), interpolation=cv2.INTER_LINEAR)
        rug_width = rug_height = diameter
    else:
        src_h, src_w = rug.shape[:2]
        src_aspect = src_w / src_h

        # Supersample ~1.25x the destination footprint so the perspective warp
        # is slightly downsampling (crisp) rather than upsampling (soft); never
        # downscale below the source's own resolution; cap so a rug marked very
        # large on a huge room photo doesn't blow up processing time.
        rug_width  = int(min(max(dst_w * 1.25, src_w), 2400))
        rug_height = int(rug_width / src_aspect)

        resize_interp = cv2.INTER_AREA if rug_width < src_w else cv2.INTER_LANCZOS4
        rug = cv2.resize(rug, (rug_width, rug_height), interpolation=resize_interp)
        rug_content_mask = cv2.resize(rug_content_mask, (rug_width, rug_height), interpolation=cv2.INTER_LINEAR)

    pts_src = np.array([
        [0,         0],
        [rug_width, 0],
        [rug_width, rug_height],
        [0,         rug_height],
    ], dtype=np.float32)
    matrix     = cv2.getPerspectiveTransform(pts_src, pts_dst)
    warped_rug = cv2.warpPerspective(rug, matrix, (w, h), flags=cv2.INTER_LANCZOS4)

    # Build flat mask in rug coordinate space then warp it. Always intersect with
    # the rug's own content silhouette so any leftover studio background (black,
    # white, or otherwise) inside the crop rectangle is excluded rather than
    # painted onto the floor.
    if shape == "circle":
        flat_mask = np.zeros((rug_height, rug_width), dtype=np.uint8)
        cx, cy = rug_width // 2, rug_height // 2
        cv2.ellipse(flat_mask, (cx, cy), (cx - 10, cy - 10), 0, 0, 360, 255, -1)
        flat_mask = cv2.min(flat_mask, rug_content_mask)
    else:
        flat_mask = rug_content_mask

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

    # Optional AI realism polish pass — only touches a thin band around the rug's
    # edges (see ai_realism.py), so pattern/position from the warp above are
    # unaffected. Falls back to the OpenCV composite on any failure.
    ai_enhanced = False
    if ai_enhance and settings.OPENAI_API_KEY:
        enhanced = ai_realism.enhance_realism(final, corner_points)
        if enhanced is not None:
            final = enhanced
            ai_enhanced = True

    # Save result
    out_name = f"{uuid.uuid4()}.jpg"
    out_path = os.path.join(OUTPUT_DIR, out_name)
    cv2.imwrite(out_path, final, [cv2.IMWRITE_JPEG_QUALITY, 95])

    return {"imageUrl": f"/api/output/{out_name}", "aiEnhanced": ai_enhanced}


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
    cached = cache_get("settings")
    if cached is not None:
        return cached
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        result = {
            "ai_assistant_enabled": tenant.ai_assistant_customer_enabled if tenant else True,
            "ai_room_enhance_enabled": bool(settings.OPENAI_API_KEY),
            "business_name": tenant.name if tenant else None,
            "logo_url": tenant.logo_url if tenant else None,
            "hero_image_url": tenant.hero_image_url if tenant else None,
            "hero_eyebrow": tenant.hero_eyebrow if tenant else None,
            "hero_heading": tenant.hero_heading if tenant else None,
            "hero_cta_label": tenant.hero_cta_label if tenant else None,
            "default_size_unit": tenant.default_size_unit if tenant else "ft",
            "contact_emails": (tenant.contact_emails or []) if tenant else [],
            "contact_phones": (tenant.contact_phones or []) if tenant else [],
            "contact_address": tenant.contact_address if tenant else None,
            "contact_hours": tenant.contact_hours if tenant else None,
            "currency": tenant.currency if tenant else "INR",
            "base_currency": tenant.base_currency if tenant else "INR",
            "exchange_rates": (tenant.exchange_rates or {}) if tenant else {},
            "catalog_pdf_url": tenant.catalog_pdf_url if tenant else None,
            "certifications": (tenant.certifications or []) if tenant else [],
            "default_shipping_rate": tenant.default_shipping_rate if tenant else None,
        }
        cache_set("settings", result)
        return result
    finally:
        db.close()


@router.get("/customer/detect-country")
async def detect_country(request: Request):
    """Best-effort IP -> country guess for guests, used only to pick a sensible
    default display currency before login/checkout (never authoritative for
    pricing/GST — see geo_ip.py). Cached per-IP so repeat visits don't re-hit
    the geolocation API."""
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else None
    )
    if not ip:
        return {"country": None}

    cached = cache_get("geo_country", ip)
    if cached is not None:
        return {"country": cached}

    country = geo_ip.lookup_country(ip)
    cache_set("geo_country", country, ip)
    return {"country": country}


@router.get("/customer/showcase-videos")
async def get_public_showcase_videos():
    """Public, unauthenticated craftsmanship videos shown on the storefront homepage."""
    cached = cache_get("showcase_videos")
    if cached is not None:
        return cached
    from app.models.models import ShowcaseVideo
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        videos = (
            db.query(ShowcaseVideo)
            .filter(ShowcaseVideo.is_active == True, ShowcaseVideo.tenant_id == (tenant.id if tenant else None))
            .order_by(ShowcaseVideo.sort_order.asc(), ShowcaseVideo.id.asc())
            .all()
        )
        result = [
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
        cache_set("showcase_videos", result)
        return result
    finally:
        db.close()


@router.get("/customer/workshop-photos")
async def get_public_workshop_photos():
    """Public, unauthenticated 'Inside the Workshop' gallery shown on the storefront homepage."""
    cached = cache_get("workshop_photos")
    if cached is not None:
        return cached
    from app.models.models import WorkshopPhoto
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        photos = (
            db.query(WorkshopPhoto)
            .filter(WorkshopPhoto.is_active == True, WorkshopPhoto.tenant_id == (tenant.id if tenant else None))
            .order_by(WorkshopPhoto.sort_order.asc(), WorkshopPhoto.id.asc())
            .all()
        )
        result = [
            {
                "id": p.id,
                "caption": p.caption,
                "description": p.description,
                "image_url": p.image_url,
            }
            for p in photos
        ]
        cache_set("workshop_photos", result)
        return result
    finally:
        db.close()


@router.get("/customer/announcement-messages")
async def get_public_announcement_messages():
    """Public, unauthenticated messages for the storefront's rotating top announcement bar."""
    cached = cache_get("announcements")
    if cached is not None:
        return cached
    from app.models.models import AnnouncementMessage
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        rows = (
            db.query(AnnouncementMessage)
            .filter(AnnouncementMessage.is_active == True, AnnouncementMessage.tenant_id == (tenant.id if tenant else None))
            .order_by(AnnouncementMessage.sort_order.asc(), AnnouncementMessage.id.asc())
            .all()
        )
        result = [{"id": a.id, "text": a.text, "link_url": a.link_url} for a in rows]
        cache_set("announcements", result)
        return result
    finally:
        db.close()


@router.get("/customer/testimonials")
async def get_public_testimonials():
    """Public, unauthenticated buyer testimonials shown on the storefront homepage."""
    cached = cache_get("testimonials")
    if cached is not None:
        return cached
    from app.models.models import Testimonial
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        rows = (
            db.query(Testimonial)
            .filter(Testimonial.is_active == True, Testimonial.tenant_id == (tenant.id if tenant else None))
            .order_by(Testimonial.sort_order.asc(), Testimonial.id.asc())
            .all()
        )
        result = [
            {
                "id": t.id,
                "author_name": t.author_name,
                "author_title": t.author_title,
                "country": t.country,
                "quote": t.quote,
                "photo_url": t.photo_url,
                "rating": t.rating,
            }
            for t in rows
        ]
        cache_set("testimonials", result)
        return result
    finally:
        db.close()


@router.get("/customer/gallery-items")
async def get_public_gallery_items():
    """Public, unauthenticated project gallery shown on the storefront homepage."""
    cached = cache_get("gallery_items")
    if cached is not None:
        return cached
    from app.models.models import ProjectGalleryItem
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        rows = (
            db.query(ProjectGalleryItem)
            .filter(ProjectGalleryItem.is_active == True, ProjectGalleryItem.tenant_id == (tenant.id if tenant else None))
            .order_by(ProjectGalleryItem.sort_order.asc(), ProjectGalleryItem.id.asc())
            .all()
        )
        result = [
            {
                "id": g.id,
                "image_url": g.image_url,
                "caption": g.caption,
                "link_url": g.link_url,
            }
            for g in rows
        ]
        cache_set("gallery_items", result)
        return result
    finally:
        db.close()


class NewsletterSubscribeBody(BaseModel):
    email: EmailStr
    source: Optional[str] = None


@router.post("/customer/newsletter-subscribe")
async def subscribe_newsletter(body: NewsletterSubscribeBody):
    """Public, unauthenticated newsletter capture — footer signup form."""
    from app.models.models import NewsletterSubscriber
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        tenant_id = tenant.id if tenant else None
        existing = (
            db.query(NewsletterSubscriber)
            .filter(NewsletterSubscriber.email == body.email, NewsletterSubscriber.tenant_id == tenant_id)
            .first()
        )
        if not existing:
            db.add(NewsletterSubscriber(email=body.email, source=body.source, tenant_id=tenant_id))
            db.commit()
        return {"message": "Subscribed"}
    finally:
        db.close()


def _public_catalog_offer(rug: RugCatalog, db: Session) -> dict:
    """Calculate the admin-selected default size through the normal quote engine."""
    sizes = [size for size in (rug.sizes or []) if isinstance(size, dict) and size.get("ft")]
    default_size = next((size for size in sizes if size.get("is_default")), sizes[0] if sizes else None)
    if not default_size:
        return {"display_price": None, "default_size": None, "price_currency": None}

    try:
        width_ft, height_ft = [float(part.strip()) for part in default_size["ft"].lower().split("x")]
        calculated = QuoteEngine(db, tenant_id=rug.tenant_id).calculate_quote(
            rug_id=rug.id,
            size_w=width_ft * 0.3048,
            size_h=height_ft * 0.3048,
            material_id=rug.material_id,
            qty=1,
            rush_order=False,
            shape="rect",
        )
        price = None if "error" in calculated else calculated.get("final_price")
        price_currency = calculated.get("price_currency")
    except (TypeError, ValueError):
        price = None
        price_currency = None
    public_size = {"ft": default_size["ft"], "cm": default_size.get("cm")}
    return {"display_price": price, "default_size": public_size, "price_currency": price_currency}


def _public_catalog_sizes(rug: RugCatalog) -> list[dict]:
    return [
        {"ft": size.get("ft"), "cm": size.get("cm")}
        for size in (rug.sizes or [])
        if isinstance(size, dict) and size.get("ft")
    ]


@router.get("/customer/catalog")
async def get_public_catalog(
    sort: str = Query("newest"),
    room_type: str = Query(None),
    mood: str = Query(None),
    material: str = Query(None),
    pile: str = Query(None),
    search: str = Query(None),
    limit: int = Query(12, ge=1, le=60),
    offset: int = Query(0, ge=0),
):
    cache_key = f"list:{sort}:{room_type or ''}:{mood or ''}:{material or ''}:{pile or ''}:{(search or '').lower()}:{limit}:{offset}"
    cached = cache_get("catalog", cache_key)
    if cached is not None:
        return cached
    from sqlalchemy import func as sqlfunc
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        q = db.query(RugCatalog).join(Material).filter(RugCatalog.tenant_id == (tenant.id if tenant else None))
        if material and material != "all":
            q = q.filter(Material.type == material)
        if pile and pile != "all":
            q = q.filter(RugCatalog.pile_height == pile)
        if search:
            like = f"%{search}%"
            q = q.filter(sqlfunc.lower(RugCatalog.name).like(sqlfunc.lower(like)) | sqlfunc.lower(RugCatalog.description).like(sqlfunc.lower(like)))

        if sort == "popular":
            from app.models.models import Quote as QuoteModel
            q = (
                q.outerjoin(QuoteModel, QuoteModel.rug_catalog_id == RugCatalog.id)
                .group_by(RugCatalog.id)
                .order_by(sqlfunc.count(QuoteModel.id).desc())
            )
        elif sort in ("price-asc", "price-desc"):
            q = q.order_by(RugCatalog.id.desc())
        elif sort == "lead-asc":
            q = q.order_by(RugCatalog.lead_time_days.asc())
        else:
            q = q.order_by(RugCatalog.id.desc())

        rugs = q.all()
        if room_type and room_type != "all":
            rugs = [r for r in rugs if room_type in (r.room_types or [])]
        if mood and mood != "all":
            rugs = [r for r in rugs if mood in (r.mood_tags or [])]
        if sort in ("price-asc", "price-desc"):
            def public_price_key(rug: RugCatalog) -> tuple[bool, float]:
                price = _public_catalog_offer(rug, db)["display_price"]
                return (price is None, (-price if sort == "price-desc" else price) if price is not None else 0.0)
            rugs.sort(key=public_price_key)

        total = len(rugs)
        page = rugs[offset:offset + limit]
        items = []
        for r in page:
            offer = _public_catalog_offer(r, db)
            items.append({
                "id": r.id,
                "slug": r.slug,
                "name": r.name,
                "description": r.description,
                "weave_type": r.weave_type,
                "pile_height": r.pile_height,
                "material": r.material.name,
                "material_type": r.material.type,
                "sizes": _public_catalog_sizes(r),
                "display_price": offer["display_price"],
                "default_size": offer["default_size"],
                "base_price_currency": offer["price_currency"],
                "lead_time_days": r.lead_time_days,
                "image_url": r.image_url,
                "images": [{"id": img.id, "image_url": img.image_url, "sort_order": img.sort_order} for img in r.images],
                "room_types": r.room_types or [],
                "mood_tags": r.mood_tags or [],
                "available": r.material.is_available,
            })
        result = {"items": items, "total": total, "has_more": offset + limit < total}
        cache_set("catalog", result, cache_key)
        return result
    finally:
        db.close()


@router.get("/customer/catalog/{rug_id_or_slug}")
async def get_public_rug(rug_id_or_slug: str):
    # Accepts either the numeric id (old/legacy links, e.g. already-shared or
    # indexed URLs from before slugs existed) or the slug (current canonical
    # URLs) — the frontend redirects the browser to the slug URL once it has
    # the rug's data, this just needs to resolve either.
    cache_key = f"detail:{rug_id_or_slug}"
    cached = cache_get("catalog", cache_key)
    if cached is not None:
        return cached
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        q = db.query(RugCatalog).join(Material).filter(RugCatalog.tenant_id == (tenant.id if tenant else None))
        if rug_id_or_slug.isdigit():
            r = q.filter(RugCatalog.id == int(rug_id_or_slug)).first()
        else:
            r = q.filter(RugCatalog.slug == rug_id_or_slug).first()
        if not r:
            raise HTTPException(status_code=404, detail="Rug not found")
        offer = _public_catalog_offer(r, db)
        result = {
            "id": r.id,
            "slug": r.slug,
            "name": r.name,
            "description": r.description,
            "about_content_html": r.about_content_html,
            "weave_type": r.weave_type,
            "pile_height": r.pile_height,
            "material": r.material.name,
            "material_type": r.material.type,
            "material_color": r.material.color,
            "sizes": _public_catalog_sizes(r),
            "display_price": offer["display_price"],
            "default_size": offer["default_size"],
            "base_price_currency": offer["price_currency"],
            "lead_time_days": r.lead_time_days,
            "image_url": r.image_url,
            "images": [{"id": img.id, "image_url": img.image_url, "sort_order": img.sort_order} for img in r.images],
            "room_types": r.room_types or [],
            "mood_tags": r.mood_tags or [],
            "available": r.material.is_available,
        }
        cache_set("catalog", result, cache_key)
        return result
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
        tenant = db.query(Tenant).first()
        rug = db.query(RugCatalog).filter(RugCatalog.id == rug_id, RugCatalog.tenant_id == (tenant.id if tenant else None)).first()
        if not rug:
            raise HTTPException(status_code=404, detail="Rug not found")
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
        safe = _customer_safe_breakdown(result)
        shipping_cost = (tenant.default_shipping_rate or 0.0) if tenant else 0.0
        safe["shipping_cost"] = shipping_cost
        safe["estimated_total"] = round((result.get("final_price") or 0.0) + shipping_cost, 2)
        return safe
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
        for match in result.get("matches", []):
            if isinstance(match.get("quote"), dict):
                match["quote"] = _customer_safe_breakdown(match["quote"])
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
        tenant = db.query(Tenant).first()
        tid = tenant.id if tenant else None
        rug = db.query(RugCatalog).filter(RugCatalog.id == body.rug_id, RugCatalog.tenant_id == tid).first()
        if not rug:
            raise HTTPException(status_code=404, detail="Rug not found")

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

        size_display = email_dims_display(quote.custom_size_w, quote.custom_size_h, shape, rug)

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


# ── Custom Rug Request ─────────────────────────────────────────────────────────

CUSTOM_REQUEST_UPLOAD_DIR = os.path.join(_BASE, "static", "custom-requests")


@router.post("/customer/custom-rug-request/upload-image")
async def upload_custom_rug_request_image(file: UploadFile = File(...)):
    # This endpoint is deliberately unauthenticated (guests submit reference images
    # before creating an account), so the upload itself must not be trusted at all:
    # content_type is client-supplied and trivially spoofable, and a filename-derived
    # extension would let an attacker store a browser-executable file (e.g. .html/.svg)
    # under /static/. Decoding with OpenCV and always re-encoding to .jpg closes both
    # holes — anything that isn't real raster image data is rejected outright, and the
    # extension is never taken from client input.
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, WebP, or GIF.")
    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB allowed.")

    arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    filename = f"{uuid.uuid4().hex}.jpg"
    os.makedirs(CUSTOM_REQUEST_UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(CUSTOM_REQUEST_UPLOAD_DIR, filename)
    cv2.imwrite(filepath, img, [cv2.IMWRITE_JPEG_QUALITY, 92])

    return {"url": f"/static/custom-requests/{filename}"}


class CustomRugRequestItem(BaseModel):
    room_type: Optional[str] = Field(None, max_length=100)
    size_w: float = Field(..., gt=0, le=50)
    size_h: float = Field(..., gt=0, le=50)
    qty: int = Field(1, ge=1, le=10000)
    material_preference: Optional[str] = Field(None, max_length=50)
    budget_range: Optional[str] = Field(None, max_length=100)
    expected_delivery: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=1500)
    reference_image_urls: Optional[List[str]] = Field(None, max_length=3)


class CustomRugRequestBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    company: Optional[str] = Field(None, max_length=200)
    items: List[CustomRugRequestItem] = Field(..., min_length=1, max_length=10)


@router.post("/customer/custom-rug-request")
async def submit_custom_rug_request(body: CustomRugRequestBody, request: Request):
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        tid = tenant.id if tenant else None

        # Prefer authenticated customer so the request appears in My Quotes
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

        # Ties every rug in this submission together so the vendor can see they arrived
        # as one request and later combine their resulting orders — only meaningful (and
        # only set) when there's actually more than one rug in this submission.
        group_id = uuid.uuid4().hex if len(body.items) > 1 else None

        quotes = []
        for item in body.items:
            quote = Quote(
                tenant_id=tid, customer_id=customer.id,
                rug_catalog_id=None, material_id=None,
                custom_size_w=item.size_w, custom_size_h=item.size_h,
                qty=item.qty, final_price=None, status="draft",
                notes=item.notes, is_custom_request=True,
                room_type=item.room_type, material_preference=item.material_preference,
                budget_range=item.budget_range, expected_delivery=item.expected_delivery,
                reference_image_urls=item.reference_image_urls,
                request_group_id=group_id,
            )
            db.add(quote)
            quotes.append(quote)
        db.commit()
        for quote in quotes:
            db.refresh(quote)

        try:
            if tenant:
                for quote in quotes:
                    _notify_vendor_custom_rug_request(db, quote, tenant, customer)
        except Exception:
            pass

        return {
            "quote_ids": [q.id for q in quotes],
            "message": "Thanks — we've received your custom rug request. Our team will review it and send you a personalized quote within 24–48 hours.",
        }
    finally:
        db.close()


# ── Customer AI Chat ─────────────────────────────────────────────────────────

class CustomerChatMessage(BaseModel):
    role: str
    content: str

# ── Customer Checkout ─────────────────────────────────────────────────────────

class CartItemBody(BaseModel):
    rug_id: int
    size_w: float = Field(..., gt=0, le=50)
    size_h: float = Field(..., gt=0, le=50)
    qty: int = Field(1, ge=1, le=10000)
    rush_order: bool = False
    shape: str = "rect"
    notes: Optional[str] = Field(None, max_length=2000)


class OrderDetailsBase(BaseModel):
    items: List[CartItemBody] = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    company: Optional[str] = Field(None, max_length=200)
    shipping_address: str = Field(..., min_length=5, max_length=1000)
    country: str = Field("India", max_length=100)
    promo_code: Optional[str] = Field(None, max_length=50)


def _is_export_country(country: Optional[str]) -> bool:
    """Anything other than India is treated as an export shipment — zero-rated
    GST under LUT, invoiced as an export invoice."""
    normalized = (country or "").strip().lower()
    return normalized not in ("", "india", "in", "bharat")


class PromoValidateBody(BaseModel):
    code: str
    subtotal: float = Field(..., ge=0)
    email: Optional[EmailStr] = None


@router.post("/customer/promo/validate")
async def validate_promo_code(body: PromoValidateBody):
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        tenant_id = tenant.id if tenant else None
        shipping_cost = (tenant.default_shipping_rate or 0.0) if tenant else 0.0
        customer = None
        if body.email:
            customer = db.query(Customer).filter(Customer.email == body.email, Customer.tenant_id == tenant_id).first()
        try:
            promo = find_valid_promo(db, tenant_id, body.code, body.subtotal, customer_id=customer.id if customer else None)
        except PromoError as e:
            raise HTTPException(status_code=400, detail=str(e))
        discount_amount = compute_discount(promo, body.subtotal, shipping_cost)
        message = (
            "Free shipping will be applied at checkout." if promo.discount_type == "free_shipping"
            else f"Promo code applied — you saved {discount_amount:.2f}."
        )
        return {
            "valid": True,
            "code": promo.code,
            "discount_type": promo.discount_type,
            "discount_value": promo.discount_value,
            "discount_amount": discount_amount,
            "message": message,
        }
    finally:
        db.close()


def _apply_promo(db: Session, tenant_id: Optional[int], promo_code: Optional[str], subtotal: float, customer_id: Optional[int], shipping_cost: float = 0.0):
    """Re-validates the promo code server-side at order time — never trusts a
    discount_amount computed by the client. Returns (promo_or_none, discount_amount)."""
    if not promo_code:
        return None, 0.0
    try:
        promo = find_valid_promo(db, tenant_id, promo_code, subtotal, customer_id=customer_id)
    except PromoError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return promo, compute_discount(promo, subtotal, shipping_cost)


def _price_cart_items(db: Session, tenant_id: Optional[int], items: List["CartItemBody"], is_export: bool = False) -> List[dict]:
    """Validates stock + prices every cart line via QuoteEngine. Read-only — no DB mutation.
    Raises HTTPException naming the offending rug on any error, so a bad line in a multi-item
    cart doesn't produce a vague failure. is_export zero-rates GST (export under LUT)."""
    engine = QuoteEngine(db, tenant_id=tenant_id)
    gst_override = 0.0 if is_export else None
    priced = []
    for item in items:
        rug = db.query(RugCatalog).filter(RugCatalog.id == item.rug_id, RugCatalog.tenant_id == tenant_id).first()
        if not rug:
            raise HTTPException(status_code=404, detail=f"Rug {item.rug_id} not found")
        material = db.query(Material).filter(Material.id == rug.material_id).first()
        if not material or not material.is_available:
            raise HTTPException(status_code=400, detail=f"Material for \"{rug.name}\" is not available")
        total_sqm = item.size_w * item.size_h * item.qty
        if material.stock_meters < total_sqm:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for \"{rug.name}\". Available: {material.stock_meters:.1f} sqm, Required: {total_sqm:.1f} sqm",
            )
        shape = item.shape or "rect"
        calc = engine.calculate_quote(
            rug_id=item.rug_id, size_w=item.size_w, size_h=item.size_h,
            material_id=rug.material_id, qty=item.qty, rush_order=item.rush_order, shape=shape,
            gst_override=gst_override,
        )
        if "error" in calc:
            raise HTTPException(status_code=400, detail=f"\"{rug.name}\": {calc['error']}")
        priced.append({"item": item, "rug": rug, "material": material, "shape": shape, "calc": calc, "total_sqm": total_sqm})
    return priced


def _create_order_from_items(
    db: Session, tenant_id: Optional[int], tenant: Optional[Tenant], customer: Customer,
    priced_items: List[dict], shipping_address: str, payment_ref: Optional[str] = None,
) -> tuple:
    """Mutates the DB: atomically deducts stock and creates one Quote per cart line, then one
    Order + one OrderItem per Quote. Order.quote_id points at the first item for backward
    compatibility with single-item views. Caller is responsible for db.commit().
    Returns (order, quotes_with_meta) — quotes_with_meta carries the per-item rug/size/lead-time
    info the route needs for its response, without re-querying after commit."""
    from datetime import datetime, timedelta

    quotes_with_meta = []
    for p in priced_items:
        item, rug, material, shape, calc, total_sqm = p["item"], p["rug"], p["material"], p["shape"], p["calc"], p["total_sqm"]

        # Atomic check-and-deduct — prevents oversell under concurrent orders
        deducted = db.execute(
            sa_update(Material)
            .where(Material.id == rug.material_id, Material.stock_meters >= total_sqm)
            .values(stock_meters=Material.stock_meters - total_sqm)
        )
        db.flush()
        if deducted.rowcount == 0:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for \"{rug.name}\" — another order may have just reserved this material.")

        quote = Quote(
            tenant_id=tenant_id, customer_id=customer.id, rug_catalog_id=rug.id,
            material_id=rug.material_id, custom_size_w=item.size_w, custom_size_h=item.size_h,
            rug_shape=shape, qty=item.qty, base_price=calc.get("subtotal"), final_price=calc.get("final_price"),
            price_currency=calc.get("price_currency") or (tenant.base_currency if tenant else "INR"),
            margin_pct=calc.get("profit_margin_pct"), gst_pct=calc.get("gst_pct"),
            rush_order=item.rush_order, status="accepted", notes=item.notes,
        )
        db.add(quote)
        db.flush()

        lead_days = rug.lead_time_days or 21
        if item.rush_order:
            lead_days = max(7, lead_days // 2)
        size_display = f"⌀ {item.size_w}m" if shape == "circle" else f"{item.size_w}m × {item.size_h}m"
        quotes_with_meta.append({"quote": quote, "rug": rug, "material": material, "total_sqm": total_sqm, "lead_days": lead_days, "size_display": size_display, "qty": item.qty})

    max_lead_days = max((m["lead_days"] for m in quotes_with_meta), default=21)
    estimated_delivery = datetime.utcnow() + timedelta(days=max_lead_days)

    first_quote = quotes_with_meta[0]["quote"]
    order = Order(
        tenant_id=tenant_id, quote_id=first_quote.id, status="pending",
        shipping_address=shipping_address, estimated_delivery=estimated_delivery,
        razorpay_payment_id=payment_ref,
    )
    db.add(order)
    db.flush()

    ref_note = f" via Razorpay {payment_ref}" if payment_ref else ""
    for m in quotes_with_meta:
        db.add(OrderItem(order_id=order.id, quote_id=m["quote"].id))
        db.add(InventoryTransaction(
            tenant_id=tenant_id, material_id=m["material"].id, qty_change=-m["total_sqm"],
            transaction_type="used",
            notes=f"Order #{order.id}{ref_note} — {m['rug'].name} {m['size_display']} ×{m['qty']}",
        ))
    db.flush()

    return order, quotes_with_meta


def _customer_id_from_auth_header(request: Request) -> Optional[int]:
    """Best-effort: pulls the customer id out of a Bearer token, if present and valid.
    Never raises — an absent/invalid/expired token just means "resolve as guest"."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from jose import jwt as _jwt
            payload = _jwt.decode(auth_header.split(" ")[1], settings.JWT_SECRET, algorithms=["HS256"])
            if payload.get("type") == "customer":
                return int(payload["sub"])
        except Exception:
            pass
    return None


def _resolve_or_create_customer(
    db: Session, tenant_id: Optional[int], body: OrderDetailsBase, customer_id_hint: Optional[int] = None,
) -> Customer:
    """Prefer the authenticated customer (so the order appears in their My Orders, and the
    webhook recovery path — which has no live request/Bearer token — can still attribute the
    order correctly via the id captured at create-payment-order time); fall back to
    matching/creating by email for guest checkout."""
    customer = None
    if customer_id_hint is not None:
        customer = db.query(Customer).filter(Customer.id == customer_id_hint).first()
    if not customer:
        customer = db.query(Customer).filter(
            Customer.email == body.email, Customer.tenant_id == tenant_id,
        ).first()
    if not customer:
        customer = Customer(
            tenant_id=tenant_id, name=body.name, email=body.email,
            phone=body.phone, company=body.company,
        )
        db.add(customer)
        db.flush()
    # Keep the profile's country/export status in sync with the shipping destination
    # actually used at checkout — this is what determines GST treatment and invoicing.
    customer.country = body.country
    customer.is_export_buyer = _is_export_country(body.country)
    return customer


def _resolve_customer(db: Session, request: Request, tenant_id: Optional[int], body: OrderDetailsBase) -> Customer:
    return _resolve_or_create_customer(db, tenant_id, body, _customer_id_from_auth_header(request))


@router.post("/customer/checkout/create-payment-order")
async def create_payment_order(body: OrderDetailsBase, request: Request):
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment gateway not configured.")
    import razorpay as _rzp
    customer_id_hint = _customer_id_from_auth_header(request)
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        tenant_id = tenant.id if tenant else None
        shipping_cost = (tenant.default_shipping_rate or 0.0) if tenant else 0.0
        priced = _price_cart_items(db, tenant_id, body.items, is_export=_is_export_country(body.country))

        currency = priced[0]["calc"].get("price_currency") or "INR"
        total_final_price = sum(p["calc"]["final_price"] for p in priced)

        existing_customer = db.query(Customer).filter(Customer.email == body.email, Customer.tenant_id == tenant_id).first()
        promo, discount_amount = _apply_promo(
            db, tenant_id, body.promo_code, total_final_price, existing_customer.id if existing_customer else None, shipping_cost,
        )
        payable = max(0.0, total_final_price + shipping_cost - discount_amount)
        amount_smallest = int(round(payable * 100))  # paise for INR

        client = _rzp.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        rzp_order = client.order.create({
            "amount": amount_smallest,
            "currency": currency,
            "receipt": f"rcpt_{uuid.uuid4().hex[:16]}",
            "payment_capture": 1,
        })

        # Snapshot checkout intent *before* the customer pays — see PaymentAttempt's
        # docstring. If /verify-payment never runs after Razorpay captures the
        # payment (browser crash, lost connection, etc.), the webhook uses this row
        # to reconstruct the order on its own rather than the payment vanishing with
        # zero trace in our system.
        db.add(PaymentAttempt(
            tenant_id=tenant_id,
            razorpay_order_id=rzp_order["id"],
            customer_id_hint=customer_id_hint,
            payload=body.model_dump(),
            amount=payable,
            currency=currency,
        ))
        db.commit()

        items_summary = [
            {
                "rug_id": p["rug"].id, "rug_name": p["rug"].name, "qty": p["item"].qty,
                "final_price": p["calc"]["final_price"], "price_currency": p["calc"].get("price_currency") or "INR",
            }
            for p in priced
        ]
        return {
            "razorpay_order_id": rzp_order["id"],
            "amount_paise": amount_smallest,
            "currency": currency,
            "key_id": settings.RAZORPAY_KEY_ID,
            "final_price": payable,
            "subtotal": total_final_price,
            "shipping_cost": shipping_cost,
            "promo_code": promo.code if promo else None,
            "discount_amount": discount_amount,
            "price_currency": currency,
            "items": items_summary,
        }
    finally:
        db.close()


def _order_confirmation_from_existing(db: Session, order_id: int) -> dict:
    """Builds a verify_payment-shaped response by reading back already-committed
    rows — used only in the rare case where this payment was already turned into
    an order by someone else (the webhook recovery path, or a concurrent retry)
    before this request got to it. Best-effort on `lead_time_days`: uses the rug's
    base lead time rather than recomputing rush-order adjustments, since that's a
    display nicety here, not something safety-critical."""
    order = db.query(Order).filter(Order.id == order_id).first()
    tenant = db.query(Tenant).filter(Tenant.id == order.tenant_id).first() if order else None
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    quotes = [q for q in (db.query(Quote).filter(Quote.id == oi.quote_id).first() for oi in order_items) if q]
    customer = db.query(Customer).filter(Customer.id == quotes[0].customer_id).first() if quotes else None
    unit = (tenant.default_size_unit if tenant else None) or "ft"

    def _item_payload(q: Quote) -> dict:
        rug = db.query(RugCatalog).filter(RugCatalog.id == q.rug_catalog_id).first()
        return {
            "quote_id": q.id, "rug_name": rug.name if rug else None,
            "size": _fmt_dims(q.custom_size_w, q.custom_size_h, unit, q.rug_shape or "rect"),
            "qty": q.qty, "final_price": q.final_price, "price_currency": q.price_currency,
        }

    items = [_item_payload(q) for q in quotes]
    first_rug = db.query(RugCatalog).filter(RugCatalog.id == quotes[0].rug_catalog_id).first() if quotes else None
    return {
        "order_id": order.id, "quote_id": quotes[0].id if quotes else None,
        "rug_name": first_rug.name if first_rug else None,
        "size": items[0]["size"] if items else None, "qty": quotes[0].qty if quotes else None,
        "final_price": order.total_amount, "subtotal": sum(q.final_price for q in quotes),
        "shipping_cost": order.shipping_cost, "promo_code": order.promo_code,
        "discount_amount": order.discount_amount, "price_currency": order.price_currency,
        "gst_inclusive": bool(tenant.gst_inclusive) if tenant else False,
        "items": items, "status": order.status,
        "estimated_delivery": order.estimated_delivery.strftime("%Y-%m-%d") if order.estimated_delivery else None,
        "lead_time_days": max((first_rug.lead_time_days if first_rug else 21), 1),
        "customer_name": customer.name if customer else None,
        "shipping_address": order.shipping_address,
    }


class VerifyPaymentBody(OrderDetailsBase):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


@router.post("/customer/checkout/verify-payment")
async def verify_payment(body: VerifyPaymentBody, request: Request):
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
        # Atomically claim this payment's attempt row, if one exists — guards
        # against a race with the webhook recovery path (both this request and
        # recover_order_from_payment_attempt reacting to the same successful
        # charge at nearly the same moment). Whichever gets here first wins;
        # losing the claim means the webhook already built the order, so return
        # that instead of creating a duplicate.
        claimed = db.execute(
            sa_update(PaymentAttempt)
            .where(PaymentAttempt.razorpay_order_id == body.razorpay_order_id, PaymentAttempt.status == "created")
            .values(status="completing")
        )
        db.commit()
        if claimed.rowcount == 0:
            existing = db.query(PaymentAttempt).filter(PaymentAttempt.razorpay_order_id == body.razorpay_order_id).first()
            if existing and existing.status == "completed" and existing.order_id:
                return _order_confirmation_from_existing(db, existing.order_id)
            # No attempt row at all (fine — this endpoint worked without one before
            # PaymentAttempt existed) or a same-millisecond in-flight webhook we lost
            # the race to; either way, fall through and create the order normally.

        tenant = db.query(Tenant).first()
        tid = tenant.id if tenant else None

        try:
            customer = _resolve_customer(db, request, tid, body)
            priced = _price_cart_items(db, tid, body.items, is_export=customer.is_export_buyer)
            subtotal = sum(p["calc"]["final_price"] for p in priced)
            shipping_cost = (tenant.default_shipping_rate or 0.0) if tenant else 0.0
            promo, discount_amount = _apply_promo(db, tid, body.promo_code, subtotal, customer.id, shipping_cost)

            order, items_meta = _create_order_from_items(db, tid, tenant, customer, priced, body.shipping_address, payment_ref=body.razorpay_payment_id)
            order.shipping_cost = shipping_cost
            if promo:
                order.promo_code = promo.code
                order.discount_amount = discount_amount
                record_redemption(db, promo, discount_amount, customer.id, order.id)
            order.total_amount = round(subtotal + shipping_cost - discount_amount, 2)
            order.price_currency = items_meta[0]["quote"].price_currency
            db.flush()
            db.execute(
                sa_update(PaymentAttempt)
                .where(PaymentAttempt.razorpay_order_id == body.razorpay_order_id)
                .values(status="completed", order_id=order.id, completed_at=datetime.utcnow())
            )
            db.commit()
        except Exception:
            db.rollback()
            # Release the claim so the webhook (or a client retry) can still recover
            # this payment later instead of it being stuck unclaimable forever.
            db.execute(
                sa_update(PaymentAttempt)
                .where(PaymentAttempt.razorpay_order_id == body.razorpay_order_id, PaymentAttempt.status == "completing")
                .values(status="created")
            )
            db.commit()
            raise
        return {
            "order_id": order.id, "quote_id": items_meta[0]["quote"].id,
            "rug_name": items_meta[0]["rug"].name, "size": items_meta[0]["size_display"], "qty": items_meta[0]["qty"],
            "final_price": subtotal + shipping_cost - discount_amount,
            "subtotal": subtotal,
            "shipping_cost": shipping_cost,
            "promo_code": promo.code if promo else None,
            "discount_amount": discount_amount,
            "price_currency": items_meta[0]["quote"].price_currency,
            "gst_inclusive": bool(tenant.gst_inclusive) if tenant else False,
            "items": [
                {"quote_id": m["quote"].id, "rug_name": m["rug"].name, "size": m["size_display"], "qty": m["qty"], "final_price": m["quote"].final_price, "price_currency": m["quote"].price_currency}
                for m in items_meta
            ],
            "status": order.status,
            "estimated_delivery": order.estimated_delivery.strftime("%Y-%m-%d"),
            "lead_time_days": max(m["lead_days"] for m in items_meta),
            "customer_name": customer.name,
            "shipping_address": body.shipping_address,
        }
    finally:
        db.close()


def recover_order_from_payment_attempt(razorpay_order_id: str, razorpay_payment_id: Optional[str]) -> Optional[int]:
    """
    Webhook safety net (called from the payment.captured handler in
    api/routes/billing.py): if a browser never completed /verify-payment after
    Razorpay captured a payment — crash, lost connection, a failed request —
    this reconstructs the order from the snapshot taken in create-payment-order,
    so the customer isn't charged with zero record of it in our system.

    Idempotent and safe to call for events that aren't ours (e.g. a subscription
    payment): it only acts if a matching, still-"created" PaymentAttempt exists.
    Returns the recovered order's id, or None if there was nothing to do.
    """
    db = SessionLocal()
    try:
        # Same atomic-claim pattern as verify_payment, for the same reason: this
        # and a concurrent /verify-payment call could both be reacting to the same
        # charge. Whichever claims it first wins.
        claimed = db.execute(
            sa_update(PaymentAttempt)
            .where(PaymentAttempt.razorpay_order_id == razorpay_order_id, PaymentAttempt.status == "created")
            .values(status="completing")
        )
        db.commit()
        if claimed.rowcount == 0:
            return None  # already handled, in-flight elsewhere, or not one of ours

        attempt = db.query(PaymentAttempt).filter(PaymentAttempt.razorpay_order_id == razorpay_order_id).first()
        try:
            body = OrderDetailsBase(**attempt.payload)
            tenant = db.query(Tenant).filter(Tenant.id == attempt.tenant_id).first()
            customer = _resolve_or_create_customer(db, attempt.tenant_id, body, attempt.customer_id_hint)

            priced = _price_cart_items(db, attempt.tenant_id, body.items, is_export=customer.is_export_buyer)
            subtotal = sum(p["calc"]["final_price"] for p in priced)
            shipping_cost = (tenant.default_shipping_rate or 0.0) if tenant else 0.0
            promo, discount_amount = _apply_promo(db, attempt.tenant_id, body.promo_code, subtotal, customer.id, shipping_cost)

            order, _items_meta = _create_order_from_items(
                db, attempt.tenant_id, tenant, customer, priced, body.shipping_address, payment_ref=razorpay_payment_id,
            )
            order.shipping_cost = shipping_cost
            order.recovered_via_webhook = True
            if promo:
                order.promo_code = promo.code
                order.discount_amount = discount_amount
                record_redemption(db, promo, discount_amount, customer.id, order.id)
            order.total_amount = round(subtotal + shipping_cost - discount_amount, 2)
            order.price_currency = _items_meta[0]["quote"].price_currency

            db.flush()
            attempt.status = "completed"
            attempt.order_id = order.id
            attempt.completed_at = datetime.utcnow()
            db.commit()
            logger.info(f"Recovered order {order.id} via webhook for razorpay_order_id={razorpay_order_id} (browser never completed checkout)")
            return order.id
        except Exception:
            db.rollback()
            # Release the claim — a redelivered webhook or a late client retry can
            # still recover this payment later instead of it being stuck forever.
            db.execute(
                sa_update(PaymentAttempt)
                .where(PaymentAttempt.razorpay_order_id == razorpay_order_id, PaymentAttempt.status == "completing")
                .values(status="created")
            )
            db.commit()
            logger.exception(f"Failed to recover order from payment_attempt razorpay_order_id={razorpay_order_id}")
            return None
    finally:
        db.close()


class CheckoutBody(OrderDetailsBase):
    pass  # inherits all validated fields from OrderDetailsBase — COD / no-Razorpay fallback path


@router.post("/customer/checkout")
async def customer_checkout(body: CheckoutBody, request: Request):
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        tid = tenant.id if tenant else None

        customer = _resolve_customer(db, request, tid, body)
        priced = _price_cart_items(db, tid, body.items, is_export=customer.is_export_buyer)
        subtotal = sum(p["calc"]["final_price"] for p in priced)
        shipping_cost = (tenant.default_shipping_rate or 0.0) if tenant else 0.0
        promo, discount_amount = _apply_promo(db, tid, body.promo_code, subtotal, customer.id, shipping_cost)

        order, items_meta = _create_order_from_items(db, tid, tenant, customer, priced, body.shipping_address)
        order.shipping_cost = shipping_cost
        if promo:
            order.promo_code = promo.code
            order.discount_amount = discount_amount
            record_redemption(db, promo, discount_amount, customer.id, order.id)
        order.total_amount = round(subtotal + shipping_cost - discount_amount, 2)
        order.price_currency = items_meta[0]["quote"].price_currency
        db.commit()
        return {
            "order_id": order.id, "quote_id": items_meta[0]["quote"].id,
            "rug_name": items_meta[0]["rug"].name, "size": items_meta[0]["size_display"],
            "size_w": items_meta[0]["quote"].custom_size_w, "size_h": items_meta[0]["quote"].custom_size_h,
            "shape": items_meta[0]["quote"].rug_shape, "qty": items_meta[0]["qty"],
            "final_price": subtotal + shipping_cost - discount_amount,
            "subtotal": subtotal,
            "shipping_cost": shipping_cost,
            "promo_code": promo.code if promo else None,
            "discount_amount": discount_amount,
            "price_currency": items_meta[0]["quote"].price_currency,
            "gst_inclusive": bool(tenant.gst_inclusive) if tenant else False,
            "items": [
                {"quote_id": m["quote"].id, "rug_name": m["rug"].name, "size": m["size_display"], "qty": m["qty"], "final_price": m["quote"].final_price, "price_currency": m["quote"].price_currency}
                for m in items_meta
            ],
            "status": order.status,
            "estimated_delivery": order.estimated_delivery.strftime("%Y-%m-%d"),
            "lead_time_days": max(m["lead_days"] for m in items_meta),
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
        tenant_cache: dict[int, "Tenant"] = {}
        result = []
        for o in orders:
            q = o.quote
            rug = q.rug_catalog if q else None
            mat = q.material if q else None
            fp = q.final_price if q else None
            gst = q.gst_pct if q else None
            pre_gst = round(fp / (1 + gst / 100), 2) if fp and gst else None
            gst_amount = round(fp - pre_gst, 2) if fp and pre_gst else None
            tenant_id = q.tenant_id if q else None
            if tenant_id is not None and tenant_id not in tenant_cache:
                tenant_cache[tenant_id] = db.query(Tenant).filter(Tenant.id == tenant_id).first()
            order_tenant = tenant_cache.get(tenant_id) if tenant_id is not None else None
            gst_inclusive = bool(order_tenant.gst_inclusive) if order_tenant else False
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
            if size_w and size_h:
                if shape == "circle":
                    size_display = f"⌀ {size_w:g}m"
                elif shape == "oval":
                    size_display = f"{size_w:g}m × {size_h:g}m (oval)"
                else:
                    size_display = f"{size_w:g}m × {size_h:g}m"
            else:
                size_display = "—"
            # All line items on this order (multi-rug cart orders have >1; legacy/Buy-Now orders have exactly 1,
            # backfilled by migrate_v14). Falls back to the primary quote if items are somehow missing.
            line_quotes = [oi.quote for oi in o.items if oi.quote] or ([q] if q else [])
            order_total_final_price = sum(lq.final_price for lq in line_quotes if lq.final_price is not None) or fp
            items_summary = [
                {
                    "quote_id": lq.id,
                    "rug_name": lq.rug_catalog.name if lq.rug_catalog else "Custom Order",
                    "qty": lq.qty,
                    "final_price": lq.final_price,
                    "price_currency": lq.price_currency or "INR",
                }
                for lq in line_quotes
            ]
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
                "qty": qty,
                "base_price": base_price,
                "price_per_piece": price_per_piece,
                "final_price": fp,
                "pre_gst_price": pre_gst,
                "gst_pct": gst,
                "gst_amount": gst_amount,
                "gst_inclusive": gst_inclusive,
                "price_currency": q.price_currency if q else "INR",
                "customer_country": q.customer.country if q and q.customer else None,
                "rush_order": q.rush_order if q else False,
                "manual_discount_pct": q.manual_discount_pct if q else None,
                "shipping_address": o.shipping_address,
                "estimated_delivery": o.estimated_delivery.strftime("%Y-%m-%d") if o.estimated_delivery else None,
                "created_at": o.created_at.strftime("%Y-%m-%d") if o.created_at else None,
                "item_count": len(line_quotes),
                "items": items_summary,
                "order_total": order_total_final_price,
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


def _gst_split(tenant_state: Optional[str], customer_state: Optional[str], gst_pct: Optional[float]) -> dict:
    """
    Same same-state/inter-state logic as invoice_generator.py: same state code
    on both sides -> CGST+SGST split evenly, otherwise IGST at the full rate.
    Lets customer-facing pages show "CGST 6% + SGST 6%" (or "IGST 12%") instead
    of an undifferentiated "GST 12%".
    """
    if not gst_pct:
        return {"type": None}
    if tenant_state and customer_state and tenant_state == customer_state:
        half = round(gst_pct / 2, 2)
        return {"type": "cgst_sgst", "cgst_pct": half, "sgst_pct": half}
    return {"type": "igst", "igst_pct": gst_pct}


def _customer_safe_breakdown(result: dict) -> dict:
    """
    calculate_quote() is shared with staff-facing tools that legitimately need
    to see margin/cost/MOQ data — strip that out here rather than in the engine
    itself, specifically for customer-facing responses. Removes the top-level
    fields and the bracketed margin/cost detail embedded in the first
    breakdown line's label (e.g. "... [40% margin on 1800.00/sqm material]").
    MOQ shortfalls are a vendor concern (fulfillment decision), not something
    to surface to the shopper — they stay visible to staff in the admin
    order/quote views.
    """
    safe = {k: v for k, v in result.items() if k not in (
        "size_sqm", "total_sqm", "base_price_per_sqm", "material_cost_per_sqm",
        "profit_margin_pct", "moq_met", "moq_message",
    )}
    breakdown = safe.get("breakdown")
    if breakdown:
        cleaned = []
        for i, line in enumerate(breakdown):
            if i == 0 and "label" in line:
                line = {**line, "label": "Rug subtotal"}
            cleaned.append(line)
        safe["breakdown"] = cleaned
    return safe


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
        if not q:
            raise HTTPException(status_code=422, detail="Order has no associated quote")
        tenant = db.query(Tenant).filter(Tenant.id == q.tenant_id).first()

        if q.rug_catalog_id and q.material_id:
            if not q.custom_size_w or not q.custom_size_h:
                raise HTTPException(status_code=422, detail="Order is missing required fields for calculation")
            engine = QuoteEngine(db, tenant_id=q.tenant_id)
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
        elif q.material_id:
            # Custom rug request with a material assigned (via Adjust Price and Material) —
            # no catalog rug, so price it via margin-over-material-cost instead.
            engine = QuoteEngine(db, tenant_id=q.tenant_id)
            result = engine.calculate_custom_quote(q, q.material_id, margin_override=q.margin_pct)
            if "error" in result:
                raise HTTPException(status_code=422, detail=result["error"])
        else:
            # Custom rug request priced with a flat vendor-typed number, no material
            # assigned — no cost basis to recompute from at all.
            result = build_manual_price_result(q, tenant)
        mat = q.material
        rug = q.rug_catalog
        cust = q.customer
        return {
            **_customer_safe_breakdown(result),
            "stored_final_price": q.final_price,
            "price_currency": q.price_currency or result.get("price_currency", "INR"),
            "customer_country": cust.country if cust else None,
            "material_name": mat.name if mat else None,
            "rug_name": rug.name if rug else "Custom Order",
            "weave_type": rug.weave_type if rug else None,
            "gst_split": _gst_split(
                tenant.state_code if tenant else None,
                cust.state_code if cust else None,
                result.get("gst_pct"),
            ),
        }
    finally:
        db.close()


@router.get("/customer/orders/{order_id}/timeline")
async def get_customer_order_timeline(order_id: int, email: str):
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

        history = (
            db.query(OrderStatusHistory)
            .filter(OrderStatusHistory.order_id == order.id)
            .order_by(OrderStatusHistory.changed_at.asc())
            .all()
        )
        # The order's own creation is the implicit first entry — no need to
        # backfill history rows for orders placed before this feature shipped.
        timeline = [{"status": "pending", "at": order.created_at.isoformat() if order.created_at else None}]
        timeline += [{"status": h.status, "at": h.changed_at.isoformat() if h.changed_at else None} for h in history]
        return timeline
    finally:
        db.close()


def _customer_owned_order(db: Session, order_id: int, current_customer: Customer) -> Order:
    """Looks up order_id, scoped to every Customer record sharing the authenticated
    customer's email (handles duplicate records from tenant-scoped vs auth-scoped
    customer creation — same pattern as get_customer_orders/get_customer_order_timeline).
    404s rather than 403s on a mismatch, so this doesn't confirm an order id's
    existence to someone who doesn't own it."""
    same_email_ids = [
        c.id for c in db.query(Customer).filter(Customer.email == current_customer.email).all()
    ]
    order = (
        db.query(Order)
        .join(Quote, Order.quote_id == Quote.id)
        .filter(Order.id == order_id, Quote.customer_id.in_(same_email_ids))
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.get("/customer/orders/{order_id}/cancel-eligibility")
def get_customer_cancel_eligibility(
    order_id: int,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    """Lets the customer portal show/gray the Cancel button and preview the refund
    amount before committing — the actual cancel endpoint re-checks everything
    itself. Same standard refund policy as the admin side (see orders.py)."""
    order = _customer_owned_order(db, order_id, current_customer)
    tenant = db.query(Tenant).filter(Tenant.id == order.tenant_id).first()
    return _cancellation_eligibility_payload(order, tenant)


@router.post("/customer/orders/{order_id}/cancel")
def cancel_customer_order(
    order_id: int,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    """Customer self-service cancellation — same standard refund policy and same
    Razorpay refund logic as the admin-side cancel (see _cancel_order_and_refund in
    orders.py), just scoped to the caller's own order instead of tenant-wide."""
    order = _customer_owned_order(db, order_id, current_customer)
    order = _cancel_order_and_refund(db, order)
    return {
        "order_id": order.id,
        "status": order.status,
        "refund_amount": order.refund_amount,
        "refund_status": order.refund_status,
        "price_currency": order.price_currency,
    }


class CustomerChatRequest(BaseModel):
    messages: List[CustomerChatMessage]
    session_id: Optional[str] = None


@router.post("/customer/chat")
async def customer_chat(body: CustomerChatRequest):
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured. Please add ANTHROPIC_API_KEY to the backend .env file.")

    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        business_name = tenant.name if tenant else "our studio"
        rugs = db.query(RugCatalog).join(Material).all()
        catalog_lines = []
        for r in rugs:
            offer = _public_catalog_offer(r, db)
            default_size = offer["default_size"]
            offer_text = (
                f"customer_price={offer['display_price']} for {default_size['ft']} ft"
                if offer["display_price"] is not None and default_size else "price on request"
            )
            catalog_lines.append(
                f"• ID {r.id} — {r.name}: material={r.material.name}, weave={r.weave_type or 'n/a'}, "
                f"pile={r.pile_height or 'n/a'}, {offer_text}, "
                f"lead_time={r.lead_time_days}d, sizes={', '.join(s['ft'] + ' ft' for s in r.sizes) or 'custom'}. {r.description or ''}"
            )
        catalog_text = "\n".join(catalog_lines)
    finally:
        db.close()

    system_prompt = f"""You are a friendly rug design consultant for {business_name}, a custom rug manufacturing studio.
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
- Show "Standard delivery" and "Rush (+25% fee)"

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
                    "rush_order":{"type": "boolean", "description": "True if rush delivery is needed"},
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
                            "gst_inclusive":    calc.get("gst_inclusive"),
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
    tenant = db.query(Tenant).filter(Tenant.id == current_customer.tenant_id).first()
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
            "customer_country": q.customer.country if q.customer else None,
            "gst_pct": q.gst_pct,
            "gst_amount": round(
                q.final_price - round(q.final_price / (1 + (q.gst_pct or 0) / 100), 2), 2
            ) if q.final_price and q.gst_pct else None,
            "pre_gst_price": round(
                q.final_price / (1 + (q.gst_pct or 0) / 100), 2
            ) if q.final_price else None,
            "gst_inclusive": bool(tenant.gst_inclusive) if tenant else False,
            "gst_split": _gst_split(
                tenant.state_code if tenant else None,
                q.customer.state_code if q.customer else None,
                q.gst_pct,
            ),
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
            "is_custom_request": bool(q.is_custom_request),
            "room_type": q.room_type,
            "material_preference": q.material_preference,
            "budget_range": q.budget_range,
            "reference_image_urls": q.reference_image_urls,
            "vendor_sample_image_urls": q.vendor_sample_image_urls,
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


_MATERIAL_PREFERENCE_LABELS = {
    "wool": "Wool", "silk": "Silk", "cotton": "Cotton", "synthetic": "Synthetic", "no_preference": "No preference",
}


def _notify_vendor_custom_rug_request(db: Session, quote: Quote, tenant, customer: Customer) -> None:
    from app.services import email_service

    to_email = email_service.vendor_recipient(tenant)
    if not to_email:
        return

    size_str = (
        email_dims_display(quote.custom_size_w, quote.custom_size_h, quote.rug_shape or "rect")
        if quote.custom_size_w and quote.custom_size_h else "Not specified"
    )
    notes_line = f"Customer notes: {quote.notes}\n" if quote.notes else ""
    images_line = f"Reference images: {', '.join(quote.reference_image_urls)}\n" if quote.reference_image_urls else ""
    phone_line = f", {customer.phone}" if customer.phone else ""

    subject, body_text, body_html = email_service.render_template(
        db, quote.tenant_id, "vendor_custom_rug_request",
        {
            "tenant_name": tenant.name,
            "customer_name": customer.name,
            "customer_email": customer.email,
            "customer_phone_line": phone_line,
            "quote_id": quote.id,
            "room_type": quote.room_type or "Not specified",
            "size": size_str,
            "qty": quote.qty,
            "material_preference": _MATERIAL_PREFERENCE_LABELS.get(quote.material_preference or "", "Not specified"),
            "budget_range": quote.budget_range or "Not specified",
            "notes_line": notes_line,
            "images_line": images_line,
        },
    )
    email_service.send_email(to_email, subject, body_text, body_html, reply_to=customer.email)


def _notify_vendor_review_request(db: Session, quote: Quote, tenant, customer: Customer, request_num: int) -> None:
    from app.services import email_service

    to_email = email_service.vendor_recipient(tenant)
    if not to_email:
        return

    rug_name = str(quote.rug_catalog.name) if quote.rug_catalog else f"Quote #{quote.id}"
    size_str = email_dims_display(quote.custom_size_w, quote.custom_size_h, quote.rug_shape or "rect", quote.rug_catalog)

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

    # quote.final_price is already the final, agreed total the customer saw and
    # accepted (shipping is baked in when it came from the calculator; it's the
    # vendor's own number when typed flat) — don't add shipping on top of it again.
    # quote.shipping_cost is kept only as an informational breakdown line.
    subtotal = quote.final_price or 0.0
    shipping_cost = quote.shipping_cost or 0.0

    discount_amount = 0.0
    promo = None
    if body.promo_code:
        try:
            promo = find_valid_promo(db, quote.tenant_id, body.promo_code, subtotal, customer_id=current_customer.id)
        except PromoError as e:
            raise HTTPException(status_code=400, detail=str(e))
        discount_amount = compute_discount(promo, subtotal, shipping_cost)

    order = Order(
        tenant_id=quote.tenant_id,
        quote_id=quote.id,
        status="pending",
        estimated_delivery=datetime.utcnow() + timedelta(days=lead_days),
        shipping_cost=shipping_cost,
        promo_code=promo.code if promo else None,
        discount_amount=discount_amount or None,
        total_amount=round(subtotal - discount_amount, 2),
        price_currency=quote.price_currency,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    if promo:
        record_redemption(db, promo, discount_amount, current_customer.id, order.id)
        db.commit()
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
        parts.append("Remove rush fee — switch to standard delivery")
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

    # Multi-item cart orders have one OrderItem (and one Quote) per rug; legacy/Buy-Now
    # orders have exactly one, backfilled by migrate_v14. Each quote gets its own invoice
    # page using the existing single-item generator, unchanged — merged into one PDF below.
    line_quotes = [oi.quote for oi in order.items if oi.quote] or ([order.quote] if order.quote else [])
    if not line_quotes:
        raise HTTPException(status_code=422, detail="Order has no line items to invoice.")

    tenant = db.query(Tenant).filter(Tenant.id == line_quotes[0].tenant_id).first()
    invoice_currency = tenant.currency if tenant else "INR"

    # This order has already been paid for — issue a real tax invoice (export invoice for
    # foreign buyers), not a proforma. Proforma is a pre-sale, non-binding document with no
    # GST/CGST/SGST/IGST breakdown, which isn't a valid record of a completed sale.
    invoice_type = "export" if current_customer.is_export_buyer else "tax"

    pdfs = []
    for quote in line_quotes:
        if not quote.final_price or not quote.custom_size_w or not quote.custom_size_h:
            raise HTTPException(status_code=422, detail="Order is missing required details to generate an invoice.")
        rug = quote.rug_catalog
        if not rug:
            raise HTTPException(status_code=422, detail="Order has no associated rug.")

        size_sqm = round(quote.custom_size_w * quote.custom_size_h, 4)
        qty = quote.qty or 1
        total_sqm = size_sqm * qty
        # Split final_price back into taxable value + GST using the rate applied on this
        # quote — holds under both GST-inclusive and GST-exclusive tenant pricing, since
        # final_price = pre_gst_price * (1 + gst_pct/100) in both cases.
        gst_pct = quote.gst_pct if quote.gst_pct is not None else ((tenant.default_gst_pct if tenant else None) or 12.0)
        pre_gst_price = round(quote.final_price / (1 + gst_pct / 100), 2) if gst_pct else quote.final_price
        gst_amount = round(quote.final_price - pre_gst_price, 2)
        # Always both units on the invoice document itself, regardless of the tenant's
        # on-site display-unit preference — the recipient may not share that preference.
        dims_str = email_dims_display(quote.custom_size_w, quote.custom_size_h, quote.rug_shape or "rect", rug)
        size_desc = f"{dims_str} ({size_sqm:.2f}m²)"

        pdfs.append(generate_invoice_pdf(
            quote_id=quote.id,
            invoice_type=invoice_type,
            supplier_name=tenant.name if tenant else "DreamRugsCreation",
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
            size_dims_str=dims_str,
            qty=qty,
            pre_gst_price=pre_gst_price,
            gst_amount=gst_amount,
            gst_pct=gst_pct,
            size_sqm=size_sqm,
            currency=invoice_currency,
            expected_delivery_days=quote.expected_delivery_days,
        ))

    if len(pdfs) == 1:
        pdf_bytes = pdfs[0]
    else:
        from io import BytesIO
        from pypdf import PdfWriter
        writer = PdfWriter()
        for p in pdfs:
            writer.append(BytesIO(p))
        merged = BytesIO()
        writer.write(merged)
        pdf_bytes = merged.getvalue()

    filename = f"invoice-order-{order_id:04d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
