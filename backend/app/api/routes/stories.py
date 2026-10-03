"""Stories behind unique rug designs — admin CRUD plus the public
/stories listing and /stories/<slug> detail page data."""
import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload

from app.core.auth import get_current_user
from app.core.cache import cache_clear, cache_get, cache_set
from app.core.database import get_db
from app.core.slugify import slugify, unique_story_slug
from app.api.routes.showcase import _extract_poster_frame, _remux_mov_to_mp4
from app.models.models import RugCatalog, RugStory, StaffUser, Tenant
from app.schemas.schemas import RugStory as RugStorySchema, RugStoryCreate, RugStoryUpdate

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "stories")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_IMAGE_SIZE_MB = 20
MAX_VIDEO_SIZE_MB = 50

router = APIRouter()


def _save_upload(contents: bytes, filename: Optional[str], default_ext: str) -> tuple[str, str]:
    ext = filename.rsplit(".", 1)[-1].lower() if filename and "." in filename else default_ext
    name = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    path = os.path.join(UPLOAD_DIR, name)
    with open(path, "wb") as f:
        f.write(contents)
    return name, path


@router.post("/stories/upload-image")
async def upload_story_image(
    file: UploadFile = File(...),
    current_user: StaffUser = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, or WebP.")
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_IMAGE_SIZE_MB}MB allowed.")
    name, _ = _save_upload(contents, file.filename, "jpg")
    return JSONResponse({"url": f"/static/stories/{name}"})


@router.post("/stories/upload-video")
async def upload_story_video(
    file: UploadFile = File(...),
    current_user: StaffUser = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use MP4, WebM, or MOV.")
    contents = await file.read()
    if len(contents) > MAX_VIDEO_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_VIDEO_SIZE_MB}MB allowed.")
    name, path = _save_upload(contents, file.filename, "mp4")

    # Same .mov → .mp4 remux and first-frame poster as the showcase video upload.
    if name.endswith(".mov"):
        mp4_name = f"{name.rsplit('.', 1)[0]}.mp4"
        mp4_path = os.path.join(UPLOAD_DIR, mp4_name)
        if _remux_mov_to_mp4(path, mp4_path):
            os.remove(path)
            name, path = mp4_name, mp4_path

    poster_url: Optional[str] = None
    poster_name = f"{uuid.uuid4().hex}-poster.jpg"
    if _extract_poster_frame(path, os.path.join(UPLOAD_DIR, poster_name)):
        poster_url = f"/static/stories/{poster_name}"

    return JSONResponse({"url": f"/static/stories/{name}", "poster_url": poster_url})


def _get_tenant_story(db: Session, story_id: int, tenant_id: int) -> RugStory:
    story = db.query(RugStory).filter(RugStory.id == story_id, RugStory.tenant_id == tenant_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


def _check_rug(db: Session, rug_id: Optional[int], tenant_id: int) -> None:
    if rug_id is None:
        return
    if not db.query(RugCatalog.id).filter(RugCatalog.id == rug_id, RugCatalog.tenant_id == tenant_id).first():
        raise HTTPException(status_code=400, detail="Linked rug not found in your catalog")


@router.get("/stories", response_model=List[RugStorySchema])
def list_stories(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return (
        db.query(RugStory)
        .options(joinedload(RugStory.rug))
        .filter(RugStory.tenant_id == current_user.tenant_id)
        .order_by(RugStory.sort_order.asc(), RugStory.id.desc())
        .all()
    )


@router.post("/stories", response_model=RugStorySchema)
def create_story(
    body: RugStoryCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    tenant_id = current_user.tenant_id
    _check_rug(db, body.rug_id, tenant_id)
    data = body.model_dump(exclude={"slug"})
    data["media"] = [m.model_dump() for m in body.media]
    slug = unique_story_slug(db, (body.slug or "").strip() or body.title, tenant_id)
    story = RugStory(**data, slug=slug, tenant_id=tenant_id)
    db.add(story)
    db.commit()
    db.refresh(story)
    cache_clear("rug_stories")
    return story


@router.put("/stories/{story_id}", response_model=RugStorySchema)
def update_story(
    story_id: int,
    body: RugStoryUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    tenant_id = current_user.tenant_id
    story = _get_tenant_story(db, story_id, tenant_id)
    updates = body.model_dump(exclude_unset=True)
    if "rug_id" in updates:
        _check_rug(db, updates["rug_id"], tenant_id)
    if "slug" in updates:
        requested = (updates.pop("slug") or "").strip()
        source = requested or updates.get("title") or story.title
        if slugify(source) != story.slug:
            story.slug = unique_story_slug(db, source, tenant_id, exclude_id=story.id)
    if "media" in updates:
        updates["media"] = [m.model_dump() for m in body.media or []]
    for field, value in updates.items():
        if field in ("title", "is_published", "sort_order") and value is None:
            continue  # non-nullable columns — ignore an explicit null
        setattr(story, field, value)
    db.commit()
    db.refresh(story)
    cache_clear("rug_stories")
    return story


@router.delete("/stories/{story_id}")
def delete_story(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    story = _get_tenant_story(db, story_id, current_user.tenant_id)
    db.delete(story)
    db.commit()
    cache_clear("rug_stories")
    return {"message": "Story deleted successfully"}


# ── Public storefront ───────────────────────────────────────────────────────

def _linked_rug(story: RugStory) -> Optional[dict]:
    rug = story.rug
    if not rug:
        return None
    return {"id": rug.id, "name": rug.name, "slug": rug.slug, "image_url": rug.image_url}


@router.get("/customer/stories")
def get_public_stories(db: Session = Depends(get_db)):
    """Public listing — cover, title and inspiration per published story.
    Also carries rug_id so a rug page can link to its story."""
    cached = cache_get("rug_stories")
    if cached is not None:
        return cached
    tenant = db.query(Tenant).first()
    rows = (
        db.query(RugStory)
        .filter(RugStory.is_published == True, RugStory.tenant_id == (tenant.id if tenant else None))
        .order_by(RugStory.sort_order.asc(), RugStory.id.desc())
        .all()
    )
    result = [
        {
            "id": s.id,
            "slug": s.slug,
            "title": s.title,
            "inspiration": s.inspiration,
            # Falls back to the linked rug's photo, same as the detail page hero.
            "cover_image_url": s.cover_image_url or (s.rug.image_url if s.rug else None),
            "rug_id": s.rug_id,
        }
        for s in rows
    ]
    cache_set("rug_stories", result)
    return result


@router.get("/customer/stories/{slug}")
def get_public_story(slug: str, db: Session = Depends(get_db)):
    """Public single-story page: full rich-text body, photos/videos and the linked rug."""
    key = f"story_{slug}"
    cached = cache_get("rug_stories", key=key)
    if cached is not None:
        return cached
    tenant = db.query(Tenant).first()
    s = (
        db.query(RugStory)
        .filter(
            RugStory.slug == slug,
            RugStory.is_published == True,
            RugStory.tenant_id == (tenant.id if tenant else None),
        )
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Story not found")
    result = {
        "id": s.id,
        "slug": s.slug,
        "title": s.title,
        "inspiration": s.inspiration,
        "body_html": s.body_html,
        "cover_image_url": s.cover_image_url,
        "media": s.media or [],
        "rug": _linked_rug(s),
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }
    cache_set("rug_stories", result, key=key)
    return result
