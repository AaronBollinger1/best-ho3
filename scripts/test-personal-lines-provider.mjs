import assert from "node:assert/strict";
import {
  QUOTE_CONTRACT_VERSION,
  buildQuoteEnvelope,
  normalizeQuoteResults,
  registerLine,
  requestProviderQuotes,
  validateQuoteEnvelope
} from "../api/lib/personal-lines-quote-provider.js";

assert.equal(QUOTE_CONTRACT_VERSION, "bestbrands.quote.v1");

const payload = {
  fields: {
    policy_form: "HO3",
    pathway: "owner",
    applicant_full_name: "Test Applicant",
    applicant_email: "applicant@example.com",
    risk_address: "123 Test Canyon Road",
    risk_city: "Los Angeles",
    risk_county: "Los Angeles",
    risk_state: "ca",
    risk_zip: "90049",
    year_built: "1968",
    total_living_area: "1,850",
    dwelling_limit: "$650,000",
    deductible: "$2,500"
  }
};

const envelope = buildQuoteEnvelope(payload);
assert.equal(envelope.contractVersion, QUOTE_CONTRACT_VERSION);
assert.equal(envelope.application.risk.state, "CA");
assert.equal(envelope.application.risk.livingArea, 1850);
assert.equal(envelope.application.coverage.dwelling, 650000);
assert.deepEqual(validateQuoteEnvelope(envelope), { valid: true, errors: [] });

const unavailable = await requestProviderQuotes(payload);
assert.equal(unavailable.ok, false);
assert.equal(unavailable.status, "provider_configuration_required");

let received;
const quoted = await requestProviderQuotes(payload, {
  async quote(request) {
    received = request;
    return {
      providerRequestId: "sandbox-123",
      status: "complete",
      results: [
        { carrierId: "carrier-a", carrierName: "Test Carrier", status: "quoted", annualPremium: "2450", dwelling: "650000", deductible: "2500", bridgeUrl: "https://example.com/bridge" },
        { carrierId: "carrier-b", carrierName: "Referral Market", status: "referred", message: "Underwriter review required" }
      ]
    };
  }
});

assert.equal(received.application.risk.postalCode, "90049");
assert.equal(quoted.ok, true);
assert.equal(quoted.results[0].annualPremium, 2450);
assert.equal(quoted.results[1].annualPremium, 0);
assert.equal(quoted.results[1].status, "referred");

const unsafe = normalizeQuoteResults({ results: [{ status: "quoted", bridgeUrl: "javascript:alert(1)" }] });
assert.equal(unsafe.results[0].bridgeUrl, "");

// A SECOND line can be registered and validated independently of homeowners.
registerLine("auto", {
  build(fields) {
    return {
      vehicle: { vin: fields.vin, year: Number(fields.vehicle_year) || 0 },
      coverage: { bodilyInjury: Number(fields.bodily_injury_limit) || 0 }
    };
  },
  validate(application) {
    const errors = [];
    if (!application.applicant || !application.applicant.fullName) errors.push("applicant.fullName");
    if (!application.vehicle || !application.vehicle.vin) errors.push("vehicle.vin");
    return errors;
  }
});

const autoPayload = {
  line: "auto",
  fields: { applicant_full_name: "Auto Applicant", vin: "1HGCM82633A004352", vehicle_year: "2019", bodily_injury_limit: "100000" }
};
const autoEnvelope = buildQuoteEnvelope(autoPayload);
assert.equal(autoEnvelope.contractVersion, QUOTE_CONTRACT_VERSION);
assert.equal(autoEnvelope.line, "auto");
assert.equal(autoEnvelope.application.vehicle.vin, "1HGCM82633A004352");
assert.equal(autoEnvelope.application.applicant.fullName, "Auto Applicant");
// The auto line validates on its OWN required fields, not homeowners' risk fields.
assert.deepEqual(validateQuoteEnvelope(autoEnvelope), { valid: true, errors: [] });
const autoMissingVin = buildQuoteEnvelope({ line: "auto", fields: { applicant_full_name: "Auto Applicant" } });
const autoMissingVinResult = validateQuoteEnvelope(autoMissingVin);
assert.equal(autoMissingVinResult.valid, false);
assert.deepEqual(autoMissingVinResult.errors, ["vehicle.vin"]);

// An unregistered line is rejected with a "line" error.
assert.deepEqual(validateQuoteEnvelope(buildQuoteEnvelope({ line: "spaceship", fields: {} })), { valid: false, errors: ["line"] });

console.log("personal-lines provider contract: OK");
