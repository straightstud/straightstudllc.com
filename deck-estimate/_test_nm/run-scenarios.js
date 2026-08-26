/**
 * Headless scenario runner for the live deck calculator.
 * Loads the real index.html + calculator.js in jsdom and drives every path.
 */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.resolve(__dirname, "..");
const htmlPath = path.join(ROOT, "index.html");
const jsPath = path.join(ROOT, "calculator.js");

function parseMoney(s) {
  return Number(String(s || "0").replace(/[^0-9.-]/g, "")) || 0;
}

function loadDom() {
  let html = fs.readFileSync(htmlPath, "utf8");
  const js = fs.readFileSync(jsPath, "utf8");
  html = html
    .replace(/<script src="\.\.\/js\/main\.js"[^>]*><\/script>/, "")
    .replace(
      /<script src="calculator\.js[^"]*"[^>]*><\/script>/,
      "<script>" + js + "</script>"
    )
    .replace(/<script async src="https:\/\/www.googletagmanager.com[\s\S]*?<\/script>/, "")
    .replace(/<script src="\.\.\/js\/analytics\.js"><\/script>/, "");
  const dom = new JSDOM(html, {
    url: "http://127.0.0.1/deck-estimate/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  return dom;
}

function $(dom, id) {
  return dom.window.document.getElementById(id);
}

function setVal(dom, id, value) {
  const el = $(dom, id);
  if (!el) throw new Error("missing #" + id);
  el.value = String(value);
  el.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  el.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
}

function checkRadio(dom, name, value) {
  const el = dom.window.document.querySelector(
    'input[name="' + name + '"][value="' + value + '"]'
  );
  if (!el) throw new Error("missing radio " + name + "=" + value);
  el.checked = true;
  el.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
}

function snapshot(dom) {
  const d = dom.window.document;
  const breakdown = (d.getElementById("live-breakdown") || {}).innerHTML || "";
  return {
    labor: parseMoney(d.getElementById("live-labor").textContent),
    materials: parseMoney(d.getElementById("live-materials").textContent),
    permit: parseMoney(d.getElementById("live-permit").textContent),
    grand: parseMoney(d.getElementById("live-grand").textContent),
    lf: Number(d.getElementById("railing-lf").value) || 0,
    railType: d.getElementById("railing-type").value,
    cableHidden: d.getElementById("cable-post-options").hidden,
    glassHidden: d.getElementById("glass-system-options").hidden,
    sampleHidden: d.getElementById("railing-sample-panel").hidden,
    breakdown,
    warn: /enter linear feet/i.test(breakdown),
    railLabor: /Railing labor/i.test(breakdown),
    railMats: /Railing materials/i.test(breakdown),
  };
}

function assert(cond, msg, extra) {
  if (!cond) {
    const err = new Error("FAIL: " + msg);
    err.extra = extra;
    throw err;
  }
}

function almost(a, b, tol) {
  return Math.abs(a - b) <= (tol == null ? 1 : tol);
}

function run() {
  const failures = [];
  const passes = [];
  function test(name, fn) {
    const dom = loadDom();
    try {
      fn(dom);
      passes.push(name);
      console.log("PASS  " + name);
    } catch (e) {
      failures.push({ name, msg: e.message, extra: e.extra });
      console.log("FAIL  " + name + " — " + e.message);
      if (e.extra) console.log("      ", JSON.stringify(e.extra));
    }
    dom.window.close();
  }

  function enterDeck(dom, sqft) {
    setVal(dom, "deck-sqft", sqft == null ? 300 : sqft);
  }

  test("default load: sqft 0, LF 0, totals $0", (dom) => {
    const s = snapshot(dom);
    assert(s.railType === "none", "default railing is none", s);
    assert(s.lf === 0, "default LF 0", s);
    const sqft = Number(dom.window.document.getElementById("deck-sqft").value) || 0;
    assert(sqft === 0, "default sqft 0 got " + sqft, s);
    assert(s.cableHidden && s.glassHidden, "sub-options hidden", s);
    assert(s.labor === 0 && s.materials === 0 && s.permit === 0, "no dollars until user types", s);
    assert(s.grand === 0, "grand 0", s);
    assert(!s.railLabor && !s.railMats, "no railing lines", s);
  });

  test("no railing + LF filled still $0 rail", (dom) => {
    enterDeck(dom);
    const before = snapshot(dom);
    setVal(dom, "railing-lf", 48);
    const s = snapshot(dom);
    assert(s.railType === "none", "still none");
    assert(!s.railLabor && !s.railMats, "no rail lines with none+48", s);
    assert(almost(s.labor, before.labor, 1), "labor unchanged", s);
    assert(almost(s.materials, before.materials, 1), "materials unchanged", s);
  });

  const railCases = [
    { type: "treated_wood", per: 20.7, lab: 35, sub: null },
    { type: "composite", per: 66, lab: 40, sub: null },
    { type: "aluminum", per: 86, lab: 45, sub: null },
    { type: "cable", per: 78, lab: 55, sub: { name: "cable_post", value: "wood" } },
    { type: "cable", per: 156, lab: 58, sub: { name: "cable_post", value: "aluminum" } },
    { type: "glass", per: 226, lab: 90, sub: { name: "glass_system", value: "spigot" } },
    { type: "glass", per: 108, lab: 70, sub: { name: "glass_system", value: "enclosed" } },
  ];

  railCases.forEach((rc) => {
    const label =
      rc.type + (rc.sub ? " / " + rc.sub.name + "=" + rc.sub.value : "");
    test("select " + label + " keeps LF 0 until typed, then prices", (dom) => {
      enterDeck(dom);
      const before = snapshot(dom);
      setVal(dom, "railing-type", rc.type);
      if (rc.sub) checkRadio(dom, rc.sub.name, rc.sub.value);
      const empty = snapshot(dom);
      assert(empty.lf === 0, "LF stays 0, got " + empty.lf, empty);
      assert(almost(empty.labor, before.labor, 1), "no labor until LF", empty);
      assert(almost(empty.materials, before.materials, 1), "no mats until LF", empty);
      assert(empty.warn, "warn to enter LF", empty);
      if (rc.type === "cable") assert(!empty.cableHidden && empty.glassHidden, "cable UI", empty);
      else if (rc.type === "glass") assert(empty.glassHidden === false && empty.cableHidden, "glass UI", empty);
      else assert(empty.cableHidden && empty.glassHidden, "no extra UI", empty);

      setVal(dom, "railing-lf", 48);
      const s = snapshot(dom);
      assert(s.lf === 48, "typed 48", s);
      assert(almost(s.labor - before.labor, Math.round(48 * rc.lab), 2), "labor delta", s);
      assert(almost(s.materials - before.materials, Math.round(48 * rc.per), 2), "mat delta", s);
      assert(s.railLabor && s.railMats, "rail lines after LF", s);
      assert(s.grand > before.grand, "grand increased", s);
    });
  });

  test("manual LF 48 aluminum matches 48*86 + 48*45", (dom) => {
    enterDeck(dom);
    const base = snapshot(dom);
    setVal(dom, "railing-lf", 48);
    setVal(dom, "railing-type", "aluminum");
    const s = snapshot(dom);
    assert(s.lf === 48, "kept 48 LF, got " + s.lf, s);
    assert(almost(s.labor - base.labor, 48 * 45, 2), "alum labor", s);
    assert(almost(s.materials - base.materials, 48 * 86, 2), "alum mats", s);
  });

  test("switching to none removes rail dollars", (dom) => {
    enterDeck(dom);
    setVal(dom, "railing-lf", 48);
    setVal(dom, "railing-type", "aluminum");
    const withRail = snapshot(dom);
    assert(withRail.grand > 0 && withRail.railLabor, "had rail", withRail);
    setVal(dom, "railing-type", "none");
    const s = snapshot(dom);
    assert(!s.railLabor && !s.railMats, "rail lines gone", s);
    enterDeck(dom);
    const b = snapshot(dom);
    assert(almost(s.labor, b.labor, 2), "labor back to base", s);
    assert(almost(s.materials, b.materials, 2), "mats back to base", s);
  });

  test("labor-only decking still adds railing materials", (dom) => {
    enterDeck(dom);
    setVal(dom, "decking-type", "");
    const noDeck = snapshot(dom);
    setVal(dom, "railing-lf", 40);
    setVal(dom, "railing-type", "treated_wood");
    const s = snapshot(dom);
    assert(s.lf === 40, "kept 40", s);
    assert(almost(s.materials - noDeck.materials, Math.round(40 * 20.7), 2), "treated mats on labor-only", s);
    assert(almost(s.labor - noDeck.labor, 40 * 35, 2), "treated labor on labor-only", s);
    assert(s.railMats, "rail mats visible", s);
  });

  test("redeck + composite rail", (dom) => {
    enterDeck(dom);
    checkRadio(dom, "project_type", "redeck");
    setVal(dom, "railing-lf", 48);
    setVal(dom, "railing-type", "composite");
    const s = snapshot(dom);
    assert(s.lf === 48, "lf 48", s);
    assert(s.railLabor && s.railMats, "rail on redeck", s);
    assert(s.grand > s.permit, "has work", s);
    assert(/Redeck labor/.test(s.breakdown), "redeck not new framing", s);
  });

  test("steps add stair labor and structure mats", (dom) => {
    enterDeck(dom);
    const before = snapshot(dom);
    setVal(dom, "num-steps", 4);
    checkRadio(dom, "stair_width", "4");
    const s = snapshot(dom);
    assert(s.labor > before.labor, "step labor", s);
    assert(s.materials > before.materials, "stair mats", s);
    assert(/Steps labor/i.test(s.breakdown), "steps line", s);
  });

  test("2 platforms + angled increases framing labor", (dom) => {
    enterDeck(dom);
    const before = snapshot(dom);
    checkRadio(dom, "platforms", "2");
    checkRadio(dom, "deck_shape", "angled");
    const s = snapshot(dom);
    assert(s.labor > before.labor, "design upcharge", s);
  });

  test("piers add when count > 0", (dom) => {
    enterDeck(dom);
    const before = snapshot(dom);
    setVal(dom, "pier-count", 4);
    checkRadio(dom, "pier_size", "16");
    const s = snapshot(dom);
    assert(s.labor > before.labor || s.materials > before.materials, "pier package", s);
    assert(s.grand > before.grand, "grand up", s);
  });

  test("treated decking changes install labor vs trex", (dom) => {
    enterDeck(dom);
    const trex = snapshot(dom);
    setVal(dom, "decking-type", "treated");
    const s = snapshot(dom);
    assert(s.labor !== trex.labor, "install labor changed", s);
    assert(s.materials > 0, "treated mats", s);
  });

  test("timbertech decking still prices", (dom) => {
    enterDeck(dom);
    setVal(dom, "decking-type", "timbertech");
    const s = snapshot(dom);
    assert(s.labor > 0 && s.materials > 0, "timbertech totals", s);
  });

  test("zero sqft does not explode", (dom) => {
    setVal(dom, "deck-sqft", 0);
    const s = snapshot(dom);
    assert(s.grand >= 0, "non-negative", s);
  });

  test("cable wood vs alum posts different totals", (dom) => {
    enterDeck(dom);
    setVal(dom, "railing-lf", 48);
    setVal(dom, "railing-type", "cable");
    checkRadio(dom, "cable_post", "wood");
    const wood = snapshot(dom);
    checkRadio(dom, "cable_post", "aluminum");
    const alum = snapshot(dom);
    assert(alum.grand > wood.grand, "alum cable costs more", { wood: wood.grand, alum: alum.grand });
    assert(alum.materials > wood.materials, "alum mats higher", alum);
  });

  test("glass spigot costs more than enclosed", (dom) => {
    enterDeck(dom);
    setVal(dom, "railing-lf", 48);
    setVal(dom, "railing-type", "glass");
    checkRadio(dom, "glass_system", "enclosed");
    const enc = snapshot(dom);
    checkRadio(dom, "glass_system", "spigot");
    const sp = snapshot(dom);
    assert(sp.grand > enc.grand, "spigot > enclosed", { enc: enc.grand, sp: sp.grand });
  });

  test("sample gallery appears for aluminum", (dom) => {
    setVal(dom, "railing-type", "aluminum");
    const s = snapshot(dom);
    assert(!s.sampleHidden, "sample panel shown", s);
    const cards = dom.window.document.querySelectorAll("#railing-sample-gallery .sample-card");
    assert(cards.length >= 3, "alum color cards " + cards.length, s);
  });

  test("railing-only aluminum 48 LF with 0 sqft prices labor+mats, no permit", (dom) => {
    const sqft = Number(dom.window.document.getElementById("deck-sqft").value) || 0;
    assert(sqft === 0, "sqft stays 0");
    setVal(dom, "railing-type", "aluminum");
    setVal(dom, "railing-lf", 48);
    const s = snapshot(dom);
    assert(s.lf === 48, "typed 48", s);
    assert(almost(s.labor, 48 * 45, 2), "alum labor only", s);
    assert(almost(s.materials, 48 * 86, 2), "alum mats only", s);
    assert(s.permit === 0, "no permit without deck sqft", s);
    assert(almost(s.grand, 48 * 45 + 48 * 86, 2), "grand is rail only", s);
    assert(s.railLabor && s.railMats, "rail lines without deck", s);
    assert(/Railing only/i.test(s.breakdown), "railing-only note", s);
    const psf = (dom.window.document.getElementById("live-psf") || {}).textContent || "";
    assert(/linear ft/i.test(psf), "per LF copy, got " + psf, s);
  });

  test("railing-only submit does not require deck sqft", (dom) => {
    setVal(dom, "railing-lf", 48);
    setVal(dom, "railing-type", "aluminum");
    $(dom, "cust-name").value = "Test";
    $(dom, "cust-email").value = "t@t.com";
    $(dom, "cust-phone").value = "6165550100";
    $(dom, "agree-rough").checked = true;
    const form = dom.window.document.getElementById("estimate-form");
    const ev = new dom.window.Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(ev);
    const err = ($(dom, "err-4").textContent || "").trim();
    assert(!err, "no sqft required error, got " + err);
    assert($(dom, "f-project-type").value === "Railing only", "project type " + $(dom, "f-project-type").value);
    assert($(dom, "f-sqft").value === "0", "sqft field 0");
    assert(parseMoney($(dom, "f-grand").value) > 0, "form grand filled");
    assert(parseMoney($(dom, "f-labor-railing").value) === 48 * 45, "rail labor field");
  });

  test("submit with 0 sqft and no railing is blocked", (dom) => {
    $(dom, "cust-name").value = "Test";
    $(dom, "cust-email").value = "t@t.com";
    $(dom, "cust-phone").value = "6165550100";
    $(dom, "agree-rough").checked = true;
    const form = dom.window.document.getElementById("estimate-form");
    const ev = new dom.window.Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(ev);
    const err = ($(dom, "err-4").textContent || "").trim();
    assert(/railing linear feet/i.test(err) || /deck square footage/i.test(err), "blocked empty submit: " + err);
  });

  test("form hidden fields fill on submit path", (dom) => {
    enterDeck(dom);
    setVal(dom, "railing-lf", 48);
    setVal(dom, "railing-type", "cable");
    checkRadio(dom, "cable_post", "aluminum");
    const form = dom.window.document.getElementById("estimate-form");
    // trigger the same prefill used on submit
    $(dom, "cust-name").value = "Test";
    $(dom, "cust-email").value = "t@t.com";
    $(dom, "cust-phone").value = "6165550100";
    $(dom, "agree-rough").checked = true;
    form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    const type = $(dom, "f-railing-type").value;
    const variant = $(dom, "f-railing-variant").value;
    const grand = $(dom, "f-grand").value;
    assert(/Cable/i.test(type), "form railing label " + type);
    assert(variant === "aluminum", "form variant " + variant);
    assert(parseMoney(grand) > 0, "form grand " + grand);
  });

  console.log("\n" + passes.length + " passed, " + failures.length + " failed, " + (passes.length + failures.length) + " total");
  if (failures.length) process.exit(1);
}

run();
