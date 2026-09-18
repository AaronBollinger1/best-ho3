// scripts/test-brand-mail.mjs — renders both brand emails from fixture data and asserts the
// contract. Sends nothing: `fetch` is replaced with a recorder for the duration of the run, so a
// missing stub shows up as a failed assertion rather than as real mail.
//
// Run: node scripts/test-brand-mail.mjs
//
// Source of truth for the module under test: see the header of api/lib/brand-mail.js.

import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  resolveBrandMail,
  renderApplicantConfirmation,
  renderInternalNotification,
  handleBrandSubmission,
  safeFacts,
  BRAND_MAIL_CONSTANTS,
} from '../api/lib/brand-mail.js';

const BRAND = 'Best HO-3';
const SITE = 'https://www.bestho3.com';
const BRAND_KEY = 'best-ho3';
const PRIVACY = 'https://www.bestho3.com/privacy';

const fixture = {
  contactName: 'Dana Ruiz',
  contactEmail: 'dana@example.com',
  contactPhone: '555-201-4477',
  businessName: 'Ruiz Studio LLC',
  lineOfBusiness: 'Homeowners (HO-3)',
  applicantFacts: [
    { label: 'ZIP', value: '90212' },
    { label: 'Employees', value: '12' },
    // Must be dropped by key, never echoed to a mailbox we do not control.
    { label: 'SSN', value: '123-45-6789' },
    { label: 'Tax ID', value: '95-1234567' },
    // Must be masked by shape even though the label looks innocent.
    { label: 'Reference', value: '4111 1111 1111 1234' },
  ],
  internalSections: [{ title: 'Request', rows: [{ label: 'ZIP', value: '90212' }, { label: 'Employees', value: '12' }] }],
};

// ── 1. No legacy env name is REQUIRED ───────────────────────────────────────────────────────────
{
  const bare = resolveBrandMail({ brandName: BRAND, siteUrl: SITE, env: {} });
  assert.equal(bare.from, `${BRAND} — Bollinsure Insurance Services <quotes@bollinsure.com>`, 'default sender is the apex quotes mailbox');
  assert.deepEqual(bare.notifyTo, ['quotes@bollinsure.com'], 'default NOTIFY_TO');
  assert.equal(bare.replyTo, 'quotes@bollinsure.com', 'default REPLY_TO');
  assert.deepEqual(bare.deprecations, [], 'an empty environment reads no legacy name');

  // Canonical names alone must satisfy the contract with no legacy alias present.
  const canonical = resolveBrandMail({
    brandName: BRAND,
    siteUrl: SITE,
    env: {
      RESEND_API_KEY: 'test-key',
      FROM_EMAIL: `${BRAND} — Bollinsure Insurance Services <quotes@bollinsure.com>`,
      NOTIFY_TO: 'quotes@bollinsure.com, ops@bollinsure.com',
      REPLY_TO: 'quotes@bollinsure.com',
      BRAND_NAME: BRAND,
      BESTOS_WEBSITE_LEAD_URL: 'https://www.bestams.com/api/inbound/website-lead',
      BESTOS_WEBSITE_LEAD_SECRET: 'test-secret',
    },
  });
  assert.deepEqual(canonical.deprecations, [], 'canonical names alone produce no deprecation');
  assert.deepEqual(canonical.notifyTo, ['quotes@bollinsure.com', 'ops@bollinsure.com'], 'NOTIFY_TO is a comma list');

  // Every legacy alias still resolves, and says so once.
  for (const mapping of BRAND_MAIL_CONSTANTS.LEGACY_ENV) {
    const [legacy, canonicalName] = mapping.split(' -> ');
    const resolved = resolveBrandMail({ brandName: BRAND, siteUrl: SITE, env: { [legacy]: 'legacy@example.com' } });
    assert.ok(resolved.deprecations.includes(mapping), `${legacy} is still honored and reported as ${canonicalName}`);
  }
}

// ── 2. The applicant confirmation ───────────────────────────────────────────────────────────────
{
  const mail = renderApplicantConfirmation({
    brandName: BRAND, siteUrl: SITE,
    contactName: fixture.contactName, lineOfBusiness: fixture.lineOfBusiness, facts: fixture.applicantFacts,
    privacyUrl: PRIVACY,
  });

  assert.equal(mail.subject, `We have your ${BRAND} request — what happens next`, 'subject');

  // The exact sentence, asserted on the plain-text body — the HTML one carries the same words
  // split across <a> tags, so it is checked component-wise just below.
  assert.ok(
    mail.text.includes('Questions? Call 562-268-9355 or email quotes@bollinsure.com.'),
    'the exact questions line',
  );
  assert.ok(/Questions\? Call <a href="tel:\+15622689355"[^>]*>562-268-9355<\/a> or email <a href="mailto:quotes@bollinsure\.com"[^>]*>quotes@bollinsure\.com<\/a>\./.test(mail.html),
    'the same questions line in HTML, linked');

  for (const body of [mail.html, mail.text]) {
    // Phone: digits only, never letters. Production printed `562-COVWELL`.
    assert.ok(body.includes('562-268-9355'), 'phone is printed as digits');
    assert.ok(!/562-[A-Za-z]/.test(body), 'no letter phone (562-COVWELL) anywhere');
    // Footer.
    assert.ok(body.includes(`Bollinsure Insurance Services · CA DOI Lic. 6013787 · ${SITE}`), 'exact footer');
    // What happens next.
    assert.ok(body.includes('licensed California broker reviews your details and replies within one business day'), 'one-business-day promise');
    // Compensation disclosure, carried over from the canonical production copy.
    assert.ok(/carriers pay our commission out of their state-filed rates/.test(body), 'compensation disclosure retained');
    // ...but NOT production's disprovable privacy sentence. best-group-medical corrected it before
    // this unification; restoring it would put a claim in the email our own policy contradicts.
    assert.ok(!/never sold or shared/.test(body), 'the disprovable "never sold or shared" claim is not used');
    assert.ok(/never to another agency or a lead buyer/.test(body), 'the corrected privacy sentence is used');
    assert.ok(body.includes(PRIVACY), 'the privacy policy is linked at its real path for this brand');
    // Echo of what was received, minus anything sensitive.
    assert.ok(body.includes('90212'), 'non-sensitive facts are echoed');
    assert.ok(!body.includes('123-45-6789'), 'SSN is never echoed');
    assert.ok(!body.includes('95-1234567'), 'tax id is never echoed');
    assert.ok(!body.includes('4111 1111 1111 1234'), 'long digit runs are not echoed verbatim');
    assert.ok(body.includes('ending 1234'), 'a long digit run is masked to its last four');
  }
  assert.ok(mail.html.includes('href="tel:+15622689355"'), 'tel: link is digits only');
}

// ── 3. The internal notification ────────────────────────────────────────────────────────────────
{
  const mail = renderInternalNotification({
    brandName: BRAND,
    contactName: fixture.contactName, contactEmail: fixture.contactEmail,
    contactPhone: fixture.contactPhone, lineOfBusiness: fixture.lineOfBusiness,
    sections: fixture.internalSections,
  });
  assert.equal(mail.subject, `New ${BRAND} request — ${fixture.contactName}`, 'internal subject names the brand and requester');
  assert.ok(mail.html.includes(fixture.contactEmail), 'internal mail carries the requester address');
  assert.ok(mail.text.includes('Employees: 12'), 'internal mail carries the submitted detail');
}

// ── 4. End to end, with fetch recorded rather than performed ────────────────────────────────────
{
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, text: async () => '{}', json: async () => ({}) };
  };

  const result = await handleBrandSubmission({
    ...fixture,
    brandName: BRAND, brandKey: BRAND_KEY, siteUrl: SITE, privacyUrl: PRIVACY, submissionId: 'fixture-1',
    env: {
      RESEND_API_KEY: 'test-key',
      BESTOS_WEBSITE_LEAD_URL: 'https://www.bestams.com/api/inbound/website-lead',
      BESTOS_WEBSITE_LEAD_SECRET: 'test-secret',
    },
  });

  const emails = calls.filter((call) => call.url.includes('api.resend.com'));
  assert.equal(emails.length, 2, 'exactly one internal notification and one applicant confirmation');

  const notification = JSON.parse(emails[0].init.body);
  const confirmation = JSON.parse(emails[1].init.body);

  // One sender for both.
  assert.equal(notification.from, confirmation.from, 'both messages use one sender');
  assert.equal(confirmation.from, `${BRAND} — Bollinsure Insurance Services <quotes@bollinsure.com>`, 'sender is the apex quotes mailbox');

  // Reply-To: internal replies reach the client, client replies reach the agency.
  assert.deepEqual(notification.to, ['quotes@bollinsure.com'], 'notification goes to NOTIFY_TO');
  assert.equal(notification.reply_to, fixture.contactEmail, 'notification Reply-To is the requester');
  assert.deepEqual(confirmation.to, [fixture.contactEmail], 'confirmation goes to the applicant');
  assert.equal(confirmation.reply_to, 'quotes@bollinsure.com', 'confirmation Reply-To is the monitored quotes box');

  // The signed BestAMS hop.
  const lead = calls.find((call) => call.url.includes('website-lead'));
  assert.ok(lead, 'the submission is posted to BestAMS');
  // THE SIGNATURE IS RECOMPUTED, NOT SHAPE-CHECKED. A 64-hex assertion passes for a random digest
  // or an HMAC over different bytes, which is exactly the failure the signed hop exists to prevent.
  const expected = `sha256=${createHmac('sha256', 'test-secret').update(lead.init.body).digest('hex')}`;
  assert.equal(lead.init.headers['x-bestos-signature'], expected, 'the signature is HMAC-SHA256 over the exact raw body with the configured secret');

  const body = JSON.parse(lead.init.body);
  assert.equal(body.brand_key, BRAND_KEY, 'brand_key identifies the property');
  assert.ok(body.sent_at && body.nonce, 'sent_at and nonce are inside the signed body');
  // One identifier per submission, in the signed body AND as the idempotency key, so a retry of
  // one submission dedupes while two genuine requests from one person never collapse.
  assert.ok(body.submission_id, 'the signed body carries a submission_id');
  assert.equal(lead.init.headers['Idempotency-Key'], body.submission_id, 'the idempotency key IS the submission id');
  assert.equal(body.details.submission_id, body.submission_id, 'the details bag carries the same id');
  assert.equal(result.submissionId, body.submission_id);
  assert.equal(result.leadStatus, 'recorded');
  assert.equal(result.ok, true, 'both sends succeeded');

  // Two submissions must not share an identifier.
  const second = await handleBrandSubmission({
    ...fixture, brandName: BRAND, brandKey: BRAND_KEY, siteUrl: SITE, privacyUrl: PRIVACY,
    env: { RESEND_API_KEY: 'test-key', BESTOS_WEBSITE_LEAD_URL: 'https://www.bestams.com/api/inbound/website-lead', BESTOS_WEBSITE_LEAD_SECRET: 'test-secret' },
  });
  assert.notEqual(second.submissionId, result.submissionId, 'each submission gets its own identifier');

  // A caller that already owns an identifier keeps it.
  const supplied = await handleBrandSubmission({
    ...fixture, brandName: BRAND, brandKey: BRAND_KEY, siteUrl: SITE, privacyUrl: PRIVACY, submissionId: 'audit-abc',
    env: { RESEND_API_KEY: 'test-key' },
  });
  assert.equal(supplied.submissionId, 'audit-abc', 'a caller-supplied submission id is used verbatim');

  // Unset URL is a skip, not a failure, and never blocks the visitor.
  calls.length = 0;
  const skipped = await handleBrandSubmission({
    ...fixture, brandName: BRAND, brandKey: BRAND_KEY, siteUrl: SITE, privacyUrl: PRIVACY, submissionId: 'fixture-2',
    env: { RESEND_API_KEY: 'test-key' },
  });
  assert.equal(skipped.leadStatus, 'skipped', 'no BESTOS_WEBSITE_LEAD_URL is a skip');
  assert.equal(calls.filter((call) => call.url.includes('api.resend.com')).length, 2, 'both emails still go out');

  globalThis.fetch = realFetch;
}

// ── 5. Redaction helper, directly ───────────────────────────────────────────────────────────────
{
  assert.deepEqual(safeFacts([{ label: 'ZIP', value: '90212' }]), [{ label: 'ZIP', value: '90212' }]);
  assert.deepEqual(safeFacts([{ label: 'Date of Birth', value: '1980-01-01' }]), [], 'DOB dropped by key');
  assert.deepEqual(safeFacts([{ label: 'Policy Number', value: 'ABC123456' }]), [], 'policy number dropped by key');
  assert.deepEqual(safeFacts([{ label: 'Note', value: '' }]), [], 'empty values are not printed');
  // ⚠️ A DATE IS NOT AN ACCOUNT NUMBER. The first version of the shape net masked 2026-10-01 to
  // "ending 1001" and put that in the applicant's own confirmation.
  assert.deepEqual(safeFacts([{ label: 'Requested effective date', value: '2026-10-01' }]),
    [{ label: 'Requested effective date', value: '2026-10-01' }], 'an ISO date survives intact');
  assert.deepEqual(safeFacts([{ label: 'Requested effective date', value: '10/1/2026' }]),
    [{ label: 'Requested effective date', value: '10/1/2026' }], 'a slashed date survives intact');
  assert.deepEqual(safeFacts([{ label: 'Property', value: '12 Oak St, Pasadena, CA 91101' }]),
    [{ label: 'Property', value: '12 Oak St, Pasadena, CA 91101' }], 'an address survives intact');
  assert.deepEqual(safeFacts([{ label: 'ZIP', value: '90212' }]), [{ label: 'ZIP', value: '90212' }], 'a ZIP survives intact');
  assert.deepEqual(safeFacts([{ label: 'Reference', value: '4111 1111 1111 1234' }]),
    [{ label: 'Reference', value: 'ending 1234' }], 'a card-shaped value is still masked');
}

// ── 6. A failed broker notification stops the applicant confirmation ────────────────────────────
//
// A receipt promising "a licensed broker reviews your details and replies within one business day"
// over a notification nobody received is a promise no one is in a position to keep, and it stops
// the visitor retrying. The caller must be able to answer the browser with a retry state.
{
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('api.resend.com')) return { ok: false, status: 500, text: async () => 'boom' };
    return { ok: true, status: 200, text: async () => '{}' };
  };

  const failed = await handleBrandSubmission({
    ...fixture, brandName: BRAND, brandKey: BRAND_KEY, siteUrl: SITE, privacyUrl: PRIVACY,
    env: { RESEND_API_KEY: 'test-key', BESTOS_WEBSITE_LEAD_URL: 'https://www.bestams.com/api/inbound/website-lead', BESTOS_WEBSITE_LEAD_SECRET: 'test-secret' },
  });

  assert.equal(failed.internal.ok, false, 'the broker notification failed');
  assert.equal(failed.confirmation.ok, false, 'no confirmation is sent over a failed notification');
  assert.equal(failed.confirmation.reason, 'internal_notification_failed');
  assert.equal(failed.ok, false, 'the caller is told to answer with a retry state');
  assert.equal(calls.filter((c) => c.url.includes('api.resend.com')).length, 1, 'exactly one send was attempted, not two');
  // The durable capture still runs: a lead recorded is better than a lead recorded nowhere.
  assert.equal(failed.leadStatus, 'recorded', 'the CRM hop is independent of the mail outcome');

  globalThis.fetch = realFetch;
}

// ── 7. An absent applicant address is not a delivery failure ────────────────────────────────────
{
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => '{}' });
  const noEmail = await handleBrandSubmission({
    ...fixture, contactEmail: '', brandName: BRAND, brandKey: BRAND_KEY, siteUrl: SITE, privacyUrl: PRIVACY,
    env: { RESEND_API_KEY: 'test-key' },
  });
  assert.equal(noEmail.confirmation.required, false, 'nothing was asked to be sent to an absent address');
  assert.equal(noEmail.ok, true, 'a good submission is not failed by an address that was never given');
  globalThis.fetch = realFetch;
}

// ── 8. The caller's brand name wins over the environment ────────────────────────────────────────
{
  const resolved = resolveBrandMail({ brandName: BRAND, siteUrl: SITE, env: { BRAND_NAME: 'Someone Else' } });
  assert.equal(resolved.brandName, BRAND, 'an accidentally-set BRAND_NAME cannot rebrand this property');
  const fallback = resolveBrandMail({ siteUrl: SITE, env: { BRAND_NAME: 'Env Brand' } });
  assert.equal(fallback.brandName, 'Env Brand', 'env still answers when the caller supplies nothing');
}

console.log(`test-brand-mail (${BRAND}): ok`);
