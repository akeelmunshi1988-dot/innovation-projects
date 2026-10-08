"""
Write a compressed WebP copy next to every uploaded image in static/:
static/rugs/abc.png -> static/rugs/abc.png.webp. Originals are never touched.

nginx serves the .webp copy to browsers that send `Accept: image/webp` and
falls back to the original otherwise (see DEPLOYMENT.md, "WebP image
copies"), so no database URLs, upload routes or frontend code change.

Idempotent — a copy newer than its original is skipped — so it's safe to
re-run on every deploy and from cron to pick up new uploads:

    ./venv/bin/python optimize_images.py            # dry run: report savings only
    ./venv/bin/python optimize_images.py --apply    # write the .webp copies
"""
import argparse
import os
import sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image, ImageOps

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
SOURCE_EXTENSIONS = (".jpg", ".jpeg", ".png")
# Longest side. Most uploads are already under this; the cap only trims
# camera-sized originals while keeping the rug detail zoom view sharp.
MAX_DIMENSION = 2400
WEBP_QUALITY = 82


def _webp_path(path: str) -> str:
    return path + ".webp"


def _needs_copy(path: str) -> bool:
    target = _webp_path(path)
    return not os.path.exists(target) or os.path.getmtime(target) < os.path.getmtime(path)


def optimize(args: tuple[str, bool]) -> tuple[str, int, int, str]:
    """Returns (path, original bytes, webp bytes, status)."""
    path, apply = args
    original_size = os.path.getsize(path)
    try:
        with Image.open(path) as image:
            image = ImageOps.exif_transpose(image)  # browsers honour EXIF rotation on the original
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA" if "transparency" in image.info or image.mode in ("LA", "PA") else "RGB")
            image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
            tmp_path = _webp_path(path) + ".tmp"
            image.save(tmp_path, "WEBP", quality=WEBP_QUALITY, method=4)
    except Exception as exc:  # corrupt/unsupported upload — leave the original as the only copy
        return path, original_size, original_size, f"error: {exc}"

    webp_size = os.path.getsize(tmp_path)
    if webp_size >= original_size:
        os.remove(tmp_path)
        return path, original_size, original_size, "skipped (webp not smaller)"
    if apply:
        os.replace(tmp_path, _webp_path(path))
    else:
        os.remove(tmp_path)
    return path, original_size, webp_size, "written" if apply else "would write"


def run(apply: bool) -> None:
    sources = []
    for root, _dirs, files in os.walk(STATIC_DIR):
        for name in files:
            if name.lower().endswith(SOURCE_EXTENSIONS):
                path = os.path.join(root, name)
                if _needs_copy(path):
                    sources.append(path)

    if not sources:
        print("  . All images already have an up-to-date WebP copy")
        return

    total_before = total_after = 0
    with ProcessPoolExecutor() as pool:
        for path, before, after, status in pool.map(optimize, [(p, apply) for p in sources], chunksize=4):
            total_before += before
            total_after += after
            rel = os.path.relpath(path, STATIC_DIR)
            if status in ("written", "would write"):
                print(f"  + {rel}: {before / 1048576:.2f} MB -> {after / 1048576:.2f} MB ({status})")
            else:
                print(f"  . {rel}: {status}")

    saved = total_before - total_after
    print(
        f"\n{len(sources)} image(s): {total_before / 1048576:.1f} MB -> {total_after / 1048576:.1f} MB "
        f"({saved / 1048576:.1f} MB, {100 * saved / max(total_before, 1):.0f}% smaller)"
        + ("" if apply else " — dry run, nothing written. Re-run with --apply.")
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write the .webp copies (default is a dry run)")
    run(parser.parse_args().apply)
    sys.exit(0)
