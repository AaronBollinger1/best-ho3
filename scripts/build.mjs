/* =============================================================
   Opt-in production build  (npm run build)
   -------------------------------------------------------------
   Produces an optimized dist/ WITHOUT touching the source tree, so
   the plain static deploy keeps working exactly as-is. dist/:
     • minifies the referenced CSS/JS (esbuild),
     • content-hashes each into /assets/<name>.<hash>.<ext>,
     • rewrites the quoted references inside dist/ HTML only,
     • leaves versioned/binary assets (vendor/pdf.js, images) as-is,
     • emits dist/vercel.json with immutable 1-year caching for
       /assets so the hashed files can be cached forever.

   Point Vercel at `npm run build` + output dir `dist` to adopt it;
   until then nothing about the current deploy changes.
   ============================================================= */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { transform } from "esbuild";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "dist");
const SKIP = new Set(["node_modules", ".git", "dist", ".vercel", ".claude"]);

/* Assets referenced from HTML (statically or via the dynamic loaders) that are
   safe to fingerprint. Vendored pdf.js stays on its version-pinned path. */
const FINGERPRINT = [
  "styles.css", "motion.css", "apply.css", "theme-dp3.css",
  "app.js", "apply.js", "brand.js", "brand.dp3.js", "seo.js",
  "ho-wizard.js", "ho-review-signing.js"
];

function walk(dir, base = "") {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const abs = path.join(dir, name);
    const rel = base ? base + "/" + name : name;
    if (fs.statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else out.push(rel);
  }
  return out;
}

function copyAll(files) {
  for (const rel of files) {
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rel), dest);
  }
}

function hash8(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 8);
}

async function minifyAndHash() {
  const map = {};       // "/assets/styles.css" -> "/assets/styles.<hash>.css"
  const stats = [];
  for (const name of FINGERPRINT) {
    const srcAbs = path.join(OUT, "assets", name);
    if (!fs.existsSync(srcAbs)) continue;
    const ext = path.extname(name).slice(1);
    const base = name.slice(0, -(ext.length + 1));
    const raw = fs.readFileSync(srcAbs, "utf8");
    const res = await transform(raw, { loader: ext === "css" ? "css" : "js", minify: true, legalComments: "none" });
    const code = res.code;
    const h = hash8(code);
    const hashedName = `${base}.${h}.${ext}`;
    fs.writeFileSync(path.join(OUT, "assets", hashedName), code);
    fs.rmSync(srcAbs);
    map["/assets/" + name] = "/assets/" + hashedName;
    stats.push({ name, from: Buffer.byteLength(raw), to: Buffer.byteLength(code), hashedName });
  }
  return { map, stats };
}

function rewriteHtml(map) {
  const htmlFiles = walk(OUT).filter((f) => f.endsWith(".html"));
  const keys = Object.keys(map).sort((a, b) => b.length - a.length); // longest first
  let rewrites = 0;
  for (const rel of htmlFiles) {
    const abs = path.join(OUT, rel);
    let html = fs.readFileSync(abs, "utf8");
    for (const key of keys) {
      for (const q of ['"', "'"]) {
        const needle = q + key + q;
        if (html.includes(needle)) {
          html = html.split(needle).join(q + map[key] + q);
          rewrites++;
        }
      }
    }
    fs.writeFileSync(abs, html);
  }
  return rewrites;
}

function emitVercelJson() {
  const srcCfg = path.join(ROOT, "vercel.json");
  const cfg = JSON.parse(fs.readFileSync(srcCfg, "utf8"));
  const IMMUTABLE = { key: "Cache-Control", value: "public, max-age=31536000, immutable" };
  /* Immutable caching is applied ONLY to content-hashed files and the
     version-pinned vendor bundle — never to a stable-path asset like
     og-image.png (which could then never be busted). We drop the source's
     catch-all /assets rule entirely; non-hashed assets fall back to Vercel's
     default caching. Rules are mutually exclusive so there is no precedence
     ambiguity between overlapping source patterns. */
  const headers = [];
  for (const entry of (cfg.headers || [])) {
    if (entry.source === "/assets/(.*)") {
      headers.push({ source: "/assets/(.+\\.[0-9a-f]{8}\\.(?:css|js))", headers: [IMMUTABLE] });
      headers.push({ source: "/assets/vendor/(.*)", headers: [IMMUTABLE] });
    } else {
      headers.push(entry);
    }
  }
  cfg.headers = headers;
  fs.writeFileSync(path.join(OUT, "vercel.json"), JSON.stringify(cfg, null, 2) + "\n");
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const files = walk(ROOT).filter((f) => f !== "dist/asset-manifest.json");
  copyAll(files);

  const { map, stats } = await minifyAndHash();
  const rewrites = rewriteHtml(map);
  emitVercelJson();
  fs.writeFileSync(path.join(OUT, "asset-manifest.json"), JSON.stringify(map, null, 2) + "\n");

  const totFrom = stats.reduce((n, s) => n + s.from, 0);
  const totTo = stats.reduce((n, s) => n + s.to, 0);
  console.log("Build complete → dist/");
  console.log(`  fingerprinted ${stats.length} assets, rewrote ${rewrites} HTML references`);
  console.log(`  minified ${(totFrom / 1024).toFixed(1)} KiB → ${(totTo / 1024).toFixed(1)} KiB (${Math.round((1 - totTo / totFrom) * 100)}% smaller)`);
  console.log("  immutable 1-year caching set for /assets in dist/vercel.json");
}

main().catch((err) => { console.error(err); process.exit(1); });
