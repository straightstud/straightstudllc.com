/**
 * Straight Stud Construction LLC — Deck estimate calculator (live)
 *
 * Labor rates: charge rates — never shown as unit prices on the page.
 * Material rates: LOCKED = true cost × 1.20 (20% upcharge baked into each rate).
 * No separate markup line — materials total is final sell price.
 *
 * Railing LF includes stairs. Unit rates are never displayed to customers.
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
   * RATES — LOCKED. Unit rates never shown in the UI.
   * Materials = cost × 1.20 already. Do not add another markup.
   * ------------------------------------------------------------------ */
  var RATES = {
    labor: {
      framingPerSqft: 7.5, // new build framing labor
      // Composite decking install (Trex / TimberTech) — new build only; not treated
      compositeInstallPerSqft: 17.5,
      // Pressure-treated face-screw board install — new build when treated selected
      treatedInstallPerSqft: 12.5,
      // Redeck path
      redeckPerSqft: 15, // redeck labor (new surface on existing structure)
      demoDisposePerSqft: 7.5, // demo & dispose old decking
      railingPerLf: 35, // base railing install labor
      perStep: 100, // add-on per step
      // Extra labor when hybrid rail selected (alum spindles + cocktail rail build)
      hybridExtraPerLf: 12,
    },
    // New builds include limited lifetime workmanship warranty (shown in UI + email)
    warrantyNewBuild: "Limited lifetime workmanship warranty included on all new builds",
    materials: {
      // All material $/unit = true cost × 1.20 (20% upcharge included)
      // PT framing lumber + hangers — was $6.50 cost
      framingPerSqft: 7.8,
      // Composite (Trex/TimberTech): hidden fasteners + butyl tape cushion — cost × 1.20
      fastenersPerSqft: 6,
      // Pressure-treated: 3" deck screws only (no butyl / no hidden fasteners)
      // 0.05 lb/sqft × $16.50/lb cost × 1.20 markup = $0.99/sqft sell
      treatedScrews: {
        lbsPerSqft: 0.05,
        costPerLb: 16.5,
        // sell rate baked: 0.05 * 16.5 * 1.20
        perSqft: 0.99,
      },
      // Decking boards — was cost rates × 1.20 (color does not change price)
      decking: {
        treated: { label: "Pressure-treated lumber", perSqft: 8.4 },
        trex: {
          label: "Trex",
          lines: {
            enhance: {
              label: "Trex Enhance",
              perSqft: 8.4,
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
              perSqft: 13.2,
              samples: [
                { id: "pebble_grey", name: "Pebble Grey", grain: ["#9a9690", "#8a8680", "#aaa6a0", "#7a7670"] },
                { id: "woodland_brown", name: "Woodland Brown", grain: ["#5c4030", "#4a3224", "#6e4e3a", "#3e2a1e"] },
                { id: "madeira", name: "Madeira", grain: ["#8b4513", "#6d3610", "#a0522d", "#7a3c12"] },
                { id: "winchester_grey", name: "Winchester Grey", grain: ["#6e6a66", "#5e5a56", "#7e7a76", "#4e4a46"] },
              ],
            },
            transcend: {
              label: "Trex Transcend",
              perSqft: 18.6,
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
              perSqft: 21.6,
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
              perSqft: 14.4,
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
              perSqft: 18.6,
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
              perSqft: 19.2,
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
        // Wood: $16 cost × 1.20
        treated_wood: {
          label: "Wood rail (4x4 posts + wood spindles)",
          perLf: 19.2,
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
        // Hybrid materials: $28 cost × 1.20; extra labor $12/LF separate
        hybrid: {
          label: "Hybrid (wood posts/rails + alum spindles)",
          perLf: 33.6,
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
        // Aluminum: $55 cost × 1.06 tax × 1.20 markup → $70 (rounded)
        aluminum: {
          label: "Aluminum railing",
          perLf: 70,
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
        // Composite: $51 cost × 1.20 (kits + sleeves + caps + 4x4 core)
        composite: {
          label: "Composite rail (kits + sleeves + caps)",
          perLf: 61.2,
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
    railingType: "none",
    railingColor: "none",
    railingColorName: "Skip / labor only",
    railingLabel: "No railing materials",
    materials: {
      framing: 0,
      decking: 0,
      fasteners: 0,
      railing: 0,
      total: 0,
    },
    grandTotal: 0,
    cameFromMaterials: false,
    // Redeck: framing labor + materials calculated in background (not in main total)
    worstCase: {
      framingLabor: 0,
      framingMaterials: 0,
      total: 0,
    },
  };

  /* ---------- DOM ---------- */
  var panels = {
    1: document.getElementById("panel-1"),
    2: document.getElementById("panel-2"),
    3: document.getElementById("panel-3"),
    4: document.getElementById("panel-4"),
  };

  var stepItems = document.querySelectorAll(".steps__item");

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

  function showPanel(id) {
    Object.keys(panels).forEach(function (key) {
      var el = panels[key];
      if (!el) return;
      var on = String(key) === String(id);
      el.hidden = !on;
      el.classList.toggle("is-active", on);
    });

    // Progress indicator (1–4)
    var stepNum = typeof id === "number" ? id : 1;
    stepItems.forEach(function (li) {
      var s = parseInt(li.getAttribute("data-step"), 10);
      li.classList.toggle("is-active", s === stepNum);
      li.classList.toggle("is-done", s < stepNum);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
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

  /** Always compute framing labor + framing materials (for redeck worst-case notice). */
  function calcWorstCaseFraming() {
    var sqft = state.sqft || 0;
    var framingLabor = sqft * RATES.labor.framingPerSqft;
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
    var hybridExtra = state.labor.hybridExtra || 0;
    var framing = 0;
    var compositeInstall = 0;
    var treatedInstall = 0;
    var redeck = 0;
    var demoDispose = 0;

    // Backend: always know framing labor/materials for transparency
    calcWorstCaseFraming();

    if (isNewBuild()) {
      framing = sqft * RATES.labor.framingPerSqft;
      // Composite install only on new build when Trex / TimberTech selected
      compositeInstall = isCompositeDecking()
        ? sqft * RATES.labor.compositeInstallPerSqft
        : 0;
      // Treated face-screw board install when pressure-treated selected
      treatedInstall =
        state.deckingType === "treated"
          ? sqft * RATES.labor.treatedInstallPerSqft
          : 0;
    } else {
      // Redeck main total: surface + demo/dispose only (framing NOT in total)
      redeck = sqft * RATES.labor.redeckPerSqft;
      demoDispose = sqft * RATES.labor.demoDisposePerSqft;
      framing = 0;
    }

    var railing = lf * RATES.labor.railingPerLf;
    var stepLabor = steps * RATES.labor.perStep;

    state.labor = {
      framing: framing,
      compositeInstall: compositeInstall,
      treatedInstall: treatedInstall,
      redeck: redeck,
      demoDispose: demoDispose,
      railing: railing,
      steps: stepLabor,
      hybridExtra: hybridExtra,
      total:
        framing +
        compositeInstall +
        treatedInstall +
        redeck +
        demoDispose +
        railing +
        stepLabor +
        hybridExtra,
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
      (L.steps || 0) +
      (L.hybridExtra || 0);
  }

  function renderLaborBreakdown() {
    var L = state.labor;
    var html = "";

    if (isNewBuild()) {
      html +=
        '<div class="totals__row"><span>Framing labor</span><span>' +
        money(L.framing) +
        "</span></div>";
      if (L.compositeInstall > 0) {
        html +=
          '<div class="totals__row"><span>Composite decking install</span><span>' +
          money(L.compositeInstall) +
          "</span></div>";
      } else if (L.treatedInstall > 0) {
        html +=
          '<div class="totals__row"><span>Treated deck face-screw install</span><span>' +
          money(L.treatedInstall) +
          "</span></div>";
      } else if (!state.wantMaterials || !state.deckingType) {
        html +=
          '<div class="totals__row totals__row--muted"><span>Board install labor</span><span>Added when you pick decking next</span></div>';
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
        '<div class="totals__row"><span>Railing install</span><span>' +
        money(L.railing) +
        "</span></div>";
    }
    if (L.steps > 0) {
      html +=
        '<div class="totals__row"><span>Steps</span><span>' +
        money(L.steps) +
        "</span></div>";
    }
    if (L.hybridExtra > 0) {
      html +=
        '<div class="totals__row"><span>Hybrid rail extra labor</span><span>' +
        money(L.hybridExtra) +
        "</span></div>";
    }
    document.getElementById("labor-breakdown").innerHTML = html;
    var laborDisp = document.getElementById("labor-total-display");
    if (laborDisp) laborDisp.textContent = money(L.total);

    var ban = document.getElementById("warranty-banner");
    var lead = document.getElementById("labor-panel-lead");
    if (ban) ban.hidden = !isNewBuild();
    if (lead) {
      lead.textContent = isNewBuild()
        ? "New build labor. Board install is added when you choose decking (treated face-screw or Trex/TimberTech composite)."
        : "Redeck labor includes surface install plus demo & dispose. Assumes existing framing is sound — see final page for worst-case framing note.";
    }
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

        // Default selection: none
        if (typeKey === "none" && sample.id === "none") {
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

    // Sync default UI label
    if (railingSampleSelected) {
      railingSampleSelected.hidden = false;
    }
    if (railingSampleSelectedLabel) {
      railingSampleSelectedLabel.textContent =
        "No railing materials — Skip / labor only";
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
    var deckCost = state.sqft * (deck.perSqft || 0);
    // Treated: 3" screws only (replaces $6/sf composite fastener cushion)
    // Composite: hidden fasteners + butyl at fastenersPerSqft
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
    var railCost = state.railingLf * (rail.perLf || 0);

    // Hybrid: extra labor for alum spindles / cocktail rail build
    if (state.railingType === "hybrid" && state.railingLf > 0) {
      state.labor.hybridExtra =
        state.railingLf * (RATES.labor.hybridExtraPerLf || 0);
    } else {
      state.labor.hybridExtra = 0;
    }
    // Refresh framing + composite install from current decking choice
    calcLabor();
    renderLaborBreakdown();

    var materialsTotal = framingCost + deckCost + fastenerCost + railCost;

    state.materials = {
      framing: framingCost,
      decking: deckCost,
      fasteners: fastenerCost,
      railing: railCost,
      total: materialsTotal,
    };
    state.grandTotal = state.labor.total + state.materials.total;

    var rows = "";
    if (framingCost > 0) {
      rows +=
        '<div class="totals__row"><span>Framing materials</span><span>' +
        money(framingCost) +
        "</span></div>";
    }
    if (deck.label) {
      rows +=
        '<div class="totals__row"><span>Decking — ' +
        escapeHtml(deck.label) +
        "</span><span>" +
        money(deckCost) +
        "</span></div>";
    }
    if (fastenerCost > 0) {
      var fastenerLabel =
        state.deckingType === "treated"
          ? "3&quot; deck screws"
          : "Fasteners / hardware";
      rows +=
        '<div class="totals__row"><span>' +
        fastenerLabel +
        "</span><span>" +
        money(fastenerCost) +
        "</span></div>";
    }
    if (rail.perLf > 0 || keyIsRailing(state.railingType)) {
      rows +=
        '<div class="totals__row"><span>Railing materials — ' +
        escapeHtml(rail.label) +
        "</span><span>" +
        money(railCost) +
        "</span></div>";
    }
    if (state.labor.hybridExtra > 0) {
      rows +=
        '<div class="totals__row"><span>Hybrid rail extra labor (alum spindles / build)</span><span>' +
        money(state.labor.hybridExtra) +
        "</span></div>";
    }
    if (!rows) {
      rows =
        '<div class="totals__row totals__row--muted"><span>Select options above</span><span>—</span></div>';
    }
    document.getElementById("materials-breakdown").innerHTML = rows;
    document.getElementById("mat-labor-display").textContent = money(
      state.labor.total
    );
    document.getElementById("mat-materials-display").textContent = money(
      state.materials.total
    );
    document.getElementById("grand-total-display").textContent = money(
      state.grandTotal
    );
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
      "Railing linear ft: " + state.railingLf,
      "Steps: " + state.steps,
      "",
      "Labor — Framing: " + money(state.labor.framing),
      "Labor — Composite install: " + money(state.labor.compositeInstall || 0),
      "Labor — Treated face-screw install: " +
        money(state.labor.treatedInstall || 0),
      "Labor — Redeck: " + money(state.labor.redeck || 0),
      "Labor — Demo & dispose: " + money(state.labor.demoDispose || 0),
      "Labor — Railing install: " + money(state.labor.railing),
      "Labor — Steps: " + money(state.labor.steps),
      "Labor — Hybrid rail extra: " + money(state.labor.hybridExtra || 0),
      "Labor total: " + money(state.labor.total),
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
          : "Fasteners / hardware: ") + money(state.materials.fasteners || 0),
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
    document.getElementById("f-mat-total").value = state.wantMaterials
      ? money(state.materials.total)
      : "n/a";
    document.getElementById("f-grand").value = state.wantMaterials
      ? money(state.grandTotal)
      : money(state.labor.total);
    document.getElementById("f-summary").value = buildSummaryText();

    // Prefer live thank-you URL; fall back to current path + ?sent=1
    var next = document.querySelector('#estimate-form input[name="_next"]');
    if (next && !next.value) {
      next.value = window.location.href.split("?")[0] + "?sent=1";
    }

    var total = state.wantMaterials ? state.grandTotal : state.labor.total;
    state.grandTotal = total;
    document.getElementById("final-total-display").textContent = money(total);
    document.getElementById("final-total-label").textContent = state.wantMaterials
      ? "Locked estimate (labor + materials)"
      : "Locked estimate (labor only)";

    // Split labor / materials on lock-in so the total never looks like one opaque fee
    var finLab = document.getElementById("final-labor-display");
    var finMat = document.getElementById("final-materials-display");
    var finMatRow = document.getElementById("final-materials-row");
    if (finLab) finLab.textContent = money(state.labor.total);
    if (finMatRow && finMat) {
      if (state.wantMaterials) {
        finMatRow.hidden = false;
        finMat.textContent = money(state.materials.total || 0);
      } else {
        finMatRow.hidden = true;
        finMat.textContent = money(0);
      }
    }

    var sumEl = document.getElementById("request-summary");
    var html =
      '<dl class="summary__dl">' +
      row("Project type", isNewBuild() ? "New build" : "Redeck") +
      row(
        "Warranty",
        isNewBuild()
          ? "Limited lifetime workmanship warranty"
          : "Per contract (redeck)"
      ) +
      row("Deck area", state.sqft + " sq ft") +
      row("Railing", state.railingLf + " linear ft") +
      row("Steps", String(state.steps));
    // Only list labor lines that apply (no $0 noise that looks like padding)
    if (isNewBuild()) {
      if (state.labor.framing > 0) {
        html += row("Framing labor", money(state.labor.framing));
      }
      if (state.labor.compositeInstall > 0) {
        html += row(
          "Composite install labor",
          money(state.labor.compositeInstall)
        );
      }
      if (state.labor.treatedInstall > 0) {
        html += row(
          "Treated face-screw install",
          money(state.labor.treatedInstall)
        );
      }
      if (
        !state.wantMaterials &&
        !state.labor.compositeInstall &&
        !state.labor.treatedInstall
      ) {
        html += row(
          "Board install labor",
          "Not in this total — confirmed when decking is chosen on site"
        );
      }
    } else {
      if (state.labor.redeck > 0) {
        html += row("Redeck labor", money(state.labor.redeck));
      }
      if (state.labor.demoDispose > 0) {
        html += row("Demo & dispose", money(state.labor.demoDispose));
      }
    }
    if (state.labor.railing > 0) {
      html += row("Railing labor", money(state.labor.railing));
    }
    if (state.labor.steps > 0) {
      html += row("Steps labor", money(state.labor.steps));
    }
    if (state.labor.hybridExtra > 0) {
      html += row("Hybrid rail extra labor", money(state.labor.hybridExtra));
    }
    html += row("Labor total", money(state.labor.total));
    if (state.wantMaterials) {
      if (state.materials.framing > 0) {
        html += row("Framing materials", money(state.materials.framing));
      }
      html +=
        row("Decking", state.deckingLabel || "—") +
        row(
          "Color sample",
          state.deckingColorName ||
            (state.deckingType === "treated" ? "Pressure-treated" : "—")
        );
      if (state.materials.fasteners > 0) {
        html += row(
          state.deckingType === "treated"
            ? "3\" deck screws"
            : "Fasteners / hardware",
          money(state.materials.fasteners)
        );
      }
      if (state.materials.railing > 0 || keyIsRailing(state.railingType)) {
        html +=
          row("Railing materials", state.railingLabel || "—") +
          row("Railing sample", state.railingColorName || "—");
      }
      html += row("Materials total", money(state.materials.total));
    } else {
      html += row(
        "Materials",
        "Not included (labor-only estimate)"
      );
    }
    html += row("Estimate total", money(total)) + "</dl>";
    sumEl.innerHTML = html;
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

  /* ---------- Step handlers ---------- */
  // Step 1: Build deck → labor
  document.getElementById("btn-step1").addEventListener("click", function () {
    setError("err-1", "");
    var sqft = num(document.getElementById("deck-sqft"), 0);
    if (sqft < 1) {
      setError("err-1", "Enter deck area in square feet (at least 1).");
      return;
    }
    var pType = document.querySelector('input[name="project_type"]:checked');
    state.projectType =
      pType && pType.value === "redeck" ? "redeck" : "new_build";
    state.sqft = Math.round(sqft);
    state.railingLf = Math.round(num(document.getElementById("railing-lf"), 0));
    state.steps = Math.round(num(document.getElementById("num-steps"), 0));
    // Reset decking until materials step
    state.deckingType = "";
    state.deckingSub = "";
    state.deckingColor = "";
    state.deckingColorName = "";
    state.deckingLabel = "";
    state.labor.hybridExtra = 0;
    calcLabor();
    renderLaborBreakdown();
    showPanel(2);
  });

  // Step 2: Labor → materials or lock-in
  document.getElementById("btn-step2").addEventListener("click", function () {
    var want = document.querySelector('input[name="want_materials"]:checked');
    state.wantMaterials = !want || want.value === "yes";
    if (state.wantMaterials) {
      state.cameFromMaterials = true;
      calcAndRenderMaterials();
      showPanel(3);
    } else {
      state.cameFromMaterials = false;
      state.deckingType = "";
      state.materials = {
        framing: 0,
        decking: 0,
        fasteners: 0,
        railing: 0,
        total: 0,
      };
      state.deckingLabel = "";
      state.railingLabel = "";
      calcLabor();
      state.grandTotal = state.labor.total;
      fillRequestForm();
      showPanel(4);
    }
  });

  // Step 3: Materials → lock-in
  document.getElementById("btn-step3").addEventListener("click", function () {
    setError("err-3", "");
    var type = deckingTypeEl.value;
    if (!type) {
      setError("err-3", "Select a decking type.");
      return;
    }
    if (type === "trex" || type === "timbertech") {
      if (!state.deckingSub || !state.deckingColor) {
        setError(
          "err-3",
          "Click a sample color block for Trex or TimberTech to continue."
        );
        return;
      }
    }
    state.wantMaterials = true;
    state.cameFromMaterials = true;
    calcAndRenderMaterials();
    fillRequestForm();
    showPanel(4);
  });

  document.getElementById("btn-back-4").addEventListener("click", function () {
    if (state.cameFromMaterials || state.wantMaterials) {
      showPanel(3);
    } else {
      showPanel(2);
    }
  });

  document.querySelectorAll("[data-back]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var to = btn.getAttribute("data-back");
      showPanel(parseInt(to, 10));
    });
  });

  deckingTypeEl.addEventListener("change", fillDeckingSub);
  renderRailingGallery();

  document.getElementById("estimate-form").addEventListener("submit", function (e) {
    setError("err-4", "");
    readContactFromForm();
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
      setError("err-4", "Please enter a phone number so we can schedule your visit.");
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

  showPanel(1);
})();
