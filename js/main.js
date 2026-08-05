/**
 * Straight Stud Construction LLC — Site Scripts
 * Mobile nav, portfolio filters, lightbox, form hardening
 */
(function () {
  "use strict";

  /* ---------- Mobile navigation ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* ---------- Active nav link ---------- */
  (function () {
    const path = window.location.pathname.toLowerCase();
    const isHome =
      (path === "/" || path.endsWith("/index.html")) &&
      !path.includes("/portfolio") &&
      !path.includes("/deck-estimate");
    const isPortfolio = path.includes("/portfolio");
    const isDeckEstimate = path.includes("/deck-estimate");
    // Basename without .html, e.g. about, contact
    const page = (path.split("/").filter(Boolean).pop() || "").replace(/\.html$/, "");

    document.querySelectorAll(".nav__link").forEach(function (link) {
      const href = (link.getAttribute("href") || "").toLowerCase();
      let active = false;
      if (isDeckEstimate && href.includes("deck-estimate")) {
        active = true;
      } else if (isPortfolio && href.includes("portfolio")) {
        active = true;
      } else if (isHome && (href === "index.html" || href === "../index.html" || href === "/" || href.endsWith("/index.html")) && !href.includes("deck-estimate") && !href.includes("portfolio")) {
        active = true;
      } else if (!isHome && !isPortfolio && !isDeckEstimate && page && href.includes(page)) {
        active = true;
      }
      if (active) link.classList.add("is-active");
    });
  })();

  /* ---------- Portfolio filters ---------- */
  const filterBtns = document.querySelectorAll(".filter-btn");
  const items = document.querySelectorAll(".portfolio-item[data-category]");

  if (filterBtns.length && items.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const filter = btn.getAttribute("data-filter") || "all";

        filterBtns.forEach(function (b) {
          b.classList.remove("is-active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");

        items.forEach(function (item) {
          const cat = item.getAttribute("data-category");
          const show = filter === "all" || cat === filter;
          item.classList.toggle("is-hidden", !show);
        });
      });
    });
  }

  /* ---------- Lightbox ---------- */
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxClose = document.querySelector(".lightbox__close");
  const lightboxPrev = document.querySelector(".lightbox__prev");
  const lightboxNext = document.querySelector(".lightbox__next");

  let gallery = [];
  let currentIndex = 0;

  function buildGallery() {
    gallery = Array.from(
      document.querySelectorAll(".portfolio-item[data-full]:not(.is-hidden)")
    ).filter(function (el) {
      return el.getAttribute("data-full");
    });
  }

  function openLightbox(index) {
    if (!lightbox || !lightboxImg) return;
    buildGallery();
    if (!gallery.length) return;
    currentIndex = index;
    showSlide(currentIndex);
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function showSlide(index) {
    if (!gallery.length) return;
    currentIndex = (index + gallery.length) % gallery.length;
    const el = gallery[currentIndex];
    const src = el.getAttribute("data-full");
    const title = el.getAttribute("data-title") || "";
    const cat = el.getAttribute("data-category") || "";
    lightboxImg.src = src;
    lightboxImg.alt = title;
    if (lightboxCaption) {
      lightboxCaption.textContent = cat
        ? title + " — " + cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ")
        : title;
    }
  }

  document.querySelectorAll(".portfolio-item[data-full]").forEach(function (item) {
    item.addEventListener("click", function () {
      buildGallery();
      const idx = gallery.indexOf(item);
      if (idx >= 0) openLightbox(idx);
    });
    item.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        buildGallery();
        const idx = gallery.indexOf(item);
        if (idx >= 0) openLightbox(idx);
      }
    });
  });

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", function () {
      showSlide(currentIndex - 1);
    });
  }
  if (lightboxNext) {
    lightboxNext.addEventListener("click", function () {
      showSlide(currentIndex + 1);
    });
  }

  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (!lightbox || !lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showSlide(currentIndex - 1);
    if (e.key === "ArrowRight") showSlide(currentIndex + 1);
  });

  /* ---------- Contact form hardening ---------- */
  const form = document.getElementById("contact-form");
  if (form) {
    const status = document.getElementById("form-status");
    const submitBtn = form.querySelector('[type="submit"]');

    form.addEventListener("submit", function (e) {
      // Honeypot: bots fill hidden field
      const hp = form.querySelector('[name="company_website"]');
      if (hp && hp.value) {
        e.preventDefault();
        return;
      }

      // Basic client-side validation (FormSubmit delivers to request@straightstudllc.com)
      const name = form.querySelector('[name="name"]');
      const email = form.querySelector('[name="email"]');
      const message = form.querySelector('[name="message"]');

      if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
        e.preventDefault();
        showFormStatus("Please fill in all required fields.", false);
        return;
      }

      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email.value.trim())) {
        e.preventDefault();
        showFormStatus("Please enter a valid email address.", false);
        return;
      }

      // Rate-limit UX: disable double-submit
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }
    });

    function showFormStatus(msg, ok) {
      if (!status) return;
      status.textContent = msg;
      status.className = "form-status " + (ok ? "is-success" : "is-error");
      status.setAttribute("role", "alert");
    }

    // Success query param after FormSubmit redirect
    if (window.location.search.indexOf("sent=1") !== -1 && status) {
      showFormStatus(
        "Thank you! Your quote request was sent to request@straightstudllc.com. We’ll get back to you soon.",
        true
      );
      if (window.history.replaceState) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }

  /* ---------- Current year in footer ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
