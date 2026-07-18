import { PDFDocument, StandardFonts, rgb, PDFName, PDFString } from "pdf-lib";
import { Resend } from "resend";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import zlib from "zlib";

const FROM_ADDRESS = process.env.FROM_EMAIL || "BestHO3 <quotes@bestho3.com>";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "quotes@bollinsure.com";
const TEMPLATE_NAME = "acord-80-homeowner-application.pdf";
const CONSENT_VERSION = "2026-07-16.bestho3.1";
const TEMPLATE_CACHE = {};
const RL = new Map();

/* Field names below were extracted programmatically from the AcroForm of
   api/acord-80-homeowner-application.pdf (ACORD 80 2013/09, decrypted, XFA
   stripped, 824 terminal fields) — see docs/acord-80-field-map.md and
   docs/acord-80-fields-raw.txt. The names are fully qualified XFA-style
   (`F[0].P<page>[0].Entity_Attribute_Instance[0]`). NEVER guess or shorten a
   name: any setText/check against a name not in the form is a silent no-op —
   the exact failure mode caught on the ACORD 130 job. Run
   `npm run test:fields` after ANY change here. */
const P1 = "F[0].P1[0].";
const P2 = "F[0].P2[0].";
const P3 = "F[0].P3[0].";
const P4 = "F[0].P4[0].";
const P5 = "F[0].P5[0].";
const P6 = "F[0].P6[0].";

const OCCUPANCY_CHECK = {
  owner: P2 + "ResidenceOccupancy_OccupancyType_OwnerIndicator_A[0]",
  tenant: P2 + "ResidenceOccupancy_OccupancyType_TenantIndicator_A[0]",
  vacant: P2 + "ResidenceOccupancy_OccupancyType_VacantIndicator_A[0]",
  unoccupied: P2 + "ResidenceOccupancy_OccupancyType_UnoccupiedIndicator_A[0]"
};
const USAGE_CHECK = {
  primary: P2 + "ResidenceOccupancy_Usage_PrimaryIndicator_A[0]",
  seasonal: P2 + "ResidenceOccupancy_Usage_SeasonalIndicator_A[0]",
  secondary: P2 + "ResidenceOccupancy_Usage_SecondaryIndicator_A[0]",
  other: P2 + "ResidenceOccupancy_Usage_OtherIndicator_A[0]"
};
const RESIDENCE_CHECK = {
  dwelling: P2 + "ResidenceOccupancy_ResidenceType_DwellingIndicator_A[0]",
  townhouse: P2 + "ResidenceOccupancy_ResidenceType_TownhouseIndicator_A[0]",
  rowhouse: P2 + "ResidenceOccupancy_ResidenceType_RowHouseIndicator_A[0]",
  condominium: P2 + "ResidenceOccupancy_ResidenceType_CondominiumIndicator_A[0]",
  cooperative: P2 + "ResidenceOccupancy_ResidenceType_CooperativeIndicator_A[0]",
  apartment: P2 + "ResidenceOccupancy_ResidenceType_ApartmentIndicator_A[0]"
};
const CONSTRUCTION_CHECK = {
  frame: P2 + "Construction_ConstructionType_FrameIndicator_A[0]",
  masonry: P2 + "Construction_ConstructionType_MasonryIndicator_A[0]",
  masonry_veneer: P2 + "Construction_ConstructionType_MasonryVeneerIndicator_A[0]",
  other: P2 + "Construction_ConstructionType_OtherIndicator_A[0]"
};
const FOUNDATION_CHECK = {
  closed: P2 + "Construction_Foundation_ClosedIndicator_A[0]",
  open: P2 + "Construction_Foundation_OpenIndicator_A[0]",
  none: P2 + "Construction_Foundation_NoIndicator_A[0]"
};
const PANEL_CHECK = {
  breakers: P2 + "Construction_ElectricalPanel_CircuitBreakersIndicator_A[0]",
  fuses: P2 + "Construction_ElectricalPanel_FusesIndicator_A[0]"
};
/* Condition ratings: prefix + {Excellent,Good,Average,BelowAverage}Indicator_A[0] */
const CONDITION_PREFIX = {
  roof_condition: P2 + "ResidentialStructure_RoofCondition_",
  plumbing_condition: P2 + "ResidentialStructure_PlumbingCondition_",
  housekeeping: P2 + "ResidentialStructure_Housekeeping_"
};
const CONDITION_SUFFIX = {
  excellent: "ExcellentIndicator_A[0]",
  good: "GoodIndicator_A[0]",
  average: "AverageIndicator_A[0]",
  below_average: "BelowAverageIndicator_A[0]"
};
/* Building improvements ("year updated"): full -> Complete, partial -> Partial.
   Unknown/original stays blank — assume original unless a record shows an update. */
const IMPROVEMENTS = {
  roof: { complete: P2 + "BuildingImprovement_RoofingCompleteIndicator_A[0]", partial: P2 + "BuildingImprovement_RoofingPartialIndicator_A[0]", year: P2 + "BuildingImprovement_RoofingYear_A[0]" },
  heating: { complete: P2 + "BuildingImprovement_HeatingCompleteIndicator_A[0]", partial: P2 + "BuildingImprovement_HeatingPartialIndicator_A[0]", year: P2 + "BuildingImprovement_HeatingYear_A[0]" },
  plumbing: { complete: P2 + "BuildingImprovement_PlumbingCompleteIndicator_A[0]", partial: P2 + "BuildingImprovement_PlumbingPartialIndicator_A[0]", year: P2 + "BuildingImprovement_PlumbingYear_A[0]" },
  wiring: { complete: P2 + "BuildingImprovement_WiringCompleteIndicator_A[0]", partial: P2 + "BuildingImprovement_WiringPartialIndicator_A[0]", year: P2 + "BuildingImprovement_WiringYear_A[0]" }
};
const LOCK_CHECK = {
  deadbolt: P2 + "ResidentialStructure_Security_DoorLockDeadboltIndicator_A[0]",
  spring: P2 + "ResidentialStructure_Security_DoorLockSpringIndicator_A[0]",
  other: P2 + "ResidentialStructure_Security_DoorLockOtherIndicator_A[0]"
};
const BURGLAR_CHECK = {
  central: P2 + "Alarm_Burglar_CentralStationIndicator_A[0]",
  local: P2 + "Alarm_Burglar_LocalGongIndicator_A[0]",
  direct: P2 + "Alarm_Burglar_DirectIndicator_A[0]"
};
const SMOKE_CHECK = {
  central: P2 + "Alarm_Smoke_CentralStationIndicator_A[0]",
  local: P2 + "Alarm_Smoke_LocalGongIndicator_A[0]",
  direct: P2 + "Alarm_Smoke_DirectIndicator_A[0]"
};
const POOL_CHECK = {
  no: P2 + "SwimmingPool_NoIndicator_A[0]",
  in_ground: P2 + "SwimmingPool_InGroundIndicator_A[0]",
  above_ground: P2 + "SwimmingPool_AboveGroundIndicator_A[0]"
};

/* The 16 underwriting Y/N questions (Tx fields that take the literal "Y"/"N").
   Bindings verified against the form's own tooltip text — see the field map.
   Only ever written when the applicant actually answered. */
const QUESTIONS = {
  q_owner: P4 + "Residential_Question_KDZCode_A[0]",
  q_hazard: P4 + "Residential_Question_KBBCode_A[0]",
  q_code_violation: P4 + "Residential_Question_KBDCode_A[0]",
  q_business: P4 + "Residential_Question_KAZCode_A[0]",
  q_employees: P4 + "Residential_Question_KBACode_A[0]",
  q_animals: P4 + "Residential_Question_KBCCode_A[0]",
  q_trampoline: P4 + "Residential_Question_KBGCode_A[0]",
  q_commercial_300ft: P4 + "Residential_Question_KBFCode_A[0]",
  q_co_alarm: P4 + "Residential_Question_ABBCode_A[0]",
  q_lead_paint: P4 + "Residential_Question_KBICode_A[0]",
  q_for_sale: P4 + "Residential_Question_KBECode_A[0]",
  q_converted: P4 + "Residential_Question_KBHCode_A[0]",
  q_declined_cancelled: P3 + "PersonalPolicy_Question_KABCode_A[0]",
  q_bankruptcy: P3 + "PersonalPolicy_Question_KAHCode_A[0]",
  q_lien: P3 + "PersonalPolicy_Question_KAICode_A[0]",
  q_fraud_arson: P4 + "PersonalPolicy_Question_KAGCode_A[0]"
};

const POLICY_FORM_CODE = { HO3: "HO 00 03", HO5: "HO 00 05", DP3: "DP 00 03" };
const ROOF_LABEL = { comp: "Composition shingle", tile: "Clay/concrete tile", metal: "Metal", shake: "Wood shake", flat: "Tar & gravel (flat)", other: "Other" };
const WIRING_LABEL = { copper: "Copper (Romex)", aluminum: "Aluminum branch wiring", knob_tube: "Knob & tube", mixed: "Mixed", unknown: "Unknown per applicant" };
const LOSS_ROWS = "ABCD";

function clean(v, max = 700) {
  if (v == null) return "";
  return String(v).replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function limitText(v, max = 1200) {
  if (v == null) return "";
  return String(v).replace(/\s+/g, " ").trim().slice(0, max);
}
function money(v) {
  const n = Number(String(v || "").replace(/[^0-9.]/g, "")) || 0;
  return n ? "$" + Math.round(n).toLocaleString("en-US") : "";
}
function dateMDY(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}
/* <input type=date> gives YYYY-MM-DD; ACORD wants MM/DD/YYYY. Pass through
   anything already human-formatted. */
function toMDY(v) {
  const s = clean(v, 20);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : s;
}
function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
function auditId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}
function ipFrom(req) {
  return String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
}
function rateLimited(ip) {
  const now = Date.now();
  const arr = (RL.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now);
  RL.set(ip, arr);
  if (RL.size > 5000) RL.clear();
  return arr.length > 20;
}
function auditText(audit) {
  return Object.entries(audit).map(([k, v]) => `${k}: ${v == null ? "" : v}`).join("\n") + "\n";
}
function loadTemplate() {
  if (TEMPLATE_CACHE[TEMPLATE_NAME]) return TEMPLATE_CACHE[TEMPLATE_NAME];
  const base = path.join(process.cwd(), "api", TEMPLATE_NAME);
  const b64 = base + ".b64";
  const br = base + ".br.b64";
  if (fs.existsSync(base)) TEMPLATE_CACHE[TEMPLATE_NAME] = fs.readFileSync(base);
  else if (fs.existsSync(br)) TEMPLATE_CACHE[TEMPLATE_NAME] = zlib.brotliDecompressSync(Buffer.from(fs.readFileSync(br, "utf8").replace(/\s+/g, ""), "base64"));
  else if (fs.existsSync(b64)) TEMPLATE_CACHE[TEMPLATE_NAME] = Buffer.from(fs.readFileSync(b64, "utf8").replace(/\s+/g, ""), "base64");
  else {
    const err = new Error(`Missing api/${TEMPLATE_NAME}.`);
    err.statusCode = 500;
    throw err;
  }
  return TEMPLATE_CACHE[TEMPLATE_NAME];
}
function required(f, names) {
  for (const n of names) if (!clean(f[n])) return n;
  return "";
}
function sanitizeFields(input) {
  const out = {};
  for (const k in (input || {})) out[k] = typeof input[k] === "string" ? clean(input[k], 1500) : input[k];
  return out;
}

async function addAuditPage(pdf, audit) {
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 744;
  page.drawText("Electronic Signature Audit Certificate", { x: 54, y, size: 16, font: bold, color: rgb(0.05, 0.06, 0.05) });
  y -= 24;
  page.drawText("This page records the electronic review and signing event for the attached ACORD 80 homeowner application.", { x: 54, y, size: 9, font, color: rgb(0.25, 0.29, 0.26) });
  y -= 22;
  const rows = [
    ["Audit ID", audit.audit_id], ["Signed at UTC", audit.signed_at_utc], ["Applicant", audit.applicant],
    ["Signer", audit.signer_name], ["Signer email", audit.signer_email],
    ["Property", audit.property], ["Policy form", audit.policy_form],
    ["IP address", audit.ip_address], ["User agent", audit.user_agent], ["Consent version", audit.consent_version],
    ["Review started", audit.review_started_at], ["Preview generated", audit.preview_generated_at],
    ["Consent checked", audit.consented_at], ["Timezone", audit.timezone], ["Pages rendered", audit.page_count_reviewed],
    ["Full document reviewed", audit.full_document_reviewed], ["Coverage acknowledged", audit.coverage_ack],
    ["Indication", audit.indication], ["Coverage A", audit.coverage_a], ["Signature SHA-256", audit.signature_sha256],
    ["Signed PDF SHA-256 before audit page", audit.signed_pdf_sha256_before_audit]
  ];
  for (const [label, value] of rows) {
    if (y < 82) break;
    page.drawText(label + ":", { x: 54, y, size: 8.3, font: bold, color: rgb(0.05, 0.06, 0.05) });
    const text = limitText(value, 1000);
    const lines = text.match(/.{1,74}(\s|$)/g) || [text];
    for (let i = 0; i < lines.length; i++) {
      if (i) y -= 10;
      page.drawText(lines[i].trim(), { x: 205, y, size: 8.3, font, color: rgb(0.05, 0.06, 0.05) });
    }
    y -= 14;
  }
  if (y > 58) {
    page.drawText("Consent text:", { x: 54, y, size: 9, font: bold, color: rgb(0.05, 0.06, 0.05) });
    y -= 12;
    page.drawText(limitText(audit.consent_text, 700), { x: 54, y, size: 7.8, font, color: rgb(0.18, 0.2, 0.18), maxWidth: 500 });
  }
}

async function fillPdf(fields, payload, opts = {}) {
  const f = { ...fields };
  const quote = payload.quote || {};
  const lossRows = Array.isArray(payload.lossRows) ? payload.lossRows.slice(0, LOSS_ROWS.length) : [];
  const pdf = await PDFDocument.load(loadTemplate());
  const form = pdf.getForm();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const today = dateMDY();

  const setText = (name, value, size = 8) => {
    try {
      const field = form.getTextField(name);
      try { field.acroField.dict.set(PDFName.of("DA"), PDFString.of(`/Helv ${size} Tf 0 g`)); } catch (e) {}
      field.setText(String(value == null ? "" : value));
      try { field.setFontSize(size); } catch (e) {}
      try { field.updateAppearances(helv); } catch (e) {}
    } catch (e) {}
  };
  const check = (name) => {
    try { form.getCheckBox(name).check(); } catch (e) {}
  };
  /* Only writes Y/N when the applicant actually answered — unanswered form
     questions stay blank for broker completion (never default to N). */
  const setYN = (name, v) => {
    const s = clean(v).toLowerCase();
    if (s === "yes" || s === "y") setText(name, "Y", 8);
    else if (s === "no" || s === "n") setText(name, "N", 8);
  };

  // ── Producer (Bollinsure constants) ─────────────────────────────────────
  setText(P1 + "Producer_FullName_A[0]", "WJB Services, Inc. dba Bollinsure Insurance Services");
  setText(P1 + "Producer_ContactPerson_FullName_A[0]", "Aaron Bollinger");
  setText(P1 + "Producer_ContactPerson_PhoneNumber_A[0]", "310-804-5017");
  setText(P1 + "Producer_ContactPerson_EmailAddress_A[0]", "quotes@bollinsure.com");
  setText(P1 + "Form_CompletionDate_A[0]", today);
  check(P1 + "Policy_Status_NewIndicator_A[0]");
  if (clean(f.effective_date)) setText(P1 + "Policy_EffectiveDate_A[0]", toMDY(f.effective_date));
  const formKey = ["HO3", "HO5", "DP3"].includes(clean(f.policy_form).toUpperCase()) ? clean(f.policy_form).toUpperCase() : "HO3";
  setText(P1 + "ResidentialStructure_PolicyForm_FormTypeCode_A[0]", POLICY_FORM_CODE[formKey]);

  // ── Applicant / named insured (page 1) ──────────────────────────────────
  setText(P1 + "NamedInsured_FullName_A[0]", clean(f.applicant_full_name));
  setText(P1 + "NamedInsured_BirthDate_A[0]", toMDY(f.applicant_dob));
  setText(P1 + "NamedInsured_OccupationDescription_A[0]", clean(f.applicant_occupation));
  setText(P1 + "NamedInsured_Primary_EmailAddress_A[0]", clean(f.applicant_email));
  setText(P1 + "NamedInsured_Primary_PhoneNumber_A[0]", clean(f.applicant_phone));
  const phoneType = clean(f.applicant_phone_type).toLowerCase();
  if (phoneType === "cell") check(P1 + "NamedInsured_Primary_CellPhoneIndicator_A[0]");
  else if (phoneType === "home") check(P1 + "NamedInsured_Primary_HomePhoneIndicator_A[0]");
  else if (phoneType === "business") check(P1 + "NamedInsured_Primary_BusinessPhoneIndicator_A[0]");

  setText(P1 + "NamedInsured_MailingAddress_LineOne_A[0]", clean(f.mailing_address));
  setText(P1 + "NamedInsured_MailingAddress_CityName_A[0]", clean(f.mailing_city));
  setText(P1 + "NamedInsured_MailingAddress_StateOrProvinceCode_A[0]", clean(f.mailing_state).toUpperCase());
  setText(P1 + "NamedInsured_MailingAddress_PostalCode_A[0]", clean(f.mailing_zip));
  if (clean(f.mailing_same).toLowerCase() === "yes") check(P1 + "NamedInsured_PhysicalAddress_SameAsMailingIndicator_A[0]");

  // ── Risk location (page 2) ──────────────────────────────────────────────
  setText(P2 + "Location_PhysicalAddress_LineOne_A[0]", clean(f.risk_address));
  setText(P2 + "Location_PhysicalAddress_CityName_A[0]", clean(f.risk_city));
  setText(P2 + "Location_PhysicalAddress_CountyName_A[0]", clean(f.risk_county));
  setText(P2 + "Location_PhysicalAddress_StateOrProvinceCode_A[0]", clean(f.risk_state).toUpperCase());
  setText(P2 + "Location_PhysicalAddress_PostalCode_A[0]", clean(f.risk_zip));
  if (clean(f.in_city_limits).toLowerCase() === "yes") check(P2 + "ResidentialLocation_RiskLocation_InCityLimitsIndicator_A[0]");

  // ── Occupancy / usage / residence type ──────────────────────────────────
  if (OCCUPANCY_CHECK[clean(f.occupancy)]) check(OCCUPANCY_CHECK[clean(f.occupancy)]);
  const usage = clean(f.usage);
  if (USAGE_CHECK[usage]) check(USAGE_CHECK[usage]);
  if (usage === "other") {
    setText(P2 + "ResidenceOccupancy_Usage_OtherDescription_A[0]",
      clean(f.pathway) === "landlord" ? "Rental / investment property" : clean(f.usage_other_description || "Other"), 7);
  }
  if (RESIDENCE_CHECK[clean(f.residence_type)]) check(RESIDENCE_CHECK[clean(f.residence_type)]);
  setText(P2 + "ResidenceOccupancy_FamilyCount_A[0]", clean(f.number_of_families));

  // ── Construction & structure ────────────────────────────────────────────
  setText(P2 + "Construction_BuiltYear_A[0]", clean(f.year_built));
  setText(P2 + "ResidentialStructure_TotalLivingArea_A[0]", clean(f.total_living_area));
  setText(P2 + "Construction_RoofMaterialCode_A[0]", ROOF_LABEL[clean(f.roof_material)] || clean(f.roof_material), 7);
  if (CONSTRUCTION_CHECK[clean(f.construction_type)]) check(CONSTRUCTION_CHECK[clean(f.construction_type)]);
  if (FOUNDATION_CHECK[clean(f.foundation_type)]) check(FOUNDATION_CHECK[clean(f.foundation_type)]);
  if (PANEL_CHECK[clean(f.electrical_panel)]) check(PANEL_CHECK[clean(f.electrical_panel)]);
  if (clean(f.electrical_amps)) setText(P2 + "Construction_ElectricalPanel_AmpereCount_A[0]", clean(f.electrical_amps));

  for (const key of ["roof_condition", "plumbing_condition", "housekeeping"]) {
    const suffix = CONDITION_SUFFIX[clean(f[key])];
    if (suffix) check(CONDITION_PREFIX[key] + suffix);
  }

  // ── Building improvements — assume original unless the applicant said so ─
  const improvements = [
    ["roof", f.roof_updated, f.roof_update_year],
    ["heating", f.heating_updated, f.heating_update_year],
    ["plumbing", f.plumbing_updated, f.plumbing_update_year],
    ["wiring", f.wiring_updated, f.wiring_update_year]
  ];
  for (const [sys, updated, year] of improvements) {
    const u = clean(updated).toLowerCase();
    if (u === "full") check(IMPROVEMENTS[sys].complete);
    else if (u === "partial") check(IMPROVEMENTS[sys].partial);
    if ((u === "full" || u === "partial") && /^\d{4}$/.test(clean(year))) setText(IMPROVEMENTS[sys].year, clean(year));
  }

  // ── Protection & safety ─────────────────────────────────────────────────
  if (LOCK_CHECK[clean(f.door_locks)]) check(LOCK_CHECK[clean(f.door_locks)]);
  if (clean(f.door_locks) === "other") setText(P2 + "ResidentialStructure_Security_DoorLockOtherDescription_A[0]", "Smart/other locks", 7);
  if (BURGLAR_CHECK[clean(f.burglar_alarm)]) check(BURGLAR_CHECK[clean(f.burglar_alarm)]);
  if (SMOKE_CHECK[clean(f.smoke_alarm)]) check(SMOKE_CHECK[clean(f.smoke_alarm)]);
  const spr = clean(f.sprinklers);
  if (spr === "full") check(P2 + "BuildingFireProtection_Sprinkler_FullIndicator_A[0]");
  else if (spr === "partial") check(P2 + "BuildingFireProtection_Sprinkler_PartialIndicator_A[0]");
  const ext = clean(f.fire_extinguisher).toLowerCase();
  if (ext === "yes" || ext === "no") setText(P2 + "BuildingFireProtection_ExtinguisherCode_A[0]", ext === "yes" ? "Y" : "N");

  const pool = clean(f.swimming_pool);
  if (POOL_CHECK[pool]) check(POOL_CHECK[pool]);
  if (pool && pool !== "no") {
    if (clean(f.pool_fence).toLowerCase() === "yes") check(P2 + "SwimmingPool_ApprovedFenceIndicator_A[0]");
    if (clean(f.pool_diving_board).toLowerCase() === "yes") check(P2 + "SwimmingPool_DivingBoardIndicator_A[0]");
    if (clean(f.pool_slide).toLowerCase() === "yes") check(P2 + "SwimmingPool_SlideIndicator_A[0]");
  }

  // ── Coverage & deductible (page 1) ──────────────────────────────────────
  setText(P1 + "ResidentialCoverage_Dwelling_LimitAmount_A[0]", money(f.dwelling_limit));
  setText(P1 + "ResidentialCoverage_PersonalLiability_EachOccurrenceLimitAmount_A[0]", money(f.personal_liability_limit));
  setText(P1 + "ResidentialCoverage_MedicalPayments_EachPersonLimitAmount_A[0]", money(f.med_pay_limit));
  setText(P1 + "ResidentialCoverage_Deductible_BaseAmount_A[0]", money(f.deductible));
  /* Coverages B/C/D stay blank — HO-3 carriers derive them from Coverage A.
     Never auto-populate a limit the applicant did not choose. */

  // ── Loss history (page 2) ───────────────────────────────────────────────
  const noLosses = clean(f.no_losses).toLowerCase() === "yes";
  if (noLosses) setText(P2 + "LossHistory_PriorLossesCode_A[0]", "N");
  else if (lossRows.length) setText(P2 + "LossHistory_PriorLossesCode_A[0]", "Y");
  if (noLosses || lossRows.length) setText(P2 + "LossHistory_InformationYearCount_A[0]", "5");
  lossRows.forEach((row, idx) => {
    const L = LOSS_ROWS[idx];
    setText(P2 + `LossHistory_OccurrenceDate_${L}[0]`, toMDY(row.date));
    setText(P2 + `LossHistory_OccurrenceDescription_${L}[0]`, clean(row.description, 120), 7);
    setText(P2 + `LossHistory_PaidAmount_${L}[0]`, money(row.amount));
  });

  // ── Prior coverage (page 2) ─────────────────────────────────────────────
  if (clean(f.no_prior_coverage).toLowerCase() === "yes") {
    check(P2 + "PriorCoverage_NoPriorCoverageIndicator_A[0]");
  } else {
    setText(P2 + "PriorCoverage_InsurerFullName_A[0]", clean(f.prior_insurer_1));
    setText(P2 + "PriorCoverage_InsurerFullName_B[0]", clean(f.prior_insurer_2));
    if (clean(f.prior_expiration)) setText(P2 + "PriorCoverage_ExpirationDate_A[0]", toMDY(f.prior_expiration));
  }

  // ── The 16 underwriting questions ───────────────────────────────────────
  for (const [key, name] of Object.entries(QUESTIONS)) setYN(name, f[key]);

  // ── Remarks (page 5) — wiring type + explanations + indication note ─────
  const remarks = [];
  if (clean(f.wiring_type)) remarks.push("Wiring type: " + (WIRING_LABEL[clean(f.wiring_type)] || clean(f.wiring_type)) + ".");
  if (clean(f.wildfire_exposure) === "yes") remarks.push("Applicant reports brush/wildland exposure near the dwelling.");
  else if (clean(f.wildfire_exposure) === "unsure") remarks.push("Applicant unsure of brush/wildfire exposure - verify fire-zone mapping.");
  if (clean(f.q_explanations)) remarks.push("Yes-answer explanations: " + clean(f.q_explanations, 500));
  if (clean(f.additional_notes)) remarks.push("Applicant notes: " + clean(f.additional_notes, 400));
  if (quote.low && quote.high) remarks.push(`Website preliminary indication ${money(quote.low)}-${money(quote.high)}/yr (not a quote; subject to underwriting).`);
  if (clean(f.pathway) === "landlord") remarks.push("Non-owner-occupied - submitted on DP-3 basis.");
  if (remarks.length) setText(P5 + "Residential_RemarkText_A[0]", limitText(remarks.join(" "), 1100), 7);

  // ── Signature (page 6) ──────────────────────────────────────────────────
  if (!opts.preview) setText(P6 + "NamedInsured_SignatureDate_A[0]", today);
  if (opts.signatureDataUrl && !opts.preview) {
    try {
      const b64 = String(opts.signatureDataUrl).split(",")[1];
      const img = await pdf.embedPng(Buffer.from(b64, "base64"));
      const dims = img.scale(1);
      const pages = pdf.getPages();
      // Place the signature over the actual NamedInsured_Signature_A widget —
      // template-independent: rect + page come from the form, not constants.
      const sigWidget = form.getTextField(P6 + "NamedInsured_Signature_A[0]").acroField.getWidgets()[0];
      const r = sigWidget.getRectangle();
      const pRef = sigWidget.P();
      let pageIdx = pages.findIndex((p) => pRef && p.ref.objectNumber === pRef.objectNumber && p.ref.generationNumber === pRef.generationNumber);
      if (pageIdx < 0) pageIdx = pages.length - 1;
      const rect = { x: r.x + 2, y: r.y + 2, w: Math.max(60, r.width - 4), h: Math.max(14, r.height - 4) };
      const s = Math.min(rect.w / dims.width, rect.h / dims.height);
      pages[pageIdx].drawImage(img, { x: rect.x, y: rect.y + Math.max(0, (rect.h - dims.height * s) / 2), width: dims.width * s, height: dims.height * s });
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      pages[pageIdx].drawText(limitText(`${clean(f.signer_name || f.applicant_full_name)} — signed electronically`, 110), { x: rect.x, y: Math.max(14, rect.y - 9), size: 7, font, color: rgb(0.05, 0.06, 0.05) });
    } catch (e) {
      console.error("[ho-application] signature stamp failed:", e?.message || e);
    }
  }

  if (opts.audit) {
    const before = await pdf.save();
    opts.audit.signed_pdf_sha256_before_audit = sha256(Buffer.from(before));
    await addAuditPage(pdf, opts.audit);
  }
  return pdf.save();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const ip = ipFrom(req);
    if (rateLimited(ip)) return res.status(429).json({ error: "Too many requests. Please wait a minute." });
    const payload = req.body || {};
    const fields = sanitizeFields(payload.fields || {});
    if (payload.website_hp || fields.website_hp) return res.status(200).json({ ok: true });
    const preview = payload.preview === true;
    const consent = payload.eSignConsent || {};
    const signatureDataUrl = clean(payload.signature, 2500000);

    const missing = required(fields, ["applicant_full_name", "applicant_email", "applicant_phone", "risk_address", "risk_city", "risk_state", "risk_zip", "residence_type", "year_built", "dwelling_limit"]);
    if (missing) return res.status(400).json({ error: "Missing required field.", field: missing });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean(fields.applicant_email, 254))) return res.status(400).json({ error: "Valid email is required." });
    if (!preview && !clean(fields.signer_name)) return res.status(400).json({ error: "Signer name is required." });
    if (!preview && !signatureDataUrl.startsWith("data:image/png;base64,")) return res.status(400).json({ error: "Adopted signature is required." });
    if (!preview && signatureDataUrl.length > 1900000) return res.status(400).json({ error: "Signature too large." });
    if (!preview && consent.accepted !== true) return res.status(400).json({ error: "Electronic signature consent required." });
    if (!preview && consent.fullDocumentRendered !== true) return res.status(400).json({ error: "Full document review required." });
    if (!preview && consent.coverageAck !== true) return res.status(400).json({ error: "Coverage acknowledgment required." });
    if (!preview && !clean(consent.reviewFingerprint || payload.reviewFingerprint)) return res.status(400).json({ error: "Application preview review record required." });

    const quote = payload.quote || {};
    const audit = preview ? null : {
      audit_id: auditId(),
      signed_at_utc: new Date().toISOString(),
      applicant: clean(fields.applicant_full_name, 180),
      signer_name: clean(fields.signer_name, 180),
      signer_email: clean(fields.applicant_email, 254),
      property: clean(`${fields.risk_address}, ${fields.risk_city}, ${fields.risk_state} ${fields.risk_zip}`, 220),
      policy_form: clean(fields.policy_form, 10) || "HO3",
      ip_address: ip,
      user_agent: clean(req.headers["user-agent"], 500),
      consent_version: clean(consent.version || CONSENT_VERSION, 80),
      consent_text: clean(consent.text || "I agree to sign electronically and consent to electronic records and signatures for this homeowner application.", 1600),
      review_started_at: clean(consent.reviewStartedAt, 80),
      preview_generated_at: clean(consent.previewGeneratedAt, 80),
      consented_at: clean(consent.consentedAt, 80),
      timezone: clean(consent.timezone, 80),
      page_count_reviewed: Number(consent.pageCount) || 6,
      full_document_reviewed: consent.fullDocumentRendered === true ? "yes" : "no",
      coverage_ack: consent.coverageAck === true ? "yes" : "no",
      indication: quote.low && quote.high ? `${money(quote.low)}-${money(quote.high)} preliminary annual indication` : "custom market review",
      coverage_a: money(fields.dwelling_limit),
      signature_sha256: sha256(signatureDataUrl),
      signed_pdf_sha256_before_audit: ""
    };

    const bytes = await fillPdf(fields, payload, { preview, audit, signatureDataUrl });
    const buffer = Buffer.from(bytes);
    if (preview) {
      const doc = await PDFDocument.load(bytes);
      return res.status(200).json({ ok: true, pdf: buffer.toString("base64"), pageCount: doc.getPageCount() });
    }

    audit.final_pdf_sha256 = sha256(buffer);
    const filename = "homeowner-application-" + clean(fields.applicant_full_name, 80).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() + ".pdf";
    let emailed = false;
    if (!process.env.RESEND_API_KEY && process.env.VERCEL_ENV === "production") {
      // Never fake success in production — a signed application must reach the broker.
      console.error("[ho-application] RESEND_API_KEY missing in production — signed application NOT delivered:", clean(fields.applicant_full_name));
      return res.status(500).json({ error: "Submission could not be delivered. Please call 310-804-5017 or email quotes@bollinsure.com." });
    }
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const pdfAttachment = { filename, content: buffer.toString("base64") };
      const auditAttachment = { filename: "HO-E-Sign-Audit-" + audit.audit_id + ".txt", content: Buffer.from(auditText(audit), "utf8").toString("base64") };
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: [NOTIFY_EMAIL],
        cc: clean(fields.applicant_email, 254) ? [clean(fields.applicant_email, 254)] : undefined,
        reply_to: clean(fields.applicant_email, 254),
        subject: `Homeowner application (${POLICY_FORM_CODE[clean(fields.policy_form).toUpperCase()] || "HO 00 03"}) - ` + clean(fields.applicant_full_name, 120),
        text: `Signed homeowner application submitted.\nApplicant: ${clean(fields.applicant_full_name)}\nProperty: ${audit.property}\nPolicy form: ${audit.policy_form}\nCoverage A: ${audit.coverage_a}\nIndication: ${audit.indication}\nAudit ID: ${audit.audit_id}`,
        attachments: [pdfAttachment, auditAttachment]
      });
      emailed = true;
    }
    return res.status(200).json({ ok: true, emailed, auditId: audit.audit_id, filename, pdfBase64: emailed ? undefined : buffer.toString("base64") });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.message || "Unable to generate application." });
  }
}
