"""
Organize construction photos from ALL_PHOTOS into category folders using CLIP vision.
Copies (does not move/delete) originals. Writes a CSV log of decisions.
"""
from __future__ import annotations

import csv
import hashlib
import os
import shutil
import sys
import time
from pathlib import Path

import torch
from PIL import Image, ImageFile, UnidentifiedImageError
from transformers import CLIPModel, CLIPProcessor

ImageFile.LOAD_TRUNCATED_IMAGES = True
# Allow very large job-site photos (some phone panoramas exceed default limit)
Image.MAX_IMAGE_PIXELS = 400_000_000

# ---------- paths ----------
SOURCE = Path(r"C:\Users\Studs_House\Pictures\Cleaned Organized Images\ALL_PHOTOS")
DEST = Path(r"C:\Users\Studs_House\Pictures\Cleaned Organized Images\ORGANIZED_BY_CATEGORY")
LOG = DEST / "_classification_log.csv"
PROGRESS = DEST / "_progress.txt"
ERROR_LOG = DEST / "_errors.txt"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff", ".heic", ".heif"}

# Zero-shot labels: (folder_name, prompt)
# Order matters only for display; scores decide.
LABELS = [
    ("decks", "a wooden deck patio porch outdoor deck construction project"),
    ("screen_porches", "a screened porch sunroom enclosed porch with screens"),
    ("additions", "a home addition room addition house expansion construction"),
    ("siding_exterior", "house siding exterior wall vinyl siding Hardie board installation"),
    ("houses", "a finished custom house exterior residential home construction"),
    ("framing_structure", "wood framing lumber studs building frame construction job site"),
    ("interiors", "home interior remodeling drywall kitchen bathroom construction"),
    ("roofing", "roof construction roofing shingles roof framing"),
    ("landscaping_outdoor", "landscaping yard patio outdoor living without a deck"),
    ("not_construction", "personal photo people selfie food car pet party screenshot document text"),
]

# Minimum score margin: best label must beat "not_construction" or be clearly construction
MIN_CONF = 0.22
# If best is not_construction, still skip unless second is much higher (handled by best pick)

BATCH_SIZE = 8  # CPU-friendly


def setup_heif():
    try:
        from pillow_heif import register_heif_opener

        register_heif_opener()
    except Exception as e:
        print(f"HEIF support not available: {e}", flush=True)


def ensure_dirs():
    DEST.mkdir(parents=True, exist_ok=True)
    for name, _ in LABELS:
        (DEST / name).mkdir(exist_ok=True)
    (DEST / "_low_confidence").mkdir(exist_ok=True)


def list_images(root: Path) -> list[Path]:
    files = []
    for dirpath, _, filenames in os.walk(root):
        for name in filenames:
            p = Path(dirpath) / name
            if p.suffix.lower() in IMAGE_EXTS:
                # Prefer originals: skip *-edited.* if non-edited twin exists
                if "-edited" in p.stem.lower():
                    twin = p.with_name(p.name.replace("-edited", "").replace("-Edited", ""))
                    if twin.exists():
                        continue
                files.append(p)
    files.sort()
    return files


def load_image(path: Path) -> Image.Image | None:
    try:
        img = Image.open(path)
        img = img.convert("RGB")
        # Downscale huge images before CLIP preprocess for speed/memory
        max_side = 1024
        w, h = img.size
        if max(w, h) > max_side:
            img.thumbnail((max_side, max_side), Image.Resampling.BILINEAR)
        return img
    except Exception as e:
        # UnidentifiedImageError, OSError, DecompressionBombError, etc.
        with open(ERROR_LOG, "a", encoding="utf-8") as f:
            f.write(f"{path}\t{type(e).__name__}: {e}\n")
        return None


def unique_dest(folder: Path, src: Path) -> Path:
    """Avoid overwrites when same filename appears in different source folders."""
    candidate = folder / src.name
    if not candidate.exists():
        return candidate
    # hash short path fragment
    h = hashlib.md5(str(src).encode("utf-8")).hexdigest()[:8]
    return folder / f"{src.stem}_{h}{src.suffix}"


def main():
    setup_heif()
    ensure_dirs()

    print("Loading CLIP model (first run downloads weights)...", flush=True)
    model_name = "openai/clip-vit-base-patch32"
    device = "cpu"
    processor = CLIPProcessor.from_pretrained(model_name)
    model = CLIPModel.from_pretrained(model_name)
    model.eval()
    model.to(device)

    texts = [p for _, p in LABELS]
    label_names = [n for n, _ in LABELS]

    def extract_features(output):
        """transformers 5.x may return BaseModelOutputWithPooling instead of a tensor."""
        if torch.is_tensor(output):
            return output
        if hasattr(output, "pooler_output") and output.pooler_output is not None:
            return output.pooler_output
        if hasattr(output, "last_hidden_state"):
            return output.last_hidden_state[:, 0]
        raise TypeError(f"Unexpected feature type: {type(output)}")

    # Precompute projected text features once
    with torch.no_grad():
        text_inputs = processor(text=texts, return_tensors="pt", padding=True)
        text_inputs = {k: v.to(device) for k, v in text_inputs.items()}
        raw_text = model.get_text_features(**text_inputs)
        # Prefer full projection path via text_model + text_projection when needed
        if not torch.is_tensor(raw_text):
            text_out = model.text_model(
                input_ids=text_inputs["input_ids"],
                attention_mask=text_inputs.get("attention_mask"),
            )
            pooled = text_out.pooler_output if text_out.pooler_output is not None else text_out.last_hidden_state[:, 0]
            text_features = model.text_projection(pooled)
        else:
            text_features = raw_text
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)

    print(f"Scanning {SOURCE} ...", flush=True)
    images = list_images(SOURCE)
    total = len(images)
    print(f"Found {total} images to classify (edited twins skipped when original exists).", flush=True)

    # Resume support: skip already-logged paths
    done = set()
    if LOG.exists():
        with open(LOG, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                done.add(row.get("source", ""))
        print(f"Resuming: {len(done)} already classified.", flush=True)

    write_header = not LOG.exists() or LOG.stat().st_size == 0
    log_f = open(LOG, "a", newline="", encoding="utf-8")
    writer = csv.DictWriter(
        log_f,
        fieldnames=["source", "category", "confidence", "second", "second_conf", "dest"],
    )
    if write_header:
        writer.writeheader()

    start = time.time()
    processed = 0
    copied = 0
    batch_paths: list[Path] = []
    batch_imgs: list[Image.Image] = []
    last_category = ""

    def flush_batch():
        nonlocal processed, copied, batch_paths, batch_imgs, last_category
        if not batch_imgs:
            return
        with torch.no_grad():
            inputs = processor(images=batch_imgs, return_tensors="pt", padding=True)
            pixel = inputs["pixel_values"].to(device)
            raw_img = model.get_image_features(pixel_values=pixel)
            if not torch.is_tensor(raw_img):
                vision_out = model.vision_model(pixel_values=pixel)
                pooled = (
                    vision_out.pooler_output
                    if vision_out.pooler_output is not None
                    else vision_out.last_hidden_state[:, 0]
                )
                image_features = model.visual_projection(pooled)
            else:
                image_features = raw_img
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            # cosine similarity -> softmax over labels
            sims = (image_features @ text_features.T) * 100.0  # scale like CLIP
            probs = sims.softmax(dim=-1).cpu()

        for i, path in enumerate(batch_paths):
            scores = probs[i]
            best_i = int(scores.argmax().item())
            best_conf = float(scores[best_i].item())
            top2 = torch.topk(scores, k=min(2, scores.numel()))
            second_i = int(top2.indices[1].item()) if scores.numel() > 1 else best_i
            second_conf = float(top2.values[1].item()) if scores.numel() > 1 else 0.0

            category = label_names[best_i]
            if best_conf < MIN_CONF:
                category = "_low_confidence"
            last_category = category

            dest_folder = DEST / category
            dest_path = unique_dest(dest_folder, path)
            try:
                shutil.copy2(path, dest_path)
                copied += 1
            except OSError as e:
                with open(ERROR_LOG, "a", encoding="utf-8") as ef:
                    ef.write(f"COPY FAIL {path} -> {dest_path}: {e}\n")
                dest_path = Path("")

            writer.writerow(
                {
                    "source": str(path),
                    "category": category,
                    "confidence": f"{best_conf:.4f}",
                    "second": label_names[second_i],
                    "second_conf": f"{second_conf:.4f}",
                    "dest": str(dest_path),
                }
            )
            processed += 1

        log_f.flush()
        batch_paths = []
        batch_imgs = []

        if processed % 50 == 0 or processed >= (total - len(done)):
            elapsed = time.time() - start
            rate = processed / elapsed if elapsed > 0 else 0
            remaining = max(total - len(done) - processed, 0)
            eta = remaining / rate if rate > 0 else 0
            msg = (
                f"[{processed}/{total - len(done)}] copied={copied} "
                f"{rate:.1f} img/s ETA~{eta/60:.1f}m last={last_category}"
            )
            print(msg, flush=True)
            PROGRESS.write_text(
                msg + f"\nprocessed_total_lines_in_log~{processed + len(done)}\n",
                encoding="utf-8",
            )

    for path in images:
        if str(path) in done:
            continue
        img = load_image(path)
        if img is None:
            writer.writerow(
                {
                    "source": str(path),
                    "category": "_error",
                    "confidence": "0",
                    "second": "",
                    "second_conf": "0",
                    "dest": "",
                }
            )
            continue
        batch_paths.append(path)
        batch_imgs.append(img)
        if len(batch_imgs) >= BATCH_SIZE:
            flush_batch()

    flush_batch()
    log_f.close()

    # Summary counts
    print("\n=== SUMMARY ===", flush=True)
    for name, _ in LABELS:
        n = len(list((DEST / name).glob("*")))
        print(f"  {name}: {n}", flush=True)
    n = len(list((DEST / "_low_confidence").glob("*")))
    print(f"  _low_confidence: {n}", flush=True)
    print(f"Done. Log: {LOG}", flush=True)
    print(f"Output: {DEST}", flush=True)


if __name__ == "__main__":
    main()
