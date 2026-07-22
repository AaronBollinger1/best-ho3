import assert from "node:assert/strict";
import {
  QUOTE_CONTRACT_VERSION,
  buildQuoteEnvelope,
  normalizeQuoteResults,
  requestProviderQuotes,
  validateQuoteEnvelope
} from "../api/lib/personal-lines-quote-provider.js";

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

console.log("personal-lines provider contract: OK");
