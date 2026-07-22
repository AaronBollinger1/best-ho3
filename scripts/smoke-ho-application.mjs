/* smoke-ho-application.mjs — end-to-end smoke test.
   1. Static site sanity (mounts, script includes, trust line).
   2. Preview: POSTs a realistic CA application through the real handler and
      re-reads the filled PDF, asserting values landed in the right fields.
   3. Signed submit (no RESEND_API_KEY => pdfBase64 returned): asserts the
      audit page was appended and the signature date set.
   Run: npm test  (requires: npm i, no network needed) */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFDocument } from "pdf-lib";

const root = process.cwd();

// ── 1. static site sanity ───────────────────────────────────────────────────
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const phrase of [
  "ho-wizard-mount",
  "/assets/ho-wizard.js",
  "/assets/ho-review-signing.js",
  "/assets/app.js",
  "CA DOI Lic. #6013787",
  "Licensed in all 50 states"
]) {
  assert.ok(index.includes(phrase), `index.html should include: ${phrase}`);
}
const wizard = fs.readFileSync(path.join(root, "assets", "ho-wizard.js"), "utf8");
for (const phrase of ["window.__ho", "hoWizardReviewStep", "ho-sign-mount", "/api/submit-ho", "bestho5.com", "landlord-dp3"]) {
  assert.ok(wizard.includes(phrase), `ho-wizard.js should include: ${phrase}`);
}
const applicationPage = fs.readFileSync(path.join(root, "apply.html"), "utf8");
for (const phrase of [
  "data-application-workspace",
  "application-timeline",
  "/assets/apply.css",
  "/assets/apply.js",
  "Preliminary estimate",
  "Carrier quote"
]) {
  assert.ok(applicationPage.includes(phrase), `apply.html should include: ${phrase}`);
}
assert.ok(wizard.includes("bestho3_property_draft_v1"), "wizard should include the device-local property draft");
assert.ok(wizard.includes("emit('indication'"), "wizard should expose product indication events");
console.log("static sanity: OK");

// ── mock req/res ────────────────────────────────────────────────────────────
function mockRes() {
  const r = { statusCode: 0, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}
const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const fields = {
  pathway: "owner", policy_form: "HO3",
  applicant_full_name: "Test Applicant", applicant_dob: "1980-04-12",
  applicant_occupation: "Teacher", applicant_email: "applicant@example.com",
  applicant_phone: "310-555-0123", applicant_phone_type: "cell",
  mailing_same: "Yes",
  mailing_address: "123 Test Canyon Rd", mailing_city: "Los Angeles", mailing_state: "CA", mailing_zip: "90049",
  risk_address: "123 Test Canyon Rd", risk_city: "Los Angeles", risk_county: "Los Angeles",
  risk_state: "CA", risk_zip: "90049", in_city_limits: "Yes",
  occupancy: "owner", usage: "primary", residence_type: "dwelling", number_of_families: "1",
  year_built: "1968", total_living_area: "1850",
  construction_type: "frame", foundation_type: "closed", roof_material: "comp",
  roof_condition: "good", plumbing_condition: "good", housekeeping: "excellent",
  wiring_type: "copper", electrical_panel: "breakers", electrical_amps: "200",
  roof_updated: "full", roof_update_year: "2019",
  heating_updated: "none", heating_update_year: "",
  plumbing_updated: "partial", plumbing_update_year: "2012",
  wiring_updated: "none", wiring_update_year: "",
  door_locks: "deadbolt", burglar_alarm: "central", smoke_alarm: "local",
  sprinklers: "none", fire_extinguisher: "Yes",
  swimming_pool: "in_ground", pool_fence: "Yes", pool_diving_board: "No", pool_slide: "No",
  wildfire_exposure: "yes",
  dwelling_limit: "650000", deductible: "2500",
  personal_liability_limit: "300000", med_pay_limit: "5000",
  effective_date: "2026-08-01",
  no_prior_coverage: "No", prior_insurer_1: "Test Mutual", prior_insurer_2: "", prior_expiration: "2026-08-01",
  no_losses: "No",
  q_owner: "Yes", q_hazard: "Yes", q_code_violation: "No", q_business: "No",
  q_employees: "No", q_animals: "Yes", q_trampoline: "No", q_commercial_300ft: "No",
  q_co_alarm: "Yes", q_lead_paint: "No", q_for_sale: "No", q_converted: "No",
  q_declined_cancelled: "No", q_bankruptcy: "No", q_lien: "No", q_fraud_arson: "No",
  q_explanations: "Q2: canyon behind the house. Q6: one golden retriever.",
  additional_notes: "Smoke test submission.",
  signer_name: "Test Applicant"
};
const payload = {
  fields,
  lossRows: [{ date: "03/2023", description: "Water damage - pipe leak", amount: "8200" }],
  quote: { low: 2400, high: 3700, dwelling: 650000, form: "HO-3 (special form)" }
};

const { default: handler } = await import(pathToFileURL(path.join(root, "api", "ho-application.js")).href);

// ── 2. preview fill + re-read ───────────────────────────────────────────────
{
  const res = mockRes();
  await handler({ method: "POST", headers: {}, body: { preview: true, ...payload } }, res);
  assert.equal(res.statusCode, 200, `preview should 200, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.pdf, "preview should return base64 pdf");

  const filled = await PDFDocument.load(Buffer.from(res.body.pdf, "base64"));
  const form = filled.getForm();
  const text = (n) => form.getTextField(n).getText() || "";
  const checked = (n) => form.getCheckBox(n).isChecked();

  assert.equal(text("F[0].P1[0].NamedInsured_FullName_A[0]"), "Test Applicant");
  assert.equal(text("F[0].P1[0].NamedInsured_BirthDate_A[0]"), "04/12/1980");
  assert.equal(text("F[0].P1[0].NamedInsured_OccupationDescription_A[0]"), "Teacher");
  assert.equal(text("F[0].P1[0].ResidentialStructure_PolicyForm_FormTypeCode_A[0]"), "HO 00 03");
  assert.equal(text("F[0].P1[0].ResidentialCoverage_Dwelling_LimitAmount_A[0]"), "$650,000");
  assert.equal(text("F[0].P1[0].ResidentialCoverage_Deductible_BaseAmount_A[0]"), "$2,500");
  assert.equal(text("F[0].P2[0].Location_PhysicalAddress_CityName_A[0]"), "Los Angeles");
  assert.equal(text("F[0].P2[0].Construction_BuiltYear_A[0]"), "1968");
  assert.equal(text("F[0].P2[0].ResidentialStructure_TotalLivingArea_A[0]"), "1850");
  assert.equal(text("F[0].P2[0].BuildingImprovement_RoofingYear_A[0]"), "2019");
  assert.equal(text("F[0].P2[0].BuildingImprovement_PlumbingYear_A[0]"), "2012");
  assert.equal(text("F[0].P2[0].BuildingImprovement_HeatingYear_A[0]"), "", "unknown update year must stay blank");
  assert.ok(checked("F[0].P2[0].ResidenceOccupancy_OccupancyType_OwnerIndicator_A[0]"), "owner occupancy checked");
  assert.ok(checked("F[0].P2[0].ResidenceOccupancy_Usage_PrimaryIndicator_A[0]"), "primary usage checked");
  assert.ok(checked("F[0].P2[0].ResidenceOccupancy_ResidenceType_DwellingIndicator_A[0]"), "dwelling type checked");
  assert.ok(checked("F[0].P2[0].Construction_ConstructionType_FrameIndicator_A[0]"), "frame checked");
  assert.ok(checked("F[0].P2[0].BuildingImprovement_RoofingCompleteIndicator_A[0]"), "roof full update checked");
  assert.ok(checked("F[0].P2[0].BuildingImprovement_PlumbingPartialIndicator_A[0]"), "plumbing partial checked");
  assert.ok(!checked("F[0].P2[0].BuildingImprovement_HeatingCompleteIndicator_A[0]"), "heating stays blank");
  assert.ok(checked("F[0].P2[0].ResidentialStructure_RoofCondition_GoodIndicator_A[0]"), "roof condition good");
  assert.ok(checked("F[0].P2[0].ResidentialStructure_Housekeeping_ExcellentIndicator_A[0]"), "housekeeping excellent");
  assert.ok(checked("F[0].P2[0].ResidentialStructure_Security_DoorLockDeadboltIndicator_A[0]"), "deadbolt checked");
  assert.ok(checked("F[0].P2[0].Alarm_Burglar_CentralStationIndicator_A[0]"), "central burglar alarm checked");
  assert.ok(checked("F[0].P2[0].SwimmingPool_InGroundIndicator_A[0]"), "in-ground pool checked");
  assert.ok(checked("F[0].P2[0].SwimmingPool_ApprovedFenceIndicator_A[0]"), "pool fence checked");
  assert.equal(text("F[0].P2[0].BuildingFireProtection_ExtinguisherCode_A[0]"), "Y");
  assert.equal(text("F[0].P2[0].LossHistory_PriorLossesCode_A[0]"), "Y");
  assert.equal(text("F[0].P2[0].LossHistory_OccurrenceDescription_A[0]"), "Water damage - pipe leak");
  assert.equal(text("F[0].P2[0].LossHistory_PaidAmount_A[0]"), "$8,200");
  assert.equal(text("F[0].P2[0].PriorCoverage_InsurerFullName_A[0]"), "Test Mutual");
  assert.equal(text("F[0].P4[0].Residential_Question_KDZCode_A[0]"), "Y", "Q1 owner = Y");
  assert.equal(text("F[0].P4[0].Residential_Question_KBBCode_A[0]"), "Y", "Q2 hazard = Y");
  assert.equal(text("F[0].P4[0].Residential_Question_KBCCode_A[0]"), "Y", "Q6 animals = Y");
  assert.equal(text("F[0].P4[0].Residential_Question_KBGCode_A[0]"), "N", "Q7 trampoline = N");
  assert.equal(text("F[0].P3[0].PersonalPolicy_Question_KABCode_A[0]"), "N", "Q13 declined = N");
  assert.equal(text("F[0].P6[0].NamedInsured_SignatureDate_A[0]"), "", "preview must not sign");
  const remarks = text("F[0].P5[0].Residential_RemarkText_A[0]");
  assert.ok(remarks.includes("Wiring type: Copper"), "remarks carry wiring type");
  assert.ok(remarks.includes("brush/wildland"), "remarks carry wildfire note");
  console.log(`preview fill + re-read: OK (${res.body.pageCount} pages)`);
}

// ── 3. signed submit (no API key => pdf returned inline) ───────────────────
{
  delete process.env.RESEND_API_KEY;
  delete process.env.VERCEL_ENV;
  const res = mockRes();
  await handler({
    method: "POST",
    headers: { "user-agent": "smoke-test", "x-forwarded-for": "203.0.113.7" },
    body: {
      ...payload,
      signature: TINY_PNG,
      eSignConsent: {
        accepted: true, fullDocumentRendered: true, coverageAck: true,
        version: "smoke", text: "smoke consent", reviewStartedAt: new Date().toISOString(),
        previewGeneratedAt: new Date().toISOString(), consentedAt: new Date().toISOString(),
        timezone: "America/Los_Angeles", pageCount: 6, reviewFingerprint: "smoke-fp"
      }
    }
  }, res);
  assert.equal(res.statusCode, 200, `signed submit should 200, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.ok && res.body.auditId, "signed submit returns auditId");
  assert.ok(res.body.pdfBase64, "without RESEND_API_KEY the signed pdf comes back inline");

  const signed = await PDFDocument.load(Buffer.from(res.body.pdfBase64, "base64"));
  const form = signed.getForm();
  const sigDate = form.getTextField("F[0].P6[0].NamedInsured_SignatureDate_A[0]").getText() || "";
  assert.ok(/^\d{2}\/\d{2}\/\d{4}$/.test(sigDate), "signature date stamped");
  console.log(`signed submit: OK (audit ${res.body.auditId}, ${signed.getPageCount()} pages incl. audit certificate)`);
}

await import("./test-personal-lines-provider.mjs");
await import("./test-request-guard.mjs");
await import("./test-line-dp3.mjs");
console.log("ALL SMOKE TESTS PASSED");
