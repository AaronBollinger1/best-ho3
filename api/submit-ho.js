import { Resend } from "resend";

/* Legacy / fallback intake: full wizard answers by email, no PDF generation.
   Used when the applicant clicks "Submit without signing" (e.g., the PDF
   preview could not be built on their device). The broker prepares the
   ACORD 80 from these answers instead. */

const FROM_ADDRESS = process.env.FROM_EMAIL || "BestHO3 <quotes@bestho3.com>";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "quotes@bollinsure.com";
const RL = new Map();

function clean(v, max = 700) {
  if (v == null) return "";
  return String(v).replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function money(v) {
  const n = Number(String(v || "").replace(/[^0-9.]/g, "")) || 0;
  return n ? "$" + Math.round(n).toLocaleString("en-US") : "";
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

const LABELS = [
  ["applicant_full_name", "Applicant"],
  ["applicant_dob", "Date of birth"],
  ["applicant_occupation", "Occupation"],
  ["applicant_email", "Email"],
  ["applicant_phone", "Phone"],
  ["applicant_phone_type", "Phone type"],
  ["policy_form", "Policy form"],
  ["pathway", "Pathway"],
  ["risk_address", "Property address"],
  ["risk_city", "City"],
  ["risk_county", "County"],
  ["risk_state", "State"],
  ["risk_zip", "ZIP"],
  ["in_city_limits", "In city limits"],
  ["mailing_same", "Mailing same as property"],
  ["mailing_address", "Mailing address"],
  ["mailing_city", "Mailing city"],
  ["mailing_state", "Mailing state"],
  ["mailing_zip", "Mailing ZIP"],
  ["occupancy", "Occupancy"],
  ["usage", "Usage"],
  ["residence_type", "Residence type"],
  ["number_of_families", "Families"],
  ["year_built", "Year built"],
  ["total_living_area", "Total living area (sq ft)"],
  ["construction_type", "Construction"],
  ["foundation_type", "Foundation"],
  ["roof_material", "Roof material"],
  ["roof_condition", "Roof condition"],
  ["plumbing_condition", "Plumbing condition"],
  ["housekeeping", "Housekeeping"],
  ["wiring_type", "Wiring type"],
  ["electrical_panel", "Electrical panel"],
  ["electrical_amps", "Panel amps"],
  ["roof_updated", "Roof updated"],
  ["roof_update_year", "Roof update year"],
  ["heating_updated", "Heating updated"],
  ["heating_update_year", "Heating update year"],
  ["plumbing_updated", "Plumbing updated"],
  ["plumbing_update_year", "Plumbing update year"],
  ["wiring_updated", "Electrical updated"],
  ["wiring_update_year", "Electrical update year"],
  ["door_locks", "Door locks"],
  ["burglar_alarm", "Burglar alarm"],
  ["smoke_alarm", "Smoke alarm"],
  ["sprinklers", "Sprinklers"],
  ["fire_extinguisher", "Fire extinguisher"],
  ["swimming_pool", "Swimming pool"],
  ["pool_fence", "Pool fence"],
  ["pool_diving_board", "Diving board"],
  ["pool_slide", "Pool slide"],
  ["wildfire_exposure", "Brush/wildfire exposure"],
  ["dwelling_limit", "Dwelling limit (Cov A)"],
  ["deductible", "Deductible"],
  ["personal_liability_limit", "Liability (Cov E)"],
  ["med_pay_limit", "Med pay (Cov F)"],
  ["effective_date", "Desired effective date"],
  ["no_prior_coverage", "No prior coverage"],
  ["prior_insurer_1", "Current/most recent carrier"],
  ["prior_insurer_2", "Prior carrier"],
  ["prior_expiration", "Current policy expiration"],
  ["no_losses", "No losses (5 yrs)"],
  ["q_owner", "Q1 Owner of property"],
  ["q_hazard", "Q2 Flood/brush/fire/landslide hazard"],
  ["q_code_violation", "Q3 Uncorrected code violations"],
  ["q_business", "Q4 Business on premises"],
  ["q_employees", "Q5 Residence employees"],
  ["q_animals", "Q6 Animals/exotic pets"],
  ["q_trampoline", "Q7 Trampoline"],
  ["q_commercial_300ft", "Q8 Within 300ft of commercial"],
  ["q_co_alarm", "Q9 CO alarm near bedrooms"],
  ["q_lead_paint", "Q10 Lead paint"],
  ["q_for_sale", "Q11 Dwelling for sale"],
  ["q_converted", "Q12 Converted structure"],
  ["q_declined_cancelled", "Q13 Declined/cancelled/non-renewed"],
  ["q_bankruptcy", "Q14 Foreclosure/bankruptcy"],
  ["q_lien", "Q15 Judgment/lien"],
  ["q_fraud_arson", "Q16 Fraud/bribery/arson conviction"],
  ["q_explanations", "Yes-answer explanations"],
  ["additional_notes", "Notes"]
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const ip = ipFrom(req);
    if (rateLimited(ip)) return res.status(429).json({ error: "Too many requests. Please wait a minute." });
    const payload = req.body || {};
    const f = payload.fields || {};
    if (payload.website_hp || f.website_hp) return res.status(200).json({ ok: true });

    for (const k of ["applicant_full_name", "applicant_email", "applicant_phone", "risk_address", "risk_city", "risk_zip"]) {
      if (!clean(f[k])) return res.status(400).json({ error: "Missing required field.", field: k });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean(f.applicant_email, 254))) return res.status(400).json({ error: "Valid email is required." });

    const quote = payload.quote || {};
    const lossRows = Array.isArray(payload.lossRows) ? payload.lossRows.slice(0, 4) : [];

    const lines = [];
    lines.push("Homeowner quote request (no e-signature — broker prepares the ACORD 80).");
    if (quote.low && quote.high) lines.push(`Website indication: ${money(quote.low)}-${money(quote.high)}/yr (${clean(quote.form || "")}) — preliminary only.`);
    lines.push("");
    for (const [key, label] of LABELS) {
      const v = clean(f[key], 900);
      if (v) lines.push(`${label}: ${v}`);
    }
    if (lossRows.length) {
      lines.push("");
      lines.push("Losses (last 5 years):");
      lossRows.forEach((r, i) => lines.push(`  ${i + 1}. ${clean(r.date, 20)} — ${clean(r.description, 200)} — ${money(r.amount)}`));
    }
    lines.push("");
    lines.push(`Submitted from IP ${ip} at ${new Date().toISOString()}.`);

    if (!process.env.RESEND_API_KEY && process.env.VERCEL_ENV === "production") {
      console.error("[submit-ho] RESEND_API_KEY missing in production — submission NOT delivered:", clean(f.applicant_full_name));
      return res.status(500).json({ error: "Submission could not be delivered. Please call 310-804-5017 or email quotes@bollinsure.com." });
    }
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: [NOTIFY_EMAIL],
        cc: clean(f.applicant_email, 254) ? [clean(f.applicant_email, 254)] : undefined,
        reply_to: clean(f.applicant_email, 254),
        subject: "Homeowner quote request - " + clean(f.applicant_full_name, 120) + " - " + clean(f.risk_city, 60),
        text: lines.join("\n")
      });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Unable to submit. Please call 310-804-5017." });
  }
}
