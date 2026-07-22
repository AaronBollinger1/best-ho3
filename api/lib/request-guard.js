/* =============================================================
   Shared request guard for every BestInsurance API endpoint.
   -------------------------------------------------------------
   Line-neutral hardening that all api/* handlers reuse unchanged:
     • Durable, distributed rate limiting (Vercel KV / Upstash Redis
       REST when configured; in-memory per-instance fallback so local
       dev and preview still throttle).
     • Origin / CSRF gate — browser state-changing POSTs must come
       from an allowed same-site origin. Non-browser / server-side
       callers (no Origin *and* no Referer, e.g. the smoke test) pass.
     • canonicalFingerprint(): a stable server-computed hash of the
       exact application data, so audit/review integrity never trusts
       a client-supplied number.

   Configure the durable store with either the Vercel KV integration
   env vars (KV_REST_API_URL + KV_REST_API_TOKEN) or the Upstash
   equivalents (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
   Extra allowed origins can be listed in ALLOWED_ORIGINS (comma-sep).
   ============================================================= */
import crypto from "crypto";

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const KV_ENABLED = Boolean(KV_URL && KV_TOKEN);

/* Per-instance fallback window store. Serverless instances are short-lived and
   not shared, so this only throttles a single warm instance — the KV path is
   what makes the limit durable across the fleet. */
const MEM = new Map();

/* Trusted client IP for rate-limit keying. On Vercel `x-real-ip` is set by the
   platform edge and is NOT client-controllable; the leftmost X-Forwarded-For
   token IS attacker-supplied, so it must never be the primary key or a caller
   could rotate it to defeat the limit. Fall back only when x-real-ip is absent
   (local/dev), and last-resort to the socket address. */
export function clientIp(req) {
  const h = (req && req.headers) || {};
  const real = String(h["x-real-ip"] || "").trim();
  if (real) return real;
  const xff = String(h["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || (req && req.socket && req.socket.remoteAddress) || "unknown";
}

/* Fixed-window counter in KV: INCR the window key, set a TTL on first hit.
   One round-trip via the REST pipeline; fails open (never blocks a real
   applicant because the store hiccupped) but logs so it's visible. */
async function kvHit(key, windowSec) {
  try {
    const res = await fetch(KV_URL + "/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(windowSec), "NX"]])
    });
    if (!res.ok) throw new Error("kv " + res.status);
    const data = await res.json();
    const count = Array.isArray(data) && data[0] ? Number(data[0].result) : 0;
    return Number.isFinite(count) ? count : 0;
  } catch (err) {
    console.warn("[request-guard] KV rate-limit unavailable, using local fallback:", err && err.message);
    return -1; // signal: fall back to memory
  }
}

function memHit(key, windowSec) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const arr = (MEM.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  MEM.set(key, arr);
  if (MEM.size > 5000) MEM.clear();
  return arr.length;
}

/* Returns true when the caller has exceeded `limit` hits in `windowSec`. */
export async function rateLimited(req, { scope = "api", limit = 20, windowSec = 60 } = {}) {
  const ip = clientIp(req);
  if (KV_ENABLED) {
    const bucket = Math.floor(Date.now() / (windowSec * 1000));
    const count = await kvHit(`rl:${scope}:${ip}:${bucket}`, windowSec);
    if (count >= 0) return count > limit;
    // count < 0 → KV failed, drop through to memory fallback
  }
  return memHit(`${scope}:${ip}`, windowSec) > limit;
}

function hostOf(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  try {
    return new URL(s.includes("://") ? s : "https://" + s).host.toLowerCase();
  } catch (e) {
    return "";
  }
}

/* Same-site Origin/CSRF gate for state-changing requests.
   - A browser always attaches Origin on a cross-origin POST, so a mismatched
     Origin is a hard reject.
   - Falls back to Referer host when Origin is absent.
   - When BOTH are absent the caller is not a browser form (server-to-server,
     curl, the smoke test) → allowed; these can't be CSRF'd.
   Allowed hosts = the request's own forwarded host + any ALLOWED_ORIGINS. */
export function sameSiteAllowed(req) {
  const headers = req.headers || {};
  const origin = headers.origin;
  const referer = headers.referer || headers.referrer;
  const claimed = hostOf(origin) || hostOf(referer);
  if (!claimed) return true; // no browser cross-origin context to enforce

  const allowed = new Set();
  const self = hostOf(headers["x-forwarded-host"]) || hostOf(headers.host);
  if (self) allowed.add(self);
  String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => hostOf(s))
    .filter(Boolean)
    .forEach((h) => allowed.add(h));

  // If we can't determine our own host and none was configured, don't block.
  if (allowed.size === 0) return true;
  return allowed.has(claimed);
}

/* Stable, order-independent hash of any JSON-serializable value. Object keys
   are sorted recursively so the same application always fingerprints the same
   regardless of property order in transit. */
export function canonicalFingerprint(value) {
  const json = canonicalJson(value, 0);
  return crypto.createHash("sha256").update(json).digest("hex") + "-" + json.length;
}

/* Depth-capped so a maliciously deep payload can't blow the stack. Beyond the
   cap we fall back to a plain (still-deterministic) stringify of the subtree. */
const MAX_DEPTH = 40;
function canonicalJson(value, depth) {
  if (value === null || typeof value !== "object") return JSON.stringify(value == null ? null : value);
  if (depth >= MAX_DEPTH) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map((v) => canonicalJson(v, depth + 1)).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k], depth + 1)).join(",") + "}";
}

/* One-call convenience for handlers: enforces rate-limit + origin and writes
   the response itself when blocking. Returns true when the request was blocked
   (the handler should `return` immediately). */
export async function guardRequest(req, res, opts = {}) {
  if (!sameSiteAllowed(req)) {
    res.status(403).json({ error: "Request origin not allowed." });
    return true;
  }
  if (await rateLimited(req, opts)) {
    res.status(429).json({ error: "Too many requests. Please wait a minute." });
    return true;
  }
  return false;
}
