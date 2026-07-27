"""
Publish Work Portfolio → website assets.

1. CLIP-filter for finished construction (reject docs/selfies/junk)
2. Categorize into site folders: decks | additions | siding | custom-homes
3. Web-optimize (resize + JPEG) into assets/portfolio/
4. Pick hero + featured images
5. Write portfolio.html grid + index.html featured section

Copies only — never deletes originals in Work Portfolio/.
"""
from __future__ import annotations

import csv
import hashlib
import re
import shutil
import time
from pathlib import Path

import torch
from PIL import Image, ImageFile, ImageOps

ImageFile.LOAD_TRUNCATED_IMAGES = True
Image.MAX_IMAGE_PIXELS = 400_000_000

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Work Portfolio"
ASSETS = ROOT / "assets" / "portfolio"
HERO_DIR = ROOT / "assets" / "hero"
LOG = ROOT / "scripts" / "_publish_portfolio_log.csv"
MANIFEST = ROOT / "scripts" / "_portfolio_manifest.csv"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}

# Site categories (must match portfolio.html filters)
SITE_CATS = ["decks", "additions", "siding", "custom-homes"]

# Max images kept per category for a strong but not overwhelming gallery
MAX_PER_CAT = 18
# Absolute max total
MAX_TOTAL = 64
# Web export
MAX_SIDE = 1600
JPEG_QUALITY = 82
MIN_BYTES = 35_000
MIN_SIDE = 480

# Skip obvious non-portfolio filenames
SKIP_NAME_RE = re.compile(
    r"(screenshot|smartselect|collage|fb_img|snapchat|pixomatic|"
    r"document|receipt|invoice|contract)",
    re.I,
)

LABELS = [
    # KEEP — finished, client-ready portfolio shots only
    (
        "keep_deck",
        "a beautiful finished composite or wood deck with railing outdoor living patio furniture completed deck project",
    ),
    (
        "keep_stairs_boardwalk",
        "a finished outdoor wooden staircase boardwalk beach walkway deck stairs with black railing completed",
    ),
    (
        "keep_addition",
        "a finished completed home addition exterior with siding windows and roof fully done no construction equipment",
    ),
    (
        "keep_siding",
        "a finished house with complete clean siding exterior cladding fully installed no house wrap no Tyvek",
    ),
    (
        "keep_custom_home",
        "a finished custom residential house exterior complete landscaping curb appeal no scaffolding no equipment",
    ),
    (
        "keep_finished_other",
        "a professional portfolio photo of completed residential construction finished craftsmanship no mess",
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
        "a personal photo selfie people faces family party kids pets closeup of a person finger over lens",
    ),
    (
        "reject_unfinished",
        "unfinished construction framing bare studs open walls incomplete job site under construction",
    ),
    (
        "reject_housewrap",
        "house wrap Tyvek white plastic weather barrier incomplete siding mid construction building wrap",
    ),
    (
        "reject_equipment",
        "construction equipment telehandler forklift dumpster heavy machinery dominating the photo job site mess",
    ),
    (
        "reject_materials",
        "building materials only lumber stack tools equipment no finished structure",
    ),
    (
        "reject_low_quality",
        "blurry dark grainy obstructed low quality bad photo useless snapshot",
    ),
    (
        "reject_unrelated",
        "food car interior unrelated random object not construction work logo graphic",
    ),
]

KEEP_LABELS = {
    "keep_deck",
    "keep_stairs_boardwalk",
    "keep_addition",
    "keep_siding",
    "keep_custom_home",
    "keep_finished_other",
}

LABEL_TO_CAT = {
    "keep_deck": "decks",
    "keep_stairs_boardwalk": "decks",
    "keep_addition": "additions",
    "keep_siding": "siding",
    "keep_custom_home": "custom-homes",
    "keep_finished_other": "custom-homes",
}

# Softmax keep threshold — higher = stricter finished-only selection
MIN_KEEP_CONF = 0.30

CAT_TITLES = {
    "decks": "Custom deck project",
    "additions": "Home addition project",
    "siding": "Siding & exterior project",
    "custom-homes": "Custom home project",
}

CAT_LABELS = {
    "decks": "Decks",
    "additions": "Additions",
    "siding": "Siding",
    "custom-homes": "Custom Homes",
}


def setup_heif():
    try:
        from pillow_heif import register_heif_opener

        register_heif_opener()
    except Exception:
        pass


def list_images(root: Path) -> list[Path]:
    files = []
    for p in sorted(root.iterdir()):
        if not p.is_file():
            continue
        if p.suffix.lower() not in IMAGE_EXTS:
            continue
        if SKIP_NAME_RE.search(p.name):
            continue
        files.append(p)
    return files


def load_for_clip(path: Path) -> Image.Image | None:
    try:
        if path.stat().st_size < MIN_BYTES:
            return None
        img = Image.open(path)
        img = ImageOps.exif_transpose(img).convert("RGB")
        w, h = img.size
        if min(w, h) < MIN_SIDE:
            return None
        # Downscale for CLIP
        max_side = 1024
        if max(w, h) > max_side:
            img.thumbnail((max_side, max_side), Image.Resampling.BILINEAR)
        return img
    except Exception as e:
        print(f"  skip load {path.name}: {e}", flush=True)
        return None


def web_export(src: Path, dest: Path) -> bool:
    try:
        img = Image.open(src)
        img = ImageOps.exif_transpose(img).convert("RGB")
        w, h = img.size
        if max(w, h) > MAX_SIDE:
            img.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        return True
    except Exception as e:
        print(f"  export fail {src.name}: {e}", flush=True)
        return False


def slug_name(src: Path, cat: str, idx: int) -> str:
    # Stable short web-friendly name
    h = hashlib.md5(src.name.encode("utf-8")).hexdigest()[:6]
    stem = re.sub(r"[^a-zA-Z0-9]+", "-", src.stem).strip("-").lower()[:24]
    if not stem:
        stem = "project"
    return f"{cat}-{idx:02d}-{stem}-{h}.jpg"


def refine_category(best: str, second: str, second_conf: float) -> str:
    cat = LABEL_TO_CAT.get(best, "custom-homes")
    if best == "keep_finished_other":
        # Prefer a more specific second keep label
        if second in LABEL_TO_CAT and second != "keep_finished_other" and second_conf > 0.12:
            cat = LABEL_TO_CAT[second]
    return cat


def article_html(rel_path: str, cat: str, title: str, n: int) -> str:
    cat_label = CAT_LABELS[cat]
    return f"""          <article
            class="portfolio-item"
            data-category="{cat}"
            data-full="{rel_path}"
            data-title="{title}"
            tabindex="0"
            role="button"
            aria-label="View {title}">
            <img src="{rel_path}" alt="{title}" loading="lazy" width="600" height="450">
            <div class="portfolio-item__overlay">
              <span class="portfolio-item__cat">{cat_label}</span>
              <span class="portfolio-item__title">{title}</span>
            </div>
          </article>"""


def patch_portfolio_html(items_by_cat: dict[str, list[dict]]) -> None:
    path = ROOT / "portfolio.html"
    text = path.read_text(encoding="utf-8")

    blocks = []
    for cat in SITE_CATS:
        items = items_by_cat.get(cat, [])
        if not items:
            continue
        blocks.append(f"          <!-- ===== {CAT_LABELS[cat].upper()} ===== -->")
        for i, it in enumerate(items, 1):
            title = f"{CAT_TITLES[cat]} {i}"
            blocks.append(article_html(it["web_path"], cat, title, i))

    grid_html = "\n\n".join(blocks) if blocks else "          <!-- No portfolio images selected -->"

    # Replace content inside #portfolio-grid
    pattern = re.compile(
        r'(<div class="portfolio-grid" id="portfolio-grid">)(.*?)(</div>\s*\n\s*<div class="legal-notice")',
        re.S,
    )
    new_text, n = pattern.subn(rf"\1\n\n{grid_html}\n\n        \3", text, count=1)
    if n != 1:
        raise RuntimeError("Could not patch portfolio.html grid")
    path.write_text(new_text, encoding="utf-8")
    print(f"Updated {path}", flush=True)


def patch_index_html(featured: list[dict], hero_rel: str | None) -> None:
    path = ROOT / "index.html"
    text = path.read_text(encoding="utf-8")

    # Featured grid: one best per category (up to 4)
    arts = []
    for it in featured:
        cat = it["category"]
        title = CAT_TITLES[cat]
        arts.append(article_html(it["web_path"], cat, title, 1))
    featured_html = "\n".join(arts) if arts else "          <!-- featured placeholders -->"

    pattern = re.compile(
        r'(<div class="portfolio-grid" id="featured-grid">)(.*?)(</div>\s*\n\s*<p style="text-align:center)',
        re.S,
    )
    text, n = pattern.subn(rf"\1\n{featured_html}\n        \3", text, count=1)
    if n != 1:
        raise RuntimeError("Could not patch index.html featured grid")

    # About media side photo if we have a strong image
    if featured:
        about_src = featured[0]["web_path"]
        about_block = (
            f'            <img src="{about_src}" alt="Straight Stud Construction project" '
            f'loading="lazy" width="640" height="480" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">'
        )
        text2, n2 = re.subn(
            r'(<div class="about-grid__media">)(.*?)(</div>)',
            rf"\1\n{about_block}\n          \3",
            text,
            count=1,
            flags=re.S,
        )
        if n2 == 1:
            text = text2

    # Hero image is referenced from css/styles.css (assets/hero/hero.jpg)
    path.write_text(text, encoding="utf-8")
    print(f"Updated {path}", flush=True)


def main():
    setup_heif()
    if not SOURCE.is_dir():
        raise SystemExit(f"Missing source folder: {SOURCE}")

    # Clean previous web portfolio images (keep README)
    for cat in SITE_CATS:
        d = ASSETS / cat
        d.mkdir(parents=True, exist_ok=True)
        for f in d.iterdir():
            if f.is_file() and f.suffix.lower() in IMAGE_EXTS | {".jpg"}:
                f.unlink()

    HERO_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading CLIP...", flush=True)
    model_name = "openai/clip-vit-base-patch32"
    processor = __import__("transformers", fromlist=["CLIPProcessor"]).CLIPProcessor.from_pretrained(model_name)
    model = __import__("transformers", fromlist=["CLIPModel"]).CLIPModel.from_pretrained(model_name)
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
    print(f"Candidates after name filter: {len(images)}", flush=True)

    log_f = open(LOG, "w", newline="", encoding="utf-8")
    writer = csv.DictWriter(
        log_f,
        fieldnames=[
            "source",
            "decision",
            "best_label",
            "confidence",
            "second",
            "second_conf",
            "category",
            "score",
        ],
    )
    writer.writeheader()

    kept: list[dict] = []
    batch_paths: list[Path] = []
    batch_imgs: list[Image.Image] = []
    BATCH = 8
    start = time.time()
    processed = 0
    rejected = 0
    skipped = 0

    def flush():
        nonlocal processed, rejected, skipped, batch_paths, batch_imgs
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

        for i, path in enumerate(batch_paths):
            scores = probs[i]
            best_i = int(scores.argmax().item())
            best_conf = float(scores[best_i].item())
            top2 = torch.topk(scores, k=2)
            second_i = int(top2.indices[1].item())
            second_conf = float(top2.values[1].item())
            best_label = label_names[best_i]
            second_label = label_names[second_i]

            is_keep = best_label in KEEP_LABELS and best_conf >= MIN_KEEP_CONF
            if is_keep and second_label.startswith("reject_") and second_conf > best_conf * 0.75:
                if second_label in (
                    "reject_document",
                    "reject_screenshot",
                    "reject_personal",
                    "reject_unfinished",
                    "reject_housewrap",
                    "reject_equipment",
                ):
                    is_keep = False

            # Hard reject unfinished / wrap / equipment even if keep wins narrowly
            if is_keep and second_label in (
                "reject_unfinished",
                "reject_housewrap",
                "reject_equipment",
            ) and second_conf > best_conf * 0.55:
                is_keep = False

            cat = ""
            score = 0.0
            if is_keep:
                cat = refine_category(best_label, second_label, second_conf)
                # Score: confidence + slight boost for specific labels
                score = best_conf
                if best_label != "keep_finished_other":
                    score += 0.03
                # Prefer larger files slightly (often better phone photos)
                try:
                    mb = path.stat().st_size / (1024 * 1024)
                    score += min(mb / 100.0, 0.05)
                except OSError:
                    pass
                kept.append(
                    {
                        "source": path,
                        "category": cat,
                        "best_label": best_label,
                        "confidence": best_conf,
                        "score": score,
                    }
                )
                decision = "KEEP"
            else:
                rejected += 1
                decision = "REJECT"

            writer.writerow(
                {
                    "source": str(path),
                    "decision": decision,
                    "best_label": best_label,
                    "confidence": f"{best_conf:.4f}",
                    "second": second_label,
                    "second_conf": f"{second_conf:.4f}",
                    "category": cat,
                    "score": f"{score:.4f}" if is_keep else "0",
                }
            )
            processed += 1

        log_f.flush()
        batch_paths = []
        batch_imgs = []
        if processed % 40 == 0:
            elapsed = time.time() - start
            rate = processed / elapsed if elapsed else 0
            print(
                f"[{processed}/{len(images)}] kept={len(kept)} rejected={rejected} {rate:.1f}/s",
                flush=True,
            )

    for path in images:
        img = load_for_clip(path)
        if img is None:
            skipped += 1
            writer.writerow(
                {
                    "source": str(path),
                    "decision": "SKIP",
                    "best_label": "",
                    "confidence": "0",
                    "second": "",
                    "second_conf": "0",
                    "category": "",
                    "score": "0",
                }
            )
            continue
        batch_paths.append(path)
        batch_imgs.append(img)
        if len(batch_imgs) >= BATCH:
            flush()
    flush()
    log_f.close()

    print(f"\nKept candidates: {len(kept)} | Rejected: {rejected} | Skipped: {skipped}", flush=True)

    # Select top per category
    by_cat: dict[str, list[dict]] = {c: [] for c in SITE_CATS}
    for item in kept:
        by_cat[item["category"]].append(item)
    for cat in SITE_CATS:
        by_cat[cat].sort(key=lambda x: x["score"], reverse=True)
        by_cat[cat] = by_cat[cat][:MAX_PER_CAT]

    # Cap total while keeping balance
    selected: list[dict] = []
    for cat in SITE_CATS:
        selected.extend(by_cat[cat])
    selected.sort(key=lambda x: x["score"], reverse=True)
    if len(selected) > MAX_TOTAL:
        # rebalance: take top from each cat first
        rebalanced = []
        for cat in SITE_CATS:
            rebalanced.extend(by_cat[cat][: max(8, MAX_TOTAL // len(SITE_CATS))])
        rebalanced.sort(key=lambda x: x["score"], reverse=True)
        selected = rebalanced[:MAX_TOTAL]
        # rebuild by_cat from selected
        by_cat = {c: [] for c in SITE_CATS}
        for it in selected:
            by_cat[it["category"]].append(it)

    # Export web images
    exported_by_cat: dict[str, list[dict]] = {c: [] for c in SITE_CATS}
    manifest_rows = []
    counters = {c: 0 for c in SITE_CATS}

    for cat in SITE_CATS:
        for it in by_cat[cat]:
            counters[cat] += 1
            idx = counters[cat]
            fname = slug_name(it["source"], cat, idx)
            dest = ASSETS / cat / fname
            if not web_export(it["source"], dest):
                continue
            rel = f"assets/portfolio/{cat}/{fname}"
            row = {
                "category": cat,
                "web_path": rel,
                "source": str(it["source"]),
                "score": it["score"],
                "confidence": it["confidence"],
            }
            exported_by_cat[cat].append(row)
            manifest_rows.append(row)

    # Hero: best overall deck or custom home
    hero_candidates = (
        exported_by_cat["decks"]
        + exported_by_cat["custom-homes"]
        + exported_by_cat["additions"]
        + exported_by_cat["siding"]
    )
    hero_rel = None
    if hero_candidates:
        best = max(hero_candidates, key=lambda x: x["score"])
        hero_dest = HERO_DIR / "hero.jpg"
        # re-export slightly larger for hero
        src = Path(best["source"])
        try:
            img = Image.open(src)
            img = ImageOps.exif_transpose(img).convert("RGB")
            img.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
            img.save(hero_dest, "JPEG", quality=85, optimize=True, progressive=True)
            hero_rel = "assets/hero/hero.jpg"
            print(f"Hero: {best['web_path']} -> {hero_rel}", flush=True)
        except Exception as e:
            print(f"Hero export failed: {e}", flush=True)
            hero_rel = best["web_path"]

    # Featured: best one per category that has images
    featured = []
    for cat in SITE_CATS:
        if exported_by_cat[cat]:
            featured.append(exported_by_cat[cat][0])

    with open(MANIFEST, "w", newline="", encoding="utf-8") as mf:
        w = csv.DictWriter(mf, fieldnames=["category", "web_path", "source", "score", "confidence"])
        w.writeheader()
        for r in manifest_rows:
            w.writerow(r)

    patch_portfolio_html(exported_by_cat)
    patch_index_html(featured, hero_rel)

    print("\n=== PUBLISH SUMMARY ===", flush=True)
    total = 0
    for cat in SITE_CATS:
        n = len(exported_by_cat[cat])
        total += n
        print(f"  {cat}: {n}", flush=True)
    print(f"Total web images: {total}", flush=True)
    print(f"Featured: {len(featured)}", flush=True)
    print(f"Log: {LOG}", flush=True)
    print(f"Manifest: {MANIFEST}", flush=True)


if __name__ == "__main__":
    main()
