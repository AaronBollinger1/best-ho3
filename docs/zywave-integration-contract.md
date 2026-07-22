# BestHO3 ↔ Zywave integration contract

Status: provider-neutral boundary implemented; Zywave adapter pending contracted documentation and sandbox access.

## Product rule

The public BestHO3 application may display a modeled **preliminary estimate** immediately. It may display a **carrier quote** only when that result is returned by an authorized carrier-connected rating workflow. Referred, declined, incomplete, and errored results remain distinct states.

## Security boundary

The browser never calls Zywave directly and never receives Zywave credentials. The flow is:

1. BestHO3 validates and persists the applicant's authorized submission.
2. A server-side quote orchestrator converts the canonical BestHO3 application to the provider-neutral envelope in `api/lib/personal-lines-quote-provider.js`.
3. A Zywave adapter translates that envelope to the contracted request schema.
4. The adapter handles authentication, idempotency, rate limiting, retries, polling or webhooks, and raw response retention.
5. Only normalized result fields reach the public comparison interface.

## Documentation required before implementing the adapter

- Authentication and credential rotation
- Sandbox and production base URLs
- Homeowners request schema and required California fields
- Carrier/appointment eligibility behavior
- Synchronous versus asynchronous response rules
- Polling limits and webhook signing
- Quote, referral, decline, and validation-error schemas
- Carrier identifiers and display-name permissions
- Coverage, deductible, endorsement, and exclusion fields
- Bridge/bind URL behavior and allowed redirect hosts
- Rate limits, retry guidance, idempotency support, and timeouts
- Data retention, logging, audit, and deletion requirements

## Existing canonical contract

`buildQuoteEnvelope()` currently normalizes the existing BestHO3/ACORD intake into:

- applicant identity and contact
- risk address and property characteristics
- requested coverage and deductible
- effective date
- recent losses
- form and occupancy pathway

This contract deliberately contains no guessed Zywave field names. The future adapter owns that translation so the BestHO3 UI and ACORD generation do not become coupled to a vendor-specific schema.

## Result states

| State | Public treatment |
| --- | --- |
| `quoted` | Carrier name, annual premium, normalized coverage and deductible; link only through an approved HTTPS bridge |
| `referred` | "Underwriter review required" with next-action timing |
| `declined` | Neutral unavailability message; internal reason retained for broker review when permitted |
| `error` | Retry or broker-review fallback; never presented as a decline |

## Go-live gate

Before enabling carrier-connected results, run contract fixtures against the Zywave sandbox, confirm the California homeowners carrier panel and appointment requirements, complete a privacy/security review, and have the licensed brokerage approve every public result label and fallback.
