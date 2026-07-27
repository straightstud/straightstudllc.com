"""Ensure /portfolio and /portfolio/ both serve the full photo gallery.

GitHub Pages maps:
  /portfolio      -> portfolio.html
  /portfolio/     -> portfolio/index.html

Business cards / QR codes often use the no-trailing-slash form.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def flatten_from_nested(nested: str) -> str:
    text = nested
    text = text.replace('href="../css/styles.css"', 'href="css/styles.css"')
    text = text.replace('src="../js/main.js"', 'src="js/main.js"')
    text = text.replace('src="../assets/', 'src="assets/')
    text = text.replace('data-full="../assets/', 'data-full="assets/')
    for page in ("index", "about", "contact", "privacy", "terms", "liability"):
        text = text.replace(f'href="../{page}.html"', f'href="{page}.html"')
    text = text.replace('href="./?filter=', 'href="/portfolio/?filter=')
    text = text.replace('href="./"', 'href="/portfolio/"')
    text = text.replace('href="portfolio.html?filter=', 'href="/portfolio/?filter=')
    text = text.replace('href="portfolio.html"', 'href="/portfolio/"')
    if 'rel="canonical"' not in text:
        text = text.replace(
            "<title>Portfolio | Straight Stud Construction LLC</title>",
            '<link rel="canonical" href="https://www.straightstudllc.com/portfolio/">\n'
            "  <title>Portfolio | Straight Stud Construction LLC</title>",
        )
    return text


def nest_from_flat(flat: str) -> str:
    text = flat
    text = text.replace('href="css/styles.css"', 'href="../css/styles.css"')
    text = text.replace('src="js/main.js"', 'src="../js/main.js"')
    text = text.replace('src="assets/', 'src="../assets/')
    text = text.replace('data-full="assets/', 'data-full="../assets/')
    for page in ("index", "about", "contact", "privacy", "terms", "liability"):
        text = text.replace(f'href="{page}.html"', f'href="../{page}.html"')
    text = text.replace('href="/portfolio/?filter=', 'href="./?filter=')
    text = text.replace('href="/portfolio/"', 'href="./"')
    text = text.replace('href="portfolio/?filter=', 'href="./?filter=')
    text = text.replace('href="portfolio/"', 'href="./"')
    return text


def main() -> None:
    nested_path = ROOT / "portfolio" / "index.html"
    root_path = ROOT / "portfolio.html"

    # Prefer nested full page if it has the grid; else root
    nested = nested_path.read_text(encoding="utf-8") if nested_path.exists() else ""
    root = root_path.read_text(encoding="utf-8") if root_path.exists() else ""

    if "portfolio-grid" in nested and "portfolio-item" in nested:
        source = nested
        flat = flatten_from_nested(source)
    elif "portfolio-grid" in root and "portfolio-item" in root:
        flat = root
        # ensure not a redirect stub
        if "location.replace" in flat and "portfolio-grid" not in flat:
            raise SystemExit("portfolio.html is redirect-only and nested page missing gallery")
    else:
        raise SystemExit("No full portfolio gallery HTML found")

    nested_out = nest_from_flat(flat)

    root_path.write_text(flat, encoding="utf-8")
    nested_path.parent.mkdir(parents=True, exist_ok=True)
    nested_path.write_text(nested_out, encoding="utf-8")

    # GitHub Pages ignores _redirects; keep a note only (no redirect that breaks /portfolio)
    (ROOT / "_redirects").write_text(
        "# Netlify-style redirects (ignored by GitHub Pages).\n"
        "# Live routes on GitHub Pages:\n"
        "#   /portfolio      -> portfolio.html  (gallery)\n"
        "#   /portfolio/     -> portfolio/index.html (gallery)\n"
        "# Business card / QR: https://www.straightstudllc.com/portfolio\n",
        encoding="utf-8",
    )

    print(f"portfolio.html: items={flat.count('class=\"portfolio-item\"')} decks={'decks-01' in flat}")
    print(
        f"portfolio/index.html: items={nested_out.count('class=\"portfolio-item\"')} "
        f"decks={'decks-01' in nested_out}"
    )
    print("Both /portfolio and /portfolio/ now serve the full gallery.")


if __name__ == "__main__":
    main()
