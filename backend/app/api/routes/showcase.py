import os
import shutil
import subprocess
import uuid
import cv2
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import ShowcaseVideo, StaffUser
from app.schemas.schemas import ShowcaseVideoCreate, ShowcaseVideoUpdate, ShowcaseVideo as ShowcaseVideoSchema

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "showcase")
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_VIDEO_SIZE_MB = 50
MAX_IMAGE_SIZE_MB = 5

router = APIRouter()


def _remux_mov_to_mp4(mov_path: str, mp4_path: str) -> bool:
    """Losslessly re-containers a .mov file into .mp4 (stream copy, no re-encode) so it plays
    in browsers that refuse the video/quicktime mimetype even with a compatible H.264 codec.
    Returns True on success. No-ops safely if ffmpeg isn't installed."""
    if not shutil.which("ffmpeg"):
        logger.warning("ffmpeg not found — skipping .mov -> .mp4 remux for %s", mov_path)
        return False
    try:
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", mov_path, "-c", "copy", "-movflags", "+faststart", mp4_path],
            capture_output=True, timeout=120,
        )
        return result.returncode == 0 and os.path.exists(mp4_path)
    except Exception as e:
        logger.warning("Failed to remux %s to mp4: %s", mov_path, e)
        return False


def _extract_poster_frame(video_path: str, poster_path: str) -> bool:
    """Grabs a representative frame from a video file and saves it as a JPEG poster.
    Seeks ~10% into the video (skips a possibly-black opening frame). Returns True on success."""
    cap = cv2.VideoCapture(video_path)
    try:
        if not cap.isOpened():
            return False
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        target_frame = max(1, int(frame_count * 0.1)) if frame_count > 0 else 0
        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
        ok, frame = cap.read()
        if not ok:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ok, frame = cap.read()
        if not ok:
            return False
        ok2, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ok2:
            return False
        with open(poster_path, "wb") as f:
            f.write(buf.tobytes())
        return True
    finally:
        cap.release()


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

    # .mov serves as video/quicktime, which Chrome/Firefox often refuse to play even with a
    # compatible H.264 codec — remux to .mp4 (lossless, stream copy) so it works everywhere.
    if ext == "mov":
        mp4_filename = f"{filename.rsplit('.', 1)[0]}.mp4"
        mp4_path = os.path.join(UPLOAD_DIR, mp4_filename)
        if _remux_mov_to_mp4(filepath, mp4_path):
            os.remove(filepath)
            filename = mp4_filename
            filepath = mp4_path

    poster_url: Optional[str] = None
    poster_filename = f"{uuid.uuid4().hex}-poster.jpg"
    poster_path = os.path.join(UPLOAD_DIR, poster_filename)
    if _extract_poster_frame(filepath, poster_path):
        poster_url = f"/static/showcase/{poster_filename}"

    return JSONResponse({"url": f"/static/showcase/{filename}", "poster_url": poster_url})


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
