# Deck Estimate Calculator (live)

**URL:** https://www.straightstudllc.com/deck-estimate/

## Go live checklist

1. Deploy / push this site so `deck-estimate/` is on GitHub Pages (or your host).
2. Open the calculator once and submit a **test** estimate.
3. Check **request@straightstudllc.com** — if FormSubmit asks you to confirm the address, click the activation link (same as the contact form).
4. Confirm the thank-you redirect lands on `?sent=1`.

## What customers get

- Multi-step rough estimate (labor → optional materials → request)
- Unit rates never shown; only dollar totals
- Email to you with full summary for appointment / contract prep

## What you charge (locked in `calculator.js`)

Labor and materials rates are final sell prices (materials already include 20% upcharge).  
Edit only `RATES` in `calculator.js` if prices change.

- **No materials:** board install + steps priced as TimberTech Advanced PVC Vintage; framing labor × 1.20.
- **Advanced PVC colors (official TimberTech):** Harvest (3), Harvest+ (2), Landmark (4), Vintage (6).
- **Board $:** Advanced PVC ~$180 / 20′ 1x6 grooved, prorated to $/sf (8% waste × 1.20) = $25.45/sf sell.
- **Piers:** (tube + bags + #5 rebar) × 1.06 tax × 1.20 markup + 1 hr @ $80. User enters count including stairs.

## Files

| File | Role |
|------|------|
| `index.html` | Wizard UI + forms |
| `calculator.js` | Rates + math + FormSubmit payload |
| `calculator.css` | Calculator layout (uses site header/footer styles too) |
