import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import ShowcaseVideo, StaffUser
from app.schemas.schemas import ShowcaseVideoCreate, ShowcaseVideoUpdate, ShowcaseVideo as ShowcaseVideoSchema

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "showcase")
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_VIDEO_SIZE_MB = 50
MAX_IMAGE_SIZE_MB = 5

router = APIRouter()


@router.post("/showcase-videos/upload-video")
async def upload_showcase_video(
    file: UploadFile = File(...),
    current_user: StaffUser = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use MP4 or WebM.")

    contents = await file.read()
    if len(contents) > MAX_VIDEO_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_VIDEO_SIZE_MB}MB allowed.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "mp4"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return JSONResponse({"url": f"/static/showcase/{filename}"})


@router.post("/showcase-videos/upload-poster")
async def upload_showcase_poster(
    file: UploadFile = File(...),
    current_user: StaffUser = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, or WebP.")

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_IMAGE_SIZE_MB}MB allowed.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return JSONResponse({"url": f"/static/showcase/{filename}"})


@router.get("/showcase-videos", response_model=List[ShowcaseVideoSchema])
def get_showcase_videos(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return (
        db.query(ShowcaseVideo)
        .filter(ShowcaseVideo.tenant_id == current_user.tenant_id)
        .order_by(ShowcaseVideo.sort_order.asc(), ShowcaseVideo.id.asc())
        .all()
    )


@router.post("/showcase-videos", response_model=ShowcaseVideoSchema)
def create_showcase_video(
    video: ShowcaseVideoCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    db_video = ShowcaseVideo(**video.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    return db_video


@router.put("/showcase-videos/{video_id}", response_model=ShowcaseVideoSchema)
def update_showcase_video(
    video_id: int,
    video_update: ShowcaseVideoUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    video = db.query(ShowcaseVideo).filter(
        ShowcaseVideo.id == video_id,
        ShowcaseVideo.tenant_id == current_user.tenant_id,
    ).first()
    if not video:
        raise HTTPException(status_code=404, detail="Showcase video not found")
    for field, value in video_update.model_dump(exclude_unset=True).items():
        setattr(video, field, value)
    db.commit()
    db.refresh(video)
    return video


@router.delete("/showcase-videos/{video_id}")
def delete_showcase_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    video = db.query(ShowcaseVideo).filter(
        ShowcaseVideo.id == video_id,
        ShowcaseVideo.tenant_id == current_user.tenant_id,
    ).first()
    if not video:
        raise HTTPException(status_code=404, detail="Showcase video not found")
    db.delete(video)
    db.commit()
    return {"message": "Showcase video deleted successfully"}
