/* =============================================================
   /apply workspace controller
   Product-agnostic: all line-specific values come from
   window.BEST_BRAND (assets/brand.js). This file is shared across
   every BestInsurance line unchanged.
   ============================================================= */
(function () {
  'use strict';

  var brand = window.BEST_BRAND || {};
  var EV = (brand.eventPrefix || 'bestbrands') + ':';
  var LABELS = brand.stepLabels || [
    'Application ready', 'Property details', 'Home structure', 'Systems and condition',
    'Protection features', 'Applicant and coverage', 'Insurance history', 'Review and sign'
  ];
  var STAGE_MAP = brand.stageMap || [1, 1, 2, 2, 2, 3, 4, 4];
  var TOTAL = brand.totalSteps || 7;

  var stepLabel = document.getElementById('application-step-label');
  var saveStatus = document.getElementById('application-save-status');
  var session = document.getElementById('application-session');
  var price = document.getElementById('application-price');
  var priceDetail = document.getElementById('application-price-detail');
  var progress = document.getElementById('application-progress-percent');
  var reset = document.getElementById('application-reset');

  /* Render the status-rail rows from the manifest so brand.timeline is the
     single source of truth (the static <li> in apply.html are a no-JS
     fallback). Values are set via textContent — never innerHTML — so manifest
     copy can't inject markup. */
  var timelineEl = document.getElementById('application-timeline');
  if (timelineEl && Array.isArray(brand.timeline) && brand.timeline.length) {
    timelineEl.innerHTML = brand.timeline.map(function (row, i) {
      return '<li data-stage="' + (i + 1) + '"><span>' + (i + 1) + '</span><div><strong></strong><small></small></div></li>';
    }).join('');
    var builtRows = timelineEl.querySelectorAll('li');
    brand.timeline.forEach(function (row, i) {
      var li = builtRows[i];
      if (!li) return;
      li.querySelector('strong').textContent = row.title || '';
      li.querySelector('small').textContent = row.sub || '';
    });
  }
  var timeline = timelineEl ? Array.prototype.slice.call(timelineEl.querySelectorAll('li')) : [];

  var sessionId = (brand.sessionPrefix || 'HO3') + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  if (session) session.textContent = sessionId;

  function mapStage(step) {
    var s = Math.max(0, Math.min(TOTAL, Number(step) || 0));
    return STAGE_MAP[s] || STAGE_MAP[STAGE_MAP.length - 1] || 1;
  }

  function setProgress(step) {
    var normalized = Math.max(0, Math.min(TOTAL, Number(step) || 0));
    var stage = mapStage(normalized);
    if (stepLabel) stepLabel.textContent = LABELS[normalized] || LABELS[0];
    if (progress) {
      /* The final review/sign step is high-friction; it must not read 100%
         until the application is actually submitted. */
      var pct = normalized >= TOTAL ? 90 : Math.round((normalized / TOTAL) * 100);
      progress.textContent = pct + '%';
    }
    timeline.forEach(function (item, index) {
      var itemStage = index + 1;
      item.classList.toggle('is-current', itemStage === stage);
      item.classList.toggle('is-complete', itemStage < stage);
    });
  }

  function applyIndication(detail) {
    detail = detail || {};
    if (!detail.ready) {
      if (price) price.textContent = 'Complete the property basics';
      if (priceDetail) priceDetail.textContent = 'Your preliminary range updates when square footage or a dwelling limit is available.';
      return;
    }
    if (price) price.textContent = detail.range;
    if (priceDetail) priceDetail.textContent = detail.summary + ' · Preliminary estimate, not a carrier quote.';
  }

  function applyDraft(detail) {
    detail = detail || {};
    if (!saveStatus) return;
    if (detail.restored) saveStatus.textContent = 'Property draft restored from this device';
    else if (detail.cleared) saveStatus.textContent = 'Local property draft cleared';
    else saveStatus.textContent = 'Property draft saved on this device';
  }

  document.addEventListener(EV + 'step', function (event) {
    setProgress(event.detail && event.detail.step);
  });
  document.addEventListener(EV + 'indication', function (event) {
    applyIndication(event.detail);
  });
  document.addEventListener(EV + 'draft', function (event) {
    applyDraft(event.detail);
  });
  document.addEventListener(EV + 'submitted', function () {
    timeline.forEach(function (item, index) {
      item.classList.toggle('is-current', index === timeline.length - 1);
      item.classList.toggle('is-complete', index < timeline.length - 1);
    });
    if (progress) progress.textContent = '100%';
    if (stepLabel) stepLabel.textContent = 'Application submitted';
    if (saveStatus) saveStatus.textContent = 'Local property draft cleared';
  });

  if (reset) {
    reset.addEventListener('click', function () {
      if (!window.confirm('Clear the property details saved on this device and start again?')) return;
      var url = new URL(window.location.href);
      url.searchParams.set('fresh', '1');
      window.location.assign(url.toString());
    });
  }

  /* Under `defer`, the wizard boots and emits its initial step/indication/draft
     synchronously BEFORE this controller subscribes. Pull the last-emitted state
     it recorded so a restored 7-day draft shows the correct step, price, and
     save status on load instead of the empty defaults. */
  var last = (window.__intake && window.__intake.last) || {};
  if (last.step) setProgress(last.step.step);
  else setProgress(0);
  if (last.indication) applyIndication(last.indication);
  if (last.draft) applyDraft(last.draft);
})();
