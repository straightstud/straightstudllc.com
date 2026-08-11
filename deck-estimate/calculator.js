/**
 * Straight Stud Construction LLC — Deck estimate calculator (live)
 *
 * Labor rates: base charge rates for the median deck band (~200–350 sq ft).
 * Labor $/sf scales with deck size (small-job premium, large-deck efficiency).
 * Material rates: sell with markup + small buffer; do NOT scale with sq ft.
 * No separate markup line — materials total is final sell price.
 * Permit fee: flat building + zoning allowance, auto-added when sq ft is entered.
 * All math runs locally in the browser — no pricing API on each keystroke.
 *
 * Railing LF includes stairs. Unit rates are never displayed to customers.
 *
 * Size bands (local median reported deck ~220–225 sf):
 *   <200 sf     — small-job labor premium
 *   200–350 sf  — base labor (factor 1.0)
 *   400–600+ sf — lower labor $/sf (volume efficiency)
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
   * RATES — base rates (labor at 200–350 sf). Unit rates never shown in UI.
   * Materials = cost × 1.20 + small buffer. Do not add another markup.
   * ------------------------------------------------------------------ */
  var RATES = {
    // Flat project fees (not size-scaled). Auto-added once deck sq ft is entered.
    fees: {
      // Building + zoning permit allowance (typical MI city package + handling buffer)
      permitZoningBuilding: 350,
      permitLabel: "Building & zoning permits",
    },
    /*
     * Footings (new build):
     * - STANDARD (included in framing materials $/sf): 16" composite pads + gravel + 6x6 posts
     * - OPTIONAL UPGRADE: sonotube / pier frost footings (extra $ each) when preferred or required
     */
    pierFrostFooting: {
      sellEach: 295, // dig + sonotube + concrete + labor (planning sell)
      label: "Pier / sonotube frost footing upgrade",
    },
    labor: {
      // Base rates = median band (200–350 sf). Scaled by sizeLaborFactor(sqft).
      framingPerSqft: 10, // new build framing labor (base; × size × platform × shape)
      // Platform count → framing labor only (stairs are separate $/step)
      // 1 → +0% | 2 → +25% | 3+ → +50%
      platformFactor: { 1: 1.0, 2: 1.25, 3: 1.5 },
      // Shape → framing labor only
      // rectangle → +0% | angled/complex → +20%
      shapeFactor: { rectangle: 1.0, angled: 1.2 },
      // Composite decking install (Trex / TimberTech) — new build only; not treated
      compositeInstallPerSqft: 25,
      // Pressure-treated face-screw board install — new build when treated selected
      treatedInstallPerSqft: 17.5,
      // Redeck path
      redeckPerSqft: 18, // redeck labor (new surface on existing structure)
      demoDisposePerSqft: 9, // demo & dispose old decking
      // Same install labor for every rail type (wood / hybrid / aluminum / composite)
      railingPerLf: 35, // not size-scaled; no type premium
      // Steps — separate from platform % (composite is much slower: blocking, risers, plugs)
      perStepTreated: 100,
      perStepComposite: 175,
      // Default when decking not chosen yet (planning); refined when surface is picked
      perStep: 100,
    },
    // New builds include limited lifetime workmanship warranty (shown in UI + email)
    warrantyNewBuild: "Limited lifetime workmanship warranty included on all new builds",
    // Scope notes for checkout / email (framing finalized)
    framingScopeNotes:
      "Framing scope (new build): footings included as 16\" composite pads on compacted gravel with 6x6 PT posts — this is the standard full-build footing package in the framing rate. " +
      "Joists typically 2x10 @ 16\" O.C.; double 2x12 carrier beams; hangers, hurricane ties, and structural fasteners included. " +
      "Sonotube / pier frost footings are NOT included (optional upgrade if required or preferred). Final layout confirmed on site.",
    stairScopeNotes:
      "Stair structure: PT 2x12 tread bases; color-matched risers (same brand/line as decking — PT 1x10 ripped or composite ~7.25\" riser); " +
      "stringers; extra 16\" composite footings when selected. Riser $/LF prorated from real decking board cost by line. " +
      "Tread face boards are in deck sq ft / decking materials. Stair rail is in railing LF.",
    /*
     * Competitor context (planning only — not a bid from any company).
     * Local research: Green Shield / large remodeler composite quotes often run
     * much higher ($140–$250+/sf on small decks in forum samples). We use a
     * conservative “premium mainstream” all-in $/sf for savings messaging.
     */
    competitor: {
      label: "mainstream premium deck companies",
      // All-in rough $/sf of deck area for similar scope (labor + materials)
      allInPerSqft: {
        treated: 75,
        composite: 110,
        laborOnly: 55,
      },
    },
    materials: {
      // Sell rates = vendor COST × 1.20 (no second markup). Fixed — do not scale with deck size.
      // Costs from Zeeland / Carter / HD Pro + owner hardware rules (see MATERIALS-COST-LOG.md).
      //
      // FRAMING MATERIALS (finalized 2026-08-07) — full takeoff legend:
      //   16" composite pads @ 8' OC, 6x6 posts, double 2x12 beams, 2x10 @ 16" OC,
      //   LUS210 hangers, H2.5A ties, GRK 4", Paslode 3", PP hanger nails,
      //   ice & water, Z-flashing, ABA66Z post bases, gravel, 8% lumber waste,
      //   delivery allowance, MI 6% tax.
      //   Takeoff: 12x20 COMP ~$10.04/sf · 12x12 COMP ~$11.57/sf · blend ~$10.75/sf
      //   Sell = 10.75 × 1.20 = $12.90/sf (same rate all sizes; small decks slightly tighter)
      framingPerSqft: 12.9,
      /*
       * Composite FASTENERS + fascia + tape — MERGED (owner rules)
       * COST then ×1.20 sell. One line in UI: "Fasteners / fascia / joist tape"
       *
       * 1) Perimeter plugs+screws (~1/6 deck): $100/100 LF board
       *    5.5" face → 2.1818 LF/sf board × (1/6) ≈ $0.36/sf
       * 2) Hidden fasteners: $1.00/sf
       * 3) Joist tape: $20/50' = $0.40/LF × 1 LF/sf = $0.40/sf
       * 4) Fascia board: $8–$18/LF (legend mid $13/LF) × 0.25 LF/sf = $3.25/sf
       * 5) Fascia plugs+screws: $80/100 LF = $0.80/LF × 0.25 LF/sf = $0.20/sf
       *
       * Cost total = 0.36 + 1.00 + 0.40 + 3.25 + 0.20 = $5.21/sf
       * Sell = 5.21 × 1.20 = $6.25/sf
       *
       * Fascia range check (board only @ 0.25 LF/sf):
       *   $8/LF → $2.00/sf | $13 mid → $3.25/sf | $18/LF → $4.50/sf
       */
      fastenersPerSqft: 6.25,
      /*
       * STAIR STRUCTURE materials (not tread FACE, not rail).
       * Face boards = deck sq ft. Rail = railing LF.
       * Cost × 1.20 sell. Inputs: step count + width (3/4/5/6 ft) + optional extra footings.
       *
       * COLOR-MATCHED RISERS: same brand/line as decking.
       *   PT: 1x10 ripped to rise (~$2.00/LF cost)
       *   Composite: ~1/2 x 7-1/4 x 12' matching collection
       *
       * Riser $/LF derived from REAL decking board $/LF prorated against known
       * matching riser sticks. Use NON-DISCOUNTED / list-class anchors for
       * estimating (Carter 5780 Arroyo Carmel was a discounted job price — keep
       * higher legend so quotes stay safe):
       *   Enhance riser ~$72/12' = $6.00/LF | board ~$2.98/LF
       *   Transcend riser ~$102/12' = $8.50/LF | board ~$7.24/LF (Zeeland-class)
       *   (Discounted Carter Carmel was board $6.79/LF, riser $91.21 = $7.60/LF — do not use as sell base)
       * Formula: riserLf = enhanceRiserLf + slope × (boardLf − enhanceBoardLf)
       *   slope = (8.50 − 6.00) / (7.24 − 2.98) ≈ 0.587
       */
      stairs: {
        twoByTwelveCostPerLf: 2.5, // Zeeland-class 2x12 tread base
        hardwareCostPerStep: 4,
        stringerBoard12: 29.94,
        stringerBoard16: 39.64,
        stringerHardwareEach: 8,
        footingPackageCost: 83.61,
        footingPad12Cost: 16.79, // Carter FP-12 reference only
        markup: 1.2,
        // Real decking BOARD cost $/LF — non-discounted legend
        realBoardCostPerLf: {
          treated: 2.2,
          enhance: 2.98, // Zeeland Enhance Naturals 16' @ $47.60
          select: 4.5,
          transcend: 7.24, // Zeeland Lineage-class (higher than discounted Carter Carmel $6.79)
          signature: 8.5,
          terrain: 4.0,
          legacy: 7.24,
          reserve: 6.5,
        },
        // Matching riser anchors — keep HIGHER non-discounted rates
        riserAnchor: {
          enhanceBoardLf: 2.98,
          enhanceRiserLf: 6.0, // ~$72/12'
          transcendBoardLf: 7.24,
          transcendRiserLf: 8.5, // ~$102/12' (not discounted Carter $7.60)
          treatedRiserLf: 2.0, // 1x10 PT ripped
        },
        // Matching fascia 12" — use higher than discounted Carter Carmel $12.49
        fasciaCostPerLfByLine: {
          enhance: 9.9,
          select: 11.0,
          transcend: 13.5, // above discounted $12.49 Carmel
          signature: 15.0,
          terrain: 9.5,
          legacy: 13.5,
          reserve: 12.5,
        },
      },
      compositeHardware: {
        cortexCostPer100Lf: 100,
        boardFaceIn: 5.5,
        perimeterShare: 1 / 6,
        hiddenFastenersCostPerSqft: 1.0,
        tapeCostPer50Lf: 20,
        tapeLfPerSqft: 1,
        // Fascia board $8–$18/LF — use mid $13 for legend
        fasciaCostPerLfMin: 8,
        fasciaCostPerLfMax: 18,
        fasciaCostPerLf: 13,
        fasciaLfPerSqft: 0.25,
        fasciaPlugsCostPer100Lf: 80, // $80 / 100 LF fascia
        // derived cost pieces
        perimeterPlugsCostPerSqft: 0.36,
        hiddenCostPerSqft: 1.0,
        tapeCostPerSqft: 0.4,
        fasciaBoardCostPerSqft: 3.25, // 13 × 0.25
        fasciaPlugsCostPerSqft: 0.2, // 0.80 × 0.25
        costPerSqft: 5.21,
        sellPerSqft: 6.25,
      },
      // Pressure-treated: 3" deck screws only (no Cortex / no butyl / no composite fascia kit)
      // 0.05 lb/sqft × $16.50/lb ≈ $0.85 cost × 1.20 + buffer
      treatedScrews: {
        lbsPerSqft: 0.05,
        costPerLb: 16.5,
        perSqft: 1.1,
      },
      // Decking boards — at least cost × 1.20 (color does not change price)
      decking: {
        treated: { label: "Pressure-treated lumber", perSqft: 9.1 }, // above cost 7.00 × 1.20
        trex: {
          label: "Trex",
          lines: {
            enhance: {
              label: "Trex Enhance",
              perSqft: 9.1, // above cost ~7.00 × 1.20
              samples: [
                { id: "beach_dune", name: "Beach Dune", grain: ["#d4b896", "#c4a078", "#b8926a", "#c9a882"] },
                { id: "clam_shell", name: "Clam Shell", grain: ["#b8b0a4", "#a89e90", "#9a9084", "#aea69a"] },
                { id: "saddle", name: "Saddle", grain: ["#8b6914", "#6b4f10", "#a07828", "#7a5a18"] },
                { id: "rocky_harbor", name: "Rocky Harbor", grain: ["#6a6560", "#5a5550", "#78736e", "#4a4540"] },
                { id: "foggy_wharf", name: "Foggy Wharf", grain: ["#8a9094", "#7a8084", "#9aa0a4", "#6a7074"] },
                { id: "toasted_sand", name: "Toasted Sand", grain: ["#c4a882", "#b89870", "#d0b490", "#a88860"] },
              ],
            },
            select: {
              label: "Trex Select",
              perSqft: 14.4, // cost 12.00 × 1.20
              samples: [
                { id: "pebble_grey", name: "Pebble Grey", grain: ["#9a9690", "#8a8680", "#aaa6a0", "#7a7670"] },
                { id: "woodland_brown", name: "Woodland Brown", grain: ["#5c4030", "#4a3224", "#6e4e3a", "#3e2a1e"] },
                { id: "madeira", name: "Madeira", grain: ["#8b4513", "#6d3610", "#a0522d", "#7a3c12"] },
                { id: "winchester_grey", name: "Winchester Grey", grain: ["#6e6a66", "#5e5a56", "#7e7a76", "#4e4a46"] },
              ],
            },
            transcend: {
              label: "Trex Transcend",
              // cost ~$19.50/sf of deck (Lineage field boards + waste, Zeeland 1511896)
              perSqft: 23.4, // cost 19.50 × 1.20
              samples: [
                { id: "island_mist", name: "Island Mist", grain: ["#a8b0a8", "#98a098", "#b8c0b8", "#889088"] },
                { id: "spiced_rum", name: "Spiced Rum", grain: ["#6b3a2a", "#5a2e20", "#7c4a38", "#4a2418"] },
                { id: "tiki_torch", name: "Tiki Torch", grain: ["#c47830", "#a86020", "#d49048", "#b06828"] },
                { id: "havana_gold", name: "Havana Gold", grain: ["#c9a84c", "#b89438", "#d8b860", "#a88030"] },
                { id: "fire_pit", name: "Fire Pit", grain: ["#5c2e1e", "#4a2416", "#6e3a28", "#3e1e12"] },
                { id: "gravel_path", name: "Gravel Path", grain: ["#7a7672", "#6a6662", "#8a8682", "#5a5652"] },
                { id: "lava_rock", name: "Lava Rock", grain: ["#3a3230", "#2a2220", "#4a4240", "#1a1210"] },
                { id: "rope_swing", name: "Rope Swing", grain: ["#a89070", "#988060", "#b8a080", "#887050"] },
              ],
            },
            signature: {
              label: "Trex Signature",
              perSqft: 25.2, // cost 21.00 × 1.20
              samples: [
                { id: "whidbey", name: "Whidbey", grain: ["#c8b8a0", "#b8a890", "#d8c8b0", "#a89880"] },
                { id: "tide_pool", name: "Tide Pool", grain: ["#5a6870", "#4a5860", "#6a7880", "#3a4850"] },
                { id: "nestwood", name: "Nestwood", grain: ["#8b6f47", "#7a5f3a", "#9b7f57", "#6a4f2a"] },
                { id: "ashwood", name: "Ashwood", grain: ["#9a9088", "#8a8078", "#aaa098", "#7a7068"] },
              ],
            },
          },
        },
        timbertech: {
          label: "TimberTech",
          lines: {
            terrain: {
              label: "TimberTech Terrain",
              perSqft: 15.6, // above cost ~12.50 × 1.20
              samples: [
                { id: "brown_oak", name: "Brown Oak", grain: ["#7a5238", "#6a4228", "#8a6248", "#5a3218"] },
                { id: "silver_maple", name: "Silver Maple", grain: ["#a8a4a0", "#989490", "#b8b4b0", "#888480"] },
                { id: "dark_hickory", name: "Dark Hickory", grain: ["#4a3428", "#3a2418", "#5a4438", "#2a1408"] },
                { id: "stone_ash", name: "Stone Ash", grain: ["#8a8680", "#7a7670", "#9a9690", "#6a6660"] },
                { id: "sandy_birch", name: "Sandy Birch", grain: ["#d0c0a0", "#c0b090", "#e0d0b0", "#b0a080"] },
              ],
            },
            legacy: {
              label: "TimberTech Legacy",
              perSqft: 23.4, // cost 19.50 × 1.20 (Transcend-class)
              samples: [
                { id: "french_white_oak", name: "French White Oak", grain: ["#d8c8b0", "#c8b8a0", "#e8d8c0", "#b8a890"] },
                { id: "ashwood", name: "Ashwood", grain: ["#9a928a", "#8a827a", "#aaa29a", "#7a726a"] },
                { id: "dark_roast", name: "Dark Roast", grain: ["#3e2a20", "#2e1a10", "#4e3a30", "#1e0a00"] },
                { id: "tigerwood", name: "Tigerwood", grain: ["#a06030", "#8a5020", "#b07040", "#704010"] },
                { id: "pecan", name: "Pecan", grain: ["#b88850", "#a87840", "#c89860", "#986830"] },
                { id: "espresso", name: "Espresso", grain: ["#3a2820", "#2a1810", "#4a3830", "#1a0800"] },
              ],
            },
            reserve: {
              label: "TimberTech Reserve / AZEK",
              perSqft: 20.7, // above cost ~16.00 × 1.20
              samples: [
                { id: "coastline", name: "Coastline", grain: ["#b0b8b8", "#a0a8a8", "#c0c8c8", "#909898"] },
                { id: "mahogany", name: "Mahogany", grain: ["#6b2e1e", "#5b1e0e", "#7b3e2e", "#4b0e00"] },
                { id: "dark_hickory_r", name: "Dark Hickory", grain: ["#4a3020", "#3a2000", "#5a4030", "#2a1000"] },
                { id: "american_walnut", name: "American Walnut", grain: ["#5c4033", "#4c3023", "#6c5043", "#3c2013"] },
                { id: "boardwalk", name: "Boardwalk", grain: ["#c4a882", "#b49872", "#d4b892", "#a48862"] },
                { id: "slate_gray", name: "Slate Gray", grain: ["#6a6e72", "#5a5e62", "#7a7e82", "#4a4e52"] },
              ],
            },
          },
        },
      },
      // Railing: sell $/LF (cost × 1.20) — posts + rail; include stair LF
      railing: {
        none: {
          label: "No railing materials",
          perLf: 0,
          samples: [
            {
              id: "none",
              name: "Skip / labor only",
              style: "none",
              rail: "#c5cdd6",
              baluster: "#c5cdd6",
            },
          ],
        },
        // Wood: cost × 1.20 (+ small buffer)
        treated_wood: {
          label: "Wood rail (4x4 posts + wood spindles)",
          perLf: 20.7, // cost 17 × 1.20
          samples: [
            {
              id: "pt_green",
              name: "Pressure-treated (green)",
              style: "wood",
              rail: "#8a9a6e",
              baluster: "#7d8f62",
            },
            {
              id: "pt_weathered",
              name: "Weathered gray look",
              style: "wood",
              rail: "#9a9690",
              baluster: "#8a8680",
            },
            {
              id: "pt_stained_brown",
              name: "Stained brown",
              style: "wood",
              rail: "#6b4f2a",
              baluster: "#5a3f20",
            },
          ],
        },
        // Hybrid materials: cost × 1.20 (rail labor is flat $35/LF all types)
        hybrid: {
          label: "Hybrid (wood posts/rails + alum spindles)",
          perLf: 36.3, // cost 30 × 1.20
          samples: [
            {
              id: "hybrid_black",
              name: "Wood top + black metal",
              style: "hybrid",
              rail: "#8b6f47",
              baluster: "#1a1a1a",
            },
            {
              id: "hybrid_bronze",
              name: "Wood top + bronze metal",
              style: "hybrid",
              rail: "#8b6f47",
              baluster: "#6b5428",
            },
            {
              id: "hybrid_silver",
              name: "Wood top + silver metal",
              style: "hybrid",
              rail: "#a89070",
              baluster: "#9aa0a6",
            },
          ],
        },
        // Aluminum: cost ~$58 × 1.20 → $69.60; kept prior buffer sell
        aluminum: {
          label: "Aluminum railing",
          perLf: 75,
          samples: [
            {
              id: "alum_black",
              name: "Black",
              style: "metal",
              rail: "#1c1c1c",
              baluster: "#2a2a2a",
            },
            {
              id: "alum_bronze",
              name: "Bronze",
              style: "metal",
              rail: "#5c4a28",
              baluster: "#6b5428",
            },
            {
              id: "alum_white",
              name: "White",
              style: "metal",
              rail: "#f0f0f0",
              baluster: "#e8e8e8",
            },
            {
              id: "alum_silver",
              name: "Silver / clear",
              style: "metal",
              rail: "#b0b6bc",
              baluster: "#9aa0a6",
            },
          ],
        },
        // Composite: cost × 1.20 + buffer (kits + sleeves + caps + 4x4 core)
        composite: {
          label: "Composite rail (kits + sleeves + caps)",
          perLf: 66,
          samples: [
            {
              id: "comp_black",
              name: "Black",
              style: "composite",
              rail: "#222222",
              baluster: "#2e2e2e",
            },
            {
              id: "comp_white",
              name: "White",
              style: "composite",
              rail: "#f5f5f5",
              baluster: "#ebebeb",
            },
            {
              id: "comp_bronze",
              name: "Bronze",
              style: "composite",
              rail: "#6b5428",
              baluster: "#5c4a28",
            },
            {
              id: "comp_gray",
              name: "Gray",
              style: "composite",
              rail: "#6a6e72",
              baluster: "#5a5e62",
            },
            {
              id: "comp_brown",
              name: "Brown",
              style: "composite",
              rail: "#5c4030",
              baluster: "#4a3224",
            },
          ],
        },
      },
    },
  };

  /* ---------- State ---------- */
  var state = {
    name: "",
    email: "",
    phone: "",
    city: "",
    projectType: "new_build", // new_build | redeck
    sqft: 0,
    railingLf: 0,
    steps: 0,
    stairWidthFt: 4, // 3 | 4 | 5 | 6
    stairExtraFootings: 0, // long run / landing pads
    pierCount: 0, // optional sonotube/pier upgrades (new build only)
    platforms: 1, // 1 | 2 | 3+
    deckShape: "rectangle", // rectangle | angled
    platformFactor: 1,
    shapeFactor: 1,
    labor: {
      framing: 0,
      compositeInstall: 0,
      treatedInstall: 0,
      redeck: 0,
      demoDispose: 0,
      railing: 0,
      steps: 0,
      hybridExtra: 0,
      total: 0,
    },
    wantMaterials: true,
    deckingType: "",
    deckingSub: "",
    deckingColor: "",
    deckingColorName: "",
    deckingLabel: "",
    railingType: "hybrid",
    railingColor: "hybrid_black",
    railingColorName: "Wood top + black metal",
    railingLabel: "Hybrid (wood posts/rails + alum spindles)",
    materials: {
      framing: 0,
      decking: 0,
      fasteners: 0,
      railing: 0,
      stairs: 0,
      pierUpgrade: 0,
      total: 0,
    },
    fees: {
      permit: 0,
      permitLabel: "Building & zoning permits",
    },
    stairMaterialsDetail: null,
    grandTotal: 0,
    cameFromMaterials: false,
    // Redeck: framing labor + materials calculated in background (not in main total)
    worstCase: {
      framingLabor: 0,
      framingMaterials: 0,
      total: 0,
    },
  };

  /* ---------- DOM helpers (single-page live calculator) ---------- */
  function money(n) {
    return (
      "$" +
      Math.round(n).toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })
    );
  }

  function num(el, fallback) {
    if (!el) return fallback || 0;
    var v = parseFloat(String(el.value).replace(/,/g, ""), 10);
    return isFinite(v) && v >= 0 ? v : fallback || 0;
  }

  /** No multi-step panels — keep for any legacy calls. */
  function showPanel() {
    /* single-page live mode */
  }

  function setError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    if (msg) {
      el.hidden = false;
      el.textContent = msg;
    } else {
      el.hidden = true;
      el.textContent = "";
    }
  }

  /* ---------- Labor math (rates never rendered as unit prices) ---------- */
  function isCompositeDecking() {
    return state.deckingType === "trex" || state.deckingType === "timbertech";
  }

  function isNewBuild() {
    return state.projectType !== "redeck";
  }

  /**
   * Labor $/sf scales with deck size. Materials do not.
   * Local median reported deck size ~220–225 sf.
   *
   *   ≤100 sf     → 1.12  (small-job premium)
   *   100–200 sf  → 1.12 → 1.02 (blend down)
   *   200–350 sf  → 1.00  (base / median band)
   *   350–400 sf  → 1.00 → 0.92 (blend to volume)
   *   400–600 sf  → 0.92 → 0.88
   *   >600 sf     → down toward 0.85 floor
   */
  function sizeLaborFactor(sqft) {
    var s = Math.max(0, Number(sqft) || 0);
    if (s <= 0) return 1;
    if (s <= 100) return 1.12;
    if (s < 200) return 1.12 - ((s - 100) / 100) * 0.1;
    if (s <= 350) return 1;
    if (s < 400) return 1 - ((s - 350) / 50) * 0.08;
    if (s <= 600) return 0.92 - ((s - 400) / 200) * 0.04;
    return Math.max(0.85, 0.88 - ((s - 600) / 400) * 0.03);
  }

  function sizeLaborBandLabel(sqft) {
    var s = Math.max(0, Number(sqft) || 0);
    if (s <= 0) return "";
    if (s < 200) return "Small deck — labor priced with a small-job efficiency factor";
    if (s <= 350) return "Standard size — base labor rates (typical local deck size)";
    if (s < 400) return "Larger deck — labor efficiency starting to apply";
    return "Large deck — lower labor per sq ft (volume efficiency)";
  }

  /** Platform count → framing labor multiplier only. */
  function platformLaborFactor(platforms) {
    var p = parseInt(platforms, 10) || 1;
    if (p >= 3) return (RATES.labor.platformFactor && RATES.labor.platformFactor[3]) || 1.5;
    if (p === 2) return (RATES.labor.platformFactor && RATES.labor.platformFactor[2]) || 1.25;
    return (RATES.labor.platformFactor && RATES.labor.platformFactor[1]) || 1;
  }

  /** Shape → framing labor multiplier only. */
  function shapeLaborFactor(shape) {
    var key = shape === "angled" ? "angled" : "rectangle";
    var map = RATES.labor.shapeFactor || {};
    return map[key] != null ? map[key] : key === "angled" ? 1.2 : 1;
  }

  function platformLabel(platforms) {
    var p = parseInt(platforms, 10) || 1;
    if (p >= 3) return "3+ platforms (+50% framing labor)";
    if (p === 2) return "2 platforms (+25% framing labor)";
    return "1 platform (base framing labor)";
  }

  function shapeLabel(shape) {
    return shape === "angled"
      ? "Angles / complex shape (+20% framing labor)"
      : "Simple rectangle (base framing labor)";
  }

  /**
   * Matching riser COST $/LF for current decking brand/line.
   * Composite: prorate from real decking board $/LF between Enhance ($6/LF riser)
   * and Transcend ($8.50/LF riser) anchors. PT: 1x10 ripped @ $2/LF.
   */
  function riserCostPerLfForDecking() {
    var cfg = (RATES.materials && RATES.materials.stairs) || {};
    var boards = cfg.realBoardCostPerLf || {};
    var a = cfg.riserAnchor || {};
    var type = state.deckingType || "";
    var sub = state.deckingSub || "";

    if (!type || type === "") {
      // Planning default until decking chosen — PT riser rate
      return {
        costPerLf: a.treatedRiserLf != null ? a.treatedRiserLf : 2,
        label: "PT 1x10 (default until decking chosen)",
        boardCostPerLf: boards.treated || 2.2,
      };
    }
    if (type === "treated") {
      return {
        costPerLf: a.treatedRiserLf != null ? a.treatedRiserLf : 2,
        label: "PT 1x10 ripped to rise",
        boardCostPerLf: boards.treated || 2.2,
      };
    }

    var key = "enhance";
    if (type === "trex") {
      if (sub === "select") key = "select";
      else if (sub === "transcend") key = "transcend";
      else if (sub === "signature") key = "signature";
      else key = "enhance";
    } else if (type === "timbertech") {
      if (sub === "legacy") key = "legacy";
      else if (sub === "reserve") key = "reserve";
      else key = "terrain";
    }

    var boardLf = boards[key];
    if (boardLf == null) boardLf = boards.enhance || 2.98;

    var eBoard = a.enhanceBoardLf != null ? a.enhanceBoardLf : 2.98;
    var eRiser = a.enhanceRiserLf != null ? a.enhanceRiserLf : 6;
    var tBoard = a.transcendBoardLf != null ? a.transcendBoardLf : 7.24;
    var tRiser = a.transcendRiserLf != null ? a.transcendRiserLf : 8.5;
    var slope = (tRiser - eRiser) / Math.max(0.01, tBoard - eBoard);
    // Prorate matching riser $/LF from real decking board $/LF (Carter/Zeeland ladder)
    var riserLf = eRiser + slope * (boardLf - eBoard);
    // Band: main lines ~$5–$12/LF cost; Signature can run higher
    if (riserLf < 4) riserLf = 4;
    if (riserLf > 16) riserLf = 16;

    var labels = {
      enhance: "Trex Enhance matching riser (~7.25\"×12')",
      select: "Trex Select matching riser",
      transcend: "Trex Transcend matching riser",
      signature: "Trex Signature matching riser",
      terrain: "TimberTech Terrain matching riser",
      legacy: "TimberTech Legacy matching riser",
      reserve: "TimberTech Reserve / AZEK matching riser",
    };

    return {
      costPerLf: riserLf,
      label: labels[key] || "Matching composite riser",
      boardCostPerLf: boardLf,
      lineKey: key,
    };
  }

  /**
   * Stair STRUCTURE materials (cost × 1.20 sell).
   * - 2x12 PT tread bases: one per step × width
   * - Color-matched risers: PT 1x10 or composite ~7.25" matching decking line
   * - Stringers: 3 if width ≤4', else 4; 12' sticks ≤6 steps, 16' if taller
   * - Hardware cushion per step
   * - Optional extra 16" footing packages (long run / landing)
   * Tread FACE boards = deck sq ft. Rail = railing LF.
   */
  function calcStairMaterials(steps, widthFt, extraFootings) {
    var s = Math.max(0, Math.round(Number(steps) || 0));
    var w = Number(widthFt) || 4;
    if (w !== 3 && w !== 4 && w !== 5 && w !== 6) w = 4;
    var foot = Math.max(0, Math.round(Number(extraFootings) || 0));
    var cfg = (RATES.materials && RATES.materials.stairs) || {};
    var m = cfg.markup != null ? cfg.markup : 1.2;
    var riserInfo = riserCostPerLfForDecking();
    if (s < 1) {
      return {
        steps: 0,
        widthFt: w,
        extraFootings: 0,
        stringerCount: 0,
        cost: 0,
        sell: 0,
        treadBasesCost: 0,
        risersCost: 0,
        stringersCost: 0,
        hardwareCost: 0,
        footingsCost: 0,
        riserCostPerLf: riserInfo.costPerLf,
        riserLabel: riserInfo.label,
      };
    }
    var lfCost = cfg.twoByTwelveCostPerLf != null ? cfg.twoByTwelveCostPerLf : 2.5;
    var hwStep = cfg.hardwareCostPerStep != null ? cfg.hardwareCostPerStep : 4;
    var board12 = cfg.stringerBoard12 != null ? cfg.stringerBoard12 : 29.94;
    var board16 = cfg.stringerBoard16 != null ? cfg.stringerBoard16 : 39.64;
    var strHw = cfg.stringerHardwareEach != null ? cfg.stringerHardwareEach : 8;
    var footPkg = cfg.footingPackageCost != null ? cfg.footingPackageCost : 83.61;

    var nStringers = w <= 4 ? 3 : 4;
    var strBoard = s <= 6 ? board12 : board16;
    var treadBasesCost = s * w * lfCost;
    // One riser face per step × stair width (matching decking line)
    var risersCost = s * w * riserInfo.costPerLf;
    var stringersCost = nStringers * strBoard + nStringers * strHw;
    var hardwareCost = s * hwStep;
    var footingsCost = foot * footPkg;
    var cost =
      treadBasesCost + risersCost + stringersCost + hardwareCost + footingsCost;
    var sell = cost * m;
    return {
      steps: s,
      widthFt: w,
      extraFootings: foot,
      stringerCount: nStringers,
      cost: cost,
      sell: sell,
      treadBasesCost: treadBasesCost,
      risersCost: risersCost,
      stringersCost: stringersCost,
      hardwareCost: hardwareCost,
      footingsCost: footingsCost,
      riserCostPerLf: riserInfo.costPerLf,
      riserSellPerLf: riserInfo.costPerLf * m,
      riserLabel: riserInfo.label,
      boardCostPerLf: riserInfo.boardCostPerLf,
      markup: m,
    };
  }

  /** Framing labor multipliers: size × platforms × shape (new build framing only). */
  function framingLaborMultipliers() {
    var sizeF = sizeLaborFactor(state.sqft);
    var platF = platformLaborFactor(state.platforms);
    var shapeF = shapeLaborFactor(state.deckShape);
    state.sizeLaborFactor = sizeF;
    state.platformFactor = platF;
    state.shapeFactor = shapeF;
    state.sizeLaborBand = sizeLaborBandLabel(state.sqft);
    return { sizeF: sizeF, platF: platF, shapeF: shapeF, combined: sizeF * platF * shapeF };
  }

  /** Always compute framing labor + framing materials (for redeck worst-case notice). */
  function calcWorstCaseFraming() {
    var sqft = state.sqft || 0;
    var m = framingLaborMultipliers();
    var framingLabor = sqft * RATES.labor.framingPerSqft * m.combined;
    var framingMaterials = sqft * (RATES.materials.framingPerSqft || 0);
    state.worstCase = {
      framingLabor: framingLabor,
      framingMaterials: framingMaterials,
      total: framingLabor + framingMaterials,
    };
    return state.worstCase;
  }

  function calcLabor() {
    var sqft = state.sqft;
    var lf = state.railingLf;
    var steps = state.steps;
    var framing = 0;
    var compositeInstall = 0;
    var treatedInstall = 0;
    var redeck = 0;
    var demoDispose = 0;
    var m = framingLaborMultipliers();
    var f = m.sizeF; // board install / redeck still use size factor only

    // Backend: always know framing labor/materials for transparency
    calcWorstCaseFraming();

    if (isNewBuild()) {
      // Framing: size × platform × shape (customer-visible design choices)
      framing = sqft * RATES.labor.framingPerSqft * m.combined;
      // Board install: size only (not platform/shape)
      compositeInstall = isCompositeDecking()
        ? sqft * RATES.labor.compositeInstallPerSqft * f
        : 0;
      treatedInstall =
        state.deckingType === "treated"
          ? sqft * RATES.labor.treatedInstallPerSqft * f
          : 0;
    } else {
      // Redeck: surface + demo only (framing NOT in total)
      redeck = sqft * RATES.labor.redeckPerSqft * f;
      demoDispose = sqft * RATES.labor.demoDisposePerSqft * f;
      framing = 0;
    }

    // Rail LF + steps: fixed unit rates (not size/platform/shape scaled)
    var railing = lf * RATES.labor.railingPerLf;
    // Steps: composite much more labor than PT; default PT rate until decking chosen
    var stepRate = RATES.labor.perStepTreated || RATES.labor.perStep || 100;
    if (isCompositeDecking()) {
      stepRate = RATES.labor.perStepComposite || 175;
    } else if (state.deckingType === "treated") {
      stepRate = RATES.labor.perStepTreated || 100;
    }
    state.stepLaborRate = stepRate;
    var stepLabor = steps * stepRate;

    state.labor = {
      framing: framing,
      compositeInstall: compositeInstall,
      treatedInstall: treatedInstall,
      redeck: redeck,
      demoDispose: demoDispose,
      railing: railing,
      steps: stepLabor,
      hybridExtra: 0,
      sizeFactor: f,
      platformFactor: m.platF,
      shapeFactor: m.shapeF,
      framingCombinedFactor: m.combined,
      total:
        framing +
        compositeInstall +
        treatedInstall +
        redeck +
        demoDispose +
        railing +
        stepLabor,
    };
    return state.labor;
  }

  function recomputeLaborTotal() {
    var L = state.labor;
    L.total =
      (L.framing || 0) +
      (L.compositeInstall || 0) +
      (L.treatedInstall || 0) +
      (L.redeck || 0) +
      (L.demoDispose || 0) +
      (L.railing || 0) +
      (L.steps || 0);
    L.hybridExtra = 0;
  }

  function competitorEstimate() {
    var c = RATES.competitor || {};
    var rates = c.allInPerSqft || {};
    var sqft = state.sqft || 0;
    if (sqft < 1) return { total: 0, perSf: 0, label: c.label || "" };
    var perSf = rates.laborOnly || 55;
    if (state.wantMaterials && state.deckingType) {
      if (state.deckingType === "treated") perSf = rates.treated || 75;
      else if (isCompositeDecking()) perSf = rates.composite || 110;
    }
    return {
      total: sqft * perSf,
      perSf: perSf,
      label: c.label || "mainstream premium deck companies",
    };
  }

  /** Flat building + zoning permit — auto when project has sq ft (local math, no API). */
  function calcPermitFee() {
    var fees = RATES.fees || {};
    var amount = fees.permitZoningBuilding != null ? fees.permitZoningBuilding : 350;
    var label = fees.permitLabel || "Building & zoning permits";
    var permit = state.sqft > 0 ? amount : 0;
    state.fees = {
      permit: permit,
      permitLabel: label,
    };
    return state.fees;
  }

  /**
   * Optional sonotube/pier frost footings (new build only).
   * Standard pad footings are already inside framing materials — this is upgrade only.
   */
  function calcPierUpgrade() {
    var cfg = RATES.pierFrostFooting || {};
    var each = cfg.sellEach != null ? cfg.sellEach : 295;
    var label = cfg.label || "Pier / sonotube frost footing upgrade";
    var n = isNewBuild() ? Math.max(0, Math.round(Number(state.pierCount) || 0)) : 0;
    var total = n * each;
    state.pierUpgrade = {
      count: n,
      each: each,
      total: total,
      label: label,
    };
    return state.pierUpgrade;
  }

  function renderLivePanel() {
    var L = state.labor;
    var M = state.materials;
    var F = calcPermitFee();
    var pier = calcPierUpgrade();
    var laborTotal = L.total || 0;
    // Stair structure mats always count when steps > 0; other mats when decking chosen
    var matTotal = M.total || 0;
    if (!state.wantMaterials) {
      // Still include optional pier upgrade + stairs when labor-only
      matTotal = (M.stairs || 0) + (M.pierUpgrade || 0);
    }
    var permitTotal = F.permit || 0;
    var grand = laborTotal + matTotal + permitTotal;
    state.grandTotal = grand;

    // Show pier option only on new builds
    var footingBlock = document.getElementById("footing-options");
    if (footingBlock) {
      footingBlock.hidden = !isNewBuild();
    }

    var elLab = document.getElementById("live-labor");
    var elMat = document.getElementById("live-materials");
    var elPermit = document.getElementById("live-permit");
    var elGrand = document.getElementById("live-grand");
    var elPsf = document.getElementById("live-psf");
    if (elLab) elLab.textContent = money(laborTotal);
    if (elMat) elMat.textContent = money(matTotal);
    if (elPermit) elPermit.textContent = money(permitTotal);
    if (elGrand) elGrand.textContent = money(grand);
    if (elPsf) {
      elPsf.textContent =
        state.sqft > 0
          ? "About " +
            money(grand / state.sqft) +
            " per sq ft planning total (this estimate)"
          : "Enter square footage to see pricing";
    }

    // Warn when labor-only / no decking — incomplete package for ad traffic
    var incBox = document.getElementById("live-incomplete");
    var incText = document.getElementById("live-incomplete-text");
    var packageComplete =
      !!state.deckingType &&
      (state.deckingType === "treated" ||
        !!(state.deckingSub && state.deckingSub.length));
    if (incBox) {
      if (state.sqft > 0 && !packageComplete) {
        incBox.hidden = false;
        if (incText) {
          incText.textContent = state.deckingType
            ? "Pick a decking line/color sample so board install and materials are in the total."
            : "Labor-only mode: board install and decking materials are not included. Pick decking for a full project planning total.";
        }
      } else {
        incBox.hidden = true;
      }
    }

    var savBox = document.getElementById("live-savings");
    var savText = document.getElementById("live-savings-text");
    var comp = competitorEstimate();
    var savings = comp.total - grand;
    state.competitorTotal = comp.total;
    state.savingsVsCompetitor = savings;
    if (savBox && savText) {
      if (state.sqft >= 50 && savings > 500) {
        savBox.hidden = false;
        savText.innerHTML =
          "Compared to " +
          escapeHtml(comp.label) +
          " at roughly " +
          money(comp.perSf) +
          "/sq ft all-in, you’re looking at about <strong>" +
          money(savings) +
          " less</strong> with this Straight Stud estimate.";
      } else if (state.sqft >= 50 && grand > 0) {
        savBox.hidden = false;
        savText.textContent =
          "Premium mainstream quotes in our market often run higher on composite — keep adjusting options to hit your budget.";
      } else {
        savBox.hidden = true;
      }
    }

    var html = "";
    if (state.sqft < 1) {
      html =
        '<div class="totals__row totals__row--muted"><span>Enter deck sq ft to start</span><span></span></div>';
    } else if (isNewBuild()) {
      if (L.framing > 0) {
        html +=
          '<div class="totals__row"><span>Framing labor</span><span>' +
          money(L.framing) +
          "</span></div>";
      }
      if (state.platformFactor > 1 || state.shapeFactor > 1) {
        html +=
          '<div class="totals__row totals__row--design-note"><span>' +
          escapeHtml(platformLabel(state.platforms)) +
          "</span><span></span></div>";
        html +=
          '<div class="totals__row totals__row--design-note"><span>' +
          escapeHtml(shapeLabel(state.deckShape)) +
          "</span><span></span></div>";
      } else {
        html +=
          '<div class="totals__row totals__row--design-note"><span>1 platform + rectangle (base framing)</span><span></span></div>';
      }
      if (L.compositeInstall > 0) {
        html +=
          '<div class="totals__row"><span>Composite install</span><span>' +
          money(L.compositeInstall) +
          "</span></div>";
      } else if (L.treatedInstall > 0) {
        html +=
          '<div class="totals__row"><span>Treated face-screw install</span><span>' +
          money(L.treatedInstall) +
          "</span></div>";
      } else if (!state.wantMaterials) {
        html +=
          '<div class="totals__row totals__row--muted"><span>Board install</span><span>Pick decking to include</span></div>';
      }
    } else {
      html +=
        '<div class="totals__row"><span>Redeck labor</span><span>' +
        money(L.redeck) +
        "</span></div>" +
        '<div class="totals__row"><span>Demo &amp; dispose</span><span>' +
        money(L.demoDispose) +
        "</span></div>";
    }
    if (L.railing > 0) {
      html +=
        '<div class="totals__row"><span>Railing labor</span><span>' +
        money(L.railing) +
        "</span></div>";
    }
    if (L.steps > 0) {
      var stepNote = "";
      if (isCompositeDecking()) {
        stepNote = " (composite rate)";
      } else if (state.deckingType === "treated") {
        stepNote = " (treated rate)";
      } else {
        stepNote = " (treated rate until decking chosen)";
      }
      html +=
        '<div class="totals__row"><span>Steps labor' +
        stepNote +
        "</span><span>" +
        money(L.steps) +
        "</span></div>";
    }
    if (state.wantMaterials && matTotal > 0) {
      if (M.framing > 0) {
        html +=
          '<div class="totals__row"><span>Framing materials</span><span>' +
          money(M.framing) +
          "</span></div>";
      }
      if (M.decking > 0) {
        html +=
          '<div class="totals__row"><span>Decking materials</span><span>' +
          money(M.decking) +
          "</span></div>";
      }
      if (M.fasteners > 0) {
        html +=
          '<div class="totals__row"><span>Fasteners / fascia / tape</span><span>' +
          money(M.fasteners) +
          "</span></div>";
      }
      if (M.railing > 0) {
        html +=
          '<div class="totals__row"><span>Railing materials</span><span>' +
          money(M.railing) +
          "</span></div>";
      }
    }
    if (M.stairs > 0) {
      var sd = state.stairMaterialsDetail || {};
      html +=
        '<div class="totals__row"><span>Stair structure mats (' +
        (sd.steps || state.steps) +
        " steps × " +
        (sd.widthFt || state.stairWidthFt) +
        "′" +
        (sd.extraFootings
          ? ", +" + sd.extraFootings + " footing"
          : "") +
        ")</span><span>" +
        money(M.stairs) +
        "</span></div>";
      if (sd.riserLabel && sd.risersCost > 0) {
        html +=
          '<div class="totals__row totals__row--design-note"><span>Risers: ' +
          escapeHtml(sd.riserLabel) +
          " (~$" +
          (sd.riserSellPerLf != null
            ? sd.riserSellPerLf.toFixed(2)
            : "?") +
          "/LF sell)</span><span>" +
          money(sd.risersCost * (sd.markup || 1.2)) +
          "</span></div>";
      }
    }
    if (pier && pier.total > 0) {
      html +=
        '<div class="totals__row"><span>' +
        escapeHtml(pier.label || "Pier / sonotube upgrade") +
        " × " +
        pier.count +
        "</span><span>" +
        money(pier.total) +
        "</span></div>";
      html +=
        '<div class="totals__row totals__row--design-note"><span>Standard pad footings stay in framing; this is pier upgrade only</span><span></span></div>';
    }
    if (permitTotal > 0) {
      html +=
        '<div class="totals__row"><span>' +
        escapeHtml(F.permitLabel || "Building & zoning permits") +
        "</span><span>" +
        money(permitTotal) +
        "</span></div>";
      html +=
        '<div class="totals__row totals__row--design-note"><span>Flat allowance for building + zoning permit (final city fee may vary)</span><span></span></div>';
    }
    if (state.sizeLaborBand) {
      html +=
        '<div class="totals__row totals__row--muted"><span>' +
        escapeHtml(state.sizeLaborBand) +
        "</span><span></span></div>";
    }
    var br = document.getElementById("live-breakdown");
    if (br) br.innerHTML = html;
    var ban = document.getElementById("warranty-banner");
    if (ban) ban.hidden = !isNewBuild();

    // Scope of work — framing notes (sticky + checkout)
    var scopeHtml = "";
    if (isNewBuild() && state.sqft > 0) {
      scopeHtml =
        "<strong>Framing &amp; pad footings (included)</strong> — " +
        escapeHtml(RATES.framingScopeNotes || "");
    } else if (!isNewBuild() && state.sqft > 0) {
      scopeHtml =
        "<strong>Framing</strong> — Redeck path assumes existing structure stays. " +
        "New posts/pad footings are not in the main total unless added after site visit. " +
        "Pier/sonotube upgrades are new-build options only.";
    }
    ["scope-framing-notes", "scope-framing-notes-checkout"].forEach(function (id) {
      var scopeEl = document.getElementById(id);
      if (!scopeEl) return;
      if (scopeHtml) {
        scopeEl.hidden = false;
        scopeEl.innerHTML = scopeHtml;
      } else {
        scopeEl.hidden = true;
        scopeEl.innerHTML = "";
      }
    });
  }

  function renderLaborBreakdown() {
    renderLivePanel();
  }

  function redeckFramingNoticeHtml() {
    var w = state.worstCase || calcWorstCaseFraming();
    return (
      "<p><strong>If framing is adequate:</strong> the estimate above covers redeck labor, demo &amp; dispose, and any options you selected. No full framing rebuild is included.</p>" +
      "<p><strong>Worst-case scenario (for peace of mind):</strong> if we find the structure is not sound on site, additional framing could run about <strong>" +
      money(w.total) +
      "</strong> more — roughly <strong>" +
      money(w.framingLabor) +
      "</strong> framing labor and <strong>" +
      money(w.framingMaterials) +
      "</strong> framing materials. That amount is <em>not</em> in your locked total below.</p>" +
      "<p>Your site visit confirms whether framing is adequate. We’ll only add structural work with your approval before you sign.</p>"
    );
  }

  function updateRedeckFramingNotice() {
    var el = document.getElementById("redeck-framing-notice");
    if (!el) return;
    if (isNewBuild() || !state.sqft) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    calcWorstCaseFraming();
    el.hidden = false;
    el.innerHTML = redeckFramingNoticeHtml();
  }

  /* ---------- Materials ---------- */
  var deckingTypeEl = document.getElementById("decking-type");
  var deckingSubEl = document.getElementById("decking-sub");
  var deckingColorEl = document.getElementById("decking-color");
  var samplePanel = document.getElementById("sample-panel");
  var treatedSample = document.getElementById("treated-sample");
  var sampleGallery = document.getElementById("sample-gallery");
  var samplePanelTitle = document.getElementById("sample-panel-title");
  var sampleSelected = document.getElementById("sample-selected");
  var sampleSelectedLabel = document.getElementById("sample-selected-label");
  var railingTypeEl = document.getElementById("railing-type");
  var railingColorEl = document.getElementById("railing-color");
  var railingSampleGallery = document.getElementById("railing-sample-gallery");
  var railingSampleSelected = document.getElementById("railing-sample-selected");
  var railingSampleSelectedLabel = document.getElementById(
    "railing-sample-selected-label"
  );

  function grainCss(colors) {
    if (!colors || !colors.length) return "#888";
    var stops = colors
      .map(function (c, i) {
        var pct = Math.round((i / Math.max(colors.length - 1, 1)) * 100);
        return c + " " + pct + "%";
      })
      .join(", ");
    return (
      "linear-gradient(105deg, " +
      stops +
      "), linear-gradient(90deg, rgba(0,0,0,0.08) 0%, transparent 40%, rgba(255,255,255,0.12) 70%, transparent 100%)"
    );
  }

  function clearSampleSelection() {
    state.deckingSub = "";
    state.deckingColor = "";
    state.deckingColorName = "";
    if (deckingSubEl) deckingSubEl.value = "";
    if (deckingColorEl) deckingColorEl.value = "";
    if (sampleSelected) sampleSelected.hidden = true;
    if (sampleSelectedLabel) sampleSelectedLabel.textContent = "";
  }

  function fillDeckingSub() {
    var type = deckingTypeEl.value;
    deckingSubEl.innerHTML = '<option value="">Select line…</option>';
    state.deckingType = type;
    clearSampleSelection();
    sampleGallery.innerHTML = "";

    if (type === "trex" || type === "timbertech") {
      var brand = RATES.materials.decking[type];
      var lines = brand.lines;
      Object.keys(lines).forEach(function (key) {
        var opt = document.createElement("option");
        opt.value = key;
        opt.textContent = lines[key].label;
        deckingSubEl.appendChild(opt);
      });
      samplePanel.hidden = false;
      treatedSample.hidden = true;
      samplePanelTitle.textContent =
        type === "trex"
          ? "Trex sample colors — pick a block"
          : "TimberTech sample colors — pick a block";
      renderSampleGallery(type);
    } else if (type === "treated") {
      samplePanel.hidden = true;
      treatedSample.hidden = false;
    } else {
      samplePanel.hidden = true;
      treatedSample.hidden = true;
    }
    calcAndRenderMaterials();
  }

  function renderSampleGallery(brandKey) {
    var brand = RATES.materials.decking[brandKey];
    if (!brand || !brand.lines) return;
    var frag = document.createDocumentFragment();

    Object.keys(brand.lines).forEach(function (lineKey) {
      var line = brand.lines[lineKey];
      var group = document.createElement("div");
      group.className = "sample-line-group";

      var title = document.createElement("div");
      title.className = "sample-line-group__title";
      title.textContent = line.label;
      group.appendChild(title);

      var grid = document.createElement("div");
      grid.className = "sample-gallery";
      grid.setAttribute("role", "group");
      grid.setAttribute("aria-label", line.label);

      (line.samples || []).forEach(function (sample) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sample-card";
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", "false");
        btn.setAttribute(
          "aria-label",
          line.label + " — " + sample.name
        );
        btn.dataset.line = lineKey;
        btn.dataset.color = sample.id;
        btn.dataset.colorName = sample.name;
        btn.dataset.lineLabel = line.label;

        var swatch = document.createElement("div");
        swatch.className = "sample-card__swatch";
        swatch.setAttribute("aria-hidden", "true");
        swatch.style.backgroundImage = grainCss(sample.grain);

        var check = document.createElement("span");
        check.className = "sample-card__check";
        check.setAttribute("aria-hidden", "true");
        check.textContent = "✓";
        swatch.appendChild(check);

        var meta = document.createElement("div");
        meta.className = "sample-card__meta";
        meta.innerHTML =
          '<span class="sample-card__line">' +
          escapeHtml(line.label.replace(/^Trex |^TimberTech /, "")) +
          "</span>" +
          '<span class="sample-card__name">' +
          escapeHtml(sample.name) +
          "</span>";

        btn.appendChild(swatch);
        btn.appendChild(meta);

        btn.addEventListener("click", function () {
          selectSample(btn);
        });

        grid.appendChild(btn);
      });

      group.appendChild(grid);
      frag.appendChild(group);
    });

    sampleGallery.innerHTML = "";
    sampleGallery.appendChild(frag);
  }

  function selectSample(btn) {
    var cards = sampleGallery.querySelectorAll(".sample-card");
    cards.forEach(function (c) {
      c.classList.remove("is-selected");
      c.setAttribute("aria-selected", "false");
    });
    btn.classList.add("is-selected");
    btn.setAttribute("aria-selected", "true");

    state.deckingSub = btn.dataset.line || "";
    state.deckingColor = btn.dataset.color || "";
    state.deckingColorName = btn.dataset.colorName || "";
    deckingSubEl.value = state.deckingSub;
    if (deckingColorEl) deckingColorEl.value = state.deckingColor;

    var fullLabel =
      (btn.dataset.lineLabel || "") +
      (state.deckingColorName ? " — " + state.deckingColorName : "");
    if (sampleSelected) sampleSelected.hidden = false;
    if (sampleSelectedLabel) sampleSelectedLabel.textContent = fullLabel;

    setError("err-4", "");
    calcAndRenderMaterials();
    if (typeof liveRecalc === "function") {
      /* sample click already updated state; refresh totals */
    }
  }

  function resolveDecking() {
    var type = deckingTypeEl.value;
    var sub = deckingSubEl.value || state.deckingSub;
    state.deckingType = type;
    state.deckingSub = sub;

    if (!type) {
      state.deckingLabel = "";
      return { perSqft: 0, label: "" };
    }
    if (type === "treated") {
      var t = RATES.materials.decking.treated;
      state.deckingLabel = t.label;
      return { perSqft: t.perSqft, label: t.label };
    }
    if ((type === "trex" || type === "timbertech") && sub) {
      var line = RATES.materials.decking[type].lines[sub];
      if (line) {
        var label = line.label;
        if (state.deckingColorName) {
          label = line.label + " — " + state.deckingColorName;
        }
        state.deckingLabel = label;
        return { perSqft: line.perSqft, label: label };
      }
    }
    state.deckingLabel = RATES.materials.decking[type]
      ? RATES.materials.decking[type].label
      : type;
    return { perSqft: 0, label: state.deckingLabel };
  }

  function renderRailingPreview(sample) {
    var rail = sample.rail || "#888";
    var bal = sample.baluster || "#666";
    var style = sample.style || "metal";

    if (style === "none") {
      return (
        '<div class="rail-preview rail-preview--none" aria-hidden="true">' +
        '<span class="rail-preview__dash">—</span>' +
        "</div>"
      );
    }

    // Mini elevation: top rail + vertical balusters + bottom rail
    var posts = "";
    for (var i = 0; i < 7; i++) {
      posts +=
        '<span class="rail-preview__baluster" style="background:' +
        bal +
        '"></span>';
    }
    return (
      '<div class="rail-preview rail-preview--' +
      escapeHtml(style) +
      '" aria-hidden="true">' +
      '<span class="rail-preview__top" style="background:' +
      rail +
      '"></span>' +
      '<span class="rail-preview__posts">' +
      posts +
      "</span>" +
      '<span class="rail-preview__bottom" style="background:' +
      rail +
      '"></span>' +
      "</div>"
    );
  }

  function renderRailingGallery() {
    if (!railingSampleGallery) return;
    var types = RATES.materials.railing;
    var frag = document.createDocumentFragment();
    var order = ["none", "treated_wood", "hybrid", "aluminum", "composite"];

    order.forEach(function (typeKey) {
      var type = types[typeKey];
      if (!type) return;

      var group = document.createElement("div");
      group.className = "sample-line-group";

      var title = document.createElement("div");
      title.className = "sample-line-group__title";
      title.textContent = type.label;
      group.appendChild(title);

      var grid = document.createElement("div");
      grid.className = "sample-gallery";
      grid.setAttribute("role", "group");
      grid.setAttribute("aria-label", type.label);

      (type.samples || []).forEach(function (sample) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sample-card sample-card--railing";
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", "false");
        btn.setAttribute(
          "aria-label",
          type.label + " — " + sample.name
        );
        btn.dataset.type = typeKey;
        btn.dataset.color = sample.id;
        btn.dataset.colorName = sample.name;
        btn.dataset.typeLabel = type.label;

        var swatch = document.createElement("div");
        swatch.className = "sample-card__swatch sample-card__swatch--railing";
        swatch.innerHTML =
          renderRailingPreview(sample) +
          '<span class="sample-card__check" aria-hidden="true">✓</span>';

        var meta = document.createElement("div");
        meta.className = "sample-card__meta";
        var shortType = type.label
          .replace(/ railing.*/i, "")
          .replace(/^No railing materials$/, "None");
        meta.innerHTML =
          '<span class="sample-card__line">' +
          escapeHtml(shortType) +
          "</span>" +
          '<span class="sample-card__name">' +
          escapeHtml(sample.name) +
          "</span>";

        btn.appendChild(swatch);
        btn.appendChild(meta);

        btn.addEventListener("click", function () {
          selectRailingSample(btn);
        });

        // Default selection: hybrid black (realistic package for ads)
        if (typeKey === "hybrid" && sample.id === "hybrid_black") {
          btn.classList.add("is-selected");
          btn.setAttribute("aria-selected", "true");
        }

        grid.appendChild(btn);
      });

      group.appendChild(grid);
      frag.appendChild(group);
    });

    railingSampleGallery.innerHTML = "";
    railingSampleGallery.appendChild(frag);

    // Sync default UI label + state (hybrid package)
    state.railingType = "hybrid";
    state.railingColor = "hybrid_black";
    state.railingColorName = "Wood top + black metal";
    if (railingTypeEl) railingTypeEl.value = "hybrid";
    if (railingColorEl) railingColorEl.value = "hybrid_black";
    if (railingSampleSelected) {
      railingSampleSelected.hidden = false;
    }
    if (railingSampleSelectedLabel) {
      railingSampleSelectedLabel.textContent =
        "Hybrid (wood posts/rails + alum spindles) — Wood top + black metal";
    }
  }

  function selectRailingSample(btn) {
    if (!railingSampleGallery) return;
    var cards = railingSampleGallery.querySelectorAll(".sample-card");
    cards.forEach(function (c) {
      c.classList.remove("is-selected");
      c.setAttribute("aria-selected", "false");
    });
    btn.classList.add("is-selected");
    btn.setAttribute("aria-selected", "true");

    state.railingType = btn.dataset.type || "none";
    state.railingColor = btn.dataset.color || "";
    state.railingColorName = btn.dataset.colorName || "";
    if (railingTypeEl) railingTypeEl.value = state.railingType;
    if (railingColorEl) railingColorEl.value = state.railingColor;

    var full =
      (btn.dataset.typeLabel || "") +
      (state.railingColorName ? " — " + state.railingColorName : "");
    if (railingSampleSelected) railingSampleSelected.hidden = false;
    if (railingSampleSelectedLabel) {
      railingSampleSelectedLabel.textContent = full;
    }

    calcAndRenderMaterials();
  }

  function resolveRailing() {
    var key =
      (railingTypeEl && railingTypeEl.value) || state.railingType || "none";
    state.railingType = key;
    var r = RATES.materials.railing[key] || RATES.materials.railing.none;
    var label = r.label;
    if (state.railingColorName && key !== "none") {
      label = r.label + " — " + state.railingColorName;
    } else if (key === "none") {
      label = r.label;
    }
    state.railingLabel = label;
    return r;
  }

  function calcAndRenderMaterials() {
    var deck = resolveDecking();
    var rail = resolveRailing();
    var hasDecking = !!(deck.perSqft > 0 && state.sqft > 0);

    // Material rates already include 20% upcharge — sum is final materials total
    // Framing materials only on new builds (redeck keeps existing structure)
    var framingCost =
      hasDecking && isNewBuild()
        ? state.sqft * (RATES.materials.framingPerSqft || 0)
        : 0;
    var deckCost = hasDecking ? state.sqft * (deck.perSqft || 0) : 0;
    // Treated: 3" screws only
    // Composite: merged fasteners + joist tape + fascia (see compositeHardware)
    var fastenerCost = 0;
    if (hasDecking) {
      if (state.deckingType === "treated") {
        var ts = RATES.materials.treatedScrews || {};
        var treatedPer =
          ts.perSqft != null
            ? ts.perSqft
            : (ts.lbsPerSqft || 0) * (ts.costPerLb || 0) * 1.2;
        fastenerCost = state.sqft * treatedPer;
      } else {
        fastenerCost = state.sqft * (RATES.materials.fastenersPerSqft || 0);
      }
    }
    var railCost =
      hasDecking || keyIsRailing(state.railingType)
        ? state.railingLf * (rail.perLf || 0)
        : state.railingLf * (rail.perLf || 0);

    // Stair STRUCTURE materials always when steps > 0 (face boards in deck sf)
    var stairDetail = calcStairMaterials(
      state.steps,
      state.stairWidthFt,
      state.stairExtraFootings
    );
    state.stairMaterialsDetail = stairDetail;
    var stairCost = stairDetail.sell || 0;

    // Optional pier/sonotube upgrade (new build only; pads already in framing)
    var pier = calcPierUpgrade();
    var pierCost = pier.total || 0;

    // Rail install labor is flat $35/LF for all types (no hybrid premium)
    // Refresh framing + composite install from current decking choice
    calcLabor();
    renderLaborBreakdown();

    var materialsTotal =
      framingCost +
      deckCost +
      fastenerCost +
      railCost +
      stairCost +
      pierCost;

    state.materials = {
      framing: framingCost,
      decking: deckCost,
      fasteners: fastenerCost,
      railing: railCost,
      stairs: stairCost,
      pierUpgrade: pierCost,
      total: materialsTotal,
    };
    var permitFee = calcPermitFee().permit || 0;
    var matForGrand = state.wantMaterials
      ? materialsTotal
      : stairCost + pierCost;
    state.grandTotal = state.labor.total + matForGrand + permitFee;
    renderLivePanel();
  }

  function keyIsRailing(k) {
    return k && k !== "none";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- Prefill request form ---------- */
  function buildSummaryText() {
    var lines = [
      "Name: " + state.name,
      "Email: " + state.email,
      "Phone: " + (state.phone || "—"),
      "City: " + (state.city || "—"),
      "",
      "Project type: " +
        (isNewBuild() ? "New build" : "Redeck"),
      "Warranty: " +
        (isNewBuild()
          ? RATES.warrantyNewBuild
          : "Workmanship warranty per contract (redeck)"),
      "Deck sq ft: " + state.sqft,
      "Platforms: " + platformLabel(state.platforms),
      "Deck shape: " + shapeLabel(state.deckShape),
      "Railing linear ft: " + state.railingLf,
      "Steps: " +
        state.steps +
        " @ " +
        (state.stairWidthFt || 4) +
        "' wide, extra footings: " +
        (state.stairExtraFootings || 0),
      "Stair structure materials (sell): " +
        money((state.materials && state.materials.stairs) || 0),
      "Pier/sonotube footing upgrades: " +
        (state.pierCount || 0) +
        " × " +
        money((state.pierUpgrade && state.pierUpgrade.each) || 295) +
        " = " +
        money((state.materials && state.materials.pierUpgrade) || 0),
      "",
      "SCOPE — FRAMING:",
      RATES.framingScopeNotes || "",
      "SCOPE — STAIRS:",
      RATES.stairScopeNotes || "",
      "",
      "Labor — Framing: " + money(state.labor.framing),
      "Labor — Composite install: " + money(state.labor.compositeInstall || 0),
      "Labor — Treated face-screw install: " +
        money(state.labor.treatedInstall || 0),
      "Labor — Redeck: " + money(state.labor.redeck || 0),
      "Labor — Demo & dispose: " + money(state.labor.demoDispose || 0),
      "Labor — Railing install ($35/LF all types): " + money(state.labor.railing),
      "Labor — Steps: " + money(state.labor.steps),
      "Labor total: " + money(state.labor.total),
      "Materials total: " +
        (state.wantMaterials ? money(state.materials.total || 0) : "n/a"),
      "Building & zoning permits: " +
        money((state.fees && state.fees.permit) || 0),
      "Grand total: " + money(state.grandTotal || 0),
      "Competitor-class compare (~): " + money(state.competitorTotal || 0),
      "Est. savings vs premium mainstream: " +
        (state.savingsVsCompetitor > 0
          ? money(state.savingsVsCompetitor)
          : "$0"),
    ];
    if (!isNewBuild()) {
      var w = state.worstCase || calcWorstCaseFraming();
      lines.push(
        "",
        "REDECK — framing adequacy note (NOT in locked total):",
        "If framing is adequate: redeck estimate stands as shown.",
        "Worst-case framing labor (if structure not sound): " +
          money(w.framingLabor),
        "Worst-case framing materials: " + money(w.framingMaterials),
        "Worst-case framing total (extra, not included): " + money(w.total),
        "Site visit confirms framing; structural work only with customer approval."
      );
    }
    if (state.wantMaterials) {
      lines.push(
        "",
        "Framing materials: " + money(state.materials.framing || 0),
        "Decking: " + (state.deckingLabel || "—"),
        "Decking color sample: " +
          (state.deckingColorName ||
            (state.deckingType === "treated" ? "Pressure-treated" : "—")),
        (state.deckingType === "treated"
          ? "3\" deck screws: "
          : "Fasteners / fascia / joist tape: ") +
          money(state.materials.fasteners || 0),
        "Railing materials: " + (state.railingLabel || "—"),
        "Railing sample: " +
          (state.railingColorName ||
            (state.railingType === "none" ? "Skip / labor only" : "—")),
        "Materials total (incl. 20% upcharge in rates): " +
          money(state.materials.total),
        "Grand total: " + money(state.grandTotal)
      );
    } else {
      lines.push("", "Materials: not included in this estimate");
    }
    lines.push("", "Source: deck-estimate");
    return lines.join("\n");
  }

  function readContactFromForm() {
    var nameEl = document.getElementById("cust-name");
    var emailEl = document.getElementById("cust-email");
    var phoneEl = document.getElementById("cust-phone");
    var cityEl = document.getElementById("cust-city");
    if (nameEl) state.name = nameEl.value.trim();
    if (emailEl) state.email = emailEl.value.trim();
    if (phoneEl) state.phone = phoneEl.value.trim();
    if (cityEl) state.city = cityEl.value.trim();
  }

  function fillRequestForm() {
    readContactFromForm();
    var fType = document.getElementById("f-project-type");
    if (fType) {
      fType.value = isNewBuild() ? "New build" : "Redeck";
    }
    var fWar = document.getElementById("f-warranty");
    if (fWar) {
      fWar.value = isNewBuild()
        ? RATES.warrantyNewBuild
        : "Workmanship warranty per contract (redeck)";
    }
    document.getElementById("f-sqft").value = String(state.sqft);
    document.getElementById("f-railing-lf").value = String(state.railingLf);
    document.getElementById("f-steps").value = String(state.steps);
    var fSw = document.getElementById("f-stair-width");
    if (fSw) fSw.value = String(state.stairWidthFt || 4);
    var fSf = document.getElementById("f-stair-footings");
    if (fSf) fSf.value = String(state.stairExtraFootings || 0);
    var fSm = document.getElementById("f-stair-mats");
    if (fSm) fSm.value = money((state.materials && state.materials.stairs) || 0);
    var fPlat = document.getElementById("f-platforms");
    if (fPlat) fPlat.value = platformLabel(state.platforms);
    var fShape = document.getElementById("f-deck-shape");
    if (fShape) fShape.value = shapeLabel(state.deckShape);
    var fPf = document.getElementById("f-platform-factor");
    if (fPf) fPf.value = String(state.platformFactor || 1);
    var fSf = document.getElementById("f-shape-factor");
    if (fSf) fSf.value = String(state.shapeFactor || 1);
    var fScope = document.getElementById("f-framing-scope");
    if (fScope) {
      fScope.value = isNewBuild()
        ? RATES.framingScopeNotes || ""
        : "Redeck — existing framing assumed; not rebuilt in main total.";
    }
    document.getElementById("f-labor-framing").value = money(state.labor.framing);
    var fComp = document.getElementById("f-labor-composite");
    if (fComp) fComp.value = money(state.labor.compositeInstall || 0);
    var fTreated = document.getElementById("f-labor-treated");
    if (fTreated) fTreated.value = money(state.labor.treatedInstall || 0);
    var fRedeck = document.getElementById("f-labor-redeck");
    if (fRedeck) fRedeck.value = money(state.labor.redeck || 0);
    var fDemo = document.getElementById("f-labor-demo");
    if (fDemo) fDemo.value = money(state.labor.demoDispose || 0);
    calcWorstCaseFraming();
    var w = state.worstCase;
    var fWl = document.getElementById("f-worst-framing-labor");
    var fWm = document.getElementById("f-worst-framing-mat");
    var fWt = document.getElementById("f-worst-framing-total");
    var fWn = document.getElementById("f-redeck-framing-note");
    if (!isNewBuild()) {
      if (fWl) fWl.value = money(w.framingLabor);
      if (fWm) fWm.value = money(w.framingMaterials);
      if (fWt) fWt.value = money(w.total);
      if (fWn) {
        fWn.value =
          "If framing adequate: redeck total stands. Worst-case extra framing labor " +
          money(w.framingLabor) +
          " + materials " +
          money(w.framingMaterials) +
          " = " +
          money(w.total) +
          " (NOT in locked total). Site visit confirms; structural work only with approval.";
      }
    } else {
      if (fWl) fWl.value = "n/a";
      if (fWm) fWm.value = "n/a";
      if (fWt) fWt.value = "n/a";
      if (fWn) fWn.value = "n/a (new build)";
    }
    document.getElementById("f-labor-railing").value = money(state.labor.railing);
    document.getElementById("f-labor-steps").value = money(state.labor.steps);
    var fHyb = document.getElementById("f-labor-hybrid");
    if (fHyb) fHyb.value = money(state.labor.hybridExtra || 0);
    document.getElementById("f-labor-total").value = money(state.labor.total);
    document.getElementById("f-included-mat").value = state.wantMaterials
      ? "yes"
      : "no";
    document.getElementById("f-decking").value = state.wantMaterials
      ? state.deckingLabel || "—"
      : "n/a";
    var colorField = document.getElementById("f-decking-color");
    if (colorField) {
      colorField.value = state.wantMaterials
        ? state.deckingColorName ||
          (state.deckingType === "treated" ? "Pressure-treated" : "—")
        : "n/a";
    }
    document.getElementById("f-railing-type").value = state.wantMaterials
      ? state.railingLabel || "—"
      : "n/a";
    var railColorField = document.getElementById("f-railing-color");
    if (railColorField) {
      railColorField.value = state.wantMaterials
        ? state.railingColorName || "—"
        : "n/a";
    }
    var fFraming = document.getElementById("f-framing-mat");
    if (fFraming) {
      fFraming.value = state.wantMaterials
        ? money(state.materials.framing || 0)
        : "n/a";
    }
    var fFasteners = document.getElementById("f-fasteners");
    if (fFasteners) {
      fFasteners.value = state.wantMaterials
        ? money(state.materials.fasteners || 0)
        : "n/a";
    }
    var matPart = state.wantMaterials
      ? state.materials.total || 0
      : ((state.materials && state.materials.stairs) || 0) +
        ((state.materials && state.materials.pierUpgrade) || 0);
    document.getElementById("f-mat-total").value = money(matPart);
    var permitFee = calcPermitFee().permit || 0;
    var fPermit = document.getElementById("f-permit");
    if (fPermit) fPermit.value = money(permitFee);
    var pier = calcPierUpgrade();
    var fPierN = document.getElementById("f-pier-count");
    var fPierT = document.getElementById("f-pier-total");
    if (fPierN) fPierN.value = String(pier.count || 0);
    if (fPierT) fPierT.value = money(pier.total || 0);
    // Pier upgrade is inside materials.total when full materials; added with stairs when labor-only
    var total = state.labor.total + matPart + permitFee;
    state.grandTotal = total;
    document.getElementById("f-grand").value = money(total);
    var fCompT = document.getElementById("f-competitor-total");
    if (fCompT) fCompT.value = money(state.competitorTotal || 0);
    var fSav = document.getElementById("f-savings");
    if (fSav) {
      fSav.value =
        state.savingsVsCompetitor > 0
          ? money(state.savingsVsCompetitor)
          : "$0";
    }
    document.getElementById("f-summary").value = buildSummaryText();

    var next = document.querySelector('#estimate-form input[name="_next"]');
    if (next && !next.value) {
      next.value = window.location.href.split("?")[0] + "?sent=1";
    }
    updateRedeckFramingNotice();
  }

  function row(k, v) {
    return (
      "<div><dt>" +
      escapeHtml(k) +
      "</dt><dd>" +
      escapeHtml(v) +
      "</dd></div>"
    );
  }

  /* ---------- Live single-page: sync DOM -> state -> totals ---------- */
  function syncStateFromDom() {
    var pType = document.querySelector('input[name="project_type"]:checked');
    state.projectType =
      pType && pType.value === "redeck" ? "redeck" : "new_build";
    state.sqft = Math.round(num(document.getElementById("deck-sqft"), 0));
    state.railingLf = Math.round(num(document.getElementById("railing-lf"), 0));
    state.steps = Math.round(num(document.getElementById("num-steps"), 0));
    var platEl = document.querySelector('input[name="platforms"]:checked');
    var platVal = platEl ? parseInt(platEl.value, 10) : 1;
    state.platforms = platVal >= 3 ? 3 : platVal === 2 ? 2 : 1;
    var shapeEl = document.querySelector('input[name="deck_shape"]:checked');
    state.deckShape =
      shapeEl && shapeEl.value === "angled" ? "angled" : "rectangle";
    var sw = document.querySelector('input[name="stair_width"]:checked');
    var swVal = sw ? parseInt(sw.value, 10) : 4;
    state.stairWidthFt =
      swVal === 3 || swVal === 5 || swVal === 6 ? swVal : 4;
    var sf = document.querySelector('input[name="stair_extra_footings"]:checked');
    state.stairExtraFootings = sf ? parseInt(sf.value, 10) || 0 : 0;
    state.pierCount = Math.round(
      num(document.getElementById("pier-count"), 0)
    );

    var dtype = deckingTypeEl ? deckingTypeEl.value : "";
    state.deckingType = dtype || "";
    if (!dtype) {
      state.wantMaterials = false;
      state.deckingSub = "";
      state.deckingColor = "";
      state.deckingColorName = "";
      state.deckingLabel = "";
    } else if (dtype === "treated") {
      state.wantMaterials = true;
      state.deckingSub = "";
      state.deckingColor = "treated";
      state.deckingColorName = "Pressure-treated";
    } else {
      state.wantMaterials = true;
    }
  }

  function liveRecalc() {
    syncStateFromDom();
    // Always run materials path so stair structure mats update with steps/width
    calcAndRenderMaterials();
    updateRedeckFramingNotice();
  }

  function bindLiveInputs() {
    var ids = ["deck-sqft", "railing-lf", "num-steps", "pier-count"];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", liveRecalc);
      el.addEventListener("change", liveRecalc);
    });
    document.querySelectorAll('input[name="project_type"]').forEach(function (el) {
      el.addEventListener("change", liveRecalc);
    });
    document.querySelectorAll('input[name="platforms"]').forEach(function (el) {
      el.addEventListener("change", liveRecalc);
    });
    document.querySelectorAll('input[name="deck_shape"]').forEach(function (el) {
      el.addEventListener("change", liveRecalc);
    });
    document.querySelectorAll('input[name="stair_width"]').forEach(function (el) {
      el.addEventListener("change", liveRecalc);
    });
    document.querySelectorAll('input[name="stair_extra_footings"]').forEach(function (el) {
      el.addEventListener("change", liveRecalc);
    });
    if (deckingTypeEl) {
      deckingTypeEl.addEventListener("change", function () {
        fillDeckingSub();
        liveRecalc();
      });
    }
  }

  /**
   * Default realistic package for ad traffic:
   * Trex Enhance (first sample) + hybrid rail — not labor-only $0 materials.
   */
  function applyDefaultPackage() {
    if (deckingTypeEl) {
      if (!deckingTypeEl.value) {
        deckingTypeEl.value = "trex";
      }
      if (deckingTypeEl.value === "trex" || deckingTypeEl.value === "timbertech") {
        fillDeckingSub();
        var brandKey = deckingTypeEl.value;
        var defaultLine = brandKey === "trex" ? "enhance" : "terrain";
        var sampleBtn =
          sampleGallery &&
          sampleGallery.querySelector(
            '.sample-card[data-line="' + defaultLine + '"]'
          );
        if (!sampleBtn && sampleGallery) {
          sampleBtn = sampleGallery.querySelector(".sample-card");
        }
        if (sampleBtn) {
          selectSample(sampleBtn);
        } else if (deckingSubEl) {
          // Fallback: set line even if gallery not ready
          deckingSubEl.value = defaultLine;
          state.deckingSub = defaultLine;
          state.deckingType = brandKey;
          state.wantMaterials = true;
          if (brandKey === "trex") {
            state.deckingColorName = "Beach Dune";
            state.deckingColor = "beach_dune";
          }
        }
      } else if (deckingTypeEl.value === "treated") {
        fillDeckingSub();
      }
    }
  }

  bindLiveInputs();
  renderRailingGallery();
  applyDefaultPackage();
  liveRecalc();

  document.getElementById("estimate-form").addEventListener("submit", function (e) {
    setError("err-4", "");
    liveRecalc();
    readContactFromForm();
    if (state.sqft < 1) {
      e.preventDefault();
      setError("err-4", "Enter deck area in square feet before submitting.");
      return;
    }
    if (!state.name) {
      e.preventDefault();
      setError("err-4", "Please enter your full name.");
      return;
    }
    if (!state.email || state.email.indexOf("@") < 1) {
      e.preventDefault();
      setError("err-4", "Please enter a valid email.");
      return;
    }
    if (!state.phone) {
      e.preventDefault();
      setError(
        "err-4",
        "Please enter a phone number so we can schedule your visit."
      );
      return;
    }
    if (!document.getElementById("agree-rough").checked) {
      e.preventDefault();
      setError(
        "err-4",
        "Please confirm you want to lock in this estimate and schedule a site visit."
      );
      return;
    }
    fillRequestForm();
  });

  // Sent confirmation
  if (/[?&]sent=1/.test(window.location.search)) {
    var intro = document.querySelector(".intro");
    if (intro) {
      var note = document.createElement("div");
      note.className = "sent-banner";
      note.setAttribute("role", "status");
      note.innerHTML =
        "<strong>Estimate locked in.</strong> We’ll contact you to schedule a site visit to verify scope and sign. You can run another estimate below if needed.";
      intro.insertBefore(note, intro.firstChild);
    }
  }

})();
