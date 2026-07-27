"""Rebuild portfolio.html + index.html featured grid from assets on disk."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE_CATS = ["decks", "additions", "siding", "custom-homes"]
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


def article_html(rel_path: str, cat: str, title: str) -> str:
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


def main() -> None:
    items_by_cat: dict[str, list[str]] = {}
    for cat in SITE_CATS:
        files = sorted((ROOT / "assets" / "portfolio" / cat).glob("*.jpg"))
        items_by_cat[cat] = [f"assets/portfolio/{cat}/{p.name}" for p in files]
        print(f"{cat}: {len(files)}")

    # portfolio.html
    path = ROOT / "portfolio.html"
    text = path.read_text(encoding="utf-8")
    blocks: list[str] = []
    for cat in SITE_CATS:
        items = items_by_cat[cat]
        if not items:
            continue
        blocks.append(f"          <!-- ===== {CAT_LABELS[cat].upper()} ===== -->")
        for i, rel in enumerate(items, 1):
            blocks.append(article_html(rel, cat, f"{CAT_TITLES[cat]} {i}"))
    grid_html = "\n\n".join(blocks)
    pattern = re.compile(
        r'(<div class="portfolio-grid" id="portfolio-grid">)(.*?)(</div>\s*\n\s*<div class="legal-notice")',
        re.S,
    )
    text, n = pattern.subn(rf"\1\n\n{grid_html}\n\n        \3", text, count=1)
    if n != 1:
        raise SystemExit("portfolio grid patch failed")
    path.write_text(text, encoding="utf-8")
    print("Updated portfolio.html")

    # index featured
    featured = [(cat, items_by_cat[cat][0]) for cat in SITE_CATS if items_by_cat[cat]]
    featured_html = "\n".join(article_html(rel, cat, CAT_TITLES[cat]) for cat, rel in featured)
    path = ROOT / "index.html"
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(
        r'(<div class="portfolio-grid" id="featured-grid">)(.*?)(</div>\s*\n\s*<p style="text-align:center)',
        re.S,
    )
    text, n = pattern.subn(rf"\1\n{featured_html}\n        \3", text, count=1)
    if n != 1:
        raise SystemExit("featured patch failed")

    if featured:
        about_src = featured[0][1]
        about_block = (
            f'            <img src="{about_src}" alt="Straight Stud Construction project" '
            f'loading="lazy" width="640" height="480" '
            f'style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">'
        )
        text, _ = re.subn(
            r'(<div class="about-grid__media">)(.*?)(</div>)',
            rf"\1\n{about_block}\n          \3",
            text,
            count=1,
            flags=re.S,
        )

    path.write_text(text, encoding="utf-8")
    print("Updated index.html")
    print("Featured:", featured)


if __name__ == "__main__":
    main()
