"""
Composites a rug image onto the fixed luxury living room photo using
OpenCV's perspective transform (warpPerspective). Returns JPEG bytes.
"""

import cv2
import numpy as np
import requests
import io
import os

# ── Room image config ──────────────────────────────────────────────────────────
ROOM_LOCAL = "/Applications/RugManufactureCustomApp/frontend/public/room-canvas.jpg"
ROOM_FALLBACK_URL = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1400&q=85"

# Floor region (percentages of room image dimensions)
FLOOR = {"x": 8, "y": 58, "width": 80, "height": 30}
PERSPECTIVE = 0.72  # top edge width as fraction of bottom (room-specific)

# ── Simple in-memory caches ────────────────────────────────────────────────────
_room: np.ndarray | None = None
_rug_cache: dict[str, np.ndarray] = {}
_composite_cache: dict[str, bytes] = {}


def _load_room() -> np.ndarray:
    global _room
    if _room is not None:
        return _room
    if os.path.exists(ROOM_LOCAL):
        img = cv2.imread(ROOM_LOCAL)
    else:
        r = requests.get(ROOM_FALLBACK_URL, timeout=12)
        arr = np.frombuffer(r.content, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError("Could not load room image")
    _room = img
    return _room


def _load_rug(url: str) -> np.ndarray:
    if url in _rug_cache:
        return _rug_cache[url]
    if url.startswith("/"):
        path = f"/Applications/RugManufactureCustomApp/frontend/public{url}"
        img = cv2.imread(path)
        if img is None:
            raise FileNotFoundError(f"Rug image not found at {path}")
    else:
        r = requests.get(url, timeout=12)
        arr = np.frombuffer(r.content, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError(f"Could not decode rug image: {url}")
    _rug_cache[url] = img
    return img


def compose(rug_image_url: str, opacity: float = 0.90) -> bytes:
    """Return JPEG bytes of the room with the rug placed on the floor."""
    cache_key = f"{rug_image_url}|{round(opacity, 2)}"
    if cache_key in _composite_cache:
        return _composite_cache[cache_key]

    room = _load_room().copy()
    rug = _load_rug(rug_image_url)

    room_h, room_w = room.shape[:2]
    rug_h, rug_w = rug.shape[:2]

    # Convert floor-region percentages → pixel coordinates
    rx = int(FLOOR["x"] / 100 * room_w)
    ry = int(FLOOR["y"] / 100 * room_h)
    rw = int(FLOOR["width"] / 100 * room_w)
    rh = int(FLOOR["height"] / 100 * room_h)

    # Trapezoid: top edge is narrower (perspective — farther away)
    cx = rx + rw // 2
    top_w = int(rw * PERSPECTIVE)
    top_x = cx - top_w // 2

    # Rug source corners (rectangle)
    src = np.float32([[0, 0], [rug_w, 0], [rug_w, rug_h], [0, rug_h]])

    # Floor destination corners (trapezoid)
    dst = np.float32([
        [top_x,          ry],
        [top_x + top_w,  ry],
        [rx + rw,        ry + rh],
        [rx,             ry + rh],
    ])

    # ── Perspective warp ──────────────────────────────────────────────────────
    M = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(rug, M, (room_w, room_h),
                                  flags=cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_CONSTANT)

    # ── Rug mask (filled trapezoid) ───────────────────────────────────────────
    mask = np.zeros((room_h, room_w), dtype=np.float32)
    cv2.fillConvexPoly(mask, dst.astype(np.int32), 1.0)

    # ── Atmospheric depth shading ─────────────────────────────────────────────
    # The top of the rug (farther away) is slightly darker.
    depth = np.ones((room_h, room_w), dtype=np.float32)
    for y in range(ry, min(ry + rh, room_h)):
        t = (y - ry) / max(rh - 1, 1)           # 0 at top, 1 at bottom
        depth[y, :] = 0.62 + 0.38 * t            # 0.62 → 1.0

    # ── Drop shadow just outside the rug perimeter ────────────────────────────
    shadow_pts = np.float32([
        [top_x - 6,         ry + 3],
        [top_x + top_w + 6, ry + 3],
        [rx + rw + 12,      ry + rh + 10],
        [rx - 12,           ry + rh + 10],
    ])
    shadow = np.zeros((room_h, room_w), dtype=np.float32)
    cv2.fillConvexPoly(shadow, shadow_pts.astype(np.int32), 0.50)
    shadow = cv2.GaussianBlur(shadow, (25, 25), 0)
    shadow *= (1 - mask)  # only outside the rug

    # ── Composite ─────────────────────────────────────────────────────────────
    room_f  = room.astype(np.float32)
    warp_f  = warped.astype(np.float32)

    alpha_3 = np.stack([mask * opacity] * 3, axis=2)
    depth_3 = np.stack([depth] * 3, axis=2)
    shade_3 = np.stack([shadow] * 3, axis=2)

    # 1. Apply drop shadow to room
    result = room_f * (1.0 - shade_3)
    # 2. Blend perspective-warped rug with depth shading
    result = result * (1.0 - alpha_3) + warp_f * alpha_3 * depth_3

    result = result.clip(0, 255).astype(np.uint8)

    _, buf = cv2.imencode(".jpg", result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    jpeg = buf.tobytes()
    _composite_cache[cache_key] = jpeg
    return jpeg


def room_only() -> bytes:
    """Return the bare room image as JPEG bytes (no rug)."""
    if "room_only" in _composite_cache:
        return _composite_cache["room_only"]
    room = _load_room()
    _, buf = cv2.imencode(".jpg", room, [cv2.IMWRITE_JPEG_QUALITY, 88])
    data = buf.tobytes()
    _composite_cache["room_only"] = data
    return data


def bust_cache() -> None:
    """Call after updating room or rug images."""
    global _room, _composite_cache
    _room = None
    _composite_cache.clear()
