# best-ho3
The one stop shop for homeowners insurance in California. It offers application intake for specialty markets and real data based indications, as well as info on property underwriting. 

## Best Brands blueprint

The reusable page, motion, storytelling, and quality-assurance conventions are documented in [`docs/best-brands-blueprint.md`](docs/best-brands-blueprint.md). Brand typography, colors, imagery, and copy stay site-specific; the interaction grammar and conversion structure are portable.

## Best Insurance Research trust layer

BestHO3 is the pilot for the reusable Best Insurance Research editorial layer:

- `/research`, `/about`, `/editorial-standards`, `/review-methodology`,
  `/corrections`, and `/aaron-bollinger` make ownership, funding, sourcing,
  review, and correction practices crawlable.
- `assets/seo.js` publishes the licensed operator, editorial lead, publisher,
  author, and reviewer relationships in one JSON-LD graph.
- `scripts/generate-editorial-pages.mjs` owns the static trust pages, while
  `scripts/apply-editorial-trust.mjs` applies the shared research mark,
  editorial panel, author metadata, and trust links to the existing library.
- `npm run content:editorial` regenerates the layer idempotently.
- `robots.txt` explicitly allows OAI-SearchBot for ChatGPT search discovery;
  `llms.txt` and `llms-full.txt` summarize the same relationships and
  limitations without replacing the canonical HTML.

Do not describe the publication as independent of Bollinsure. Bollinsure is an
independent broker because it accesses multiple markets; BestHO3 is
broker-owned and discloses that relationship.

## Application workspace

`/apply` is the dedicated product surface for the existing seven-step intake, live preliminary indication, ACORD 80 review/signature flow, progress status, and privacy-limited device draft. The homepage retains its embedded intake as a compatible fallback.

Carrier-connected quoting is isolated behind the provider-neutral contract in `api/lib/personal-lines-quote-provider.js`. The Zywave adapter is intentionally pending contracted documentation and sandbox access; implementation requirements are tracked in [`docs/zywave-integration-contract.md`](docs/zywave-integration-contract.md).
