/* Provider-neutral personal-lines quoting boundary.
   Zywave authentication, endpoints, request schema, and polling/webhook rules
   are intentionally not guessed. Their adapter will implement quote() after
   the contracted documentation and sandbox are available.

   The quote contract is line-neutral: a per-line SCHEMA REGISTRY (LINE_SCHEMAS)
   describes how to build the line-specific application payload from raw fields
   and how to validate it. The transport envelope and the shared applicant block
   are identical across lines (homeowners, auto, umbrella, flood, ...); only the
   registry entry differs. Register new lines with registerLine(line, schema). */

export const QUOTE_CONTRACT_VERSION = "bestbrands.quote.v1";
export const RESULT_STATUSES = new Set(["quoted", "referred", "declined", "error"]);

function text(value, max = 500) {
  return String(value == null ? "" : value).replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function number(value) {
  const parsed = Number(String(value == null ? "" : value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

// Applicant is shared across every line of business.
function buildApplicant(fields) {
  return {
    fullName: text(fields.applicant_full_name, 120),
    dateOfBirth: text(fields.applicant_dob, 20),
    email: text(fields.applicant_email, 254),
    phone: text(fields.applicant_phone, 40)
  };
}

/* SCHEMA REGISTRY, keyed by line. Each entry is a pure descriptor:
   - build(fields, losses): returns the line-specific application payload
     (risk/coverage/losses/etc.), which is spread alongside the shared applicant.
   - validate(application): returns an array of error keys for the line's
     required fields + format checks. */
export const LINE_SCHEMAS = {
  homeowners: {
    build(fields, losses) {
      return {
        form: text(fields.policy_form || "HO3", 12),
        pathway: text(fields.pathway || "owner", 20),
        risk: {
          address1: text(fields.risk_address, 160),
          city: text(fields.risk_city, 80),
          county: text(fields.risk_county, 80),
          state: text(fields.risk_state, 2).toUpperCase(),
          postalCode: text(fields.risk_zip, 10),
          occupancy: text(fields.occupancy, 30),
          usage: text(fields.usage, 30),
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
          medicalPayments: number(fields.med_pay_limit),
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
  }
};

// Register (or override) the schema descriptor for a line of business.
export function registerLine(line, schema) {
  LINE_SCHEMAS[text(line, 40)] = schema;
  return LINE_SCHEMAS;
}

// Map a policy form to its line so legacy callers passing only policy_form
// still resolve to the right line (e.g. "HO3"/"HO5" => homeowners).
function impliedLineFromForm(form) {
  const value = text(form, 12).toUpperCase();
  if (/^HO/.test(value)) return "homeowners";
  return "";
}

function resolveLine(line, payload, fields) {
  return line || payload.line || impliedLineFromForm(fields.policy_form) || "homeowners";
}

export function buildQuoteEnvelope(payload = {}, line) {
  const fields = payload.fields || {};
  const losses = Array.isArray(payload.lossRows) ? payload.lossRows.slice(0, 4) : [];
  const resolvedLine = resolveLine(line, payload, fields);
  const schema = LINE_SCHEMAS[resolvedLine];

  return {
    contractVersion: QUOTE_CONTRACT_VERSION,
    line: resolvedLine,
    application: {
      applicant: buildApplicant(fields),
      ...(schema ? schema.build(fields, losses) : {})
    }
  };
}

export function validateQuoteEnvelope(envelope) {
  const errors = [];
  if (!envelope || envelope.contractVersion !== QUOTE_CONTRACT_VERSION) errors.push("contractVersion");
  const schema = envelope && envelope.line ? LINE_SCHEMAS[envelope.line] : undefined;
  if (!schema) {
    errors.push("line");
    return { valid: false, errors };
  }
  const application = (envelope && envelope.application) || {};
  errors.push(...schema.validate(application));
  return { valid: errors.length === 0, errors };
}

export function normalizeQuoteResults(providerResponse = {}) {
  const results = Array.isArray(providerResponse.results) ? providerResponse.results : [];
  return {
    contractVersion: QUOTE_CONTRACT_VERSION,
    providerRequestId: text(providerResponse.providerRequestId, 120),
    status: text(providerResponse.status || (results.length ? "complete" : "pending"), 30),
    results: results.map((result) => {
      const status = RESULT_STATUSES.has(result.status) ? result.status : "error";
      return {
        carrierId: text(result.carrierId, 100),
        carrierName: text(result.carrierName, 120),
        status,
        annualPremium: status === "quoted" ? number(result.annualPremium) : 0,
        dwelling: number(result.dwelling),
        deductible: number(result.deductible),
        message: text(result.message, 500),
        bridgeUrl: /^https:\/\//.test(text(result.bridgeUrl, 1000)) ? text(result.bridgeUrl, 1000) : ""
      };
    })
  };
}

export async function requestProviderQuotes(payload, adapter) {
  const envelope = buildQuoteEnvelope(payload);
  const validation = validateQuoteEnvelope(envelope);
  if (!validation.valid) {
    return { ok: false, status: "invalid_application", errors: validation.errors, contractVersion: QUOTE_CONTRACT_VERSION };
  }
  if (!adapter || typeof adapter.quote !== "function") {
    return {
      ok: false,
      status: "provider_configuration_required",
      contractVersion: QUOTE_CONTRACT_VERSION,
      message: "Carrier-connected rating is not configured. Continue with licensed broker review."
    };
  }
  const response = await adapter.quote(envelope);
  return { ok: true, ...normalizeQuoteResults(response) };
}
