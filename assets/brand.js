/* =============================================================
   BestInsurance — Brand manifest
   -------------------------------------------------------------
   The SINGLE per-line configuration point for the platform. A new
   line of insurance (BestAuto, BestDP3, BestUmbrella, BestCondo,
   BestFlood) ships its own copy of this file; the shared layers
   (app.js, apply.js, ho-wizard.js, motion.css) read from it and are
   never edited per line. Load this BEFORE the wizard and apply
   controller on every product page.
   ============================================================= */
(function () {
  'use strict';

  window.BEST_BRAND = {
    /* Identity */
    key: 'ho3',
    name: 'BestHO3',
    line: 'homeowners',
    phone: '310-804-5017',
    ctaLabel: 'Start your application',

    /* Namespaces — keep these line-neutral so a second product does not
       inherit "bestho3" strings. */
    eventPrefix: 'bestbrands',              /* custom-event channel */
    sessionPrefix: 'HO3',                   /* display session id prefix */
    draftKey: 'bestho3_property_draft_v1',  /* localStorage draft namespace */
    mountId: 'intake-mount',                /* where the wizard renders */

    /* /apply workspace shell config (drives the status rail + progress).
       stepLabels is indexed by the wizard's 0-based step; stageMap maps each
       step to a rail stage (1..N); timeline defines the rail's stage rows. */
    totalSteps: 7,
    stepLabels: [
      'Application ready',
      'Property details',
      'Home structure',
      'Systems and condition',
      'Protection features',
      'Applicant and coverage',
      'Insurance history',
      'Review and sign'
    ],
    stageMap: [1, 1, 2, 2, 2, 3, 4, 4],     /* step 0..7 -> stage; review handled as stage 4 in-progress */
    timeline: [
      { title: 'Property',          sub: 'Address and occupancy' },
      { title: 'Home profile',      sub: 'Structure, systems, protection' },
      { title: 'Coverage',          sub: 'Applicant and desired limits' },
      { title: 'Underwriting',      sub: 'History and review' },
      { title: 'Market submission', sub: 'Signed application to broker' }
    ]
  };
})();
