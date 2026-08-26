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

- **Railing:** dropdown (none / treated / composite / aluminum / cable / glass). Cable asks wood vs aluminum posts. Glass asks spigots vs enclosed frame. Labor is per system. Linear feet starts at 0 and stays 0 until the user types it.
- **Railing-only:** deck sq ft is optional. Customers can leave sq ft at 0, pick a railing type, enter LF, and submit. Permit ($350) is not added until deck sq ft is entered. Install labor (not shown in the UI): treated $35/LF, composite $40/LF, aluminum $45/LF, cable wood $55/LF, cable alum $58/LF, glass enclosed $70/LF, glass spigot $90/LF.
- **Alum posts:** floor $100 each (Westbury 2x2 kit $103, Trex Select from $119). Cable alum posts Feeney $243–$281. Glass spigot HD kit ~$166/LF materials.
- **No materials:** board install + steps priced as TimberTech Advanced PVC Vintage; framing labor × 1.20. Railing materials still add if a railing type is selected.
- **Advanced PVC colors (official TimberTech):** Harvest (3), Harvest+ (2), Landmark (4), Vintage (6).
- **Board $:** Advanced PVC ~$180 / 20′ 1x6 grooved, prorated to $/sf (8% waste × 1.20) = $25.45/sf sell.
- **Piers:** (tube + bags + #5 rebar) × 1.06 tax × 1.20 markup + 1 hr @ $80. User enters count including stairs.

## Files

| File | Role |
|------|------|
| `index.html` | Wizard UI + forms |
| `calculator.js` | Rates + math + FormSubmit payload (`?v=20260819` on index) |
| `calculator.css` | Calculator layout (uses site header/footer styles too) |
