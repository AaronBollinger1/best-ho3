# BestHO3 — Value-Add Integrations Roadmap

Internal decision document. Every recommendation below has **step-by-step
implementation** (for this exact static-HTML + Vercel-serverless stack) and a
**pros / cons** list. Third-party pricing/ToS facts were web-verified with an
adversarial fact-check pass; where a fact could not be confirmed it is marked
UNVERIFIED. No invented statistics — figures are the vendor's own or the site's
sanctioned $350/sq ft starting point.

## Stack facts these instructions rely on (bestho3-specific, verified)
- Fully static HTML + a few Vercel serverless functions (`api/*.js`, Node ESM).
  No framework/build step/database. Email via Resend (`api/submit-ho.js`).
- `vercel.json` has **`cleanUrls: true`** → a new `foo.html` is served at `/foo`
  automatically. **No vercel.json edit needed for new pages.**
- The wizard section anchor is **`#quote`** (`<section id="quote">`); the lazy
  loader in `index.html` mounts the wizard on hash `#quote`, on click of any
  `/#quote` link, and after idle. **Use `/#quote`, never `/#wizard`.**
- The wizard (`assets/ho-wizard.js`) has **no autosave/localStorage** today.
  Any "prefill the wizard from a public tool" step therefore requires ALSO
  adding a small `sessionStorage` read at wizard `init()` — noted where relevant.
- Rebuild cost is a flat `COST_PER_SQFT = 350 × living-area` in `calcIndication()`.
- New public pages should be built from the **guide-page template pattern**
  (`coverage.html`: nav + `.container-narrow.prose` + `.info-box` + CTA band +
  footer) — bestho3 has no `cost-estimator.html` scaffold to fork.
- E&O rule (binding): the site may not invent statistics, premiums, statutes, or
  $/% figures; only the sanctioned set (see `docs/content-spec.md`). Public tools
  must show the user's own math, the vendor's attributed figure, or the
  broker-verified ~$350/sq ft starting point — nothing else.

---

## Prioritized roadmap (value-for-effort order)

| # | Recommendation | Public / Wizard | Effort | Cost | Priority |
|---|----------------|-----------------|--------|------|----------|
| 1 | Cloudflare Web Analytics | Public (site-wide) | S | Free | **P0** |
| 2 | Coverage-A replacement-cost estimator (public) | Public (+opt. prefill) | S–M | Free | **P0** |
| 3 | Wildfire / home-hardening readiness scorer | Public | M | Free | **P0** |
| 4 | Deductible / out-of-pocket calculator | Public (+ wizard) | S | Free | P1 |
| 5 | "Which policy form am I?" quiz | Public → wizard | S–M | Free | P1 |
| 6 | Cal.com "book a call" embed | Both | S | Free | P1 |
| 7 | Public address hazard lookup (FEMA + CAL FIRE + USGS) | Both | M | Free | P1 |
| 8 | Address autocomplete (Geoapify / Google / Smarty) | Both | S–M | Free → $ | P1 |
| 9 | County-assessor / ArcGIS property prefill | Both | M–L | Free | P1 |
| 10 | Replacement-cost heuristic upgrade (wizard) | Wizard | S | Free | P2 |
| 11 | e2Value Pronto internal RC spot-check | Wizard (internal) | S | $ | P2 |
| 12 | Vercel Blob client uploads (docs/photos) | Wizard | M | $ (Pro) | P2 |
| 13 | Realie.ai property prefill (paid, contingent) | Wizard | M | Free → $ | P2 |
| 14 | Glossary search / curated testimonials / Crisp chat | Public | S | Free | P2 |
| 15 | Twilio SMS (A2P 10DLC) | Wizard / back-office | L | $ + compliance | P2 |
| 16 | USPS/CASS standardization (server-side) | Wizard (server) | M | Free | P2 |

Two cross-cutting cautions: (a) Vercel's in-memory rate limiter is per-instance,
best-effort — **not** a spend cap on a paid upstream, so any public feature that
hits a *paid* API needs a hard quota + cache; public features here use free
government data to avoid this. (b) Vercel edge caches only GET/HEAD, not POST —
cache server-side (keyed by rounded coords), don't rely on `s-maxage` on a POST.

---

## P0 — 1. Cloudflare Web Analytics
**What / where:** free, cookieless, hosted analytics; one `<script defer>` beacon
in every page `<head>`. Site-wide.
**Steps:**
1. Create a free Cloudflare account → add bestho3.com as an *analytics-only* site
   (no DNS change; the standalone beacon works on Vercel-hosted sites).
2. Paste `<script defer src="https://static.cloudflareinsights.com/beacon.min.js"
   data-cf-beacon='{"token":"..."}'></script>` into each page `<head>`.
3. When a CSP is added later, allow `static.cloudflareinsights.com` +
   `cloudflareinsights.com` in `script-src`/`connect-src`.
4. Fallback: none needed — deferred, non-blocking.
**Pros:** genuinely free on all plans; no cookies → no consent banner, keeps the
no-cookie posture; zero server work; finally makes wizard drop-off measurable.
**Cons:** coarse funnel depth; for step-level funnels later, graduate to
Plausible ($9/mo, no free tier) or self-host.
**Cost/E&O:** free; no figures shown → no E&O surface.

## P0 — 2. Coverage-A replacement-cost estimator (public)
**What / where:** new public page `replacement-cost-estimator.html` (served at
`/replacement-cost-estimator`). Interactive version of the $350/sq ft method.
**Steps:**
1. New page from the `coverage.html` template pattern (nav, `.container-narrow
   .prose`, `.info-box`, CTA band, footer, `app.js`).
2. Body logic: `livingArea (sqft) × 350` → render a **single** Coverage-A figure
   (no ± band — a band manufactures an unsanctioned range). Label it "a
   broker-verified starting point, not an appraisal."
3. Add `InsuranceAgency` + `BreadcrumbList` + `FAQPage` JSON-LD; canonical to the
   new slug; add to the homepage guide index + sitemap.xml + llms.txt.
4. CTA → `<a href="/#quote">` (fires the wizard loader).
5. *(Optional prefill)* to carry sqft into the wizard: write it to
   `sessionStorage` here AND add a one-line read at `ho-wizard.js` `init()` that
   restores it into `state.total_living_area`. Best-effort; skip if not worth the
   coupling.
6. Fallback: pure client-side, nothing to fail.
**Pros:** ~1 day; no vendor/key/PII; reuses the one sanctioned number; strong SEO
+ direct funnel to the wizard.
**Cons:** only as accurate as the flat $350 (see #10); optional prefill couples to
the wizard's field name.
**Cost/E&O:** free; E&O-clean only with the single figure + "not an appraisal"
label (do NOT import any %-rate or premium table).

## P0 — 3. Wildfire / home-hardening readiness scorer
**What / where:** new public page; user answers yes/no on mitigation measures →
score from *their own answers* + tailored next steps linking the hardening guides.
The strongest CA lead magnet on this list.
**Steps:**
1. New static page, same chrome/JSON-LD pattern as #2.
2. Checklist of the 12 "Safer from Wildfires" measures in 3 categories (community
   / defensible space / home hardening), attributed to CDI / CAL FIRE / Board of
   Forestry (Cal. Ins. Code §2644.9).
3. Sanctioned phrasing: "may qualify you for the wildfire-mitigation discounts
   California requires admitted insurers to offer" — **with attribution, no
   percentage.**
4. Zone 0: describe as "the 0–5 ft ember-resistant zone"; do not assert final
   rule text (BOF rule still in draft as of 2026). Vents: "ember-/fire-resistant"
   (no mesh spec).
5. Score = count of checked measures → qualitative band + "discuss with your
   broker" CTA → `/#quote`; deep-link the relevant hardening guides.
6. Fallback: client-side only.
**Pros:** free, evergreen SEO, highly shareable, targets CA homeowners' #1 pain
(wildfire/non-renewal); figure-free.
**Cons:** content-discipline heavy (attribute every measure, never quote a
discount %); revisit when BOF adopts the final Zone-0 rule.
**Cost/E&O:** free; safe as long as scoring uses the user's answers, measures are
attributed, and no discount % / final-rule claim appears.

## P1 — 4. Deductible / out-of-pocket calculator
**What / where:** small public page (also embeddable in the wizard). Pure
arithmetic on the user's inputs.
**Steps:** new page; inputs = Coverage-A value + deductible ($ or %); output =
`value × pct`. No premium, no "savings," no carrier figure. CTA → `/#quote`.
**Pros:** airtight E&O (echoes the user's own math); trivial; relevant to CA
wind/wildfire % deductibles.
**Cons:** low standalone SEO — bundle with #2/#3.
**Cost/E&O:** free; clean provided no premium/savings figure appears.

## P1 — 5. "Which policy form am I?" quiz
**What / where:** public educational quiz (HO-3 vs HO-5 vs HO-6/renter vs DP-3) →
routes to the right guide or the wizard.
**Steps:** new page; branch on plain-English questions; explain each form; route
landlords to plain `/#quote` (do NOT promise a DP-3 deep-link unless/until an
entry param is added to `ho-wizard.js` — today the DP-3 branch is reached by the
in-wizard "rental" route card, not a URL param). Figure-free.
**Pros:** educational, E&O-clean, good top-of-funnel; pre-qualifies landlord/DP-3
leads.
**Cons:** DP-3 deep-link is an overclaim until the wizard supports an entry param.
**Cost/E&O:** free; clean.

## P1 — 6. Cal.com "book a call" embed
**What / where:** client-side embed on public pages + optionally the wizard's
final step. No secret, no serverless.
**Steps:** free Cal.com account (1 user, unlimited event types/bookings) → paste
the embed snippet → add the embed host to CSP when CSP lands → keep a plain
phone/`mailto:` link as fallback.
**Pros:** free, client-side, converts "not ready to quote" visitors into booked
calls.
**Cons:** free tier shows Cal.com branding (removing needs Teams $15/user/mo).
**Cost/E&O:** free (branded); booking is a visitor-initiated action → no E&O
surface.

## P1 — 7. Public address hazard lookup (FEMA + CAL FIRE + USGS)
**What / where:** public "check your address risk" page backed by ONE serverless
proxy (`api/hazard.js`, mirrors `api/submit-ho.js`) fanning out to free
government endpoints. Also an internal wizard brush signal.
**Steps:**
1. `api/hazard.js`: POST `{address}` (address in **body, never URL**). Geocode
   server-side via the free **U.S. Census geocoder** (`onelineaddress`, no key)
   → `{x,y}`.
2. `Promise.allSettled` fan-out (verified live):
   - **FEMA NFHL layer 28** → `FLD_ZONE`, `SFHA_TF`, `ZONE_SUBTY` (public domain).
   - **CAL FIRE FHSZ** FeatureServer → `FHSZ_Description` (**CC BY 3.0 —
     attribution mandatory**; hardcode "Source: CAL FIRE FRAP/OSFM").
   - **USGS** ASCE7-16 design ground motion via
     `/ws/building-codes/asce7-16/calculate` (the old `/ws/designmaps/*.json`
     301-redirects) + USGS FDSN quake catalog.
3. Send a browser-like `User-Agent` + `Accept: application/json` (CA state hosts
   WAF-block non-browser UAs). Degrade per-hazard if one source fails.
4. Cache server-side (Upstash Redis via Vercel Marketplace — "Vercel KV" is
   deprecated) keyed by **rounded coords/geohash**, never the raw address.
5. CGS liquefaction/landslide layers: unverified (draft path 500'd) — ship
   without them first; add after confirming live endpoints.
6. Fallback: on total failure show "we couldn't retrieve hazard data — your
   broker will review it" and still route to `/#quote`.
**Pros:** all-free government data, genuinely differentiating, strong SEO/lead
magnet; same-origin proxy (no third-party `connect-src`); flood+fire+seismic in
one view.
**Cons:** third-party-hosted ArcGIS has no SLA (URLs drift) → cache aggressively;
CGS paths unverified; maintenance when endpoints move.
**Cost/E&O:** free (+ negligible Upstash). Show the **agency's own attributed
figure** (FHSZ class, FEMA zone, USGS PGA) with source + date + link + non-binding
disclaimer. In the wizard, use only as an internal signal — never as a price,
never altering the $350/sq ft indication.

## P1 — 8. Address autocomplete (Geoapify primary; Google / Smarty alts)
**What / where:** type-ahead replacing the manual `risk_address/city/county/
state/zip` fields; progressive enhancement (manual fields still submit on
failure).
**Steps:**
1. **Geoapify (primary, free):** browser key restricted by HTTP referrer; on
   select, parse into the five fields. Commercial use OK **with attribution**;
   caching/storage permitted; 3,000 credits/day free, no card.
2. **Google Places Autocomplete (New) + Address Validation (wizard alt):**
   referrer-restricted browser key (works with the site's referrer policy, no
   proxy). The user-selected address is exempt from content restrictions →
   legally storable on the ACORD 80; attribution required when no map shown.
   Autocomplete effectively free at broker volume; Validation ≈ $17/1k beyond
   free caps (card required).
3. **Smarty (alt, best US accuracy):** hostname-allowlisted website key; embedded
   keys blocked from public-cloud IPs so use a secret key in a function; ~$20/mo,
   no permanent free tier. **Insurance-lead ToS UNVERIFIED — confirm before use.**
4. Pass the selected address to the wizard via `sessionStorage`/`postMessage`,
   **never a URL query string** (PII rule).
5. Fallback: the five manual fields remain and submit if the widget fails.
**Pros:** Geoapify truly free/storable/privacy-friendly/no-card; big UX + data-
quality win; county auto-filled for the ACORD 80.
**Cons:** Geoapify lower US rooftop precision; Google needs a card + per-SKU
billing; **Smarty insurance ToS unverified.** Mapbox excluded (can't store temp
geocodes; permanent $5/1k, no free tier); Radar excluded (30-day cache limit vs
ACORD persistence).
**Cost/E&O:** Geoapify free; Google free→$; Smarty ~$20/mo. Widget shows only a
standardized address + county — no scores/premiums/figures.

## P1 — 9. County-assessor / ArcGIS property prefill
**What / where:** free public "look up your home" + zero-cost wizard prefill using
public county assessor ArcGIS open-data endpoints (public record → no insurance-
use ToS problem).
**Steps:**
1. `api/parcel.js` (or client-side for open endpoints): query the county ArcGIS
   FeatureServer by parsed address. Verified example — Orange County:
   `https://www.ocgis.com/arcpub/rest/services/Map_Layers/Parcels/MapServer/0`
   exposes `YEAR_BUILT`, `NBR_BEDROOMS`, `SITE_ADDRESS` (no sqft/roof/stories).
2. Prefill only the fields the county returns; leave the rest to the applicant.
   Gate `calcIndication()` on **user-confirmed** sqft before applying $350.
3. Start with the 3–5 highest-volume CA counties; expand per-county.
4. Fallback: manual entry (already the default) on no match.
**Pros:** free, public record → no ToS/E&O exposure; safe zero-cost wizard
fallback for big counties.
**Cons:** per-county integration (58-county fragmentation is the real cost); thin
fields (often no sqft/roof) → partial prefill only; coverage gaps.
**Cost/E&O:** free; clean (public record, user confirms before it feeds the
indication).

## P2 — 10. Replacement-cost heuristic upgrade (wizard)
**What / where:** upgrade `calcIndication()` from flat $350 to
`base × quality × story × region_index × sqft`, each factor shown.
**Steps:** edit `ho-wizard.js` `calcIndication()`; derive multipliers from citable
sources (RSMeans City Cost Index — real, quarterly; and/or Craftsman National
Building Cost Estimator, $69.75 one-time). **Do not republish proprietary index
values**; use broker-derived rounded multipliers and attribute methodology
("reflects local construction-cost indices"). Fall back to flat $350 if a factor
is missing.
**Pros:** far more credible than a flat number; still client-side/free (+ optional
$69.75); every factor visible.
**Cons:** multipliers must be broker-derived + documented; keep the *public*
estimator (#2) a single figure — this multiplier version is wizard-only (broker
reviews before binding).
**Cost/E&O:** free (+ optional $69.75); keep the non-binding disclaimer; attribute
methodology, don't quote proprietary values.

## P2 — 11. e2Value Pronto (internal RC spot-check)
**What / where:** no code — broker runs Pronto in its own login as a pre-bind RC
check and types the vetted Coverage A into the wizard/ACORD 80.
**Steps:** subscribe directly (independent agency — no carrier relationship
required; ask for the Big "I" member discount); address-only input → RC + sqft +
construction + photos; broker verifies and enters the number. Heuristic (#10)
stays the automated default.
**Pros:** best *real* RC tool a solo broker can obtain; zero code; best E&O
posture (human-verified before binding); no carrier gate.
**Cons:** pricing quote-only (UNVERIFIED); manual step (not automated).
**Cost/E&O:** $ subscription; E&O-strong (licensed professional verifies).

## P2 — 12. Vercel Blob client uploads (docs/photos)
**What / where:** let applicants upload dec pages / roof photos via
`@vercel/blob/client` `upload()` with a short-lived token from a `handleUpload`
route. Wizard.
**Steps:** add a server route that mints the client token (secret stays
server-side); client uploads direct to Blob (no data-transfer charge); reuse
`submit-ho.js` patterns (`rateLimit`, `sanitize`, `escapeHtml`, Resend). Fall
back to a Resend email attachment if Blob fails.
**Pros:** no new vendor, PII stays in-house (clean ToS story); documented pattern;
$0.023/GB-mo storage.
**Cons:** not free — a licensed brokerage is commercial → needs **Vercel Pro
($20/mo)**; handle uploaded PII carefully.
**Cost/E&O:** in the Pro plan + overages; standard PII/retention care.

## P2 — 13. Realie.ai property prefill (paid, contingent)
**What / where:** automated wizard prefill of every underwriting field via REST
through a serverless proxy. **Contingent on two pre-launch confirmations.**
**Steps:** `api/prefill.js` (mirrors `submit-ho.js`): POST `{address}` in body;
key in env; hash the address, never log raw PII; map the schema (`yearBuilt`,
`buildingArea`, `constructionType`, `roofType`, `stories`, `pool`, …) into wizard
fields. **Blocking pre-launch:** (i) confirm insurance-use + consumer-redisplay
ToS (UNVERIFIED); (ii) obtain the construction/roof decode key (codes are single
letters with no published table). Add a hard daily quota + short-TTL cache
(caching third-party data may itself be ToS-restricted — resolve in the same
email). Fallback: county ArcGIS (#9), then manual.
**Pros:** self-serve REST; covers every wizard field; free tier exists, paid from
$50/mo.
**Cons:** two unresolved dependencies (ToS + decode key); paid upstream needs a
hard cap; FCRA caution (never an eligibility factor).
**Cost/E&O:** free → $ (from $50/mo); prefill is a convenience, never an
eligibility determination; user confirms all fields.

## P2 — 14. Glossary search / curated testimonials / Crisp chat (bundle)
**What / where:** low-effort public trust/engagement items.
**Steps:** (a) make the existing glossary searchable/filterable (client-side); (b)
add a manually curated testimonials section (with permission) OR a plain link to
the Google Business Profile — **do NOT fetch+cache Google reviews** (Places API
policy forbids caching); (c) optional Crisp free 2-seat chat (add script + CSP
host). All degrade to static content.
**Pros:** glossary + curated testimonials are free, S-effort, zero ToS/E&O.
**Cons:** Crisp sets cookies (breaks the no-cookie posture, needs consent),
external script/CSP surface, only pays off if staffed; Trustpilot free has no star
widget.
**Cost/E&O:** glossary/testimonials free; Crisp free (2 seats); no figure E&O.

## P2 — 15. Twilio SMS (A2P 10DLC)
**What / where:** transactional/quote-status texts; ship last (most compliance).
**Steps:** register a sole-prop A2P 10DLC brand + campaign; serverless send route
(secret in env); capture **TCPA prior express consent** in the wizard; email
(Resend) stays primary.
**Pros:** high-engagement channel; A2P attainable for a sole prop.
**Cons:** $4 brand + $15 campaign + ~$2/mo + per-msg surcharges; throughput caps;
carriers block unregistered traffic; TCPA exposure.
**Cost/E&O:** $ + compliance; any texted indication must be the sanctioned
non-binding figure, explicitly labeled — never a firm premium.

## P2 — 16. USPS/CASS standardization (server-side)
**What / where:** optional server-side USPS standardization before writing the
ACORD 80. Not autocomplete.
**Steps:** `api/usps.js` proxy (secret required — cannot be client-side); USPS
Addresses API v3 (OAuth2 client-credentials, validation only); run once per
completed quote; fall back to the entered address.
**Pros:** free with a USPS business account; authoritative standardization.
**Cons:** not autocomplete; server-only; **USPS API access delayed to Aug 1
2026** — Google Address Validation or Smarty US Verify (#8) do the same sooner.
**Cost/E&O:** free; no figure E&O surface.

---

## Start here — first three to build
1. **Cloudflare Web Analytics (#1).** Free, cookieless, one line. Build first
   because you can't judge the ROI of anything below while flying blind.
2. **Coverage-A estimator (#2), single figure.** Best buildable-now public tool:
   no vendor/key/PII, reuses the one sanctioned number, funnels to `/#quote`.
3. **Wildfire readiness scorer (#3).** Free, targets CA homeowners' top anxiety,
   strongest organic lead magnet; scores from the user's own answers → E&O-clean.

Together: high value, zero vendor cost, no ToS landmines, all on the current
stack. Best *next* step is the one serverless proxy that unlocks #7 (hazard
lookup) and #9 (county prefill).

## Avoid / not worth it
- **ATTOM / Estated** — Estated deprecating into ATTOM; ATTOM self-serve is
  evaluation-only (24-hr cache cap + redistribution ban). Real data = paid
  negotiated license.
- **CoreLogic/Cotality RCT & Verisk 360Value** — carrier/enterprise-gated; agents
  get 360Value "on applications, not quotes." Out of reach.
- **Cape Analytics / ZestyAI / First Street** — carrier/MGA relationships; showing
  a vendor risk score to the public is an E&O landmine.
- **Loqate, HouseCanary, Datafiniti, LightBox, Trustpilot free** — enterprise/
  contact-sales or wrong-market; none fit a small residential-HO broker.
- **Mapbox / Radar for a persisted address** — storage limits collide with
  writing the address to the ACORD 80.
- **Caching Google reviews to static HTML** — direct Places API ToS breach; use a
  GBP link or curated testimonials.
- **"Vercel KV" / POST edge-caching / the in-memory rate limiter as a spend cap**
  — KV deprecated (use Upstash); edge caches only GET/HEAD; the rate-limit Map is
  best-effort, not a cost cap.
