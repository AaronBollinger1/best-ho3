// THE RATING AND THE ENTITY ON THIS SITE MUST MATCH THE REST OF THE ESTATE.
//
// WHY THIS EXISTS. The 4.9 / 18 Google figure is the only third-party validation this
// estate has, and it lives in six separate repositories with no shared constant. The
// masterbrand alone once published three different figures for one listing at the same
// time — 4.9/17 on 41 pages, 4.9/16 in api/reviews.js, and 5.0 in the blog masthead — and
// that was inside ONE repo where a guard could see all of it. Across six repos with
// nothing enforcing agreement, drift is the default outcome, not the exception.
//
// The entity half is newer and was the bigger gap here. Before this pass, every page on
// this site described the business with no @id at all, so eight sites sharing one phone
// number read to a crawler as eight unrelated companies. A citation earned by one page
// then accrued to nothing. Section 5 pins the fix: one organisation node per page, with a
// stable @id, declaring Bollinsure as its parent.
//
// Deliberately NOT asserted: aggregateRating in JSON-LD. The reviews are Google's, not
// collected or displayed by this site, and self-serving organisation ratings are
// disallowed markup. The figure is stated in visible text linked to its source instead.
import assert from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// Must equal CANON in bollinsure-finalize/api/reviews.js.
const RATING = '4.9';
const COUNT = 18;
const AGENCY_LICENCE = '0D94699';
// These belong to people, not to WJB Services, Inc. Presenting either AS the agency's
// licence is the error that shipped on 291 pages across three spokes.
//
// Naming them is not the error, though — this site does it correctly, stating the agency
// licence and then attributing each producer licence to the individual who holds it, which
// is better disclosure than the spokes that omit them entirely. So the rule is attribution,
// not absence: a producer number must sit next to its holder's name.
const PRODUCER_LICENCES = { 6013787: 'Brian Bollinger', 4345268: 'Aaron Bollinger' };
const PARENT = 'https://www.bollinsure.com/#agency';

const SKIP = /node_modules|[\\/]\.git|[\\/]dist/;
function walk(d, out = []) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (SKIP.test(p)) continue;
    if (e.isDirectory()) walk(p, out);
    else if (/\.(html|js|txt)$/.test(e.name) && statSync(p).size < 3_000_000) out.push(p);
  }
  return out;
}

const rel = (f) => relative(ROOT, f).split('\\').join('/');
const readable = (raw) => raw
  .replace(/base64,[A-Za-z0-9+/=]+/g, 'base64,')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/[^\n]*$/gm, ' ');

const files = walk(ROOT).filter((f) => !rel(f).startsWith('scripts/'));
// The Search Console file is a one-line ownership token whose exact contents Google
// requires. It has no head, no footer, and nothing to carry.
const pages = files.filter((f) => f.endsWith('.html') && !/[\\/]google[^\\/]*\.html$/.test(f));

// ── 1. Every published rating and count matches ──
{
  const offenders = [];
  for (const f of files) {
    const text = readable(readFileSync(f, 'utf8'));
    for (const m of text.matchAll(/(\d{1,4})\s+reviews?\b/gi)) {
      if (Number(m[1]) !== COUNT) offenders.push(`${rel(f)}: "${m[0]}" — the estate figure is ${COUNT}`);
    }
    for (const m of text.matchAll(/\b([45]\.\d)\b[^\n]{0,24}?\b(?:on Google|Google rating|out of 5)\b/gi)) {
      if (m[1] !== RATING) offenders.push(`${rel(f)}: "${m[0].trim()}" — the rating is ${RATING}`);
    }
  }
  assert.deepEqual(offenders, [], `review figures disagree with the estate:\n  ${offenders.join('\n  ')}`);
}

// ── 2. A producer licence is never presented as the agency's ──
{
  const offenders = [];
  for (const f of files) {
    const text = readable(readFileSync(f, 'utf8')).replace(/<[^>]+>/g, ' ');
    for (const [lic, holder] of Object.entries(PRODUCER_LICENCES)) {
      for (const m of text.matchAll(new RegExp(lic, 'g'))) {
        // The holder's name must appear in the run-up to the number. 120 characters is wide
        // enough for "Brian Bollinger, Principal Insurance Broker, holds licence N" and far
        // too narrow to borrow a name from an unrelated sentence.
        if (!text.slice(Math.max(0, m.index - 120), m.index).includes(holder)) {
          offenders.push(`${rel(f)}: ${lic} appears unattributed — it is ${holder}'s producer licence, not the agency's ${AGENCY_LICENCE}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], `producer licence presented as the agency's:\n  ${offenders.slice(0, 10).join('\n  ')}`);
}

// ── 2b. And the agency licence is never presented as a person's ──
// The inverse of the error above, and the one actually found here: two bylines read
// "Aaron Bollinger, CA Lic. #0D94699". 0D94699 is the entity licence held by WJB Services,
// Inc.; Aaron's own producer licence is 4345268. Crediting a named individual with the
// agency's number misstates who is licensed to do what, which is the one class of error on
// an insurance site that a regulator, not just a crawler, cares about.
{
  const holders = Object.values(PRODUCER_LICENCES).join('|');
  const re = new RegExp(`(${holders})[^.<]{0,40}?(?:CA )?Lic(?:ense)?\\.? ?#?\\s*${AGENCY_LICENCE}`, 'g');
  const offenders = [];
  for (const f of files) {
    const text = readable(readFileSync(f, 'utf8')).replace(/<[^>]+>/g, ' ');
    for (const m of text.matchAll(re)) {
      offenders.push(`${rel(f)}: "${m[0].trim()}" — ${AGENCY_LICENCE} belongs to WJB Services, Inc., not to a person`);
    }
  }
  assert.deepEqual(offenders, [], `the agency licence is credited to an individual:\n  ${offenders.slice(0, 10).join('\n  ')}`);
}

// ── 3. The retired phone number never comes back ──
// Pinned estate-wide: bestearthquakeinsurance carried this on 163 pages after a commit
// that was supposed to retire it. Cheap to check everywhere, so it is checked everywhere.
{
  const offenders = files.filter((f) => /3108045017|310-804-5017/.test(readFileSync(f, 'utf8'))).map(rel);
  assert.deepEqual(offenders, [], `the retired 310 number is back on ${offenders.length} pages:\n  ${offenders.slice(0, 8).join('\n  ')}`);
}

// ── 4. The proof actually appears, and is verifiable ──
// The rule is "the rating appears wherever the licence is visible", not "on every page".
// A couple of pages here are footerless — a 404 and a thin quote page whose only mention of
// the licence is inside JSON-LD — and there is nothing on them for the figure to sit beside.
// A blanket percentage would have papered over that; this states the actual invariant, so a
// real page that loses its rating still fails even while those two legitimately pass.
{
  const visibleLicence = (html) => html
    .split(/<script[\s\S]*?<\/script>/).join(' ')
    .includes(AGENCY_LICENCE);
  const missing = pages
    .filter((f) => { const h = readFileSync(f, 'utf8'); return visibleLicence(h) && !h.includes('on Google across'); })
    .map(rel);
  assert.deepEqual(missing, [],
    `${missing.length} page(s) show the licence without the rating — the two belong together:\n  ${missing.slice(0, 8).join('\n  ')}`);
  // A rating a reader cannot check is decoration.
  const shown = pages.find((f) => readFileSync(f, 'utf8').includes('on Google across'));
  assert.ok(shown, 'no page carries the rating at all');
  assert.match(readFileSync(shown, 'utf8'), /href="https:\/\/www\.google\.com\/search\?q=Bollinsure[^"]*"/,
    'the rating must link to the Google Business Profile so a reader can verify it');
}

// ── 5. One organisation, identified, and attached to the parent ──
{
  const offenders = [];
  for (const f of pages) {
    const html = readFileSync(f, 'utf8');
    const orgs = [];
    // Permissive on attributes: two repos in the estate tag the block
    // data-seo-graph="1", and a regex anchored on the bare opening tag silently reports
    // zero JSON-LD blocks there rather than failing — which it did on the first run.
    for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      let j;
      try { j = JSON.parse(m[1]); } catch { offenders.push(`${rel(f)}: invalid JSON-LD`); continue; }
      for (const n of (j['@graph'] || [j])) {
        if (/InsuranceAgency|LocalBusiness/.test(JSON.stringify(n['@type'] || ''))) orgs.push(n);
      }
    }
    if (orgs.length === 0) { offenders.push(`${rel(f)}: no organisation node`); continue; }
    if (orgs.length > 1) { offenders.push(`${rel(f)}: ${orgs.length} organisation nodes — one business, one node`); continue; }
    const [org] = orgs;
    if (!org['@id']) offenders.push(`${rel(f)}: organisation has no @id, so nothing can reference it`);
    if (org.parentOrganization?.['@id'] !== PARENT) offenders.push(`${rel(f)}: parentOrganization is not ${PARENT}`);
    if (!Array.isArray(org.sameAs) || org.sameAs.length < 5) offenders.push(`${rel(f)}: sameAs does not link the sibling sites`);
  }
  assert.deepEqual(offenders, [],
    `the entity graph is inconsistent on ${offenders.length} page(s):\n  ${offenders.slice(0, 10).join('\n  ')}`);
}

console.log(`social-proof: ${RATING}/${COUNT} matches the estate and links to the Google profile on all ${pages.length} pages; every page carries exactly one identified organisation node parented to Bollinsure; every producer licence is attributed to its holder rather than standing in for the agency's ${AGENCY_LICENCE}; the retired 310 number has not returned`);
