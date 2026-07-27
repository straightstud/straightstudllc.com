"""Create /portfolio/ clean URL page and update site links for business cards."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build_portfolio_index() -> None:
    src = (ROOT / "portfolio.html").read_text(encoding="utf-8")
    # If portfolio.html is already a redirect stub, read from portfolio/index if present
    if "Redirecting" in src and (ROOT / "portfolio" / "index.html").exists():
        src = (ROOT / "portfolio" / "index.html").read_text(encoding="utf-8")
        # normalize back to root-relative form first if needed — skip, rebuild from backup
    text = src

    # If we're re-running on already-nested paths, normalize ../ back first
    text = text.replace('href="../css/styles.css"', 'href="css/styles.css"')
    text = text.replace('src="../js/main.js"', 'src="js/main.js"')
    text = text.replace('src="../assets/', 'src="assets/')
    text = text.replace('data-full="../assets/', 'data-full="assets/')
    for page in ("index", "about", "contact", "privacy", "terms", "liability"):
        text = text.replace(f'href="../{page}.html"', f'href="{page}.html"')

    # Apply nested paths for portfolio/index.html
    text = text.replace('href="css/styles.css"', 'href="../css/styles.css"')
    text = text.replace('src="js/main.js"', 'src="../js/main.js"')
    text = text.replace('src="assets/', 'src="../assets/')
    text = text.replace('data-full="assets/', 'data-full="../assets/')
    for page in ("index", "about", "contact", "privacy", "terms", "liability"):
        text = text.replace(f'href="{page}.html"', f'href="../{page}.html"')

    text = text.replace('href="portfolio.html?filter=', 'href="./?filter=')
    text = text.replace('href="portfolio.html"', 'href="./"')

    if 'rel="canonical"' not in text:
        text = text.replace(
            "<title>Portfolio | Straight Stud Construction LLC</title>",
            '<link rel="canonical" href="https://www.straightstudllc.com/portfolio/">\n'
            "  <title>Portfolio | Straight Stud Construction LLC</title>",
        )

    text = text.replace(
        "// Deep-link filters: portfolio.html?filter=decks",
        "// Deep-link filters: /portfolio/?filter=decks",
    )
    text = text.replace(
        "// Deep-link filters: /portfolio/?filter=decks",
        "// Deep-link filters: /portfolio/?filter=decks",
    )

    out = ROOT / "portfolio" / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(f"Wrote {out.relative_to(ROOT)}")


def write_redirect_stub() -> None:
    """portfolio.html → /portfolio/ so old links and bookmarks still work."""
    stub = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio | Straight Stud Construction LLC</title>
  <link rel="canonical" href="https://www.straightstudllc.com/portfolio/">
  <meta http-equiv="refresh" content="0; url=/portfolio/">
  <script>
    (function () {
      var q = window.location.search || "";
      var h = window.location.hash || "";
      window.location.replace("/portfolio/" + q + h);
    })();
  </script>
</head>
<body>
  <p style="font-family: system-ui, sans-serif; padding: 2rem; text-align: center;">
    Redirecting to our portfolio…
    <a href="/portfolio/">Continue to www.straightstudllc.com/portfolio</a>
  </p>
</body>
</html>
"""
    (ROOT / "portfolio.html").write_text(stub, encoding="utf-8")
    print("Wrote portfolio.html redirect stub")


def update_site_links() -> None:
    html_files = list(ROOT.glob("*.html"))
    # Do not rewrite the redirect stub content beyond what we write
    for path in html_files:
        if path.name == "portfolio.html":
            continue
        text = path.read_text(encoding="utf-8")
        original = text
        # Prefer clean URL used on business cards
        text = text.replace("portfolio.html?filter=", "portfolio/?filter=")
        text = text.replace('href="portfolio.html"', 'href="portfolio/"')
        text = text.replace("href='portfolio.html'", "href='portfolio/'")
        if text != original:
            path.write_text(text, encoding="utf-8")
            print(f"Updated links in {path.name}")


def update_sitemap() -> None:
    path = ROOT / "sitemap.xml"
    text = path.read_text(encoding="utf-8")
    text = text.replace(
        "https://straightstudllc.com/portfolio.html",
        "https://www.straightstudllc.com/portfolio/",
    )
    # Prefer www on main URLs for card consistency (optional — keep apex for home if desired)
    # Only portfolio is critical for business cards
    path.write_text(text, encoding="utf-8")
    print("Updated sitemap.xml")


def update_htaccess() -> None:
    path = ROOT / ".htaccess"
    text = path.read_text(encoding="utf-8")
    marker = "# Clean portfolio URL (business cards: www.straightstudllc.com/portfolio)"
    if marker in text:
        print(".htaccess already has portfolio rewrite")
        return
    block = f"""
{marker}
<IfModule mod_rewrite.c>
  RewriteEngine On
  # /portfolio and /portfolio/ → portfolio/index.html
  RewriteRule ^portfolio/?$ portfolio/index.html [L]
  # Legacy portfolio.html → clean URL (keep query string)
  RewriteRule ^portfolio\\.html$ /portfolio/ [R=301,L,QSA]
</IfModule>
"""
    path.write_text(text.rstrip() + "\n" + block + "\n", encoding="utf-8")
    print("Updated .htaccess")


def update_headers_for_pages() -> None:
    """Optional Netlify/Cloudflare-style redirects if _redirects is used later."""
    redirects = ROOT / "_redirects"
    content = """# Business card URL + legacy .html
/portfolio.html  /portfolio/  301
/portfolio       /portfolio/  301
"""
    # Only write if not present or update portfolio lines
    if redirects.exists():
        existing = redirects.read_text(encoding="utf-8")
        if "/portfolio" in existing:
            print("_redirects already has portfolio rules")
            return
    redirects.write_text(content, encoding="utf-8")
    print("Wrote _redirects")


def patch_main_js_active_nav() -> None:
    path = ROOT / "js" / "main.js"
    text = path.read_text(encoding="utf-8")
    old = """  /* ---------- Active nav link ---------- */
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav__link").forEach(function (link) {
    const href = link.getAttribute("href");
    if (!href) return;
    const file = href.split("/").pop().split("#")[0];
    if (file === path || (path === "" && file === "index.html")) {
      link.classList.add("is-active");
    }
  });"""
    new = """  /* ---------- Active nav link ---------- */
  (function () {
    const pathname = window.location.pathname.replace(/\\/+$/, "") || "/";
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] || "index.html";
    // Treat /portfolio and /portfolio/index.html as the portfolio page
    const isPortfolio =
      last === "portfolio" ||
      (segments.length >= 1 && segments[segments.length - 1] === "index.html" && segments[segments.length - 2] === "portfolio") ||
      last === "portfolio.html";

    document.querySelectorAll(".nav__link").forEach(function (link) {
      const href = link.getAttribute("href");
      if (!href) return;
      const clean = href.split("#")[0].replace(/\\/+$/, "");
      const linkLast = clean.split("/").filter(Boolean).pop() || "";
      const linkIsPortfolio =
        linkLast === "portfolio" ||
        clean.endsWith("portfolio") ||
        clean.endsWith("portfolio.html");

      let active = false;
      if (isPortfolio && linkIsPortfolio) {
        active = true;
      } else if (!isPortfolio) {
        const pathFile = last.includes(".") ? last : last + ".html";
        if (linkLast === last || linkLast === pathFile || (last === "index.html" && (linkLast === "index.html" || clean.endsWith("index.html")))) {
          // Home: pathname / or /index.html
          if (last === "index.html" || pathname === "/" || pathname === "") {
            active = linkLast === "index.html" || clean === ".." || clean.endsWith("index.html") || href === "../index.html" || href === "index.html" || href === "/";
          } else {
            active = linkLast === last || linkLast === pathFile || clean.endsWith(last) || clean.endsWith(pathFile);
          }
        }
        // Simpler fallback: compare basename without .html
        const base = last.replace(/\\.html$/, "");
        const linkBase = linkLast.replace(/\\.html$/, "");
        if (base && linkBase && base === linkBase && !linkIsPortfolio) {
          active = true;
        }
        if ((pathname === "/" || last === "index.html" || last === "") && (href === "index.html" || href === "../index.html" || href === "/")) {
          active = true;
        }
      }
      if (active) link.classList.add("is-active");
    });
  })();"""
    if old in text:
        path.write_text(text.replace(old, new), encoding="utf-8")
        print("Patched js/main.js active nav")
    else:
        # Try a more flexible replace of the active nav block
        pattern = re.compile(
            r"/\* ---------- Active nav link ---------- \*/.*?document\.querySelectorAll\(\"\.nav__link\"\)\.forEach\(function \(link\) \{.*?\}\);",
            re.S,
        )
        if pattern.search(text):
            path.write_text(pattern.sub(new.strip(), text, count=1), encoding="utf-8")
            print("Patched js/main.js active nav (regex)")
        else:
            print("WARNING: could not patch main.js active nav — check manually")


def main() -> None:
    # Order matters: build index from current portfolio.html content first
    # If portfolio.html is still the full page, use it; else use existing portfolio/index.html
    full = ROOT / "portfolio.html"
    nested = ROOT / "portfolio" / "index.html"
    content = full.read_text(encoding="utf-8")
    if "portfolio-grid" not in content and nested.exists() and "portfolio-grid" in nested.read_text(encoding="utf-8"):
        # restore working copy from nested for rebuild
        raw = nested.read_text(encoding="utf-8")
        # flatten paths temporarily into a root-style page for rebuild
        flat = raw
        flat = flat.replace('href="../css/styles.css"', 'href="css/styles.css"')
        flat = flat.replace('src="../js/main.js"', 'src="js/main.js"')
        flat = flat.replace('src="../assets/', 'src="assets/')
        flat = flat.replace('data-full="../assets/', 'data-full="assets/')
        for page in ("index", "about", "contact", "privacy", "terms", "liability"):
            flat = flat.replace(f'href="../{page}.html"', f'href="{page}.html"')
        flat = flat.replace('href="./?filter=', 'href="portfolio.html?filter=')
        flat = flat.replace('href="./"', 'href="portfolio.html"')
        full.write_text(flat, encoding="utf-8")

    build_portfolio_index()
    write_redirect_stub()
    update_site_links()
    update_sitemap()
    update_htaccess()
    update_headers_for_pages()
    patch_main_js_active_nav()
    print("Done. Business card URL: https://www.straightstudllc.com/portfolio/")


if __name__ == "__main__":
    main()
