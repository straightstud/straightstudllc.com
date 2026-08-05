# Deck Estimate Calculator — DEMO (not live)

Private demo for Straight Stud Construction LLC.  
**Not linked** from the public site. **noindex** + blocked in `robots.txt`.

## Open locally

```
demo/deck-calculator/index.html
```

## Customer flow

1. **Your info** — name, email, phone, city  
2. **Deck size** — sq ft, railing LF (include stairs), steps  
3. **Labor total**  
4. **Materials** (optional) — decking samples + railing samples  
5. **Request** — summary emailed to you  

## Labor (charge rates — not shown as unit prices)

| Item | Rate |
|------|------|
| Framing & install | $35 / sq ft |
| Railing install | $35 / LF |
| Steps | $100 / step |
| Hybrid rail extra labor | $12 / LF (when hybrid selected) |

```
labor = (sqft × 35) + (railing_LF × 35) + (steps × 100) + (hybrid ? LF × 12 : 0)
```

## Materials (LOCKED = true cost × 1.20)

**20% upcharge is baked into every material rate.** No separate markup line.

```
framing    = sqft × $7.80
boards     = sqft × (line rate)
fasteners  = sqft × $6.00
railing    = total_LF × (type rate)   // include stair LF
materials  = framing + boards + fasteners + railing
grand      = labor + materials
```

### Final sell rates (cost × 1.20)

| Category | Sell rate | Was cost |
|----------|-----------|----------|
| Framing materials | **$7.80 / SF** | $6.50 |
| Fasteners / hardware | **$6.00 / SF** | $5.00 |
| Pressure-treated decking | **$8.40 / SF** | $7 |
| Trex Enhance | **$8.40 / SF** | $7 |
| Trex Select | **$13.20 / SF** | $11 |
| Trex Transcend | **$18.60 / SF** | $15.50 |
| Trex Signature | **$21.60 / SF** | $18 |
| TimberTech Terrain | **$14.40 / SF** | $12 |
| TimberTech Legacy | **$18.60 / SF** | $15.50 |
| TimberTech Reserve / AZEK | **$19.20 / SF** | $16 |
| Wood rail | **$19.20 / LF** | $16 |
| Hybrid rail materials | **$33.60 / LF** | $28 |
| Aluminum rail | **$114 / LF** | $95 |
| Composite rail | **$61.20 / LF** | $51 |

## Files

| File | Purpose |
|------|---------|
| `index.html` | Multi-step UI |
| `calculator.js` | Rates, math, form prefills |
| `calculator.css` | Styles |
| `README.md` | This file |
