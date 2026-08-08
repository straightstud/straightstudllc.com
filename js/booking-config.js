/**
 * Straight Stud Construction — Google Calendar booking config
 *
 * HOW TO CONNECT (one-time, ~5 minutes):
 * 1. On a computer open https://calendar.google.com (signed in as parker@straightstudllc.com)
 * 2. Click Create → Appointment schedule
 * 3. Title: "Site visit / free quote — Straight Stud Construction"
 * 4. Duration: 60 minutes (or 30 if you prefer)
 * 5. General availability: EVERY day Mon–Sun, 9:00 AM – 5:00 PM
 *    Time zone: Eastern Time (America/Detroit) — Grand Rapids
 * 6. Location: In-person meeting (Greater Grand Rapids) or Phone call
 * 7. Save, then open the schedule → Share / Copy link (or Website embed → copy iframe src)
 * 8. Paste that URL into bookingPageUrl below (and embedSrc if Google gives a separate embed URL)
 * 9. Commit & push — the Book page will show live open slots from your calendar
 */
window.SSC_BOOKING = {
  /* Paste your Google Calendar booking page URL here, e.g.
     https://calendar.google.com/calendar/appointments/schedules/AcZssZ0...
     or https://calendar.app.google/... */
  bookingPageUrl: "",

  /* Optional: iframe src from Google “Website embed”. Leave blank to use bookingPageUrl. */
  embedSrc: "",

  /* Display copy for the site */
  title: "Book a site visit or quote call",
  hoursLabel: "Monday – Sunday · 9:00 AM – 5:00 PM",
  timezoneLabel: "Eastern Time (Grand Rapids)",
  durationLabel: "Typically 30–60 minutes",
  serviceArea: "Greater Grand Rapids, Michigan",
};
