PORTFOLIO PHOTO ORGANIZATION
============================
Straight Stud Construction LLC

Put your project photos in these folders:

  assets/portfolio/decks/          → Custom deck projects
  assets/portfolio/additions/      → Home additions
  assets/portfolio/siding/         → Siding & exterior
  assets/portfolio/custom-homes/   → Custom homes

  assets/logo/logo.png             → Company logo (header)
  assets/hero/hero.jpg             → Wide homepage banner photo

RECOMMENDED PHOTO SPECS
-----------------------
- Format: JPG or WebP
- Size: about 1600×1200 (or larger), landscape preferred
- File names: short and clear, e.g. deck-cedar-01.jpg
- Avoid: house numbers, street signs, client faces (unless permitted)

HOW TO SHOW A PHOTO ON THE WEBSITE
----------------------------------
1. Copy your image into the correct folder above.
2. Open portfolio.html in a text editor.
3. Find the EXAMPLE block (HTML comment) or a placeholder card.
4. Replace a placeholder with something like:

<article
  class="portfolio-item"
  data-category="decks"
  data-full="assets/portfolio/decks/deck-cedar-01.jpg"
  data-title="Cedar multi-level deck"
  tabindex="0"
  role="button"
  aria-label="View cedar multi-level deck">
  <img src="assets/portfolio/decks/deck-cedar-01.jpg"
       alt="Cedar multi-level deck with black railing"
       loading="lazy" width="600" height="450">
  <div class="portfolio-item__overlay">
    <span class="portfolio-item__cat">Decks</span>
    <span class="portfolio-item__title">Cedar multi-level deck</span>
  </div>
</article>

5. data-category must be one of: decks | additions | siding | custom-homes
6. Save and refresh the browser.

FEATURED PHOTOS ON THE HOMEPAGE
-------------------------------
Edit index.html and replace the four placeholder boxes in the
"Featured Work" section with the same kind of <article> cards.
