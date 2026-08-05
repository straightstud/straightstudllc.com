"""One-off: median wood / hybrid / composite rail cost models ($/LF materials)."""
from statistics import median

# --- Component samples (MI big-box / distributor ranges + your quotes) ---
post_4x4x8 = [12.98, 14.50, 15.88, 16.50, 18.00]  # PT 4x4x8
rail_2x4x8 = [5.50, 6.28, 6.98, 7.50, 8.00]
rail_2x6x8 = [8.50, 9.50, 10.50, 11.50, 12.50]
wood_spindle = [2.50, 3.00, 3.50, 4.00, 4.50]  # 2x2 x ~42"
alum_spindle = [4.50, 5.50, 6.50, 7.50, 8.50]  # aluminum baluster each
# Your proposal: 220 spindles / ~70 LF => 3.14 per LF (~3.8" OC) — use code ~4.5" centers
# Composite rail kits (6' section) materials-only ranges
comp_kit_6 = [120, 150, 180, 200, 220, 250]
post_sleeve = [35, 45, 55, 65, 75]
post_cap = [12, 18, 25, 30, 40]
post_skirt = [8, 12, 15, 20]

# Your real quote points
# StraightStud proposal ~70 LF:
hybrid_job = 2098.74 / 70  # Custom Hybrid Craftsman materials
alum_job = 5773.00 / 70  # Premium aluminum materials
rail_labor_job = 2450.00 / 70  # install labor quoted

# Westbury (Quote0047281807): panel + post kits
westbury_panel_6 = 231.5125 / 6
westbury_panel_8 = 295.6250 / 8
westbury_post_37 = 78.7250
westbury_post_47 = 85.6625
# posts every 6' for level rail
westbury_full_6 = westbury_panel_6 + westbury_post_37 / 6

print("=== YOUR QUOTE ANCHORS ===")
print(f"Hybrid materials (proposal): ${hybrid_job:.2f}/LF")
print(f"Aluminum materials (proposal): ${alum_job:.2f}/LF")
print(f"Rail install labor (proposal): ${rail_labor_job:.2f}/LF")
print(f"Westbury panel only 6': ${westbury_panel_6:.2f}/LF")
print(f"Westbury full (panel+post@6'): ${westbury_full_6:.2f}/LF")

# WOOD: 4x4 posts @ 6' OC, 2x4 top+bottom, wood spindles @ 4.5" OC, hardware
post = median(post_4x4x8)
top = median(rail_2x4x8) / 8
bot = median(rail_2x4x8) / 8
top6 = median(rail_2x6x8) / 8
sp_w = median(wood_spindle)
sp_a = median(alum_spindle)
sp_per_lf = 12 / 4.5  # ~2.67
hw = 1.50
post_lf = post / 6.0

wood_2x4 = post_lf + top + bot + sp_per_lf * sp_w + hw
wood_2x6 = post_lf + top6 + bot + sp_per_lf * sp_w + hw
wood_samples = [wood_2x4, wood_2x6, wood_2x4 * 0.9, wood_2x6 * 1.1]
# also posts every 5' (tighter)
wood_5oc = (post / 5.0) + top + bot + sp_per_lf * sp_w + hw
wood_samples.append(wood_5oc)

print("\n=== WOOD RAIL (4x4 post + wood rails + wood spindles) MATERIALS ===")
print(f"4x4 post median: ${post:.2f} ea -> ${post_lf:.2f}/LF @6' OC")
print(f"2x4 top/LF: ${top:.2f}  bottom/LF: ${bot:.2f}")
print(f"wood spindles/LF: ${sp_per_lf * sp_w:.2f}")
print(f"wood total 2x4 top: ${wood_2x4:.2f}/LF")
print(f"wood total 2x6 top: ${wood_2x6:.2f}/LF")
print(f"wood total 5' OC: ${wood_5oc:.2f}/LF")
print(f"WOOD MEDIAN: ${median(wood_samples):.2f}/LF")

# HYBRID materials = wood posts/rails + aluminum spindles + baluster hardware
baluster_hw = 2.0  # shoes/brackets per LF allowance
hybrid_mat = post_lf + top + bot + sp_per_lf * sp_a + hw + baluster_hw
# cocktail/composite top rail upgrade (your hybrid description)
cocktail_extra = [3, 4, 5, 6, 8]  # $/LF for composite drink rail vs 2x4
hybrid_with_cocktail = hybrid_mat + median(cocktail_extra)
# Your actual hybrid job
hybrid_samples = [hybrid_mat, hybrid_with_cocktail, hybrid_job, hybrid_mat * 1.1, hybrid_job * 0.95]
print("\n=== HYBRID (wood structure + alum spindles) MATERIALS ===")
print(f"alum spindles/LF: ${sp_per_lf * sp_a:.2f}")
print(f"hybrid mat (2x4 top): ${hybrid_mat:.2f}/LF")
print(f"hybrid + cocktail rail: ${hybrid_with_cocktail:.2f}/LF")
print(f"your job hybrid: ${hybrid_job:.2f}/LF")
print(f"HYBRID MATERIALS MEDIAN: ${median(hybrid_samples):.2f}/LF")

# Extra labor for hybrid vs plain wood rail (spindle layout, shoes, cocktail rail)
# Base rail labor already $35/LF in calculator; EXTRA only for hybrid complexity
extra_labor_samples = [8, 10, 12, 15, rail_labor_job - 25]  # if base wood labor ~$25, extra from $35 quote
extra_labor_samples = [x for x in extra_labor_samples if x > 0]
# From proposal: full rail labor $35/LF; wood-only often ~$20-25; hybrid extra ~$10-15
extra_labor = [8, 10, 12, 15, 12]
print(f"extra hybrid labor median: ${median(extra_labor):.2f}/LF")
hybrid_mat_plus_extra_labor = median(hybrid_samples) + median(extra_labor)
print(f"HYBRID materials + extra labor (for materials-line pad): ${hybrid_mat_plus_extra_labor:.2f}/LF")
# Better: keep materials and add labor separately in calculator
# User asked: "add in cost of aluminum spindles and the extra labor to build the rail system"
# So hybrid rate in materials can include extra labor OR we bump railing labor for hybrid.
# Cleaner for calculator: materials = hybrid mat; labor_extra_hybrid_per_lf locked

# COMPOSITE: kits + post sleeves + caps (+ structural 4x4)
kit = median(comp_kit_6)
sleeve = median(post_sleeve)
cap = median(post_cap)
skirt = median(post_skirt)
kit_lf = kit / 6.0
finish_lf = (sleeve + cap + skirt) / 6.0
struct_lf = post / 6.0
comp = kit_lf + finish_lf + struct_lf + 1.0  # misc brackets
# Westbury-style full aluminum panel system as upper composite/alum kit proxy
comp_samples = [
    comp,
    kit_lf + finish_lf + struct_lf,
    westbury_full_6,  # commercial kit system
    (150 / 6) + finish_lf + struct_lf,
    (200 / 6) + finish_lf + struct_lf,
    (220 / 6) + finish_lf + struct_lf,
]
print("\n=== COMPOSITE (kits + sleeves + caps + 4x4 core) MATERIALS ===")
print(f"kit median ${kit:.0f}/6' -> ${kit_lf:.2f}/LF")
print(f"sleeve+cap+skirt/LF: ${finish_lf:.2f}")
print(f"4x4 core/LF: ${struct_lf:.2f}")
print(f"composite build-up: ${comp:.2f}/LF")
print(f"Westbury full system: ${westbury_full_6:.2f}/LF")
print(f"COMPOSITE MATERIALS MEDIAN: ${median(comp_samples):.2f}/LF")

print("\n=== LOCKED RECOMMENDATIONS (cost basis, before 20% markup) ===")
print(f"treated_wood: ${round(median(wood_samples)):.0f}/LF")
print(f"hybrid materials only: ${round(median(hybrid_samples)):.0f}/LF")
print(f"hybrid extra labor: ${round(median(extra_labor)):.0f}/LF  (add to labor when hybrid selected)")
print(f"hybrid materials+extra labor combined: ${round(hybrid_mat_plus_extra_labor):.0f}/LF")
print(f"composite: ${round(median(comp_samples)):.0f}/LF")
print(f"aluminum (keep prior lock): $90/LF Signature cable OR ${round(alum_job):.0f}/LF from proposal Westbury-style")
