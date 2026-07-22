/* =============================================================
   BestInsurance — chassis sync  (node scripts/sync-chassis.mjs <target-repo> [--dry])
   -------------------------------------------------------------
   The BestInsurance platform runs one repo + Vercel project per line
   (best-ho3, best-dp3, best-os, …). The SHARED chassis — the
   line-neutral CSS/JS/API/tests — must stay identical across every
   line, or fixes made in one repo drift away from the others.

   best-ho3 is the canonical chassis. This script copies the shared
   files (CHASSIS below) from here into another line's repo, and
   NEVER touches that line's per-line files (its brand.js, theme.css,
   index/apply/content pages, favicons, manifest, api/lib/lines/*,
   vercel.json, package.json). Run it after any chassis change:

     node scripts/sync-chassis.mjs ../best-dp3            # apply
     node scripts/sync-chassis.mjs ../best-dp3 --dry      # preview

   A file listed here is, by definition, not allowed to contain a
   line-specific literal — that is what makes it safe to overwrite.
   ============================================================= */
import fs from "node:fs";
import path from "node:path";

const CHASSIS = [
  // Shared front-end runtime (token-driven; palette comes from each line's theme.css)
  "assets/styles.css",
  "assets/motion.css",
  "assets/apply.css",
  "assets/app.js",
  "assets/apply.js",
  "assets/seo.js",
  "assets/ho-wizard.js",
  "assets/ho-review-signing.js",
  "assets/vendor/pdfjs/pdf.min.js",
  "assets/vendor/pdfjs/pdf.worker.min.js",
  // Shared serverless API + hardening + quote contract (per-line schemas live in api/lib/lines/)
  "api/ho-application.js",
  "api/submit-ho.js",
  "api/lib/request-guard.js",
  "api/lib/personal-lines-quote-provider.js",
  "api/acord-80-homeowner-application.pdf",
  // Shared build + test tooling
  "scripts/build.mjs",
  "scripts/sync-chassis.mjs",
  "scripts/smoke-ho-application.mjs",
  "scripts/verify-acord80-fieldmap.mjs",
  "scripts/test-request-guard.mjs",
  "scripts/test-personal-lines-provider.mjs"
];

const target = process.argv[2];
const dry = process.argv.includes("--dry");
if (!target) {
  console.error("Usage: node scripts/sync-chassis.mjs <target-repo-dir> [--dry]");
  process.exit(1);
}
const SRC = process.cwd();
const DST = path.resolve(target);
if (!fs.existsSync(DST)) { console.error("Target does not exist: " + DST); process.exit(1); }
if (path.resolve(SRC) === DST) { console.error("Refusing to sync a repo into itself."); process.exit(1); }

let copied = 0, missing = 0, unchanged = 0;
for (const rel of CHASSIS) {
  const from = path.join(SRC, rel);
  if (!fs.existsSync(from)) { console.warn("  ! source missing (skipped): " + rel); missing++; continue; }
  const to = path.join(DST, rel);
  const same = fs.existsSync(to) && fs.readFileSync(from).equals(fs.readFileSync(to));
  if (same) { unchanged++; continue; }
  if (dry) { console.log("  would update: " + rel); copied++; continue; }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log("  synced: " + rel);
  copied++;
}
console.log(`\n${dry ? "[dry] " : ""}chassis sync ${SRC} -> ${DST}`);
console.log(`  ${copied} ${dry ? "to update" : "updated"}, ${unchanged} already current, ${missing} missing.`);
console.log("  per-line files (brand.js, theme.css, index/apply/content, favicons, api/lib/lines/*, vercel.json, package.json) left untouched.");
