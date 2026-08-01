// TCPA prior express written consent requires telling the consumer they are not
// required to agree in order to obtain the service. That disclosure cannot be
// made truthfully on a control that blocks submission — so the one thing this
// file exists to prevent is the consent box becoming a gate again.
//
// It was a gate until 2026-08-01: the signing UI was disabled unless "I consent
// to being contacted" was ticked, which made consent a condition of using the
// site and the required disclosure unmakeable.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "assets/ho-wizard.js"), "utf8");

// ── the consent must not gate submission ────────────────────────────────────
const gate = src.match(/const ok = state\.consent[^\n;]*/);
assert.ok(gate, "submit gate not found — has the wizard been restructured?");
assert.ok(!/consent_tcpa/.test(gate[0]),
  `TCPA consent is part of the submit gate again: ${gate[0]}`);

for (const m of src.matchAll(/if \(!\(state\.consent[^\n)]*\)\)/g)) {
  assert.ok(!/consent_tcpa/.test(m[0]), `TCPA consent blocks submission: ${m[0]}`);
}

// ── the disclosure must contain what the rule requires ──────────────────────
const text = (src.match(/const TCPA_CONSENT_TEXT = '([^']*)'/) || [])[1];
assert.ok(text, "TCPA_CONSENT_TEXT not found");
for (const [what, re] of [
  ["the named seller", /Bollinsure Insurance Services/],
  ["autodialed or prerecorded calls", /autodialer|prerecorded/i],
  ["texts as well as calls", /text/i],
  ["not a condition", /not a condition/i],
  ["message and data rates", /rates may apply/i],
  ["frequency", /frequency/i],
  ["STOP to opt out", /\bSTOP\b/],
]) assert.match(text, re, `TCPA disclosure is missing ${what}`);

// ── the record must be provable ─────────────────────────────────────────────
// A ticked box is not a defence without the wording that sat beside it and the
// time it was given, so both travel with the application.
for (const [what, re] of [
  ["the granted flag", /granted: !!state\.consent_tcpa/],
  ["the timestamp", /at: state\.consent_tcpa_at/],
  ["the wording version", /version: TCPA_CONSENT_VERSION/],
  ["the verbatim wording", /text: TCPA_CONSENT_TEXT/],
]) assert.match(src, re, `the consent record is missing ${what}`);

// ── the gating box must stay transactional ──────────────────────────────────
// It may only describe a broker replying about the application just submitted.
// Anything broader is marketing consent, and marketing consent may not gate.
const c2 = src.match(/c2w\.appendChild\(document\.createTextNode\('([^']*)'\)\)/);
assert.ok(c2, "the transactional-contact label was not found");
assert.ok(!/autodial|prerecorded|text me|marketing/i.test(c2[1]),
  `the GATING consent box describes marketing contact: "${c2[1]}"`);

// ── best-dp3 shares this wizard verbatim ────────────────────────────────────
const twin = path.resolve(ROOT, "../best-dp3/assets/ho-wizard.js");
if (fs.existsSync(twin)) {
  // Compare content, not line endings — git normalises CRLF on checkout, so a raw
  // byte comparison reports drift on Windows for a file identical in the repo.
  const norm = (x) => x.replace(/\r\n/g, "\n");
  assert.equal(norm(fs.readFileSync(twin, "utf8")), norm(src),
    "best-dp3/assets/ho-wizard.js has drifted — the TCPA fix must apply to both sites");
}

console.log("TCPA consent tests passed (gate excludes it; disclosure complete; record provable).");
