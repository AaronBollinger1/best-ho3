/* Bollinsure estate — lead conversion events.
   ============================================================================
   The GTM container (GTM-5QM55LTJ) already has GA4 tags configured for
   generate_lead, phone_click, form_start and email_click, bound to G-2C0V0NWB3Z
   with the Ads conversion AW-18196791997 present. Until 2026-08-01 exactly one
   of the ten properties ever pushed the event those tags listen for. The other
   nine sent nothing, so GA4 recorded no conversions for them and Google Ads had
   nothing to optimise against — the tags were not broken, they were never fired.

   This file is IDENTICAL on every property. Do not fork it. Site identity comes
   from the brand_key already pushed into dataLayer by the GTM bootstrap, so
   there is nothing per-site to configure and nothing per-site to get wrong.

   Public API:
     bollinsure.lead(detail)   — call once on a confirmed submission
     bollinsure.track(evt, d)  — anything else worth measuring

   Click tracking for tel:, mailto: and quote links wires itself on load.
   ========================================================================== */
(function (w, d) {
  "use strict";

  w.dataLayer = w.dataLayer || [];

  function brandKey() {
    // The GTM bootstrap pushes {brand_key:'…'} before this file loads.
    for (var i = w.dataLayer.length - 1; i >= 0; i--) {
      if (w.dataLayer[i] && w.dataLayer[i].brand_key) return w.dataLayer[i].brand_key;
    }
    return (w.location.hostname || "").replace(/^www\./, "").split(".")[0] || "unknown";
  }

  function push(event, detail) {
    var payload = { event: event, brand_key: brandKey(), page_path: w.location.pathname };
    for (var k in detail) if (Object.prototype.hasOwnProperty.call(detail, k)) payload[k] = detail[k];
    w.dataLayer.push(payload);
    return payload;
  }

  // A submission can only convert once. Retries, double-clicks and a back-button
  // return to the thank-you state must not each report a lead — that inflates the
  // conversion count Ads bids on, which is worse than reporting nothing.
  var converted = false;

  var api = {
    track: push,

    lead: function (detail) {
      if (converted) return null;
      converted = true;
      detail = detail || {};
      // quoteFormSubmitted is what the container's existing GA4 tag listens for;
      // generate_lead is the GA4 recommended name. Push both so the configured
      // tag keeps working and the standard event is also available.
      var body = {
        value: typeof detail.value === "number" ? detail.value : 1.0,
        currency: detail.currency || "USD"
      };
      for (var k in detail) if (Object.prototype.hasOwnProperty.call(detail, k)) body[k] = detail[k];
      push("quoteFormSubmitted", body);
      push("generate_lead", body);
      return body;
    },

    formStart: (function () {
      var started = false;
      return function (detail) {
        if (started) return;
        started = true;
        push("form_start", detail || {});
      };
    })()
  };

  w.bollinsure = w.bollinsure || {};
  w.bollinsure.lead = api.lead;
  w.bollinsure.track = api.track;
  w.bollinsure.formStart = api.formStart;

  // Delegated click tracking. Attached once, survives re-rendered wizard markup,
  // and costs nothing when nothing matches.
  d.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var zoneEl = a.closest("[data-zone]");
    var zone = zoneEl ? zoneEl.getAttribute("data-zone")
      : a.closest("nav") ? "nav" : a.closest("footer") ? "footer" : "body";
    var label = (a.textContent || "").trim().slice(0, 40);

    if (href.indexOf("tel:") === 0) push("phone_click", { zone: zone, label: label });
    else if (href.indexOf("mailto:") === 0) push("email_click", { zone: zone, label: label });
    else if (/^\/?(quote|apply)\b/.test(href.replace(/^https?:\/\/[^/]+/, "")))
      push("quote_click", { zone: zone, label: label });
  }, { passive: true });

  // First interaction with any form field on the page counts as form_start.
  d.addEventListener("focusin", function (e) {
    var t = e.target;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) api.formStart({ field: t.name || t.id || "" });
  }, { passive: true });
})(window, document);
