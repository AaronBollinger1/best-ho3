// assets/lead-events.js is the only thing reporting conversions to GA4 and Google
// Ads across the estate, and it is byte-identical on every property — so a bug
// here is a bug on ten sites at once, and the failure is silent. Ads simply bids
// on numbers that are wrong, which is worse than bidding on none.
//
// Runs the real file against a minimal DOM shim. No browser, no dependencies.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "assets/lead-events.js"), "utf8");

// Run the file verbatim against a minimal window/document rather than unwrapping
// its IIFE — the shape of the wrapper is not what is under test, and a loader
// that depends on it breaks every time the file is reformatted.
function load({ brandKey = "bestho3" } = {}) {
  const listeners = {};
  const sandbox = {
    dataLayer: brandKey ? [{ brand_key: brandKey }] : [],
    location: { hostname: "www.bestho3.com", pathname: "/quote" },
    document: { addEventListener: (type, fn) => { listeners[type] = fn; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return { win: sandbox, listeners, fire: (type, ev) => listeners[type] && listeners[type](ev) };
}

// ── the API attaches ────────────────────────────────────────────────────────
{
  const { win } = load();
  assert.equal(typeof win.bollinsure.lead, "function", "bollinsure.lead must exist");
  assert.equal(typeof win.bollinsure.track, "function", "bollinsure.track must exist");
}

// ── a lead pushes BOTH event names ──────────────────────────────────────────
// quoteFormSubmitted is what the container's existing GA4 tag listens for;
// generate_lead is the GA4 recommended name. Dropping either breaks something.
{
  const { win } = load();
  win.bollinsure.lead({ lead_type: "ho3", quote_id: "abc" });
  const events = win.dataLayer.map((e) => e.event).filter(Boolean);
  assert.ok(events.includes("quoteFormSubmitted"), "must push quoteFormSubmitted");
  assert.ok(events.includes("generate_lead"), "must push generate_lead");

  const lead = win.dataLayer.find((e) => e.event === "quoteFormSubmitted");
  assert.equal(lead.value, 1.0, "a lead must carry a value for Ads bidding");
  assert.equal(lead.currency, "USD");
  assert.equal(lead.lead_type, "ho3", "caller detail must survive");
  assert.equal(lead.quote_id, "abc");
  assert.equal(lead.brand_key, "bestho3", "brand_key must come from the GTM bootstrap push");
}

// ── a lead converts ONCE ────────────────────────────────────────────────────
// A retry, a double-click, or a back-button return to the thank-you state must
// not each report a conversion. Inflating the count Ads bids on is worse than
// reporting nothing at all.
{
  const { win } = load();
  win.bollinsure.lead({ lead_type: "ho3" });
  win.bollinsure.lead({ lead_type: "ho3" });
  win.bollinsure.lead({ lead_type: "ho3" });
  const n = win.dataLayer.filter((e) => e.event === "quoteFormSubmitted").length;
  assert.equal(n, 1, `a submission must convert exactly once, pushed ${n}`);
}

// ── brand_key falls back to the hostname rather than going missing ──────────
{
  const { win } = load({ brandKey: null });
  win.bollinsure.lead({});
  const lead = win.dataLayer.find((e) => e.event === "quoteFormSubmitted");
  assert.equal(lead.brand_key, "bestho3", "must fall back to the hostname, never empty");
}

// ── click tracking classifies the three link types ──────────────────────────
{
  const { win, fire } = load();
  const anchor = (href) => ({
    target: {
      closest: (sel) => (sel === "a" ? {
        getAttribute: () => href,
        textContent: "call us",
        closest: () => null,
      } : null),
    },
  });
  fire("click", anchor("tel:+15622689355"));
  fire("click", anchor("mailto:reviews@bollinsure.com"));
  fire("click", anchor("/quote"));
  const events = win.dataLayer.map((e) => e.event);
  for (const e of ["phone_click", "email_click", "quote_click"]) {
    assert.ok(events.includes(e), `${e} must fire on the matching link`);
  }
}

// ── form_start fires once, not per keystroke ───────────────────────────────
{
  const { win, fire } = load();
  fire("focusin", { target: { tagName: "INPUT", name: "zip" } });
  fire("focusin", { target: { tagName: "SELECT", name: "state" } });
  const n = win.dataLayer.filter((e) => e.event === "form_start").length;
  assert.equal(n, 1, `form_start must fire once per page, pushed ${n}`);
}

// ── the file is identical estate-wide ───────────────────────────────────────
// Site identity comes from brand_key, so there is nothing legitimate to fork.
// A divergent copy means one property quietly stopped reporting.
{
  const SWEEP = path.resolve(ROOT, "..");
  const copies = [];
  for (const repo of fs.readdirSync(SWEEP, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    for (const rel of ["assets/lead-events.js", "lead-events.js"]) {
      const p = path.join(SWEEP, repo.name, rel);
      if (fs.existsSync(p)) copies.push([`${repo.name}/${rel}`, fs.readFileSync(p, "utf8")]);
    }
  }
  // Compare content, not line endings. Git normalises CRLF on checkout, so a raw
  // byte comparison reports drift on Windows for a file that is identical in the
  // repository — a false alarm that trains people to ignore this assertion.
  const norm = (s) => s.replace(/\r\n/g, "\n");
  const drift = copies.filter(([, body]) => norm(body) !== norm(src)).map(([n]) => n);
  assert.deepEqual(drift, [], `lead-events.js has drifted on: ${drift.join(", ")}`);
  console.log(`  identical across ${copies.length} properties`);
}

console.log("Lead conversion event tests passed.");
