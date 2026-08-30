#!/usr/bin/env python3
"""Watch a folder and create five room visualizations for every new rug image."""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import logging
import os
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Literal

import httpx
from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image, ImageOps
from pydantic import BaseModel, Field


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ROOM_VARIANTS = (
    ("living-room", "an elegant contemporary living room"),
    ("bedroom", "a calm premium bedroom"),
    ("dining-room", "a refined modern dining room"),
    ("study", "a sophisticated home study and reading room"),
    ("entryway", "a welcoming luxury entryway"),
)
COLLECTION_MAIN_FILENAME = "00-collection-main-transparent.png"


class CatalogMetadata(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=40, max_length=700)
    material_key: Literal["wool_silk_blend", "wool", "silk", "cotton", "synthetic"]
    weave_type: str = Field(min_length=3, max_length=80)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--watch-dir", type=Path, required=True)
    parser.add_argument("--env-file", type=Path, required=True)
    parser.add_argument(
        "--catalog-config",
        type=Path,
        default=Path(__file__).with_name("catalog_defaults.json"),
    )
    parser.add_argument("--poll-seconds", type=float, default=10)
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--prompt-catalog", action="store_true", help="Reopen catalog questionnaires that were previously cancelled")
    parser.add_argument("--update-catalog-id", type=int, help="Regenerate and replace only this catalog item's main image")
    parser.add_argument("--update-source", type=Path, help="Original rug image for --update-catalog-id; opens a file picker when omitted")
    return parser.parse_args()


def fingerprint(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_state(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        logging.exception("Could not read state file; starting with empty state")
        return {}


def save_state(path: Path, state: dict[str, dict[str, str]]) -> None:
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")
    temporary.replace(path)


def stable_images(watch_dir: Path) -> list[Path]:
    images: list[Path] = []
    for path in sorted(watch_dir.iterdir(), key=lambda item: item.name.lower()):
        if not path.is_file() or path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        first = path.stat()
        time.sleep(0.25)
        second = path.stat()
        if first.st_size == second.st_size and first.st_mtime_ns == second.st_mtime_ns:
            images.append(path)
    return images


def product_details(source: Path) -> str:
    """Turn a descriptive filename into readable product context for the model."""
    return " ".join(source.stem.replace("_", "-").split("-")).strip()


def build_collection_prompt(source: Path) -> str:
    details = product_details(source)
    return f"""Create the primary ecommerce catalog image for the supplied rug.

Product details inferred from the source filename: {details}.

Treat the supplied photograph as the authoritative product reference. Extract this exact physical rug; do not generate a replacement or reinterpret its appearance. Preserve the visible rug surface exactly as photographed, including its original design, colors, pattern geometry, weave, material appearance, pile, fiber texture, border, edge irregularities, tonal variation, wear, and handmade character. It must retain the natural photographic texture of the original and must not look digitally painted, airbrushed, sharpened into synthetic fibers, or AI-generated.

The only permitted transformations are: remove the surrounding scene/background, correct camera perspective, rotate the rug upright, center it, scale it to fit the portrait canvas, improve output resolution, and apply restrained photographic exposure and clarity correction. Show it straight-on from the front as a flat product cutout, with its long edge running top to bottom. Any enhancement must remain subtle and source-faithful; do not beautify, repair, clean, extend, reconstruct, simplify, or replace any portion of the rug. The entire rug and every original outer edge must be visible.

Composition: portrait ecommerce image, rug centered upright, symmetrical front-facing view, generous transparent margin on every side.

Background: genuinely transparent alpha channel, including all four corners; no colored, white, studio, floor, wall, or room background.

Quality: high-resolution commercial catalog extraction with authentic photographic weave and pile detail, natural edges, and color matching the source photograph. Favor source fidelity over visual perfection.

Avoid: text, labels, logos, watermark, furniture, people, props, room scene, floor, wall, drop shadow, folded edges, duplicate rugs, cropped rug, altered artwork, invented detail, cleaned-up or replaced motifs, uniform or synthetic texture, oversmoothing, recoloring, relighting, exaggerated contrast, tilted perspective, landscape orientation, checkerboard pattern, or an obviously generated appearance."""


def build_room_prompt(room_description: str, source: Path) -> str:
    details = product_details(source)
    return f"""Create a photorealistic, high-end room visualizer using the supplied rug image.

Product details inferred from the source filename: {details}.

Place this exact rug naturally on the floor in {room_description}. Preserve the rug's design, colors, pattern, texture, proportions, and border accurately; do not redesign or crop it. Match realistic perspective, scale, shadows, pile texture, and room lighting so it looks physically present in the scene.

Composition: wide landscape editorial interior photograph, complete rug clearly visible, balanced furniture placement, premium but lived-in styling, uncluttered room, natural daylight plus warm ambient light.

Quality: high-resolution commercial interior photography, sharp material detail, realistic surfaces and shadows.

Avoid: text, logos, watermarks, people, duplicate rugs, distorted geometry, altered rug artwork, oversaturation, or an obviously composited appearance."""


def generate_catalog_metadata(client: OpenAI, source: Path) -> CatalogMetadata:
    with Image.open(source) as original:
        preview = ImageOps.exif_transpose(original).convert("RGB")
        preview.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        encoded = io.BytesIO()
        preview.save(encoded, format="JPEG", quality=90, optimize=True)

    image_url = "data:image/jpeg;base64," + base64.b64encode(encoded.getvalue()).decode("ascii")
    filename_details = product_details(source)
    prompt = f"""Create ecommerce catalog metadata for this rug.

Source filename: {source.name}
Filename details: {filename_details}

Use both the filename and visible rug. The title must be concise and customer-facing. The description must be 2–3 polished sentences describing construction, style, palette, texture, and suitable interiors without inventing dimensions, provenance certifications, prices, or care guarantees. Select the closest material_key. Normalize weave_type to values such as hand-knotted, hand-tufted, flatweave, hand-woven, or machine-woven. If the filename says Handknotted, weave_type must be hand-knotted."""

    response = client.responses.parse(
        model="gpt-5-mini",
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "image_url": image_url, "detail": "high"},
                ],
            }
        ],
        text_format=CatalogMetadata,
        store=False,
        timeout=180,
    )
    if not response.output_parsed:
        raise RuntimeError(f"The metadata model returned no structured data for {source.name}")
    return response.output_parsed


def load_catalog_config(path: Path) -> dict:
    with path.expanduser().open(encoding="utf-8") as source:
        config = json.load(source)
    required = {"api_base_url", "material_ids", "base_prices", "sizes"}
    missing = required.difference(config)
    if missing:
        raise ValueError(f"Catalog config is missing: {', '.join(sorted(missing))}")
    return config


def macos_prompt(message: str, default: str = "") -> str | None:
    """Display one native text prompt; None means the user cancelled."""
    script = (
        f'set dialogResult to display dialog {json.dumps(message, ensure_ascii=False)} default answer {json.dumps(default, ensure_ascii=False)} '
        'buttons {"Cancel", "Continue"} default button "Continue" with title "DreamRugs Catalog"\n'
        'return text returned of dialogResult'
    )
    result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
    if result.returncode != 0:
        logging.warning("Catalog text prompt failed/cancelled (%s): %s", message, result.stderr.strip())
    return result.stdout.strip() if result.returncode == 0 else None


def macos_choose(message: str, choices: list[str], default: str) -> str | None:
    rendered = ", ".join(json.dumps(choice, ensure_ascii=False) for choice in choices)
    script = (
        f'set picked to choose from list {{{rendered}}} with prompt {json.dumps(message, ensure_ascii=False)} '
        f'default items {{{json.dumps(default, ensure_ascii=False)}}} with title "DreamRugs Catalog"\n'
        'if picked is false then error number -128\nreturn item 1 of picked'
    )
    result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
    if result.returncode != 0:
        logging.warning("Catalog choice prompt failed/cancelled (%s): %s", message, result.stderr.strip())
    return result.stdout.strip() if result.returncode == 0 else None


def choose_update_source(watch_dir: Path) -> Path | None:
    script = (
        f'set picked to choose file with prompt "Select the original rug image" default location POSIX file {json.dumps(str(watch_dir))}\n'
        'return POSIX path of picked'
    )
    result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
    if result.returncode != 0:
        return None
    return Path(result.stdout.strip()).expanduser().resolve()


def confirm_main_image_update(catalog_id: int, source: Path) -> bool:
    message = f"Replace only the main image of catalog ID {catalog_id} using {source.name}? Gallery images and catalog details will not change."
    script = (
        f'display dialog {json.dumps(message, ensure_ascii=False)} '
        'buttons {"Cancel", "Update Main Image"} default button "Update Main Image" with title "DreamRugs Catalog Update"\n'
        'return button returned of result'
    )
    result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
    return result.returncode == 0 and result.stdout.strip() == "Update Main Image"


def collect_catalog_config(metadata: CatalogMetadata, defaults: dict) -> tuple[CatalogMetadata, dict] | None:
    """Collect every non-image catalog field after a folder's six images exist."""
    title = macos_prompt("Catalog title", metadata.title)
    if title is None:
        return None
    description = macos_prompt("Catalog description", metadata.description)
    if description is None:
        return None
    material_keys = list(defaults["material_ids"])
    material_key = macos_choose("Select material", material_keys, metadata.material_key)
    if material_key is None:
        return None
    weave_type = macos_prompt("Weave type", metadata.weave_type)
    if weave_type is None:
        return None
    sizes_text = macos_prompt(
        "Available sizes in feet, separated by commas",
        ", ".join(str(size["ft"]) for size in defaults["sizes"]),
    )
    if sizes_text is None:
        return None
    size_labels = [value.strip() for value in sizes_text.split(",") if value.strip()]
    if not size_labels:
        raise ValueError("At least one catalog size is required")

    sizes = []
    for index, label in enumerate(size_labels):
        while True:
            price_text = macos_prompt(f"Total selling price for {label} ft", "")
            if price_text is None:
                return None
            try:
                price = float(price_text.replace(",", ""))
                if price < 0:
                    raise ValueError
                break
            except ValueError:
                subprocess.run(["osascript", "-e", 'display alert "Enter a valid non-negative price."'], check=False)
        while True:
            lead_time_text = macos_prompt(
                f"Expected delivery time in days for {label} ft",
                str(defaults.get("lead_time_days", 21)),
            )
            if lead_time_text is None:
                return None
            try:
                lead_time_days = int(lead_time_text)
                if lead_time_days < 1:
                    raise ValueError
                break
            except ValueError:
                subprocess.run(["osascript", "-e", 'display alert "Enter valid delivery days (1 or more)."'], check=False)
        sizes.append({
            "ft": label, "cm": None, "price": price,
            "lead_time_days": lead_time_days, "is_default": index == 0,
        })

    currency = macos_prompt("Price currency", defaults.get("base_price_currency", "INR"))
    if currency is None:
        return None
    room_types = macos_prompt("Room tags, separated by commas", ", ".join(slug for slug, _ in ROOM_VARIANTS))
    if room_types is None:
        return None
    mood_tags = macos_prompt("Mood tags, separated by commas", ", ".join(defaults.get("mood_tags", [])))
    if mood_tags is None:
        return None

    chosen_metadata = CatalogMetadata(
        title=title.strip(), description=description.strip(), material_key=material_key, weave_type=weave_type.strip(),
    )
    job_config = dict(defaults)
    job_config.update({
        "sizes": sizes,
        "base_price_currency": currency.strip().upper(),
        "lead_time_days": sizes[0]["lead_time_days"],
        "room_types": [value.strip() for value in room_types.split(",") if value.strip()],
        "mood_tags": [value.strip() for value in mood_tags.split(",") if value.strip()],
    })
    job_config["base_prices"] = dict(defaults.get("base_prices", {}))
    job_config["base_prices"][material_key] = next(size["price"] for size in sizes if size["is_default"])
    return chosen_metadata, job_config


def upload_catalog_image(http: httpx.Client, path: Path) -> str:
    with path.open("rb") as image_file:
        response = http.post(
            "/catalog/upload-image",
            files={"file": (path.name, image_file, "image/png")},
        )
    response.raise_for_status()
    return response.json()["url"]


def sync_catalog(
    source: Path,
    output_root: Path,
    metadata: CatalogMetadata,
    config: dict,
    state: dict[str, dict],
    state_key: str,
    state_path: Path,
) -> None:
    api_key = os.getenv("CATALOG_API_KEY")
    if not api_key:
        raise RuntimeError("CATALOG_API_KEY is missing; run setup_catalog_api_key.py")

    entry = state.setdefault(state_key, {})
    destination = output_root / source.stem
    headers = {"X-Api-Key": api_key}
    with httpx.Client(base_url=config["api_base_url"].rstrip("/"), headers=headers, timeout=120) as http:
        if entry.get("main_image_filename") != COLLECTION_MAIN_FILENAME:
            entry["main_image_url"] = upload_catalog_image(http, destination / COLLECTION_MAIN_FILENAME)
            entry["main_image_filename"] = COLLECTION_MAIN_FILENAME
            entry["catalog_cover_updated"] = False
            save_state(state_path, state)

        if not entry.get("catalog_id"):
            material_id = config["material_ids"][metadata.material_key]
            payload = {
                "name": metadata.title,
                "description": metadata.description,
                "sizes": config["sizes"],
                "base_price": config["base_prices"][metadata.material_key],
                "base_price_currency": config.get("base_price_currency", "INR"),
                "material_id": material_id,
                "pile_height": config.get("pile_height"),
                "weave_type": metadata.weave_type,
                "lead_time_days": config.get("lead_time_days", 21),
                "image_url": entry["main_image_url"],
                "room_types": config.get("room_types", [slug for slug, _ in ROOM_VARIANTS]),
                "mood_tags": config.get("mood_tags", []),
            }
            response = http.post("/catalog", json=payload)
            response.raise_for_status()
            entry["catalog_id"] = response.json()["id"]
            entry["metadata"] = metadata.model_dump()
            entry["gallery_uploaded"] = []
            entry["catalog_cover_updated"] = True
            save_state(state_path, state)
            logging.info("Created catalog rug %s with id %s", metadata.title, entry["catalog_id"])

        if not entry.get("catalog_cover_updated"):
            response = http.put(
                f"/catalog/{entry['catalog_id']}",
                json={
                    "name": metadata.title,
                    "description": metadata.description,
                    "material_id": config["material_ids"][metadata.material_key],
                    "weave_type": metadata.weave_type,
                    "image_url": entry["main_image_url"],
                },
            )
            response.raise_for_status()
            entry["catalog_cover_updated"] = True
            save_state(state_path, state)
            logging.info("Updated catalog id %s with transparent portrait cover", entry["catalog_id"])

        uploaded = set(entry.get("gallery_uploaded", []))
        for index, (slug, _) in enumerate(ROOM_VARIANTS, start=1):
            filename = f"{index:02d}-{slug}.png"
            if filename in uploaded:
                continue
            image_url = upload_catalog_image(http, destination / filename)
            response = http.post(
                f"/catalog/{entry['catalog_id']}/images",
                json={"image_url": image_url, "sort_order": index},
            )
            response.raise_for_status()
            uploaded.add(filename)
            entry["gallery_uploaded"] = sorted(uploaded)
            save_state(state_path, state)
            logging.info("Added gallery image %s to catalog id %s", filename, entry["catalog_id"])

    entry["catalog_synced"] = True
    save_state(state_path, state)


def generate_main_image(client: OpenAI, source: Path, output: Path) -> None:
    """Generate one fresh, source-faithful catalog cover without touching gallery assets."""
    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as original, tempfile.NamedTemporaryFile(suffix=".png") as normalized_file:
        normalized = ImageOps.exif_transpose(original).convert("RGB")
        normalized.save(normalized_file, format="PNG", optimize=True)
        normalized_file.flush()
        normalized_file.seek(0)
        response = client.images.edit(
            model="gpt-image-2",
            image=(f"{source.stem}.png", normalized_file, "image/png"),
            prompt=build_collection_prompt(source),
            quality="high",
            size="1024x1536",
            background="transparent",
            output_format="png",
            n=1,
            timeout=600,
        )
    if not response.data or not response.data[0].b64_json:
        raise RuntimeError(f"The API returned no main image data for {source.name}")
    output.write_bytes(base64.b64decode(response.data[0].b64_json))


def update_catalog_main_image(client: OpenAI, source: Path, output_root: Path, catalog_id: int, config: dict) -> None:
    if catalog_id < 1:
        raise ValueError("Catalog ID must be a positive integer")
    if not source.is_file() or source.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError("Select an existing JPG, JPEG, PNG, or WebP original image")
    api_key = os.getenv("CATALOG_API_KEY")
    if not api_key:
        raise RuntimeError("CATALOG_API_KEY is missing; run setup_catalog_api_key.py")

    timestamp = time.strftime("%Y%m%d-%H%M%S")
    output = output_root / source.stem / f"00-collection-main-catalog-{catalog_id}-{timestamp}.png"
    logging.info("Generating a fresh natural main image for catalog id %s from %s", catalog_id, source.name)
    generate_main_image(client, source, output)

    headers = {"X-Api-Key": api_key}
    with httpx.Client(base_url=config["api_base_url"].rstrip("/"), headers=headers, timeout=120) as http:
        image_url = upload_catalog_image(http, output)
        response = http.put(f"/catalog/{catalog_id}", json={"image_url": image_url})
        response.raise_for_status()
    logging.info("Updated only the main image for catalog id %s: %s", catalog_id, image_url)
    print(f"Catalog {catalog_id} main image updated: {image_url}")


def process_image(client: OpenAI, source: Path, output_root: Path) -> None:
    destination = output_root / source.stem
    destination.mkdir(parents=True, exist_ok=True)
    logging.info("Processing %s", source.name)

    jobs = [(COLLECTION_MAIN_FILENAME, "collection-main", build_collection_prompt(source), "1024x1536", "transparent")]
    jobs.extend(
        (f"{index:02d}-{slug}.png", slug, build_room_prompt(description, source), "1536x1024", "opaque")
        for index, (slug, description) in enumerate(ROOM_VARIANTS, start=1)
    )

    for filename, label, prompt, size, background in jobs:
        output = destination / filename
        if output.exists():
            logging.info("Skipping existing output %s", output.name)
            continue

        logging.info("Generating %s for %s using filename details: %s", label, source.name, product_details(source))
        # iPhone photos can be MPO containers despite using a .JPG extension.
        # Normalize every input to a plain, orientation-correct RGB PNG so the
        # Images API receives a consistently supported file mode and format.
        with Image.open(source) as original, tempfile.NamedTemporaryFile(suffix=".png") as normalized_file:
            normalized = ImageOps.exif_transpose(original).convert("RGB")
            normalized.save(normalized_file, format="PNG", optimize=True)
            normalized_file.flush()
            normalized_file.seek(0)
            response = client.images.edit(
                model="gpt-image-2",
                image=(f"{source.stem}.png", normalized_file, "image/png"),
                prompt=prompt,
                quality="high",
                size=size,
                background=background,
                output_format="png",
                n=1,
                timeout=600,
            )

        if not response.data or not response.data[0].b64_json:
            raise RuntimeError(f"The API returned no image data for {source.name}: {slug}")
        output.write_bytes(base64.b64decode(response.data[0].b64_json))
        logging.info("Saved %s", output)


def run(args: argparse.Namespace) -> None:
    watch_dir = args.watch_dir.expanduser().resolve()
    watch_dir.mkdir(parents=True, exist_ok=True)
    output_root = watch_dir / "RoomVisualizerOutputs"
    output_root.mkdir(exist_ok=True)
    state_path = output_root / ".processed.json"

    load_dotenv(args.env_file.expanduser())
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit(f"OPENAI_API_KEY is missing from {args.env_file}")

    client = OpenAI()
    catalog_defaults = load_catalog_config(args.catalog_config)
    if args.update_catalog_id is not None:
        source = args.update_source.expanduser().resolve() if args.update_source else choose_update_source(watch_dir)
        if source is None:
            logging.info("Catalog main-image update cancelled")
            return
        if not confirm_main_image_update(args.update_catalog_id, source):
            logging.info("Catalog main-image update cancelled")
            return
        update_catalog_main_image(client, source, output_root, args.update_catalog_id, catalog_defaults)
        return

    state = load_state(state_path)
    logging.info("Watching %s", watch_dir)

    while True:
        for source in stable_images(watch_dir):
            key = str(source)
            try:
                current_fingerprint = fingerprint(source)
                destination = output_root / source.stem
                expected_outputs = [destination / COLLECTION_MAIN_FILENAME]
                expected_outputs.extend(
                    destination / f"{index:02d}-{slug}.png"
                    for index, (slug, _) in enumerate(ROOM_VARIANTS, start=1)
                )
                assets_ready = (
                    state.get(key, {}).get("sha256") == current_fingerprint
                    and all(path.exists() for path in expected_outputs)
                )
                entry = state.setdefault(key, {})
                if assets_ready and entry.get("catalog_synced") is True:
                    continue
                if assets_ready and entry.get("catalog_prompt_cancelled") and not args.prompt_catalog:
                    continue
                process_image(client, source, output_root)
                metadata_payload = entry.get("metadata")
                metadata = CatalogMetadata.model_validate(metadata_payload) if metadata_payload else generate_catalog_metadata(client, source)
                entry["metadata"] = metadata.model_dump()
                entry["sha256"] = current_fingerprint
                entry["assets_processed"] = True
                save_state(state_path, state)

                questionnaire = collect_catalog_config(metadata, catalog_defaults)
                if questionnaire is None:
                    entry["catalog_prompt_cancelled"] = True
                    entry["catalog_synced"] = False
                    save_state(state_path, state)
                    logging.info("Catalog questionnaire cancelled for %s; run ctl.sh catalog to reopen it", source.name)
                    continue
                chosen_metadata, job_config = questionnaire
                entry["metadata"] = chosen_metadata.model_dump()
                entry["catalog_prompt_cancelled"] = False
                save_state(state_path, state)
                sync_catalog(source, output_root, chosen_metadata, job_config, state, key, state_path)
                entry["completed_at"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
                save_state(state_path, state)
            except Exception:
                logging.exception("Failed to process %s; it will be retried", source.name)

        if args.once:
            return
        time.sleep(args.poll_seconds)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run(parse_args())
