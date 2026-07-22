(function () {
  'use strict';

  const stepLabel = document.getElementById('application-step-label');
  const saveStatus = document.getElementById('application-save-status');
  const session = document.getElementById('application-session');
  const price = document.getElementById('application-price');
  const priceDetail = document.getElementById('application-price-detail');
  const progress = document.getElementById('application-progress-percent');
  const timeline = Array.from(document.querySelectorAll('#application-timeline li'));
  const reset = document.getElementById('application-reset');

  const sessionId = 'HO3-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  if (session) session.textContent = sessionId;

  const labels = ['Application ready', 'Property details', 'Home structure', 'Systems and condition', 'Protection features', 'Applicant and coverage', 'Insurance history', 'Review and sign'];
  const mapStage = (step) => step <= 1 ? 1 : step <= 4 ? 2 : step === 5 ? 3 : step <= 7 ? 4 : 5;

  function setProgress(step) {
    const normalized = Math.max(0, Math.min(7, Number(step) || 0));
    const stage = mapStage(normalized);
    if (stepLabel) stepLabel.textContent = labels[normalized] || labels[0];
    if (progress) progress.textContent = Math.round((normalized / 7) * 100) + '%';
    timeline.forEach((item, index) => {
      const itemStage = index + 1;
      item.classList.toggle('is-current', itemStage === stage);
      item.classList.toggle('is-complete', itemStage < stage);
    });
  }

  document.addEventListener('bestho3:step', function (event) {
    setProgress(event.detail && event.detail.step);
  });

  document.addEventListener('bestho3:indication', function (event) {
    const detail = event.detail || {};
    if (!detail.ready) {
      if (price) price.textContent = 'Complete the property basics';
      if (priceDetail) priceDetail.textContent = 'Your preliminary range updates when square footage or a dwelling limit is available.';
      return;
    }
    if (price) price.textContent = detail.range;
    if (priceDetail) priceDetail.textContent = detail.summary + ' · Preliminary estimate, not a carrier quote.';
  });

  document.addEventListener('bestho3:draft', function (event) {
    const detail = event.detail || {};
    if (!saveStatus) return;
    if (detail.restored) saveStatus.textContent = 'Property draft restored from this device';
    else if (detail.cleared) saveStatus.textContent = 'Local property draft cleared';
    else saveStatus.textContent = 'Property draft saved on this device';
  });

  document.addEventListener('bestho3:submitted', function () {
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
      const url = new URL(window.location.href);
      url.searchParams.set('fresh', '1');
      window.location.assign(url.toString());
    });
  }

  setProgress(0);
})();
