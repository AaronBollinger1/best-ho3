/* =============================================================
   BestDP3 — dwelling-fire quote schema  (a NEW line, from the chassis)
   -------------------------------------------------------------
   Registers a "dwelling-fire" (DP-3 / landlord) line on the shared
   personal-lines quote contract using ONLY its public extension
   point, registerLine(). The shared provider file is not edited:
   the transport envelope + applicant block are reused unchanged;
   only this line-specific descriptor is added. Importing this module
   makes the DP-3 line available to buildQuoteEnvelope/validate.
   ============================================================= */
import { registerLine } from "../personal-lines-quote-provider.js";

function text(value, max = 500) {
  return String(value == null ? "" : value).replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function number(value) {
  const parsed = Number(String(value == null ? "" : value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export const DP3_SCHEMA = {
  build(fields, losses) {
    return {
      form: text(fields.policy_form || "DP3", 12),
      pathway: text(fields.pathway || "landlord", 20),
      risk: {
        address1: text(fields.risk_address, 160),
        city: text(fields.risk_city, 80),
        county: text(fields.risk_county, 80),
        state: text(fields.risk_state, 2).toUpperCase(),
        postalCode: text(fields.risk_zip, 10),
        occupancy: text(fields.occupancy || "tenant", 30),
        rentalType: text(fields.rental_type, 40),      // single-family / multifamily / seasonal
        unitCount: number(fields.unit_count) || 1,
        yearBuilt: number(fields.year_built),
        livingArea: number(fields.total_living_area),
        construction: text(fields.construction_type, 40),
        roofMaterial: text(fields.roof_material, 40),
        wildfireExposure: text(fields.wildfire_exposure, 20)
      },
      coverage: {
        dwelling: number(fields.dwelling_limit),
        deductible: number(fields.deductible),
        personalLiability: number(fields.personal_liability_limit),
        fairRentalValue: number(fields.fair_rental_value),   // DP-3 loss-of-rents (Coverage D)
        effectiveDate: text(fields.effective_date, 20)
      },
      losses: losses.map((loss) => ({
        date: text(loss.date, 20),
        description: text(loss.description, 240),
        amount: number(loss.amount)
      }))
    };
  },
  validate(application) {
    const errors = [];
    const risk = application && application.risk;
    const applicant = application && application.applicant;
    if (!text(applicant && applicant.fullName)) errors.push("applicant.fullName");
    if (!text(risk && risk.address1)) errors.push("risk.address1");
    if (!text(risk && risk.city)) errors.push("risk.city");
    if (!/^[A-Z]{2}$/.test(text(risk && risk.state, 2))) errors.push("risk.state");
    if (!/^\d{5}(-\d{4})?$/.test(text(risk && risk.postalCode, 10))) errors.push("risk.postalCode");
    return errors;
  }
};

registerLine("dwelling-fire", DP3_SCHEMA);
