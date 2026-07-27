"""
Filter construction photos to top-quality COMPLETED work only.
- COPIES only (never moves/deletes originals)
- Rejects documents, contracts, paper, personal/people-heavy shots
- Prefers finished portfolio-style construction photos
"""
from __future__ import annotations

import csv
import hashlib
import shutil
import time
from pathlib import Path

import torch
from PIL import Image, ImageFile, UnidentifiedImageError
from transformers import CLIPModel, CLIPProcessor

ImageFile.LOAD_TRUNCATED_IMAGES = True
Image.MAX_IMAGE_PIXELS = 400_000_000

SOURCE = Path(r"C:\Users\Studs_House\Pictures\Cleaned Organized Images\CONSTRUCTION_FROM_2021-06")
DEST = Path(r"C:\Users\Studs_House\Pictures\Cleaned Organized Images\PORTFOLIO_BEST_QUALITY")
LOG = DEST / "_portfolio_filter_log.csv"
PROGRESS = DEST / "_progress.txt"
ERROR_LOG = DEST / "_errors.txt"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff", ".heic", ".heif"}

# Output category folders for kept photos
KEEP_FOLDERS = [
    "decks",
    "screen_porches",
    "additions",
    "siding_exterior",
    "houses",
    "completed_other",
]

# CLIP labels — first group = KEEP if best; rest = REJECT
LABELS = [
    # KEEP — finished construction that looks portfolio-ready
    (
        "keep_deck",
        "a high quality photo of a finished completed wooden deck outdoor living space no people no documents",
    ),
    (
        "keep_screen_porch",
        "a high quality photo of a finished screened porch or sunroom completed construction",
    ),
    (
        "keep_house_addition",
        "a high quality photo of a finished house exterior or completed home addition construction project",
    ),
    (
        "keep_siding",
        "a high quality photo of finished house siding exterior completed cladding work",
    ),
    (
        "keep_finished_build",
        "a professional portfolio photo of completed residential construction finished craftsmanship",
    ),
    # REJECT
    (
        "reject_document",
        "a paper document contract form invoice receipt estimate spreadsheet text page scanned paperwork",
    ),
    (
        "reject_screenshot",
        "a phone screenshot computer screen app interface email text message UI",
    ),
    (
        "reject_personal",
        "a personal photo selfie people faces family party kids pets closeup of a person",
    ),
    (
        "reject_unfinished",
        "unfinished construction framing bare studs lumber piles tools mess incomplete job site",
    ),
    (
        "reject_materials_only",
        "building materials only lumber stack tools equipment no finished structure",
    ),
    (
        "reject_low_quality",
        "blurry dark grainy obstructed low quality bad photo useless snapshot",
    ),
    (
        "reject_unrelated",
        "food car interior unrelated random object not construction work",
    ),
]

KEEP_LABELS = {
    "keep_deck",
    "keep_screen_porch",
    "keep_house_addition",
    "keep_siding",
    "keep_finished_build",
}

# Map keep labels → folder
LABEL_TO_FOLDER = {
    "keep_deck": "decks",
    "keep_screen_porch": "screen_porches",
    "keep_house_addition": "houses",  # refined below with source folder
    "keep_siding": "siding_exterior",
    "keep_finished_build": "completed_other",
}

MIN_KEEP_CONF = 0.28  # softmax among all labels
MIN_SIDE = 500  # reject tiny images
MIN_BYTES = 40_000  # ~40KB — skip tiny junk
BATCH = 8


def setup_heif():
    try:
        from pillow_heif import register_heif_opener

        register_heif_opener()
    except Exception:
        pass


def unique_dest(folder: Path, src: Path) -> Path:
    candidate = folder / src.name
    if not candidate.exists():
        return candidate
    h = hashlib.md5(str(src).encode("utf-8")).hexdigest()[:8]
    return folder / f"{src.stem}_{h}{src.suffix}"


def list_images(root: Path) -> list[tuple[Path, str]]:
    """Return (path, source_category_folder_name)."""
    out = []
    for p in sorted(root.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in IMAGE_EXTS:
            continue
        # parent folder is category under CONSTRUCTION_FROM_2021-06
        cat = p.parent.name
        if cat.startswith("_"):
            continue
        out.append((p, cat))
    return out


def load_image(path: Path) -> Image.Image | None:
    try:
        if path.stat().st_size < MIN_BYTES:
            return None
        img = Image.open(path).convert("RGB")
        w, h = img.size
        if min(w, h) < MIN_SIDE:
            return None
        max_side = 1024
        if max(w, h) > max_side:
            img.thumbnail((max_side, max_side), Image.Resampling.BILINEAR)
        return img
    except Exception as e:
        with open(ERROR_LOG, "a", encoding="utf-8") as f:
            f.write(f"{path}\t{type(e).__name__}: {e}\n")
        return None


def prefer_folder(keep_label: str, source_cat: str) -> str:
    """Use original construction category when it is a keep category."""
    if source_cat in KEEP_FOLDERS and source_cat != "completed_other":
        # Screen porches / decks / etc. keep source taxonomy if sensible
        if source_cat == "decks" and keep_label in ("keep_deck", "keep_finished_build"):
            return "decks"
        if source_cat == "screen_porches":
            return "screen_porches"
        if source_cat == "siding_exterior" and keep_label in ("keep_siding", "keep_finished_build", "keep_house_addition"):
            return "siding_exterior"
        if source_cat in ("houses", "additions") and keep_label in (
            "keep_house_addition",
            "keep_finished_build",
            "keep_siding",
        ):
            return source_cat
        if source_cat == "decks":
            return "decks"
    return LABEL_TO_FOLDER.get(keep_label, "completed_other")


def main():
    setup_heif()
    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.mkdir(parents=True)
    for name in KEEP_FOLDERS:
        (DEST / name).mkdir(exist_ok=True)
    (DEST / "_rejected_preview_log_only").mkdir(exist_ok=True)  # no files stored here

    print("Loading CLIP...", flush=True)
    model_name = "openai/clip-vit-base-patch32"
    device = "cpu"
    processor = CLIPProcessor.from_pretrained(model_name)
    model = CLIPModel.from_pretrained(model_name)
    model.eval()

    texts = [t for _, t in LABELS]
    label_names = [n for n, _ in LABELS]

    with torch.no_grad():
        ti = processor(text=texts, return_tensors="pt", padding=True)
        raw = model.get_text_features(**ti)
        if not torch.is_tensor(raw):
            text_out = model.text_model(
                input_ids=ti["input_ids"],
                attention_mask=ti.get("attention_mask"),
            )
            pooled = text_out.pooler_output
            text_features = model.text_projection(pooled)
        else:
            text_features = raw
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)

    images = list_images(SOURCE)
    total = len(images)
    print(f"Scanning {total} construction photos from {SOURCE}", flush=True)

    log_f = open(LOG, "w", newline="", encoding="utf-8")
    writer = csv.DictWriter(
        log_f,
        fieldnames=[
            "source",
            "source_category",
            "decision",
            "best_label",
            "confidence",
            "second",
            "second_conf",
            "dest",
        ],
    )
    writer.writeheader()

    kept = 0
    rejected = 0
    skipped = 0
    start = time.time()
    batch_paths: list[tuple[Path, str]] = []
    batch_imgs: list[Image.Image] = []

    def flush():
        nonlocal kept, rejected, skipped, batch_paths, batch_imgs
        if not batch_imgs:
            return
        with torch.no_grad():
            inputs = processor(images=batch_imgs, return_tensors="pt", padding=True)
            raw_i = model.get_image_features(pixel_values=inputs["pixel_values"])
            if not torch.is_tensor(raw_i):
                vo = model.vision_model(pixel_values=inputs["pixel_values"])
                pooled = vo.pooler_output
                imf = model.visual_projection(pooled)
            else:
                imf = raw_i
            imf = imf / imf.norm(dim=-1, keepdim=True)
            probs = (imf @ text_features.T * 100.0).softmax(dim=-1).cpu()

        for i, (path, src_cat) in enumerate(batch_paths):
            scores = probs[i]
            best_i = int(scores.argmax().item())
            best_conf = float(scores[best_i].item())
            top2 = torch.topk(scores, k=2)
            second_i = int(top2.indices[1].item())
            second_conf = float(top2.values[1].item())
            best_label = label_names[best_i]
            second_label = label_names[second_i]

            is_keep = best_label in KEEP_LABELS and best_conf >= MIN_KEEP_CONF
            # Extra guard: if second is a strong reject document/personal, drop
            if is_keep and second_label.startswith("reject_") and second_conf > best_conf * 0.85:
                if second_label in ("reject_document", "reject_screenshot", "reject_personal"):
                    is_keep = False

            dest_path = ""
            if is_keep:
                folder_name = prefer_folder(best_label, src_cat)
                # Never put unfinished source categories into keep without finished label
                if src_cat in ("framing_structure", "roofing", "interiors") and best_label not in (
                    "keep_finished_build",
                    "keep_house_addition",
                    "keep_deck",
                    "keep_siding",
                    "keep_screen_porch",
                ):
                    is_keep = False

            if is_keep:
                dest_folder = DEST / folder_name
                dest_path = str(unique_dest(dest_folder, path))
                shutil.copy2(path, dest_path)
                kept += 1
                decision = "KEEP"
            else:
                rejected += 1
                decision = "REJECT"

            writer.writerow(
                {
                    "source": str(path),
                    "source_category": src_cat,
                    "decision": decision,
                    "best_label": best_label,
                    "confidence": f"{best_conf:.4f}",
                    "second": second_label,
                    "second_conf": f"{second_conf:.4f}",
                    "dest": dest_path,
                }
            )

        log_f.flush()
        done = kept + rejected + skipped
        batch_paths = []
        batch_imgs = []
        if done % 40 == 0 or done >= total:
            elapsed = time.time() - start
            rate = done / elapsed if elapsed else 0
            msg = f"[{done}/{total}] kept={kept} rejected={rejected} {rate:.1f}/s"
            print(msg, flush=True)
            PROGRESS.write_text(msg + "\n", encoding="utf-8")

    for path, src_cat in images:
        # Hard skip unfinished categories unless they somehow look finished
        img = load_image(path)
        if img is None:
            skipped += 1
            writer.writerow(
                {
                    "source": str(path),
                    "source_category": src_cat,
                    "decision": "SKIP_SIZE_OR_ERROR",
                    "best_label": "",
                    "confidence": "0",
                    "second": "",
                    "second_conf": "0",
                    "dest": "",
                }
            )
            continue
        batch_paths.append((path, src_cat))
        batch_imgs.append(img)
        if len(batch_imgs) >= BATCH:
            flush()
    flush()
    log_f.close()

    print("\n=== PORTFOLIO BEST QUALITY ===", flush=True)
    for name in KEEP_FOLDERS:
        n = len(list((DEST / name).glob("*")))
        print(f"  {name}: {n}", flush=True)
    print(f"Kept: {kept} | Rejected: {rejected} | Skipped: {skipped}", flush=True)
    print(f"Output: {DEST}", flush=True)

    readme = DEST / "README.txt"
    readme.write_text(
        f"""PORTFOLIO BEST QUALITY — completed construction only
====================================================
Source pool: {SOURCE}
Filter:      CLIP vision — finished work only
Excluded:    documents, contracts, screenshots, personal/people photos,
             unfinished framing, materials-only, low quality / tiny images
Action:      COPIED only — nothing moved from source

Kept: {kept}
Rejected: {rejected}
Skipped (size/error): {skipped}

Review folders before publishing to the website.
Log: {LOG}
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
