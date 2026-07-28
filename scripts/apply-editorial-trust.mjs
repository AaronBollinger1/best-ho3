import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXCLUDED = new Set([
  "404.html",
  "apply.html",
  "privacy.html",
  "terms.html",
  "research.html",
  "about.html",
  "editorial-standards.html",
  "review-methodology.html",
  "corrections.html",
  "aaron-bollinger.html"
]);

const researchMark = '        <span class="research-mark">Part of Best Insurance Research</span>\n';
const policyLinks = '<span class="footer-policy-links"><a href="/about">About</a> · <a href="/editorial-standards">Editorial standards</a> · <a href="/review-methodology">Methodology</a> · <a href="/corrections">Corrections</a> · <a href="/privacy">Privacy &amp; CCPA notice</a> · <a href="/terms">Terms of use</a></span>';
const editorialTrust = `
<div class="container-narrow">
  <aside class="editorial-trust" aria-label="Editorial review information">
    <span class="editorial-avatar" aria-hidden="true">AB</span>
    <span><strong>Broker-reviewed insurance research</strong>Editorial lead: <a href="/aaron-bollinger">Aaron Bollinger</a> · Insurance review: Bollinsure Insurance Services, CA DOI #6013787</span>
    <a href="/editorial-standards">How we research →</a>
  </aside>
</div>
`;

function htmlFiles(dir) {
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(".html") && !EXCLUDED.has(name))
    .sort();
}

let changed = 0;
let articleTrust = 0;

for (const name of htmlFiles(ROOT)) {
  const file = path.join(ROOT, name);
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  if (!html.includes('name="author"')) {
    html = html.replace("</head>", '  <meta name="author" content="Aaron Bollinger">\n</head>');
  }

  if (html.includes('<div class="footer-brand">') && !html.includes('class="research-mark"')) {
    html = html.replace('<div class="footer-brand">\n', `<div class="footer-brand">\n${researchMark}`);
  }

  html = html.replace(
    /<span><a href="\/privacy">Privacy &amp; CCPA notice<\/a> · <a href="\/terms">Terms of use<\/a><\/span>/g,
    policyLinks
  );

  const isArticle = /<meta\s+property="og:type"\s+content="article">/i.test(html);
  if (isArticle && !html.includes('class="editorial-trust"')) {
    if (html.includes("<!-- ARTICLE BODY -->")) {
      html = html.replace("<!-- ARTICLE BODY -->", `${editorialTrust}\n<!-- ARTICLE BODY -->`);
      articleTrust++;
    } else {
      const articleStart = html.search(/<article\b/i);
      if (articleStart !== -1) {
        html = html.slice(0, articleStart) + editorialTrust + "\n" + html.slice(articleStart);
        articleTrust++;
      }
    }
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    changed++;
  }
}

console.log(`Updated ${changed} existing HTML pages; added ${articleTrust} article trust panels.`);
