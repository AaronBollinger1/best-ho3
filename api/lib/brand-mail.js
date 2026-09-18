// api/lib/brand-mail.js — one sender, one env contract, for every Best-brand property.
//
// ── SOURCE OF TRUTH ─────────────────────────────────────────────────────────────────────────────
//
// This file is maintained as ONE IDENTICAL COPY per brand repository. Do not edit a single copy:
// change it in the source of truth, then port it verbatim to all eight.
//
//   Applicant/internal template structure and the compensation + licence copy
//     → AaronBollinger1/best-group-medical/PRODUCTION-EMAIL-DIVERGENCE.md
//       (captured verbatim from Resend request logs for a real lead, 2026-07-29 18:05 UTC —
//        it is what clients actually received, not a reconstruction)
//   Signed BestAMS website-lead contract (HMAC body, header names, idempotency)
//     → AaronBollinger1/bollinsure-site/api/send-quote.js  (postLeadToBestAMS)
//
// Repos carrying this file: best-art-insurance, best-cyber-liability, best-dp3,
// best-earthquake-insurance, best-group-medical, best-ho3, best-workers-compensation, bestepli.
//
// ── WHY THE SENDER IS ONE ADDRESS ───────────────────────────────────────────────────────────────
//
// quotes@bollinsure.com, apex domain, brand carried in the DISPLAY NAME rather than the mailbox.
// The apex is verified in Resend, has Google MX and a monitored inbox, and its DKIM/SPF/DMARC are
// verified and aligned (p=reject, aspf=r, adkim=s).
//
// It is deliberately NOT updates.bollinsure.com: that subdomain has no MX, so a client who simply
// hits reply to the From address gets a bounce and only Reply-To saves the conversation. Seven
// properties were moved off it on 2026-07-29 for exactly that reason. It is also not reviews@,
// which stays scoped to review requests. Aaron's decision, 2026-09-18.
//
// Transactional mail only. Apex reputation is shared with human Workspace mail, so marketing from
// a brand property would need its own domain that day.

const BOLLINSURE_PHONE_DISPLAY = '562-268-9355';
const BOLLINSURE_PHONE_TEL = '+15622689355';
const BOLLINSURE_QUOTES_MAILBOX = 'quotes@bollinsure.com';
// CA DOI 6013787 is the AGENCY (entity) licence — WJB Services, Inc. dba Bollinsure Insurance
// Services. It is the correct number for advertising by the licensed entity. 0D94699 and 4345268
// are individual producer licences and do not belong in a brand footer. Confirmed 2026-09-18.
const BOLLINSURE_AGENCY_LICENCE = '6013787';

// ── ENV CONTRACT ────────────────────────────────────────────────────────────────────────────────
//
// Exactly seven names are read. Everything else below is a LEGACY ALIAS kept alive so that nothing
// breaks before the Vercel environment is cleaned up — each one logs a single deprecation line
// naming the modern replacement, and none of them is required.

const CANONICAL = {
  RESEND_API_KEY: [],
  FROM_EMAIL: ['RESEND_FROM', 'EMAIL_FROM', 'RESEND_SEND_FROM', 'RESEND_FROM_EMAIL', 'FROM_EMAIL_APPLICANT', 'FROM_EMAIL_BROKER'],
  NOTIFY_TO: ['NOTIFY_EMAIL', 'EMAIL_TO', 'CONTACT_TO_EMAIL', 'RESEND_NOTIFY_TO', 'INTERNAL_COPY_EMAILS', 'EMAIL_BCC', 'COMPANY_EMAIL'],
  REPLY_TO: ['REPLY_TO_EMAIL', 'PUBLIC_CONTACT_EMAIL'],
  BRAND_NAME: [],
  BESTOS_WEBSITE_LEAD_URL: [],
  BESTOS_WEBSITE_LEAD_SECRET: [],
};

function readEnv(name, env) {
  const raw = env[name];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : '';
}

/**
 * Resolve one canonical name, falling back through its legacy aliases.
 *
 * A legacy hit is reported rather than silently honoured: the whole point of keeping the aliases
 * is that the environment can be cleaned up afterwards, and that needs a list of what is still
 * being read from where. Never logs the VALUE — several of these are stored sensitive in Vercel.
 */
function resolveName(canonicalName, env, deprecations) {
  const direct = readEnv(canonicalName, env);
  if (direct) return direct;
  for (const legacy of CANONICAL[canonicalName] || []) {
    const value = readEnv(legacy, env);
    if (value) {
      deprecations.push(`${legacy} -> ${canonicalName}`);
      return value;
    }
  }
  return '';
}

export function splitEmails(value) {
  return String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
}

function uniqueEmails(list) {
  const seen = new Set();
  return list.filter((email) => {
    const key = String(email || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * The whole mail/intake configuration for one brand, resolved once.
 *
 * `brandName` and `siteUrl` are passed by the caller rather than read from env, because they are
 * properties of the repository and not of the deployment — a brand site that renamed itself by
 * changing an env var would send mail that disagrees with its own pages.
 */
export function resolveBrandMail({ brandName, siteUrl, env = process.env } = {}) {
  const deprecations = [];
  const brand = readEnv('BRAND_NAME', env) || brandName || 'Bollinsure';
  const from = resolveName('FROM_EMAIL', env, deprecations)
    || `${brand} — Bollinsure Insurance Services <${BOLLINSURE_QUOTES_MAILBOX}>`;
  const notifyTo = uniqueEmails(splitEmails(resolveName('NOTIFY_TO', env, deprecations) || BOLLINSURE_QUOTES_MAILBOX));
  const replyTo = resolveName('REPLY_TO', env, deprecations) || BOLLINSURE_QUOTES_MAILBOX;

  for (const note of deprecations) {
    console.warn(JSON.stringify({ event: 'brand_mail_deprecated_env', mapping: note, brand }));
  }

  return {
    brandName: brand,
    siteUrl: siteUrl || '',
    apiKey: readEnv('RESEND_API_KEY', env),
    from,
    notifyTo,
    replyTo,
    leadUrl: readEnv('BESTOS_WEBSITE_LEAD_URL', env),
    leadSecret: readEnv('BESTOS_WEBSITE_LEAD_SECRET', env),
    deprecations,
  };
}

// ── WHAT MAY BE ECHOED BACK TO AN APPLICANT ─────────────────────────────────────────────────────
//
// The confirmation repeats what someone typed so they can see we have it right. That is useful for
// a ZIP or an employee count and reckless for a tax id: this mail crosses the public internet and
// lands in a mailbox we do not control. So identifying and financial fields are dropped by KEY, and
// any value that merely LOOKS like a long account number is masked by SHAPE as a second net.

const SENSITIVE_KEY = /(ssn|social.?security|ein\b|fein|tax.?id|dob|date.?of.?birth|birth|credit.?card|card.?number|cvv|account.?number|routing|bank|iban|passport|driver.?licen[cs]e|dl.?number|licen[cs]e.?number|policy.?number|password|secret|token)/i;

// ⚠️ A DATE IS NOT AN ACCOUNT NUMBER. The shape net below counts digits, and `2026-10-01` has
// eight of them separated by dashes — so the first version of this masked a requested effective
// date to "ending 1001" and shipped that to the applicant as their own confirmation. Dates are
// excluded explicitly rather than by lowering the digit threshold, because the threshold is what
// catches a 9-digit EIN.
const DATE_LIKE = /^(\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+Z?)?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})$/;
// Nine digits or more: SSN and EIN are 9, cards are 15-16, account and routing numbers 9+.
// A ZIP (5), a year (4) and a headcount stay legible.
const MIN_MASKED_DIGITS = 9;

export function isSensitiveKey(key) {
  return SENSITIVE_KEY.test(String(key || ''));
}

/** A value safe to print back. Long digit runs are masked to their last four. */
export function safeValue(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return '';
  if (DATE_LIKE.test(text)) return text;
  const digits = text.replace(/\D/g, '');
  // Only a value that is MOSTLY digits is a candidate; "12 Oak St, Pasadena, CA 91101" is an
  // address, not an account number, and must survive intact.
  const mostlyDigits = digits.length >= MIN_MASKED_DIGITS && digits.length >= text.replace(/\s/g, '').length - 4;
  if (mostlyDigits) return `ending ${digits.slice(-4)}`;
  return text;
}

/**
 * Reduce a submission to the handful of facts worth repeating back, sensitive fields removed.
 * `facts` is an array of {label, value} so each brand decides its own vocabulary.
 */
export function safeFacts(facts = []) {
  return facts
    .filter((fact) => fact && fact.label && !isSensitiveKey(fact.label) && !isSensitiveKey(fact.key || ''))
    .map((fact) => ({ label: String(fact.label).trim(), value: safeValue(fact.value) }))
    .filter((fact) => fact.value);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function firstNameFrom(name) {
  const first = String(name || '').trim().split(/\s+/)[0];
  return first || 'Hello';
}

// ── THE APPLICANT CONFIRMATION ──────────────────────────────────────────────────────────────────
//
// Structure is production's (greeting, numbered what-happens-now, the compensation disclosure, the
// licence line). The phone is DIGITS: production printed `562-COVWELL`, which is the same number
// but unreadable to a screen reader, undiallable by a non-US keypad and unsearchable. Aaron's
// standing rule is digits only, never letters.

// ⚠️ THE PRIVACY SENTENCE IS THE CORRECTED ONE, NOT PRODUCTION'S.
//
// Production said "your information goes to us and no one else; it is never sold or shared". That
// was the one sentence in the email a recipient could disprove by reading our own privacy policy:
// it DOES go somewhere else — to the carriers and general agents we ask for rates, which is the
// errand the applicant sent us on — and "never shared" collides with the policy's own admission
// that a Google Ads identifier counts as sharing under the CPRA. best-group-medical corrected it
// before this unification; the corrected wording is narrower, true, and keeps the part that
// actually distinguishes a broker from a lead marketplace. Do not restore the original.

export function renderApplicantConfirmation({ brandName, siteUrl, privacyUrl, contactName, lineOfBusiness, facts = [] }) {
  const brand = String(brandName || 'Bollinsure').trim();
  const privacyHref = String(privacyUrl || (siteUrl ? `${String(siteUrl).replace(/\/$/, '')}/privacy` : '')).trim();
  const greeting = firstNameFrom(contactName);
  const line = String(lineOfBusiness || '').trim();
  const shown = safeFacts(facts);
  const footer = `Bollinsure Insurance Services · CA DOI Lic. ${BOLLINSURE_AGENCY_LICENCE} · ${siteUrl}`;
  const subject = `We have your ${brand} request — what happens next`;

  const factRows = shown.map((fact) => `
      <tr>
        <td style="padding:4px 12px 4px 0;color:#5b6353;vertical-align:top;white-space:nowrap;">${escapeHtml(fact.label)}</td>
        <td style="padding:4px 0;color:#1c211c;vertical-align:top;">${escapeHtml(fact.value)}</td>
      </tr>`).join('');

  const html = `<div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;color:#1c211c;line-height:1.65;">
  <p style="font-size:1.05rem;margin:0 0 16px;">${escapeHtml(greeting)},</p>
  <p style="margin:0 0 16px;">Your ${escapeHtml(brand)} request is in. Here is exactly what happens now, so you are not left wondering.</p>
  <p style="margin:0 0 8px;font-weight:bold;">What we received</p>
  <table style="margin:0 0 18px;border-collapse:collapse;font-size:0.95rem;">
      <tr>
        <td style="padding:4px 12px 4px 0;color:#5b6353;vertical-align:top;white-space:nowrap;">Coverage</td>
        <td style="padding:4px 0;color:#1c211c;vertical-align:top;">${escapeHtml(line || brand)}</td>
      </tr>
      <tr>
        <td style="padding:4px 12px 4px 0;color:#5b6353;vertical-align:top;white-space:nowrap;">Name</td>
        <td style="padding:4px 0;color:#1c211c;vertical-align:top;">${escapeHtml(contactName || '')}</td>
      </tr>${factRows}
  </table>
  <p style="margin:0 0 8px;font-weight:bold;">What happens next</p>
  <ol style="margin:0 0 18px;padding-left:20px;">
    <li style="margin-bottom:8px;">A licensed California broker reviews your details and replies within one business day.</li>
    <li style="margin-bottom:8px;">We request indications from every carrier we hold an appointment with.</li>
    <li style="margin-bottom:8px;">You get them side by side, with the numbers in writing.</li>
  </ol>
  <p style="margin:0 0 16px;">Two things worth knowing while you wait. You pay us nothing &mdash; carriers pay our commission out of their state-filed rates, and we print that dollar amount on every quote we send you. And your request is never sold: it goes to us and to the carriers we ask for your rates, and never to another agency or a lead buyer.${privacyHref ? ` Our <a href="${escapeHtml(privacyHref)}" style="color:#0f5132;">privacy policy</a> lists everyone who touches it.` : ''}</p>
  <p style="margin:0 0 16px;">Questions? Call <a href="tel:${BOLLINSURE_PHONE_TEL}" style="color:#0f5132;">${BOLLINSURE_PHONE_DISPLAY}</a> or email <a href="mailto:${BOLLINSURE_QUOTES_MAILBOX}" style="color:#0f5132;">${BOLLINSURE_QUOTES_MAILBOX}</a>.</p>
  <p style="margin:0 0 6px;">&mdash; Bollinsure Insurance Services</p>
  <p style="margin:0;font-size:0.82rem;color:#5b6353;">${escapeHtml(footer)}<br>
  Independent insurance broker. This message is a confirmation of your request and is not an offer of coverage or a binding quote.</p>
</div>`;

  const text = [
    `${greeting},`,
    '',
    `Your ${brand} request is in. Here is exactly what happens now, so you are not left wondering.`,
    '',
    'What we received',
    `  Coverage: ${line || brand}`,
    `  Name: ${contactName || ''}`,
    ...shown.map((fact) => `  ${fact.label}: ${fact.value}`),
    '',
    'What happens next',
    '  1. A licensed California broker reviews your details and replies within one business day.',
    '  2. We request indications from every carrier we hold an appointment with.',
    '  3. You get them side by side, with the numbers in writing.',
    '',
    'You pay us nothing - carriers pay our commission out of their state-filed rates, and we print',
    'that dollar amount on every quote we send you. Your request is never sold: it goes to us and',
    'to the carriers we ask for your rates, and never to another agency or a lead buyer.',
    ...(privacyHref ? [`Our privacy policy lists everyone who touches it: ${privacyHref}`] : []),
    '',
    `Questions? Call ${BOLLINSURE_PHONE_DISPLAY} or email ${BOLLINSURE_QUOTES_MAILBOX}.`,
    '',
    '- Bollinsure Insurance Services',
    footer,
    'Independent insurance broker. This message is a confirmation of your request and is not an',
    'offer of coverage or a binding quote.',
  ].join('\n');

  return { subject, html, text, footer };
}

// ── THE INTERNAL NOTIFICATION ───────────────────────────────────────────────────────────────────
//
// Production's shape: a sectioned table under one honest caption, Reply-To set to the requester so
// a broker can answer by hitting reply. Sensitive fields are NOT stripped here — this one goes to
// the agency's own monitored mailbox and the broker needs the full submission.

export function renderInternalNotification({ brandName, contactName, contactEmail, contactPhone, lineOfBusiness, sections = [], caption }) {
  const brand = String(brandName || 'Bollinsure').trim();
  const who = String(contactName || contactEmail || 'Website visitor').trim();
  const subject = `New ${brand} request — ${who}`;
  const intro = caption || 'Simple quote request only. Not a full carrier application.';

  const renderRows = (rows = []) => (rows || [])
    .filter((row) => row && row.label && String(row.value ?? '').trim())
    .map((row) => `
        <tr>
          <td style="padding:4px 12px 4px 0;color:#5b6353;vertical-align:top;white-space:nowrap;">${escapeHtml(row.label)}</td>
          <td style="padding:4px 0;color:#1c211c;vertical-align:top;">${escapeHtml(row.value)}</td>
        </tr>`).join('');

  const contactSection = {
    title: 'Contact',
    rows: [
      { label: 'Name', value: contactName || '' },
      { label: 'Email', value: contactEmail || '' },
      { label: 'Phone', value: contactPhone || '' },
      { label: 'Coverage', value: lineOfBusiness || '' },
      { label: 'Completed at', value: new Date().toISOString() },
    ],
  };

  const allSections = [...sections, contactSection]
    .filter((section) => section && renderRows(section.rows));

  const html = `<div style="font-family:Georgia,'Times New Roman',serif;max-width:640px;color:#1c211c;line-height:1.6;">
  <p style="margin:0 0 16px;font-size:0.9rem;color:#5b6353;">${escapeHtml(intro)}</p>
${allSections.map((section) => `  <p style="margin:0 0 6px;font-weight:bold;">${escapeHtml(section.title)}</p>
  <table style="margin:0 0 16px;border-collapse:collapse;font-size:0.95rem;">${renderRows(section.rows)}
  </table>`).join('\n')}
</div>`;

  const text = [
    intro,
    '',
    ...allSections.flatMap((section) => [
      section.title,
      ...(section.rows || [])
        .filter((row) => row && row.label && String(row.value ?? '').trim())
        .map((row) => `  ${row.label}: ${row.value}`),
      '',
    ]),
  ].join('\n');

  return { subject, html, text };
}

// ── SENDING ─────────────────────────────────────────────────────────────────────────────────────

async function sendOne(config, { to, subject, html, text, replyTo, idempotencyKey, attachments }) {
  if (!config.apiKey) {
    console.error(JSON.stringify({ event: 'brand_mail_not_sent', reason: 'no_resend_api_key', subject }));
    return { ok: false, reason: 'no_resend_api_key' };
  }
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    'User-Agent': 'bollinsure-brand-mail/1.0',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: config.from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        reply_to: replyTo || config.replyTo,
        // Carrier packets (filled ACORD / application PDFs) ride on the INTERNAL notification only.
        // The applicant confirmation never carries an attachment: it is a receipt, and a PDF on it
        // is one more thing to scan and one more way to trip a spam filter on a transactional send.
        ...(attachments && attachments.length ? { attachments } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(JSON.stringify({ event: 'brand_mail_send_failed', status: res.status, subject, detail: detail.slice(0, 300) }));
      return { ok: false, reason: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error(JSON.stringify({ event: 'brand_mail_send_failed', subject, error: err?.message || 'unknown' }));
    return { ok: false, reason: 'exception' };
  }
}

// ── THE SIGNED BESTAMS HOP ──────────────────────────────────────────────────────────────────────
//
// Same contract bollinsure-site uses: HMAC-SHA256 over the raw JSON body, `sha256=<hex>` in
// `x-bestos-signature`, a stable `Idempotency-Key`, and `sent_at` + `nonce` INSIDE the signed body
// so a captured signature expires and cannot be replayed verbatim. Enforcement of that window is
// the receiver's half; sending the fields is what makes it possible.
//
// FAIL-OPEN FOR THE VISITOR, and the asymmetry is deliberate. By the time this runs the applicant
// has already been told we have their request, and that is true — the broker has the notification.
// A CRM write that did not land is an operational failure to log and retry, not a reason to show a
// person an error about something that did work.

function hex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function postLeadToBestAMS(config, lead, idempotencyKey) {
  if (!config.leadUrl) {
    console.warn(JSON.stringify({ event: 'bestos_lead_intake_skipped', reason: 'url_not_set' }));
    return 'skipped';
  }
  if (!config.leadSecret) {
    console.error(JSON.stringify({ event: 'bestos_lead_intake_failed', reason: 'secret_not_set' }));
    return 'failed';
  }
  try {
    const raw = JSON.stringify({
      ...lead,
      sent_at: new Date().toISOString(),
      nonce: hex(crypto.getRandomValues(new Uint8Array(16)).buffer),
    });
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(config.leadSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = `sha256=${hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))}`;
    const res = await fetch(config.leadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bestos-signature': signature,
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: raw,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(JSON.stringify({ event: 'bestos_lead_intake_failed', status: res.status, detail: detail.slice(0, 300) }));
      return 'failed';
    }
    return 'recorded';
  } catch (err) {
    console.error(JSON.stringify({ event: 'bestos_lead_intake_failed', error: err?.message || 'unknown' }));
    return 'failed';
  }
}

/**
 * One submission → one internal notification, one applicant confirmation, one signed BestAMS post.
 *
 * ORDER IS LOAD-BEARING. The broker notification goes first: if only one message can get out, the
 * one that reaches a human who can act is worth more than the one that reassures. The applicant
 * confirmation follows, and the CRM hop is last and fail-open.
 */
export async function handleBrandSubmission({
  brandName,
  brandKey,
  siteUrl,
  privacyUrl,
  submissionId,
  contactName,
  contactEmail,
  contactPhone,
  businessName,
  lineOfBusiness,
  insuranceType,
  applicantFacts = [],
  internalSections = [],
  internalCaption,
  internalAttachments = [],
  // A brand whose broker packet is genuinely its own — a filled ACORD table, a carrier-specific
  // underwriting grid — passes its existing subject and HTML straight through. Unification is
  // about the SENDER, the RECIPIENTS, the applicant confirmation and the CRM hop; it was never
  // about forcing eight different underwriting submissions into one table.
  internalSubject,
  internalHtml,
  notes,
  details = {},
  consent,
  env = process.env,
}) {
  const config = resolveBrandMail({ brandName, siteUrl, env });
  const id = submissionId || `${brandKey}-${Date.now()}`;

  const generatedInternal = renderInternalNotification({
    brandName: config.brandName,
    contactName, contactEmail, contactPhone, lineOfBusiness,
    sections: internalSections,
    caption: internalCaption,
  });
  const internal = {
    subject: internalSubject || generatedInternal.subject,
    html: internalHtml || generatedInternal.html,
    text: internalHtml ? undefined : generatedInternal.text,
  };
  const internalResult = await sendOne(config, {
    to: config.notifyTo,
    subject: internal.subject,
    html: internal.html,
    text: internal.text,
    // Reply-To the requester, so a broker answers the client by hitting reply.
    replyTo: contactEmail || config.replyTo,
    attachments: internalAttachments,
    idempotencyKey: `${id}:notification`,
  });

  const confirmation = renderApplicantConfirmation({
    brandName: config.brandName,
    siteUrl: config.siteUrl,
    privacyUrl,
    contactName, lineOfBusiness,
    facts: applicantFacts,
  });
  const confirmationResult = contactEmail
    ? await sendOne(config, {
        to: contactEmail,
        subject: confirmation.subject,
        html: confirmation.html,
        text: confirmation.text,
        // Reply-To the monitored quotes box, so a client reply reaches the agency.
        replyTo: config.replyTo,
        idempotencyKey: `${id}:confirmation`,
      })
    : { ok: false, reason: 'no_applicant_email' };

  const leadStatus = await postLeadToBestAMS(config, {
    brand_key: brandKey,
    sourceDomain: (config.siteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
    submissionKind: 'initial',
    submission_id: id,
    contactName: contactName || 'Website visitor',
    contactEmail: contactEmail || '',
    contactPhone: contactPhone || '',
    businessName: businessName || '',
    insuranceType: insuranceType || lineOfBusiness || '',
    lineOfBusiness: lineOfBusiness || '',
    notes: notes || '',
    details: { ...details, brand_key: brandKey, website_workflow: 'brand_site_submission_v1' },
    ...(consent ? { consent } : {}),
  }, `${id}:lead`);

  return { config, internal: internalResult, confirmation: confirmationResult, leadStatus, confirmationRender: confirmation, internalRender: internal };
}

export const BRAND_MAIL_CONSTANTS = {
  PHONE_DISPLAY: BOLLINSURE_PHONE_DISPLAY,
  PHONE_TEL: BOLLINSURE_PHONE_TEL,
  QUOTES_MAILBOX: BOLLINSURE_QUOTES_MAILBOX,
  AGENCY_LICENCE: BOLLINSURE_AGENCY_LICENCE,
  CANONICAL_ENV: Object.keys(CANONICAL),
  LEGACY_ENV: Object.entries(CANONICAL).flatMap(([name, aliases]) => aliases.map((alias) => `${alias} -> ${name}`)),
};
