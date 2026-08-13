"""
Optional realism polish pass for the room visualizer.

Takes an already-composited room+rug image (produced by the OpenCV
perspective warp in customer.py) and asks an image-edit model to blend the
rug's contact shadow / ambient occlusion in more naturally. The edit mask is
built from the same corner points used for the warp so the model can only
touch a thin band around the rug's edges — it can never see enough of the
rug itself, or the rest of the room, to alter them.
"""

import io
import logging

import cv2
import numpy as np
from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

# How far outside the rug's marked quad the editable band extends, and how
# far it stays clear of the rug's own edge — matches the drop-shadow footprint
# already painted by the OpenCV pass (customer.py contact/ambient shadow).
_BAND_OUTER_PAD = 14
_BAND_INNER_PAD = 4

_client: OpenAI | None = None


def _get_client() -> OpenAI | None:
    global _client
    if not settings.OPENAI_API_KEY:
        return None
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def _build_edit_mask(shape: tuple[int, int], corner_points: list) -> np.ndarray:
    """RGBA mask for OpenAI's images.edit: transparent = editable, opaque = protected."""
    h, w = shape
    pts = np.array(corner_points, dtype=np.int32)

    outer = np.zeros((h, w), dtype=np.uint8)
    cv2.fillConvexPoly(outer, pts, 255)
    outer = cv2.dilate(outer, np.ones((_BAND_OUTER_PAD * 2 + 1,) * 2, np.uint8))

    inner = np.zeros((h, w), dtype=np.uint8)
    cv2.fillConvexPoly(inner, pts, 255)
    inner = cv2.erode(inner, np.ones((_BAND_INNER_PAD * 2 + 1,) * 2, np.uint8))

    editable_band = cv2.subtract(outer, inner)  # ring around the rug edge only

    alpha = 255 - editable_band  # opaque everywhere except the band
    mask_rgba = np.zeros((h, w, 4), dtype=np.uint8)
    mask_rgba[:, :, 3] = alpha
    return mask_rgba


def enhance_realism(composite_bgr: np.ndarray, corner_points: list) -> np.ndarray | None:
    """Returns an enhanced BGR image (same shape/encoding conventions as composite_bgr),
    or None on any failure — caller falls back to composite_bgr unchanged."""
    client = _get_client()
    if client is None:
        return None

    try:
        h, w = composite_bgr.shape[:2]
        mask_rgba = _build_edit_mask((h, w), corner_points)

        ok, image_png = cv2.imencode(".png", composite_bgr)
        if not ok:
            return None
        ok, mask_png = cv2.imencode(".png", mask_rgba)
        if not ok:
            return None

        result = client.images.edit(
            model="gpt-image-1",
            image=("composite.png", io.BytesIO(image_png.tobytes()), "image/png"),
            mask=("mask.png", io.BytesIO(mask_png.tobytes()), "image/png"),
            prompt=(
                "Photorealistic interior photo. Blend the rug naturally into the floor: add a soft, "
                "realistic contact shadow and ambient occlusion right at its edges, matching the room's "
                "existing light direction and color temperature. Do not alter the rug's pattern, color, "
                "size, or position, and do not change anything else in the room."
            ),
            size="auto",
            timeout=20,
        )
        b64 = result.data[0].b64_json
        if not b64:
            return None

        import base64
        decoded = cv2.imdecode(np.frombuffer(base64.b64decode(b64), np.uint8), cv2.IMREAD_COLOR)
        if decoded is None or decoded.shape[:2] != (h, w):
            return None
        return decoded
    except Exception:
        logger.exception("AI realism enhancement failed; falling back to OpenCV composite")
        return None
