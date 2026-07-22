# best-ho3
The one stop shop for homeowners insurance in California. It offers application intake for specialty markets and real data based indications, as well as info on property underwriting. 

## Best Brands blueprint

The reusable page, motion, storytelling, and quality-assurance conventions are documented in [`docs/best-brands-blueprint.md`](docs/best-brands-blueprint.md). Brand typography, colors, imagery, and copy stay site-specific; the interaction grammar and conversion structure are portable.

## Application workspace

`/apply` is the dedicated product surface for the existing seven-step intake, live preliminary indication, ACORD 80 review/signature flow, progress status, and privacy-limited device draft. The homepage retains its embedded intake as a compatible fallback.

Carrier-connected quoting is isolated behind the provider-neutral contract in `api/lib/personal-lines-quote-provider.js`. The Zywave adapter is intentionally pending contracted documentation and sandbox access; implementation requirements are tracked in [`docs/zywave-integration-contract.md`](docs/zywave-integration-contract.md).
