// assets/seo.js builds the JSON-LD graph in the browser and appends it at runtime.
// That works for Google, which renders. It does not work for the crawlers that
// increasingly decide whether this business gets named in an answer: GPTBot,
// ClaudeBot, OAI-SearchBot and PerplexityBot fetch raw HTML and do not execute
// JavaScript. Measured on 2026-08-01, www.bestho3.com served ZERO
// application/ld+json blocks in its response body across all 67 URLs.
//
// This runs the same graph in Node at build time and writes it into each page, so
// the markup exists at rest. seo.js already no-ops when it finds a
// [data-seo-graph] script (see its inject()), so the runtime path stays as a
// fallback for anything this misses rather than double-writing.
//
// Deliberately not a second copy of the graph: the values live in seo.js and are
// read out of it, so the two cannot drift. A duplicated literal here is exactly
// how "+1-562-COVWELL" survived a fix that touched 200 other files.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://www.bestho3.com";

// Pull OPERATOR straight out of seo.js rather than restating it.
const seoSrc = fs.readFileSync(path.join(ROOT, "assets/seo.js"), "utf8");
const opMatch = seoSrc.match(/var OPERATOR = (\{[\s\S]*?\n {2}\});/);
if (!opMatch) { console.error("bake-seo: could not read OPERATOR from assets/seo.js"); process.exit(1); }
// The literal uses unquoted keys and // comments, so evaluate it rather than JSON.parse.
const OPERATOR = new Function(`return ${opMatch[1]}`)();

for (const [k, v] of Object.entries({ telephone: /^\+\d{7,15}$/, license: /^[0-9][A-Z0-9]{5,7}$/ })) {
  if (!v.test(OPERATOR[k])) { console.error(`bake-seo: OPERATOR.${k} = ${OPERATOR[k]} fails ${v}`); process.exit(1); }
}

const agency = {
  "@type": "InsuranceAgency",
  "@id": `${SITE}/#organization`,
  name: OPERATOR.name,
  legalName: OPERATOR.legalName,
  url: `${SITE}/`,
  telephone: OPERATOR.telephone,
  email: OPERATOR.email,
  areaServed: OPERATOR.areaServed,
  hasCredential: {
    "@type": "EducationalOccupationalCredential",
    name: "California Department of Insurance Agency License",
    credentialCategory: "License",
    recognizedBy: { "@type": "Organization", name: "California Department of Insurance" },
    identifier: OPERATOR.license,
  },
  parentOrganization: { "@id": OPERATOR.parentId },
  address: {
    "@type": "PostalAddress",
    streetAddress: OPERATOR.street,
    addressLocality: OPERATOR.locality,
    addressRegion: OPERATOR.region,
    postalCode: OPERATOR.postalCode,
    addressCountry: "US",
  },
};

const walk = (d, a = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if ([ "node_modules", ".git", "assets", "scripts", "api", "docs" ].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, a);
    else if (e.name.endsWith(".html")) a.push(p);
  }
  return a;
};

const titleOf = (h) => (h.match(/<title>([^<]*)<\/title>/i) || [, ""])[1].trim();
const descOf = (h) => (h.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [, ""])[1].trim();
const canonOf = (h, rel) => (h.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i) || [, ""])[1].trim()
  || `${SITE}/${rel.replace(/index\.html$/, "").replace(/\.html$/, "")}`.replace(/\/+$/, "/");

let written = 0, skipped = 0;
for (const f of walk(ROOT)) {
  let html = fs.readFileSync(f, "utf8");
  const rel = path.relative(ROOT, f).split(path.sep).join("/");
  if (!/<\/head>/i.test(html)) { skipped++; continue; }

  const canonical = canonOf(html, rel);
  const graph = [
    agency,
    { "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: "BestHO3", publisher: { "@id": agency["@id"] } },
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: titleOf(html),
      ...(descOf(html) ? { description: descOf(html) } : {}),
      isPartOf: { "@id": `${SITE}/#website` },
      about: { "@id": agency["@id"] },
    },
  ];
  const block = `<script type="application/ld+json" data-seo-graph="1">${
    JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;

  html = /data-seo-graph/.test(html)
    ? html.replace(/<script type="application\/ld\+json" data-seo-graph="1">[\s\S]*?<\/script>/, block)
    : html.replace(/<\/head>/i, `${block}\n</head>`);

  fs.writeFileSync(f, html);
  written++;
}

console.log(`bake-seo: wrote JSON-LD into ${written} pages (${skipped} skipped, no <head>)`);
