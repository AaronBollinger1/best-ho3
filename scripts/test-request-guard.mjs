/* test-request-guard.mjs — unit coverage for the shared api/lib/request-guard.
   Runs with `npm run test:guard` and is also chained from the main smoke test.
   No network / no KV env => exercises the in-memory fallback + origin gate. */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const mod = await import(pathToFileURL(path.join(process.cwd(), "api", "lib", "request-guard.js")).href);
const { rateLimited, sameSiteAllowed, canonicalFingerprint, guardRequest } = mod;

function mockRes() {
  const r = { statusCode: 0, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

// ── origin / CSRF gate ──────────────────────────────────────────────────────
assert.equal(sameSiteAllowed({ headers: {} }), true, "no origin/referer (server-side) allowed");
assert.equal(
  sameSiteAllowed({ headers: { origin: "https://bestho3.com", host: "bestho3.com" } }),
  true, "same-origin allowed"
);
assert.equal(
  sameSiteAllowed({ headers: { origin: "https://bestho3.com", "x-forwarded-host": "bestho3.com" } }),
  true, "same-origin via forwarded host allowed"
);
assert.equal(
  sameSiteAllowed({ headers: { origin: "https://evil.example", host: "bestho3.com" } }),
  false, "cross-origin POST rejected"
);
assert.equal(
  sameSiteAllowed({ headers: { referer: "https://evil.example/x", host: "bestho3.com" } }),
  false, "cross-origin referer rejected when origin absent"
);
console.log("origin/CSRF gate: OK");

// ── canonical fingerprint ───────────────────────────────────────────────────
const a = canonicalFingerprint({ fields: { b: 1, a: 2 }, lossRows: [], quote: { low: 1 } });
const b = canonicalFingerprint({ quote: { low: 1 }, lossRows: [], fields: { a: 2, b: 1 } });
assert.equal(a, b, "fingerprint is key-order independent");
const c = canonicalFingerprint({ fields: { a: 2, b: 1 }, lossRows: [], quote: { low: 2 } });
assert.notEqual(a, c, "fingerprint changes when data changes");
assert.match(a, /^[0-9a-f]{64}-\d+$/, "fingerprint shape is sha256-length");
console.log("canonical fingerprint: OK");

// ── rate limit (in-memory fallback) ─────────────────────────────────────────
const req = { headers: { "x-forwarded-for": "198.51.100.9" } };
let blocked = false;
for (let i = 0; i < 6; i++) blocked = await rateLimited(req, { scope: "unit", limit: 5, windowSec: 60 });
assert.equal(blocked, true, "6th hit over a limit of 5 is throttled");
assert.equal(
  await rateLimited({ headers: { "x-forwarded-for": "198.51.100.10" } }, { scope: "unit", limit: 5, windowSec: 60 }),
  false, "a different IP is not throttled"
);
console.log("rate limit fallback: OK");

// ── guardRequest end-to-end ─────────────────────────────────────────────────
{
  const res = mockRes();
  const stop = await guardRequest({ headers: { origin: "https://evil.example", host: "bestho3.com" } }, res, { scope: "ge", limit: 5 });
  assert.equal(stop, true, "guardRequest blocks bad origin");
  assert.equal(res.statusCode, 403, "bad origin => 403");
}
{
  const res = mockRes();
  const stop = await guardRequest({ headers: { "x-forwarded-for": "203.0.113.55" } }, res, { scope: "ge2", limit: 5 });
  assert.equal(stop, false, "guardRequest passes a clean same-site request");
}
console.log("guardRequest: OK");
console.log("REQUEST GUARD TESTS PASSED");
