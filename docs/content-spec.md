# BestHO3 content spec — read fully before writing any page

You are writing guide pages for bestho3.com, an independent California homeowners
insurance brokerage site (WJB Services, Inc. dba Bollinsure Insurance Services,
CA DOI Lic. #6013787, licensed in all 50 states). Audience: California homeowners;
content must be CA-tailored but generally accurate nationwide.

## Non-negotiable structure

Copy the skeleton of `C:\Users\aaron\Downloads\_bho3\coverage.html` EXACTLY:
same `<head>` pattern (fonts, `/assets/styles.css`), same nav block, same
breadcrumb pattern, same article header (`kicker` + `h1.section-title` + `.lead`
+ the "Updated July 2026 · N min read · Reviewed by a licensed broker, CA DOI
Lic. #6013787" line), same mid-article CTA band, same "Keep reading" related
block, same `.cta-section`, same footer (verbatim, including the two disclaimer
paragraphs and the `CA DOI Lic. #6013787 · Independent Broker · Licensed in all
50 states` bottom line), and `<script src="/assets/app.js" defer></script>`
before `</body>`.

Per page you must set uniquely: `<title>… | BestHO3</title>` (≤65 chars before
the pipe), meta description (140–160 chars), `<link rel="canonical"
href="https://www.bestho3.com/SLUG">`, og:title/og:description/og:url
(og:type article), breadcrumb trail, and the body content between the article
header and the "Keep reading" block.

Files are written to `C:\Users\aaron\Downloads\_bho3\SLUG.html`. Internal links
are ABSOLUTE PATHS WITHOUT .html (e.g. `/coverage`, `/ho3-vs-ho5`) — Vercel
cleanUrls handles the rest.

## Body requirements

- 900–1,600 words of substantive prose (pillar page: 2,200+; glossary: ~55 short
  entries; region pages: 800–1,100).
- h2 headings styled exactly like the template:
  `<h2 style="font-family:var(--font-display);font-size:1.5rem;margin:34px 0 14px;color:var(--text)">…</h2>`
- Use `.ho-table` (inside `<div style="overflow-x:auto">`) for any comparison,
  `.info-box` / `.info-box.accent` for callouts (`<h4>` + `<p>`).
- ≥5 internal links from the approved list below, naturally placed, plus the
  mid-article CTA band linking `/#quote`.
- End with 2–4 `<h3>` FAQ entries before the "Keep reading" block.
- Plain-English broker voice. Confident, concrete, zero filler ("In today's
  world…" is banned). Short paragraphs. Explain the WHY behind underwriting.

## E&O rules (violations are shippable-blocking)

1. NEVER invent statistics, average premiums, statutes, deadlines, or dollar
   figures. No "the average California premium is $X". No named-statute claims
   (no "Prop 103 requires…", no "CC §2071 says…"). Qualitative is fine
   ("carriers commonly…", "often", "typically").
2. The ONLY sanctioned house figures (use verbatim when relevant): the wizard's
   ~$350/sq ft starting suggestion for rebuild cost (always described as a
   starting point the broker verifies); HO-5 "typically 10–20% more premium";
   "identical homes priced 20–40% apart by carrier"; Coverage B "typically 10%
   of A"; Coverage C "50–70% of A"; Coverage D "20–30% of A or a time limit";
   liability options "$100k/$300k/$500k"; deductible options "$1,000–$10,000";
   "roofs over 20 years old" as the carrier-scrutiny threshold; CLUE lookback
   "5–7 years".
3. Truths that must never be contradicted: wildfire/fire IS a covered peril on
   HO-3 and the FAIR Plan; earthquake and flood are NOT covered by homeowners
   policies; the FAIR Plan is fire-lines-only and pairs with a DIC policy;
   rentals belong on DP-3, condos on HO-6; indications on this site are NOT
   quotes; coverage is always subject to carrier underwriting.
4. Never promise coverage, savings, or placement. Never disparage a named
   carrier. Never give legal or tax advice ("talk to your broker" instead).
5. Company facts: independent brokerage; no broker fee on standard homeowners
   placements (carrier pays commission); quotes@bollinsure.com / 310-804-5017;
   CA DOI Lic. #6013787; licensed in all 50 states. Do NOT mention any
   surplus-lines license number.
6. HO-5 upsell: where genuinely relevant, mention the HO-5 comprehensive form
   and link `https://www.bestho5.com` (target="_blank" rel="noopener") as our
   sister specialty site. Landlord/investor content routes to `/landlord-dp3`.

## Approved link targets (the ONLY internal hrefs allowed)

/, /#quote, /coverage, /california-homeowners-insurance, /ho3-vs-ho5,
/landlord-dp3, /cost, /california-fair-plan, /carriers, /faq, /glossary,
/coverage-a-dwelling, /coverage-b-other-structures, /coverage-c-personal-property,
/coverage-d-loss-of-use, /personal-liability-coverage-e, /medical-payments-coverage-f,
/deductibles, /replacement-cost-vs-actual-cash-value, /extended-replacement-cost,
/what-is-an-ho3-policy, /ho3-vs-ho6-condo, /ho3-vs-dp3, /open-perils-vs-named-perils,
/scheduled-personal-property, /umbrella-insurance,
/california-wildfire-insurance, /safer-from-wildfires-discounts, /fair-plan-plus-dic,
/california-insurance-crisis, /earthquake-insurance-california,
/flood-insurance-california, /wildfire-mitigation-checklist, /california-home-hardening,
/roof-types-and-insurance, /roof-age, /knob-and-tube-wiring, /aluminum-wiring,
/electrical-panels-insurance, /galvanized-and-polybutylene-plumbing,
/swimming-pool-insurance, /dog-breeds-and-liability, /home-security-discounts,
/older-homes-insurance,
/first-time-home-buyer, /switching-home-insurance, /non-renewal-what-to-do,
/vacant-home-insurance, /seasonal-second-home, /short-term-rental-airbnb,
/home-business-insurance, /new-construction-insurance,
/how-to-file-a-claim, /home-insurance-inspection, /how-much-dwelling-coverage,
/lower-your-premium, /escrow-and-lenders,
/los-angeles, /san-diego, /orange-county, /san-francisco-bay-area, /sacramento,
/inland-empire, /central-valley, /central-coast

External allowed: https://www.bestho5.com (only), tel:3108045017,
mailto:quotes@bollinsure.com. NOTHING else — no .gov/.org citations, no other
sites.

## Per-page briefs

- **california-homeowners-insurance** — THE pillar (2,200+ words). Sections: how a
  CA policy is built (A–F, link each), HO-3 vs HO-5 vs DP-3 vs HO-6, what's
  excluded (EQ/flood), the wildfire market reality + FAIR+DIC, what drives cost
  (8 levers), how to buy through an independent broker (the wizard flow: answer
  → indication → signed ACORD 80 → market sweep), claims basics, when to
  remarket. Heavy interlinking (15+ links).
- **faq** — 18–22 questions grouped by theme (buying, coverage, wildfire/FAIR,
  cost, claims, landlord/forms). Reuse homepage FAQ themes but expand; each
  answer 60–120 words with a link.
- **ho3-vs-ho5** — the decision page. Comparison table, contents RCV vs ACV,
  who each form suits, premium delta (10–20%), strong BestHO5.com routing.
- **landlord-dp3** — DP-3 explained for landlords: fair rental value, premises
  liability, tenant vs vacant, umbrella pairing, why HO-3 misrepresentation
  voids claims; wizard routes automatically.
- **cost** — the 8 levers expanded, deductible strategy, why carrier choice is
  the biggest controllable, indication → real quote pipeline.
- **california-fair-plan** — what it is (insurer of last resort, fire lines),
  what it covers/doesn't, who ends up there, how DIC completes it, how to exit
  back to admitted when appetite returns.
- **carriers** — the CA homeowners market by segment: preferred/standard
  admitted, high-value (Chubb, PURE, AIG Private Client, Cincinnati, Nationwide
  Private Client), specialty/E&S, FAIR Plan. What "admitted vs non-admitted"
  means, why appetite shifts quarterly. Neutral tone, no rankings.
- **coverage-a-dwelling** — rebuild vs market value, $/sq ft reality, extended
  replacement cost, ordinance/law, underinsurance after wildfires.
- **coverage-b-other-structures** — 10% default, ADU boom implications, fences
  after wind/fire, when to raise it.
- **coverage-c-personal-property** — named perils on HO-3, sub-limits (jewelry,
  cash, firearms — qualitative), RCV endorsement, home inventory how-to,
  worldwide coverage.
- **coverage-d-loss-of-use** — ALE, fair rental value, CA wildfire displacement
  reality, time limits vs dollar limits, receipts discipline.
- **personal-liability-coverage-e** — what it defends/pays, dog/pool/trampoline
  exposures, why $300k floor, umbrella hand-off.
- **medical-payments-coverage-f** — no-fault guest medical, why it exists,
  $1k/$5k options, how it prevents suits.
- **deductibles** — flat vs percentage (wildfire/wind %, where they appear),
  choosing $1k–$10k, claim-frequency strategy (don't file small).
- **replacement-cost-vs-actual-cash-value** — the depreciation math in words,
  roof ACV schedules on older homes, contents RCV endorsement, reading the dec
  page.
- **extended-replacement-cost** — 25–50% cushions, demand surge after fires,
  guaranteed replacement rarity, code upgrade pairing.
- **what-is-an-ho3-policy** — "special form" explained, open vs named perils
  split, history of the forms (brief), what the dec page lines mean.
- **ho3-vs-ho6-condo** — walls-in vs master policy, HOA docs, loss assessment
  coverage, when a townhouse is HO-3.
- **ho3-vs-dp3** — occupancy is the divider; DP-3 differences (no contents by
  default, fair rental value, liability optional), landlord routing.
- **open-perils-vs-named-perils** — with concrete claim examples that fall in
  the gap (contents damaged by something not on the 16-peril list).
- **scheduled-personal-property** — sub-limits problem, agreed value, no
  deductible, appraisals, jewelry/art/instruments/watches.
- **umbrella-insurance** — how it stacks over Coverage E, what $1M+ costs
  qualitatively ("a few hundred a year" allowed), underlying-limit requirements,
  who needs it (pool, dog, teen driver, landlord).
- **california-wildfire-insurance** — fire IS covered; the problem is appetite;
  brush mapping vs ZIP; hardening + Safer from Wildfires credits; FAIR+DIC path;
  rebuild-cost discipline.
- **safer-from-wildfires-discounts** — the framework qualitatively (structure
  hardening + defensible space + community programs earn credits), what
  improvements carriers recognize, documentation tips. NO specific percentage
  promises.
- **fair-plan-plus-dic** — the pairing mechanics: FAIR covers fire lines, DIC
  adds liability/water/theft/loss-of-use; one broker coordinates both; common
  gaps to check (limits matching, deductible interplay).
- **california-insurance-crisis** — sober market-conditions explainer: why
  carriers pulled back (wildfire losses, rebuild inflation, reinsurance costs),
  what's changing (rate adequacy, catastrophe modeling, mitigation credits),
  what a homeowner should DO (harden, document, shop via broker). No doom, no
  politics, no statute claims.
- **earthquake-insurance-california** — excluded from HO-3; CEA vs private
  markets qualitatively; deductible structure (percentage-based); why brokers
  quote it alongside homeowners.
- **flood-insurance-california** — excluded from HO-3; NFIP vs private;
  post-wildfire debris flow risk; lender requirements in flood zones.
- **wildfire-mitigation-checklist** — actionable checklist page: ember-resistant
  vents, Class A roof, defensible space zones, gutters, decks, documentation
  for carriers. Format as styled checklist sections.
- **california-home-hardening** — deeper companion: materials, retrofit order
  of operations, what inspectors photograph, insurance payoff framing.
- **roof-types-and-insurance** — comp shingle/tile/metal/shake/flat: carrier
  view of each, Class A ratings, shake problem in brush zones, re-roof payoff.
- **roof-age** — the 20-year threshold, ACV roof schedules, inspection photos,
  documenting a re-roof (permits), partial vs full replacement.
- **knob-and-tube-wiring** — what it is, why carriers care (no ground,
  insulation brittle, buried in attic insulation), disclosure duty, remediation
  path, which market segments accept it.
- **aluminum-wiring** — 1960s–70s branch wiring, pigtailing/COPALUM fixes,
  carrier requirements, disclosure.
- **electrical-panels-insurance** — fuse panels, and the problem panels carriers
  flag (Federal Pacific, Zinsco — describe the underwriting concern factually,
  no safety claims beyond "carriers commonly require replacement"), amperage,
  panel upgrade payoff.
- **galvanized-and-polybutylene-plumbing** — why old supply lines drive water
  losses, the most common CA claim; repipe payoff; water sensors/shutoff
  discounts.
- **swimming-pool-insurance** — liability exposure, fencing requirements,
  diving boards/slides, attractive nuisance concept, umbrella pairing.
- **dog-breeds-and-liability** — how carriers handle dogs (breed lists vs
  bite-history underwriting), disclosure, options when declined, umbrella.
  Neutral, factual, no breed-bashing.
- **home-security-discounts** — local vs central-station alarms, water shutoff
  devices, smart-home credits, deadbolts/extinguishers, stacking discounts.
- **older-homes-insurance** — pre-1950 underwriting: systems updates the
  application asks for (roof/heating/plumbing/electrical + years), "assume
  original unless updated", ordinance/law importance, market segments for
  unrenovated homes.
- **first-time-home-buyer** — timeline from offer to close: when to shop,
  escrow/lender requirements, what the application asks, binding before close,
  first-year budgeting.
- **switching-home-insurance** — when it pays to move, how to avoid lapses,
  cancellation refunds qualitatively, timing around renewals, loyalty myth.
- **non-renewal-what-to-do** — the playbook: read the notice, note the date,
  remarket admitted → E&S → FAIR+DIC, fix the stated reason (roof, brush),
  document everything. Calm, procedural.
- **vacant-home-insurance** — why vacancy changes everything (water/vandalism),
  vacant-dwelling policies, renovation vacancies, estate situations.
- **seasonal-second-home** — seasonal usage underwriting, freeze/water
  management, security requirements, pairing with primary-home carrier.
- **short-term-rental-airbnb** — occasional vs business-level hosting, why
  HO-3s balk, endorsement vs commercial-ish solutions qualitatively, DP-3 +
  STR considerations, disclosure duty.
- **home-business-insurance** — incidental office vs client traffic vs
  inventory; endorsements; when a BOP is the answer; liability gaps.
- **new-construction-insurance** — course of construction vs first HO-3, builder
  warranties vs insurance, new-home discounts, documenting finishes.
- **how-to-file-a-claim** — when to file vs eat it (frequency matters),
  documentation, mitigation duty, working the adjuster, CA fair-claims
  expectations qualitatively, broker's role.
- **home-insurance-inspection** — what exterior/interior inspections look for,
  photos to prep, common flags (roof, brush, panels, dogs), post-bind
  inspection cancellations and how to avoid them.
- **how-much-dwelling-coverage** — the rebuild-cost method, $/sq ft starting
  point (~$350 house figure), what inflates it (slopes, custom, code), extended
  RC cushion, annual review.
- **lower-your-premium** — deductible moves, hardening credits, alarm/water
  devices, bundling, claim discipline, remarketing cadence via broker.
- **escrow-and-lenders** — evidence of insurance for closing, lender-required
  coverages, escrow-paid premiums, force-placed insurance warning, timing.
- **Region pages** (los-angeles, san-diego, orange-county,
  san-francisco-bay-area, sacramento, inland-empire, central-valley,
  central-coast) — 800–1,100 words each: the area's characteristic risk mix
  (qualitative only — hillside/canyon brush, older housing stock, coastal wind,
  river flood exposure, EQ crossover as relevant), what carriers scrutinize
  there, FAIR-Plan prevalence qualitatively, hardening opportunities, CTA. NO
  invented city statistics, NO named neighborhoods with risk claims beyond
  common knowledge (canyon/hillside/WUI generalities fine).
- **glossary** — ~55 terms, each `<h3 id="term-slug">Term</h3>` + 40–90 word
  definition with internal link where natural. Cover: ACV, RCV, ALE, admitted,
  appetite, binder, brush zone, CLUE, coverage A–F, DIC, dec page, deductible,
  defensible space, dwelling fire, E&S, endorsement, escrow, exclusion,
  extended replacement cost, FAIR Plan, fire-resistive, force-placed, HO-3/4/5/6,
  DP-3, hard market, hazard insurance, home hardening, inspection, loss of use,
  loss run, named insured, named perils, non-admitted, non-renewal, open perils,
  ordinance or law, peril, premium, protection class, rebuild cost, remarketing,
  replacement cost, scheduled property, special form, sub-limit, surplus lines,
  umbrella, underwriting, vacancy, water backup, wildfire score, WUI.
