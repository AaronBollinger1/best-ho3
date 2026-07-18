# BestHO3.com — launch checklist

Site state as of 2026-07-17: 63 content pages + homepage wizard + signed ACORD 80
flow, all verified statically (link graph, titles/metas/canonicals, E&O figure
sweep, ACORD 80 field-name check 131/131, wizard↔API payload parity, 16
underwriting questions bound 17/17 including q_owner).

## One-time setup (Aaron)

1. **Create the GitHub repo** (none exists yet — checked best-ho3 / bestho3 /
   best-homeowners-insurance): create empty repo `AaronBollinger1/best-ho3`
   (no README/license — the local repo already has content), then:
   ```
   cd C:\Users\aaron\Downloads\_bho3
   git remote add origin https://github.com/AaronBollinger1/best-ho3.git
   git push -u origin main
   ```
2. **Vercel project**: import the repo. `vercel.json` already sets cleanUrls,
   security headers, /quote redirects, and includeFiles for the ACORD 80 PDF.
3. **Environment**: set `RESEND_API_KEY` in the Vercel project (production).
   Missing key = handlers return 500, not fake-success (by design).
4. **Resend**: verify `bestho3.com` as a sending domain; submissions go to
   quotes@bollinsure.com with CC to the applicant.
5. **Domain**: point bestho3.com / www.bestho3.com at the Vercel project.
   Canonicals use https://www.bestho3.com.

## Pre-launch verification (needs Node, not available on the build machine)

```
npm install
npm test              # scripts/smoke-ho-application.mjs — fills a sample ACORD 80
npm run test:fields   # scripts/verify-acord80-fieldmap.mjs — field-name check
```

Then one real end-to-end submission on the deployed preview:
- Complete the wizard (try landlord path once → confirm DP-3 routing note),
- Sign (typed + drawn), submit,
- Confirm the filled PDF renders in Adobe Reader (XFA-stripped AcroForm — values
  should be visible; this was the failure mode caught on the ACORD 130 job),
- Confirm the email arrives at quotes@bollinsure.com with the signed PDF + audit
  page, and the applicant CC arrives.

## Post-launch

- Submit https://www.bestho3.com/sitemap.xml in Search Console (64 URLs).
- Spot-check mobile nav + wizard on a phone.
- The homepage hero SVG shows an illustrative indication range ($650,000 /
  $2,400–$3,700) — decorative, matches wizard math style; revisit if E&O
  preference changes.

## Content rules (for future pages)

docs/content-spec.md is binding: template skeleton, approved link list, and the
E&O rules — only sanctioned house figures ($350/sq ft starting point, HO-5
10–20%, 20–40% carrier spread, B 10% / C 50–70% / D 20–30% of A, E
$100k/$300k/$500k, F $1k/$5k, deductibles $1,000–$10,000, roofs >20 years, CLUE
5–7 years, ERC 25–50%, umbrella $1M+ "a few hundred a year"). No statutes, no
invented statistics, wildfire IS covered on HO-3/FAIR, EQ + flood are NOT,
rentals → DP-3, condos → HO-6, indications are never quotes.
