"""Full railing materials math — wood, hybrid, composite, aluminum (cost basis)."""
from statistics import median

print("=" * 60)
print("RAILING MATERIALS MATH (cost basis, before 20% markup)")
print("Assumptions: posts ~6' O.C.; include stair LF in total LF")
print("=" * 60)

# Shared
POST_OC = 6.0  # feet between posts
SPINDLE_OC_IN = 4.5  # code-friendly centers for ~1.5" balusters
SPINDLES_PER_LF = 12.0 / SPINDLE_OC_IN  # ~2.667

# --- Component unit costs (MI medians / your quotes) ---
post_4x4x8 = 15.88
rail_2x4_per_lf = 6.98 / 8  # 2x4x8 median / 8
rail_2x6_per_lf = 10.50 / 8
wood_spindle_each = 3.50
alum_spindle_each = 6.50
baluster_hw_per_lf = 2.00  # shoes/brackets
framing_hw_per_lf = 1.50  # screws/nails
cocktail_rail_extra = 5.00  # composite drink rail vs plain 2x4

# Composite kit package
kit_6ft = 190.0  # median Trex/TimberTech-style 6' kit
sleeve = 55.0
cap = 25.0
skirt = 15.0

print("\n### 1) WOOD RAIL — 4x4 posts + wood rails + wood spindles")
print("-" * 50)
post_lf = post_4x4x8 / POST_OC
top = rail_2x4_per_lf
bot = rail_2x4_per_lf
sp_wood = SPINDLES_PER_LF * wood_spindle_each
wood_total = post_lf + top + bot + sp_wood + framing_hw_per_lf
print(f"  4x4x8 PT post ${post_4x4x8:.2f} / {POST_OC}' OC     = ${post_lf:.2f}/LF")
print(f"  Top rail 2x4                          = ${top:.2f}/LF")
print(f"  Bottom rail 2x4                       = ${bot:.2f}/LF")
print(f"  Wood spindles {SPINDLES_PER_LF:.2f}/LF x ${wood_spindle_each:.2f} = ${sp_wood:.2f}/LF")
print(f"  Hardware allowance                    = ${framing_hw_per_lf:.2f}/LF")
print(f"  WOOD TOTAL (cost)                     = ${wood_total:.2f}/LF")
print(f"  LOCKED                                = $16.00/LF")
print(f"  After 20% markup                      = ${16 * 1.2:.2f}/LF")

print("\n### 2) HYBRID — wood posts/rails + aluminum spindles (+ cocktail rail)")
print("-" * 50)
sp_alum = SPINDLES_PER_LF * alum_spindle_each
hybrid_mat = (
    post_lf + top + bot + sp_alum + framing_hw_per_lf + baluster_hw_per_lf + cocktail_rail_extra
)
print(f"  4x4 post @ 6' OC                      = ${post_lf:.2f}/LF")
print(f"  Top + bottom 2x4                      = ${top + bot:.2f}/LF")
print(f"  Alum spindles {SPINDLES_PER_LF:.2f}/LF x ${alum_spindle_each:.2f} = ${sp_alum:.2f}/LF")
print(f"  Baluster shoes/brackets               = ${baluster_hw_per_lf:.2f}/LF")
print(f"  Cocktail / composite top rail extra   = ${cocktail_rail_extra:.2f}/LF")
print(f"  Framing hardware                      = ${framing_hw_per_lf:.2f}/LF")
print(f"  HYBRID MATERIALS BUILD-UP             = ${hybrid_mat:.2f}/LF")
print(f"  Your job check: $2,098.74 / 70 LF     = ${2098.74/70:.2f}/LF")
print(f"  LOCKED materials                      = $28.00/LF")
print(f"  Extra hybrid LABOR (not marked up)    = $12.00/LF")
print(f"  Materials after 20%                   = ${28 * 1.2:.2f}/LF")
print(f"  + base rail labor $35 + extra $12     = $47.00/LF labor side")

print("\n### 3) COMPOSITE — Trex/TimberTech-style kits + sleeves + caps")
print("-" * 50)
kit_lf = kit_6ft / 6.0
finish_lf = (sleeve + cap + skirt) / POST_OC
core_lf = post_4x4x8 / POST_OC
misc = 1.00
comp_total = kit_lf + finish_lf + core_lf + misc
print(f"  Rail kit ${kit_6ft:.0f} / 6' section          = ${kit_lf:.2f}/LF")
print(f"  Post sleeve ${sleeve:.0f}                     = ${sleeve/POST_OC:.2f}/LF")
print(f"  Post cap ${cap:.0f}                           = ${cap/POST_OC:.2f}/LF")
print(f"  Post skirt ${skirt:.0f}                       = ${skirt/POST_OC:.2f}/LF")
print(f"  4x4 structural core                   = ${core_lf:.2f}/LF")
print(f"  Misc brackets/hardware                = ${misc:.2f}/LF")
print(f"  COMPOSITE TOTAL (cost)                = ${comp_total:.2f}/LF")
print(f"  LOCKED                                = $51.00/LF")
print(f"  After 20% markup                      = ${51 * 1.2:.2f}/LF")
print("  (Kit $190 is mid Trex/TimberTech 6' kit range $120–$250)")

print("\n### 4) ALUMINUM — premium full system (your lock)")
print("-" * 50)
print("  Reference packages from your files:")
print(f"    Signature cable cost sheet          = ${ (6840+2660+1360+1680)/140 :.2f}/LF")
print(f"    Proposal Westbury materials         = ${5773/70:.2f}/LF")
print(f"    Trex Select Zeeland panels+posts    = ~$44/LF (value tier)")
print(f"    Westbury SRS full kit system        = ~$53/LF")
print(f"  LOCKED (your call)                    = $95.00/LF")
print(f"  After 20% markup                      = ${95 * 1.2:.2f}/LF")
print("  Includes: posts + rail/panels; put stairs in total LF")

print("\n" + "=" * 60)
print("LOCKED SUMMARY (cost → with 20% material markup)")
print("=" * 60)
rows = [
    ("Wood", 16, None),
    ("Hybrid materials", 28, 12),
    ("Composite", 51, None),
    ("Aluminum", 95, None),
]
for name, cost, extra_lab in rows:
    m = cost * 1.2
    extra = f"  + ${extra_lab}/LF hybrid labor" if extra_lab else ""
    print(f"  {name:20}  cost ${cost:5.2f}/LF  →  marked-up ${m:6.2f}/LF{extra}")

print("\n### Example: 70 LF of each (materials only + 20%)")
print("-" * 50)
for name, cost, extra_lab in rows:
    sub = 70 * cost
    mk = sub * 0.20
    tot = sub + mk
    lab = f"  hybrid extra labor ${70*(extra_lab or 0):,.0f}" if extra_lab else ""
    print(f"  {name:20}  subtotal ${sub:,.0f} + 20% ${mk:,.0f} = ${tot:,.0f}{lab}")
