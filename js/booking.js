/**
 * Renders Google Calendar appointment booking embed (or setup state).
 */
(function () {
  "use strict";

  var cfg = window.SSC_BOOKING || {};
  var pageUrl = (cfg.bookingPageUrl || "").trim();
  var embedSrc = (cfg.embedSrc || pageUrl || "").trim();

  function isConfigured() {
    if (!pageUrl && !embedSrc) return false;
    if (pageUrl.indexOf("PASTE_") === 0) return false;
    if (pageUrl.indexOf("YOUR_") === 0) return false;
    return /calendar\.google\.com|calendar\.app\.google|appointments\/schedules/i.test(
      pageUrl || embedSrc
    );
  }

  function fillText(sel, text) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.textContent = text;
    });
  }

  function init() {
    fillText("[data-booking-hours]", cfg.hoursLabel || "Monday – Sunday · 9:00 AM – 5:00 PM");
    fillText("[data-booking-tz]", cfg.timezoneLabel || "Eastern Time");
    fillText("[data-booking-duration]", cfg.durationLabel || "30–60 minutes");

    var mount = document.getElementById("gcal-booking-mount");
    var setup = document.getElementById("gcal-booking-setup");
    var openBtn = document.getElementById("gcal-booking-open");
    var status = document.getElementById("gcal-booking-status");

    if (openBtn) {
      if (isConfigured() && pageUrl) {
        openBtn.href = pageUrl;
        openBtn.hidden = false;
      } else {
        openBtn.hidden = true;
      }
    }

    if (!mount) return;

    if (isConfigured() && embedSrc) {
      if (setup) setup.hidden = true;
      mount.hidden = false;
      mount.innerHTML = "";
      var frame = document.createElement("iframe");
      frame.src = embedSrc;
      frame.title = cfg.title || "Book an appointment";
      frame.className = "booking-embed__frame";
      frame.setAttribute("loading", "lazy");
      frame.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
      frame.setAttribute(
        "sandbox",
        "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      );
      mount.appendChild(frame);
      if (status) {
        status.textContent =
          "Live availability from Google Calendar · " +
          (cfg.hoursLabel || "Mon–Sun 9–5");
      }
    } else {
      mount.hidden = true;
      if (setup) setup.hidden = false;
      if (status) {
        status.textContent =
          "Booking calendar connects after the Google Appointment schedule link is added.";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
