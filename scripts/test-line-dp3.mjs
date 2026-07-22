/* test-line-dp3.mjs — proves a NEW line (DP-3 / dwelling-fire) plugs into the
   shared personal-lines quote contract via registerLine() alone, with NO edits
   to api/lib/personal-lines-quote-provider.js. Run: npm run test:dp3 (also
   chained from the main smoke test). */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = process.cwd();
const provider = await import(pathToFileURL(path.join(root, "api", "lib", "personal-lines-quote-provider.js")).href);
const { buildQuoteEnvelope, validateQuoteEnvelope, LINE_SCHEMAS, QUOTE_CONTRACT_VERSION } = provider;

// Before importing the DP-3 line, the contract must NOT know it.
assert.ok(!LINE_SCHEMAS["dwelling-fire"], "dwelling-fire not registered before import");

// Importing the line module registers it via the public extension point only.
await import(pathToFileURL(path.join(root, "api", "lib", "lines", "dp3.js")).href);
assert.ok(LINE_SCHEMAS["dwelling-fire"], "dwelling-fire registered after import");

const payload = {
  line: "dwelling-fire",
  fields: {
    applicant_full_name: "Rental Owner LLC",
    applicant_email: "owner@example.com",
    applicant_phone: "310-555-0100",
    policy_form: "DP3",
    pathway: "landlord",
    risk_address: "88 Rental Row",
    risk_city: "Sacramento",
    risk_county: "Sacramento",
    risk_state: "CA",
    risk_zip: "95814",
    occupancy: "tenant",
    rental_type: "single-family",
    unit_count: "1",
    year_built: "1994",
    total_living_area: "1600",
    construction_type: "frame",
    roof_material: "comp",
    dwelling_limit: "480000",
    deductible: "2500",
    personal_liability_limit: "300000",
    fair_rental_value: "36000",
    effective_date: "2026-09-01"
  },
  lossRows: [{ date: "05/2024", description: "Tenant kitchen fire", amount: "12000" }]
};

const envelope = buildQuoteEnvelope(payload);
assert.equal(envelope.contractVersion, QUOTE_CONTRACT_VERSION, "reuses the shared transport version");
assert.equal(envelope.line, "dwelling-fire", "resolved to the DP-3 line");
assert.equal(envelope.application.applicant.fullName, "Rental Owner LLC", "shared applicant block reused");
assert.equal(envelope.application.form, "DP3");
assert.equal(envelope.application.risk.rentalType, "single-family", "line-specific field carried");
assert.equal(envelope.application.coverage.fairRentalValue, 36000, "DP-3 loss-of-rents carried");
assert.equal(envelope.application.losses.length, 1);

const result = validateQuoteEnvelope(envelope);
assert.ok(result.valid, "valid DP-3 envelope: " + JSON.stringify(result.errors));

// A malformed DP-3 application is rejected by the line's own validators.
const bad = buildQuoteEnvelope({ line: "dwelling-fire", fields: { risk_state: "1", risk_zip: "9" } });
const badResult = validateQuoteEnvelope(bad);
assert.ok(!badResult.valid, "malformed DP-3 rejected");
assert.ok(
  badResult.errors.includes("applicant.fullName") &&
  badResult.errors.includes("risk.state") &&
  badResult.errors.includes("risk.postalCode"),
  "reports field errors: " + JSON.stringify(badResult.errors)
);

// The original homeowners line still works — no regression from adding DP-3.
const ho = buildQuoteEnvelope({ line: "homeowners", fields: { applicant_full_name: "H O", risk_address: "1 A St", risk_city: "LA", risk_state: "CA", risk_zip: "90001" } });
assert.ok(validateQuoteEnvelope(ho).valid, "homeowners line unaffected");

console.log("DP-3 line contract: OK (registered via registerLine, shared provider unedited)");
