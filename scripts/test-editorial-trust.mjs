import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const trustPages = [
  "research",
  "about",
  "editorial-standards",
  "review-methodology",
  "corrections",
  "aaron-bollinger"
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function count(text, fragment) {
  return text.split(fragment).length - 1;
}

for (const slug of trustPages) {
  const html = read(`${slug}.html`);
  assert.equal(count(html, "<h1"), 1, `${slug} must have one h1`);
  assert.match(html, new RegExp(`<link rel="canonical" href="https://www\\.bestho3\\.com/${slug}">`));
  assert.match(html, /Part of Best Insurance Research/);
  assert.match(html, /Bollinsure Insurance Services/);
  assert.match(html, /CA DOI #6013787|CA DOI Lic\. #6013787/);
  assert.match(html, /\/editorial-standards/);
  assert.match(html, /\/corrections/);
  assert.match(html, /window\.PAGE_SEO/);
}

const publicHtml = fs.readdirSync(ROOT)
  .filter((name) => name.endsWith(".html"))
  .filter((name) => !["404.html", "apply.html", "privacy.html", "terms.html"].includes(name));

let articleCount = 0;
for (const name of publicHtml) {
  const html = read(name);
  assert.equal(count(html, 'class="research-mark"'), 1, `${name} research mark`);
  assert.match(html, /\/editorial-standards/, `${name} standards link`);
  assert.match(html, /\/review-methodology/, `${name} methodology link`);
  assert.match(html, /\/corrections/, `${name} corrections link`);

  if (/<meta\s+property="og:type"\s+content="article">/i.test(html) && !trustPages.includes(name.replace(/\.html$/, ""))) {
    articleCount++;
    assert.equal(count(html, 'class="editorial-trust"'), 1, `${name} editorial trust panel`);
    assert.equal(count(html, '<meta name="author" content="Aaron Bollinger">'), 1, `${name} author metadata`);
  }
}

assert.ok(articleCount >= 60, `expected at least 60 guide articles, found ${articleCount}`);

const sitemap = read("sitemap.xml");
for (const slug of trustPages) {
  assert.match(sitemap, new RegExp(`https://www\\.bestho3\\.com/${slug}`), `sitemap ${slug}`);
}

assert.match(read("robots.txt"), /User-agent: OAI-SearchBot\s+Allow: \//);
assert.match(read("llms.txt"), /Best Insurance Research/);
assert.match(read("llms-full.txt"), /BestHO3 — Full Reference/);
assert.match(read("assets/seo.js"), /"reviewedBy"/);
assert.match(read("assets/seo.js"), /"publisher"/);

console.log(`Editorial trust checks passed for ${publicHtml.length} public pages and ${articleCount} guide articles.`);
