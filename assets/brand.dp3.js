/* =============================================================
   BestDP3 — Brand manifest  (a NEW line, from the chassis)
   -------------------------------------------------------------
   Parallel to assets/brand.js (BestHO3): the single per-line
   configuration point. A DP3 (dwelling-fire / landlord) product
   page loads THIS instead of brand.js; the shared layers (app.js,
   apply.js, seo.js, ho-wizard.js) read window.BEST_BRAND and are
   never edited per line. This proves the manifest is the config
   seam. Load BEFORE the shared controllers on every DP3 page.
   ============================================================= */
(function () {
  'use strict';

  window.BEST_BRAND = {
    /* Identity */
    key: 'dp3',
    name: 'BestDP3',
    line: 'dwelling-fire',
    phone: '310-804-5017',
    ctaLabel: 'Start your landlord application',

    /* Line-neutral namespaces (no "bestho3" strings leak in). */
    eventPrefix: 'bestbrands',
    sessionPrefix: 'DP3',
    draftKey: 'bestdp3_property_draft_v1',
    mountId: 'intake-mount',

    /* /apply workspace shell config — the SAME rail engine as HO3,
       relabeled for a rental risk. Present so a DP3 apply shell drops
       straight onto apply.js with no shared edits. */
    totalSteps: 7,
    stepLabels: [
      'Application ready',
      'Rental property details',
      'Building structure',
      'Systems and condition',
      'Protection features',
      'Owner and coverage',
      'Loss and rental history',
      'Review and sign'
    ],
    stageMap: [1, 1, 2, 2, 2, 3, 4, 4],
    timeline: [
      { title: 'Rental property', sub: 'Address and occupancy' },
      { title: 'Building profile', sub: 'Structure, systems, protection' },
      { title: 'Coverage',         sub: 'Owner and desired limits' },
      { title: 'Underwriting',     sub: 'History and review' },
      { title: 'Market submission', sub: 'Signed DP-3 application to broker' }
    ]
  };
})();
