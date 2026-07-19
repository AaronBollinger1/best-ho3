/* =============================================
   BEST HO3 — Homeowners Quote Wizard
   bestho3.com

   Multi-step pricing-indication wizard modeled on the
   best-cyber-liability / best-workers-compensation family
   pattern: white step cards on the dark site theme, a live
   top estimate card (cyber's cw-top-est pattern), routing
   cards, and a signed ACORD 80 flow bridged via window.__ho.

   Every wizard key here maps 1:1 to docs/acord-80-field-map.md
   and api/ho-application.js. Do not rename keys in one place only.
   ============================================= */

(function () {
  'use strict';

  // ─── Indication constants (tunable — keep content pages consistent with these) ──
  const COST_PER_SQFT = 350;          // default CA rebuild-cost suggestion, user-adjustable
  const BASE_RATE_PER_1000 = 3.6;     // baseline $ per $1,000 of Coverage A per year
  const RANGE_LOW = 0.82;             // carrier spread low
  const RANGE_HIGH = 1.28;            // carrier spread high
  const FLOOR_PREMIUM = 650;          // minimum realistic CA annual premium
  const HIGH_VALUE_THRESHOLD = 1000000; // Coverage A at/above => Private Client callout

  const THIS_YEAR = new Date().getFullYear();

  // ─── State ────────────────────────────────────────────────────────────────
  const state = {
    pathway: null,              // 'owner' | 'landlord'  (renters get a contact card)
    // Step 1 — property & occupancy
    risk_address: '', risk_city: '', risk_county: '', risk_state: 'CA', risk_zip: '',
    in_city_limits: 'Yes',
    residence_type: '',         // dwelling|townhouse|rowhouse|condominium|cooperative|apartment
    usage: 'primary',           // primary|seasonal|secondary|other
    vacancy: 'No',              // No | Vacant | Unoccupied
    number_of_families: '1',
    wildfire_exposure: '',      // yes|no|unsure — early CA driver, feeds q_hazard default
    // Step 2 — structure
    year_built: '', total_living_area: '',
    construction_type: '',      // frame|masonry|masonry_veneer|other
    foundation_type: '',        // ''(optional)|closed|open|none
    roof_material: '',          // comp|tile|metal|shake|flat|other
    // Step 3 — systems & condition
    roof_updated: 'none', roof_update_year: '',
    heating_updated: 'none', heating_update_year: '',
    plumbing_updated: 'none', plumbing_update_year: '',
    wiring_updated: 'none', wiring_update_year: '',
    wiring_type: '',            // copper|aluminum|knob_tube|mixed|unknown
    electrical_panel: '',       // breakers|fuses
    electrical_amps: '',
    roof_condition: '', plumbing_condition: '', housekeeping: '',
    // Step 4 — protection & features
    door_locks: '', burglar_alarm: 'none', smoke_alarm: 'local', sprinklers: 'none',
    fire_extinguisher: '',
    swimming_pool: '',          // no|in_ground|above_ground
    pool_fence: 'No', pool_diving_board: 'No', pool_slide: 'No',
    // Step 5 — applicant & coverage
    applicant_full_name: '', applicant_dob: '', applicant_occupation: '',
    applicant_email: '', applicant_phone: '', applicant_phone_type: 'cell',
    mailing_same: 'Yes',
    mailing_address: '', mailing_city: '', mailing_state: 'CA', mailing_zip: '',
    effective_date: '',
    dwelling_limit: '', dwelling_touched: false,
    deductible: '2500',
    personal_liability_limit: '300000',
    med_pay_limit: '5000',
    policy_form: 'HO3',         // HO3 | HO5 (landlord pathway forces DP3)
    // Step 6 — history
    no_prior_coverage: false,
    prior_insurer_1: '', prior_insurer_2: '', prior_expiration: '',
    hasClaims: null,
    lossRows: [],               // {date, description, amount}
    // Step 7 — the 16 underwriting questions (Y/N as 'Yes'/'No')
    q: {},                      // q_owner..q_fraud_arson
    q_explanations: '',
    additional_notes: '',
    consent_indication: false, consent_contact: false,
    website_hp: ''              // honeypot
  };

  const QUESTIONS = [
    { key: 'q_owner',             text: 'Are you the owner of the property being insured?' },
    { key: 'q_hazard',            text: 'Any flooding, brush, forest-fire, or landslide hazard at the location?' },
    { key: 'q_code_violation',    text: 'Any uncorrected fire or building-code violations?' },
    { key: 'q_business',          text: 'Is any business conducted on the premises?' },
    { key: 'q_employees',         text: 'Any residence employees (nanny, housekeeper, gardener)?' },
    { key: 'q_animals',           text: 'Any animals or exotic pets on the premises?' },
    { key: 'q_trampoline',        text: 'Is there a trampoline on the premises?' },
    { key: 'q_commercial_300ft',  text: 'Is the property within 300 ft of a commercial or non-residential property?' },
    { key: 'q_co_alarm',          text: 'Approved carbon-monoxide alarm near every sleeping room?' },
    { key: 'q_lead_paint',        text: 'Any lead paint (homes built before 1978)?' },
    { key: 'q_for_sale',          text: 'Is the dwelling currently for sale?' },
    { key: 'q_converted',         text: 'Was the structure originally built for other than a private residence and converted?' },
    { key: 'q_declined_cancelled', text: 'Any coverage declined, cancelled, or non-renewed in the last 3 years?' },
    { key: 'q_bankruptcy',        text: 'Any foreclosure, repossession, or bankruptcy in the past 5 years?' },
    { key: 'q_lien',              text: 'Any judgment or lien in the past 5 years?' },
    { key: 'q_fraud_arson',       text: 'In the last 5 years, has any applicant been convicted of fraud, bribery, or arson?' }
  ];
  // "Yes" on these deserves a short explanation for the broker.
  const EXPLAIN_KEYS = ['q_hazard', 'q_code_violation', 'q_business', 'q_animals', 'q_lead_paint', 'q_converted', 'q_declined_cancelled', 'q_bankruptcy', 'q_lien', 'q_fraud_arson'];

  const TOTAL_STEPS = 7;
  const STEP_LABELS = ['Property', 'Structure', 'Systems', 'Protection', 'Coverage', 'History', 'Review'];

  // ─── CSS ──────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('ho-wiz-styles')) return;
    const style = document.createElement('style');
    style.id = 'ho-wiz-styles';
    style.textContent = `
      #ho-wizard-mount * { box-sizing: border-box; margin: 0; padding: 0; }
      #ho-wizard-mount { font-family: var(--font-sans); color: var(--text); }

      .wz-card { background: #fff; color: #262b23; border-radius: 10px; padding: 48px 52px; box-shadow: 0 6px 28px rgba(59,50,32,0.14); max-width: 860px; margin: 0 auto; }
      @media (max-width: 640px) { .wz-card { padding: 28px 20px; } }
      .wz-card h2 { font-family: var(--font-display); font-size: 1.35rem; font-weight: 600; color: #262b23; margin-bottom: 4px; }
      .wz-card h2 + p { font-size: 0.875rem; color: #575f52; margin-bottom: 24px; line-height: 1.5; }

      .wz-step-context { font-size: 0.84rem; color: #575f52; margin-bottom: 24px; line-height: 1.7; border-left: 2px solid rgba(29,87,65,0.4); padding-left: 12px; }

      .wz-field { display: flex; flex-direction: column; }
      .wz-field label { font-size: 0.78rem; font-weight: 600; color: #575f52; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block; }
      .wz-input, .wz-select, .wz-textarea { background: #f6f2e9; border: 1.5px solid #cfc3a9; color: #262b23; border-radius: 8px; padding: 11px 14px; font-size: 0.95rem; width: 100%; min-height: 44px; font-family: var(--font-sans); transition: border-color 0.15s; }
      .wz-input:focus, .wz-select:focus, .wz-textarea:focus { border-color: #1d5741 !important; box-shadow: 0 0 0 3px rgba(29,87,65,0.12) !important; outline: none; background: #eef3ec; }
      .wz-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23555' d='M1 1l5 5 5-5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; }
      .wz-textarea { resize: vertical; min-height: 90px; }
      .wz-input.invalid, .wz-select.invalid, .wz-textarea.invalid { border-color: #a33d2a; }
      .wz-field-error { color: #a33d2a; font-size: 0.78rem; margin-top: 5px; display: block; animation: wz-shake 0.3s ease; }
      @keyframes wz-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }

      .wz-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; }
      .wz-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
      @media (max-width: 640px) { .wz-grid, .wz-grid3 { grid-template-columns: 1fr; } }
      .wz-full { grid-column: 1 / -1; }

      .wz-yn-row { display: flex; gap: 12px; margin-bottom: 18px; }
      .wz-yn-btn { flex: 1; min-height: 42px; border: 1.5px solid #cfc3a9; border-radius: 8px; background: transparent; color: #575f52; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.15s; font-family: var(--font-sans); }
      .wz-yn-btn:hover { border-color: #1d5741; color: #262b23; }
      .wz-yn-btn.selected { background: #1d5741; border-color: #1d5741; color: #f6f2e9; font-weight: 700; }

      .wz-seg { display: flex; gap: 8px; flex-wrap: wrap; }
      .wz-seg-btn { flex: 1 1 auto; min-height: 42px; padding: 8px 14px; border: 1.5px solid #cfc3a9; border-radius: 8px; background: #fff; color: #575f52; font-weight: 600; font-size: 0.84rem; cursor: pointer; transition: all 0.15s; font-family: var(--font-sans); white-space: nowrap; }
      .wz-seg-btn:hover { border-color: #1d5741; color: #262b23; }
      .wz-seg-btn.selected { background: #edf3ec; border-color: #1d5741; color: #1d5741; font-weight: 700; }

      .wz-indication-box { background: #eef3ec; border: 1px solid rgba(29,87,65,0.35); border-radius: 10px; padding: 28px 32px; margin: 20px 0; }
      .wz-indication-kicker { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #17493a; margin-bottom: 6px; }
      .wz-indication-amount { font-family: var(--font-display); font-size: 2rem; font-weight: 600; color: #1d5741; line-height: 1.1; margin-bottom: 12px; }
      .wz-indication-detail { font-size: 0.82rem; color: #575f52; line-height: 1.9; }
      .wz-indication-detail strong { color: #3d443a; }
      .wz-indication-warning { font-size: 0.78rem; color: #17493a; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(29,87,65,0.2); line-height: 1.5; }

      .wz-nav { display: flex; justify-content: flex-end; gap: 12px; margin-top: 36px; padding-top: 24px; border-top: 1px solid #e2d9c6; }
      .wz-btn-back { background: transparent; border: 1.5px solid #cfc3a9; color: #575f52; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; font-family: var(--font-sans); transition: all 0.15s; }
      .wz-btn-back:hover { border-color: #575f52; color: #262b23; }
      .wz-btn-next { background: #1d5741; color: #f6f2e9; font-weight: 700; border: none; padding: 12px 28px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-family: var(--font-sans); transition: all 0.15s; }
      .wz-btn-next:hover:not(:disabled) { background: #163f30; }
      .wz-btn-next:disabled { opacity: 0.4; cursor: not-allowed; }
      .wz-btn-full { width: 100%; padding: 14px; font-size: 1rem; border-radius: 10px; margin-top: 16px; }
      .wz-btn-submitting { animation: wz-ripple 1.5s linear infinite !important; cursor: wait !important; }
      @keyframes wz-ripple { 0%,100%{box-shadow:0 0 0 0 rgba(29,87,65,0.4)} 50%{box-shadow:0 0 0 10px rgba(29,87,65,0)} }

      .wz-stepper { display: flex; flex-direction: column; gap: 0; margin-bottom: 36px; }
      .wz-stepper-segs { display: flex; gap: 6px; }
      .wz-step-seg { flex: 1; height: 4px; border-radius: 2px; background: #e2d9c6; transition: background 0.2s; }
      .wz-step-seg.done, .wz-step-seg.active { background: #1d5741; }
      .wz-step-seg.active { animation: wz-pulse 2.2s ease-in-out infinite; }
      @keyframes wz-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.65; } }
      .wz-stepper-labels { display: flex; gap: 6px; margin-top: 6px; }
      .wz-stepper-label { flex: 1; font-size: 0.68rem; text-align: center; color: #575f52; }
      .wz-stepper-label.active { color: #1d5741; font-weight: 600; }
      @media (max-width: 560px) { .wz-stepper-label { display: none; } .wz-stepper-label.active { display: block; } }

      .wz-error { color: #a33d2a; font-size: 0.82rem; margin-top: 5px; display: none; }
      .wz-error.show { display: block; }
      .wz-form-error { background: #f7ece9; border: 1px solid rgba(163,61,42,0.4); border-radius: 8px; padding: 12px 16px; font-size: 0.85rem; color: #a33d2a; margin-bottom: 16px; display: none; }
      .wz-form-error.show { display: block; }

      .wz-callout-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin: 20px 0; }
      @media (max-width: 640px) { .wz-callout-grid { grid-template-columns: 1fr; } }
      .wz-callout { background: #f6f2e9; border: 1px solid #e2d9c6; border-radius: 10px; padding: 24px; }
      .wz-callout h4 { font-size: 0.9rem; font-weight: 700; color: #17493a; margin-bottom: 10px; }
      .wz-callout ul { padding-left: 16px; }
      .wz-callout li { font-size: 0.82rem; color: #575f52; line-height: 1.7; }

      .wz-success { text-align: center; padding: 48px 24px; }
      .wz-success-icon { font-size: 3rem; margin-bottom: 16px; }
      .wz-success h2 { font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; color: #262b23; margin-bottom: 12px; }
      .wz-success p { font-size: 0.9rem; color: #575f52; line-height: 1.6; margin-bottom: 8px; }
      .wz-success a { color: #1d5741; font-weight: 600; text-decoration: none; }
      .wz-success a:hover { text-decoration: underline; }
      .wz-success-back { display: inline-block; margin-top: 20px; padding: 10px 20px; border: 1.5px solid #cfc3a9; border-radius: 8px; font-size: 0.88rem; font-weight: 600; color: #575f52; text-decoration: none; transition: all 0.15s; }
      .wz-success-back:hover { border-color: #575f52; color: #262b23; }

      .wz-route-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 8px; }
      @media (max-width: 720px) { .wz-route-cards { grid-template-columns: 1fr; } }
      .wz-route-card { border: 1.5px solid #cfc3a9; border-radius: 10px; padding: 32px 24px; text-align: center; background: #fff; transition: all 0.15s; cursor: pointer; font-family: var(--font-sans); }
      .wz-route-card:hover { border-color: #1d5741; box-shadow: 0 4px 20px rgba(29,87,65,0.15); transform: translateY(-2px); }
      .wz-route-card h3 { font-family: var(--font-display); font-size: 1.05rem; font-weight: 600; color: #262b23; margin-bottom: 8px; }
      .wz-route-card p { font-size: 0.84rem; color: #575f52; line-height: 1.6; margin-bottom: 0; }
      .wz-route-icon { font-size: 2rem; margin-bottom: 12px; display: block; }

      .wz-check-label { display: flex; gap: 10px; align-items: flex-start; font-size: 0.88rem; color: #575f52; line-height: 1.6; cursor: pointer; margin-bottom: 12px; }
      .wz-check-label input[type=checkbox] { width: 18px; height: 18px; flex-shrink: 0; accent-color: #1d5741; margin-top: 2px; }
      .wz-note-accent { background: #eef3ec; border: 1px solid rgba(29,87,65,0.35); border-radius: 8px; padding: 12px 16px; font-size: 0.82rem; color: #17493a; line-height: 1.6; margin: 12px 0; }
      .wz-note-warn { background: #fbf4e6; border: 1px solid rgba(146,64,14,0.30); border-radius: 8px; padding: 12px 16px; font-size: 0.82rem; color: #92400e; line-height: 1.6; margin: 12px 0; }
      .wz-note-green { background: #eef3ec; border: 1px solid rgba(46,107,63,0.30); border-radius: 8px; padding: 12px 16px; font-size: 0.88rem; color: #2e6b3f; line-height: 1.6; margin: 12px 0; font-weight: 600; }
      .wz-section-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #575f52; margin: 20px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #e2d9c6; }
      .wz-honeypot { position: absolute; left: -9999px; opacity: 0; height: 0; overflow: hidden; }
      .wz-spinner { display: inline-block; width: 20px; height: 20px; border: 2.5px solid rgba(0,0,0,0.2); border-top-color: #000; border-radius: 50%; animation: wz-spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
      @keyframes wz-spin { to { transform: rotate(360deg); } }
      .wz-rate-note { font-size: 0.75rem; color: #575f52; margin-top: 4px; font-style: italic; }
      .wz-divider { border: none; border-top: 1px solid #e2d9c6; margin: 20px 0; }

      .wz-claims-btns { display: flex; gap: 14px; margin: 20px 0; }
      .wz-claims-btn { flex: 1; padding: 18px; border: 2px solid #cfc3a9; border-radius: 10px; background: #fff; cursor: pointer; font-size: 0.95rem; font-weight: 600; color: #3d443a; font-family: var(--font-sans); transition: all 0.15s; text-align: center; }
      .wz-claims-btn:hover { border-color: #1d5741; }
      .wz-claims-btn.selected-no { border-color: #2e6b3f; background: #eef3ec; color: #2e6b3f; }
      .wz-claims-btn.selected-yes { border-color: #92400e; background: #fbf4e6; color: #92400e; }
      @media (max-width: 540px) { .wz-claims-btns { flex-direction: column; } }

      .wz-loss-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
      .wz-loss-table th { background: #e8ece2; color: #575f52; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2d9c6; }
      .wz-loss-table td { padding: 8px 12px; border-bottom: 1px solid #e2d9c6; }
      .wz-loss-table td input, .wz-loss-table td select { background: #fff; border: 1.5px solid #cfc3a9; border-radius: 6px; padding: 7px 10px; font-size: 0.85rem; font-family: var(--font-sans); width: 100%; color: #262b23; }
      .wz-loss-table td input:focus, .wz-loss-table td select:focus { border-color: #1d5741; outline: none; }
      .wz-add-row-btn { background: none; border: 1.5px dashed #cfc3a9; color: #575f52; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-weight: 600; font-family: var(--font-sans); transition: all 0.15s; width: 100%; margin-top: 12px; }
      .wz-add-row-btn:hover { border-color: #1d5741; color: #1d5741; }
      .wz-row-remove { background: none; border: none; color: #a33d2a; cursor: pointer; font-size: 0.82rem; font-weight: 600; padding: 2px 6px; border-radius: 4px; font-family: var(--font-sans); }

      .wz-qq { border: 1px solid #e2d9c6; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; }
      .wz-qq.missing { border-color: rgba(163,61,42,0.45); background: #f7ece9; }
      .wz-qq-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
      .wz-qq-text { font-size: 0.88rem; color: #262b23; line-height: 1.45; flex: 1; }
      .wz-qq-num { font-family: var(--font-mono); font-size: 0.72rem; color: #575f52; margin-right: 8px; }
      .wz-qq-btns { display: flex; gap: 8px; flex-shrink: 0; }
      .wz-qq-btn { min-width: 58px; min-height: 38px; border: 1.5px solid #cfc3a9; border-radius: 8px; background: #fff; color: #575f52; font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all 0.13s; font-family: var(--font-sans); }
      .wz-qq-btn:hover { border-color: #1d5741; }
      .wz-qq-btn.sel-yes { background: #fbf4e6; border-color: #92400e; color: #92400e; }
      .wz-qq-btn.sel-no { background: #edf3ec; border-color: #1d5741; color: #1d5741; }
      @media (max-width: 560px) { .wz-qq-row { flex-direction: column; align-items: stretch; } .wz-qq-btns { justify-content: stretch; } .wz-qq-btn { flex: 1; } }

      .wz-upd-grid { display: grid; grid-template-columns: 110px 1fr 120px; gap: 10px 14px; align-items: center; }
      @media (max-width: 640px) { .wz-upd-grid { grid-template-columns: 1fr; } .wz-upd-grid .wz-upd-label { margin-top: 10px; } }
      .wz-upd-label { font-size: 0.85rem; font-weight: 700; color: #3d443a; }

      .wz-form-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 8px 0 4px; }
      @media (max-width: 640px) { .wz-form-cards { grid-template-columns: 1fr; } }
      .wz-form-card { border: 1.5px solid #cfc3a9; border-radius: 10px; padding: 20px; background: #fff; cursor: pointer; text-align: left; transition: all 0.15s; font-family: var(--font-sans); }
      .wz-form-card:hover { border-color: #1d5741; }
      .wz-form-card.selected { border-color: #1d5741; background: #edf3ec; }
      .wz-form-card h4 { font-size: 0.95rem; font-weight: 700; color: #262b23; margin-bottom: 6px; }
      .wz-form-card p { font-size: 0.8rem; color: #575f52; line-height: 1.55; }
      .wz-form-card .wz-form-tag { display: inline-block; font-family: var(--font-mono); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; color: #1d5741; background: rgba(29,87,65,0.1); border-radius: 20px; padding: 2px 10px; margin-bottom: 8px; }

      /* Top estimate card — the cyber cw-top-est pattern, HO edition */
      .ho-top-est { max-width: 860px; margin: 0 auto 18px; display: flex; align-items: center; justify-content: space-between; gap: 18px; background: linear-gradient(135deg, rgba(29,87,65,0.10), rgba(29,87,65,0.04)); border: 1px solid rgba(29,87,65,0.30); border-radius: 10px; padding: 18px 24px; }
      .ho-top-est-label { font-family: var(--font-sans); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #1d5741; }
      .ho-top-est-value { font-family: var(--font-display); font-size: clamp(1.3rem, 3vw, 1.9rem); font-weight: 600; color: #1d5741; line-height: 1.15; margin-top: 2px; }
      .ho-top-est-copy { font-size: 0.78rem; color: var(--muted, #575f52); margin-top: 4px; line-height: 1.5; max-width: 520px; }
      .ho-top-est-chip { flex-shrink: 0; font-family: var(--font-sans); font-size: 0.68rem; font-weight: 600; color: #1d5741; border: 1px solid rgba(29,87,65,0.4); border-radius: 6px; padding: 6px 12px; white-space: nowrap; }
      @media (max-width: 640px) { .ho-top-est { flex-direction: column; align-items: flex-start; } .ho-top-est-chip { display: none; } }

      .wz-sticky-bar { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg2, #efe9db); border-top: 1px solid var(--border, #e2d9c6); padding: 12px 20px; align-items: center; justify-content: space-between; gap: 12px; z-index: 100; font-size: 0.82rem; }
      @media (max-width: 768px) { .wz-sticky-bar.wz-on { display: flex; } }
    `;
    document.head.appendChild(style);
  }

  // ─── Utilities ────────────────────────────────────────────────────────────
  function mk(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    for (let i = 2; i < arguments.length; i++) {
      const c = arguments[i];
      if (c == null) continue;
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    }
    return e;
  }
  function parseDollar(v) { return parseFloat(String(v || '').replace(/[^0-9.]/g, '')) || 0; }
  function fmtMoney(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function mkField(labelText, inputEl, errorId) {
    const d = mk('div', { class: 'wz-field' });
    if (labelText) { const l = mk('label'); l.textContent = labelText; d.appendChild(l); }
    d.appendChild(inputEl);
    if (errorId) { const e = mk('span', { class: 'wz-error', id: errorId }); d.appendChild(e); }
    return d;
  }
  function showErr(id, msg) {
    const e = document.getElementById(id);
    if (!e) return;
    e.textContent = msg || '';
    e.classList.toggle('show', !!msg);
    if (msg && e.previousElementSibling) e.previousElementSibling.classList.add('invalid');
  }
  function clearErr(id) {
    const e = document.getElementById(id);
    if (!e) return;
    e.textContent = ''; e.classList.remove('show');
    if (e.previousElementSibling) e.previousElementSibling.classList.remove('invalid');
  }
  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '')); }

  // Segmented single-select control bound to a state key.
  function segGroup(key, options, onChange) {
    const wrap = mk('div', { class: 'wz-seg' });
    options.forEach(opt => {
      const btn = mk('button', { type: 'button', class: 'wz-seg-btn' + (state[key] === opt.v ? ' selected' : '') });
      btn.textContent = opt.l;
      btn.addEventListener('click', () => {
        state[key] = opt.v;
        wrap.querySelectorAll('.wz-seg-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        refreshTopEst();
        if (onChange) onChange(opt.v);
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }
  function selectEl(key, options, onChange) {
    const s = mk('select', { class: 'wz-select' });
    options.forEach(o => {
      const op = mk('option', { value: o.v }); op.textContent = o.l;
      if (state[key] === o.v) op.selected = true;
      s.appendChild(op);
    });
    s.addEventListener('change', () => { state[key] = s.value; refreshTopEst(); if (onChange) onChange(s.value); });
    return s;
  }
  function textInput(key, attrs, onInput) {
    const i = mk('input', Object.assign({ class: 'wz-input', type: 'text' }, attrs || {}));
    i.value = state[key] || '';
    i.addEventListener('input', () => { state[key] = i.value; refreshTopEst(); if (onInput) onInput(i.value); });
    return i;
  }

  // ─── Sticky bar ───────────────────────────────────────────────────────────
  function mountStickyBar(mount) {
    if (document.getElementById('wz-sticky')) return;
    const bar = mk('div', { class: 'wz-sticky-bar', id: 'wz-sticky' });
    const phone = mk('a', { href: 'tel:+13108045017', style: 'color:#1d5741;font-weight:600;text-decoration:none;' });
    phone.textContent = '📞 310-804-5017';
    const stepLabel = mk('span', { id: 'wz-sticky-step', style: 'color:var(--muted, #575f52);' });
    stepLabel.textContent = 'Get your indication';
    bar.appendChild(phone); bar.appendChild(stepLabel);
    document.body.appendChild(bar);
    // Only show while the wizard is on screen — it must not hover over unrelated content.
    if (mount && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { bar.classList.toggle('wz-on', en.isIntersecting); });
      }).observe(mount);
    } else {
      bar.classList.add('wz-on');
    }
  }
  function updateStickyStep(current) {
    const el = document.getElementById('wz-sticky-step');
    if (el) el.textContent = 'Step ' + current + ' of ' + TOTAL_STEPS;
  }

  // ─── Indication math ──────────────────────────────────────────────────────
  function suggestedDwelling() {
    const sqft = parseDollar(state.total_living_area);
    return sqft >= 200 ? Math.round(sqft * COST_PER_SQFT / 1000) * 1000 : 0;
  }
  function effectiveDwelling() {
    const manual = parseDollar(state.dwelling_limit);
    if (state.dwelling_touched && manual > 0) return manual;
    return manual > 0 ? manual : suggestedDwelling();
  }
  function roofAgeYears() {
    const yb = parseInt(state.year_built, 10);
    const ry = parseInt(state.roof_update_year, 10);
    if (state.roof_updated === 'full' && ry > 1900) return THIS_YEAR - ry;
    if (yb > 1800) return THIS_YEAR - yb;
    return null;
  }
  function calcIndication() {
    const dwelling = effectiveDwelling();
    if (!dwelling) return { ready: false };
    let premium = (dwelling / 1000) * BASE_RATE_PER_1000;
    const notes = [];

    // Wildfire / brush — the dominant CA rating driver.
    const wf = state.q.q_hazard ? (state.q.q_hazard === 'Yes' ? 'yes' : 'no') : state.wildfire_exposure;
    if (wf === 'yes') { premium *= 1.9; notes.push('Brush/wildfire exposure — may quote as FAIR Plan + companion (DIC) pairing'); }
    else if (wf === 'unsure') { premium *= 1.2; notes.push('Wildfire exposure unknown — we verify the brush/fire-zone mapping'); }

    // Roof
    const ra = roofAgeYears();
    if (ra != null) {
      if (ra > 25) { premium *= 1.30; notes.push('Roof age 25+ years — several carriers surcharge or require replacement'); }
      else if (ra >= 15) { premium *= 1.15; }
    }
    if (state.roof_material === 'shake') { premium *= 1.25; notes.push('Wood-shake roof — limited carrier appetite in CA'); }
    else if (state.roof_material === 'flat') { premium *= 1.10; }
    else if (state.roof_material === 'metal') { premium *= 0.95; }

    // Age of home / systems
    const yb = parseInt(state.year_built, 10);
    const fullyRewired = state.wiring_updated === 'full';
    if (yb && yb < 1950 && !fullyRewired) premium *= 1.20;
    else if (yb && yb < 1980 && !fullyRewired) premium *= 1.08;
    if (state.wiring_type === 'knob_tube') { premium *= 1.35; notes.push('Knob & tube wiring — most standard carriers require remediation'); }
    else if (state.wiring_type === 'aluminum') { premium *= 1.20; notes.push('Aluminum branch wiring — carriers may require pigtailing/remediation'); }
    if (state.electrical_panel === 'fuses') { premium *= 1.15; notes.push('Fuse panel — many carriers require a breaker upgrade'); }

    // Construction & occupancy
    if (state.construction_type === 'masonry') premium *= 0.95;
    if (state.usage === 'seasonal') premium *= 1.15;
    else if (state.usage === 'secondary') premium *= 1.05;
    if (state.vacancy !== 'No') { premium *= 1.5; notes.push('Vacant/unoccupied — placed in specialty vacant-dwelling markets'); }

    // Protection & features
    if (state.burglar_alarm === 'central' || state.smoke_alarm === 'central') premium *= 0.95;
    if (state.swimming_pool && state.swimming_pool !== 'no') {
      premium *= 1.03;
      if (state.pool_fence !== 'Yes') notes.push('Unfenced pool — most carriers require approved fencing');
    }

    // Claims
    const claims = state.hasClaims === 'yes' ? state.lossRows.filter(r => r.date || r.description || r.amount).length : 0;
    if (claims === 1) premium *= 1.25;
    else if (claims === 2) premium *= 1.5;
    else if (claims >= 3) { premium *= 1.9; notes.push('3+ losses — expect specialty-market placement'); }

    // Deductible
    const ded = parseDollar(state.deductible);
    if (ded <= 500) premium *= 1.12;
    else if (ded <= 1000) premium *= 1.06;
    else if (ded >= 10000) premium *= 0.85;
    else if (ded >= 5000) premium *= 0.92;

    // Form
    if (state.policy_form === 'HO5') premium *= 1.13;

    premium = Math.max(premium, FLOOR_PREMIUM);
    const low = Math.round(premium * RANGE_LOW / 10) * 10;
    const high = Math.round(premium * RANGE_HIGH / 10) * 10;
    return {
      ready: true, dwelling, low, high, notes,
      highValue: dwelling >= HIGH_VALUE_THRESHOLD,
      wildfire: wf === 'yes',
      formLabel: state.pathway === 'landlord' ? 'DP-3 (landlord dwelling)' : (state.policy_form === 'HO5' ? 'HO-5 (comprehensive)' : 'HO-3 (special form)')
    };
  }

  // ─── Top estimate card (cyber cw-top-est pattern) ────────────────────────
  function renderTopEst() {
    let card = document.getElementById('ho-top-est');
    if (!card) {
      card = mk('div', { class: 'ho-top-est', id: 'ho-top-est' });
      const mount = document.getElementById('ho-wizard-mount');
      if (mount) mount.insertBefore(card, mount.firstChild);
    }
    const ind = calcIndication();
    if (!ind.ready) {
      card.innerHTML = '<div><span class="ho-top-est-label">Estimated annual premium</span>' +
        '<div class="ho-top-est-value">Complete the basics</div>' +
        '<p class="ho-top-est-copy">Square footage (or a dwelling limit) unlocks your live estimate. It refines as you answer.</p></div>' +
        '<div class="ho-top-est-chip">Updates as you answer</div>';
      return;
    }
    let copy = ind.formLabel + ' · Coverage A ' + fmtMoney(ind.dwelling) + ' · $' + parseDollar(state.deductible).toLocaleString() + ' deductible';
    if (ind.wildfire) copy += ' · brush-zone pricing';
    card.innerHTML = '<div><span class="ho-top-est-label">Estimated annual premium</span>' +
      '<div class="ho-top-est-value">' + fmtMoney(ind.low) + ' – ' + fmtMoney(ind.high) + ' <span style="font-size:0.6em;font-weight:600;color:#1d5741;">/ year</span></div>' +
      '<p class="ho-top-est-copy">' + copy + '. Preliminary indication — not a quote.</p></div>' +
      '<div class="ho-top-est-chip">Updates as you answer</div>';
  }
  let estTimer = null;
  function refreshTopEst() {
    clearTimeout(estTimer);
    estTimer = setTimeout(renderTopEst, 120);
  }

  function renderIndicationBox() {
    const ind = calcIndication();
    const box = mk('div', { class: 'wz-indication-box', id: 'wz-ind-box' });
    const kicker = mk('div', { class: 'wz-indication-kicker' }); kicker.textContent = 'PRELIMINARY INDICATION';
    box.appendChild(kicker);
    if (!ind.ready) {
      const ph = mk('div', { style: 'color:#575f52;font-size:0.88rem;padding:8px 0' });
      ph.textContent = 'Enter square footage (Structure step) or a dwelling limit (Coverage step) to see your range.';
      box.appendChild(ph); return box;
    }
    const amt = mk('div', { class: 'wz-indication-amount' });
    amt.textContent = fmtMoney(ind.low) + ' – ' + fmtMoney(ind.high) + ' / year';
    box.appendChild(amt);
    const detail = mk('div', { class: 'wz-indication-detail' });
    detail.innerHTML = '<div><strong>Policy form:</strong> ' + ind.formLabel + '</div>' +
      '<div><strong>Coverage A (dwelling):</strong> ' + fmtMoney(ind.dwelling) + '</div>' +
      '<div><strong>Deductible:</strong> $' + parseDollar(state.deductible).toLocaleString() + '</div>' +
      '<div><strong>Liability / Med-pay:</strong> $' + parseDollar(state.personal_liability_limit).toLocaleString() + ' / $' + parseDollar(state.med_pay_limit).toLocaleString() + '</div>';
    box.appendChild(detail);
    const warn = mk('div', { class: 'wz-indication-warning' });
    warn.textContent = '⚠ Preliminary indication only — not a quote, binder, or guarantee of coverage. Final premium depends on carrier underwriting, wildfire-zone mapping, replacement-cost valuation, and inspection.';
    box.appendChild(warn);
    if (ind.notes.length) {
      const ul = mk('ul', { style: 'margin:10px 0 0 18px;font-size:0.8rem;color:#575f52;line-height:1.7;' });
      ind.notes.forEach(n => { const li = mk('li'); li.textContent = n; ul.appendChild(li); });
      box.appendChild(ul);
    }
    if (ind.highValue) {
      const hv = mk('div', { style: 'margin-top:12px;padding:13px 15px;border:1px solid rgba(29,87,65,0.4);background:rgba(29,87,65,0.08);border-radius:10px;font-size:0.82rem;line-height:1.6;color:#1a3a2a;' });
      hv.innerHTML = '<strong style="color:#17493a;">Private Client home.</strong> At ' + fmtMoney(HIGH_VALUE_THRESHOLD) + '+ of dwelling coverage you qualify for the high-value homeowners market — Chubb, PURE, AIG Private Client, Cincinnati, Nationwide Private Client — with cash-settlement options, extended replacement cost, and dedicated claim handling. We shop those markets for you; treat the range above as directional only.';
      box.appendChild(hv);
    }
    if (state.policy_form === 'HO5' && state.pathway !== 'landlord') {
      const h5 = mk('div', { style: 'margin-top:12px;padding:13px 15px;border:1px solid rgba(29,87,65,0.4);background:rgba(29,87,65,0.06);border-radius:10px;font-size:0.82rem;line-height:1.6;color:#1a3a2a;' });
      h5.innerHTML = '<strong style="color:#17493a;">You chose HO-5 — good instinct for better value.</strong> Open-perils coverage on your contents, usually 10–20% more premium. Our sister site <a href="https://www.bestho5.com" target="_blank" rel="noopener" style="color:#1d5741;font-weight:700;">BestHO5.com</a> specializes in comprehensive-form placements; this application works for both — we quote HO-5 first and show you the HO-3 delta.';
      box.appendChild(h5);
    }
    return box;
  }

  // ─── Step scaffolding ─────────────────────────────────────────────────────
  function stepper(current) {
    const wrap = mk('div', { class: 'wz-stepper' });
    const segs = mk('div', { class: 'wz-stepper-segs' });
    const labels = mk('div', { class: 'wz-stepper-labels' });
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      segs.appendChild(mk('div', { class: 'wz-step-seg' + (i < current ? ' done' : i === current ? ' active' : '') }));
      const l = mk('div', { class: 'wz-stepper-label' + (i === current ? ' active' : '') });
      l.textContent = STEP_LABELS[i - 1];
      labels.appendChild(l);
    }
    wrap.appendChild(segs); wrap.appendChild(labels);
    return wrap;
  }
  function navRow(onBack, onNext, nextLabel) {
    const nav = mk('div', { class: 'wz-nav' });
    if (onBack) {
      const back = mk('button', { type: 'button', class: 'wz-btn-back' });
      back.textContent = '← Back';
      back.addEventListener('click', onBack);
      nav.appendChild(back);
    }
    if (onNext) {
      const next = mk('button', { type: 'button', class: 'wz-btn-next' });
      next.textContent = nextLabel || 'Continue →';
      next.addEventListener('click', onNext);
      nav.appendChild(next);
    }
    return nav;
  }
  function swapCard(mount, card) {
    mount.querySelectorAll('.wz-card').forEach(c => c.remove());
    mount.appendChild(card);
    renderTopEst();
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ─── Opening — routing (owner / landlord→DP-3 / renter) ──────────────────
  function renderOpening(mount) {
    const card = mk('div', { class: 'wz-card' });
    const h2 = mk('h2'); h2.textContent = 'Who lives in the home?'; card.appendChild(h2);
    const sub = mk('p'); sub.textContent = 'This decides the right policy form — HO-3/HO-5 for owner-occupied homes, DP-3 for rentals and investment properties.'; card.appendChild(sub);

    const cards = mk('div', { class: 'wz-route-cards' });
    const routes = [
      { icon: '🏠', title: 'I own it and live in it', body: 'Primary, seasonal, or secondary home you own. HO-3 special form — or HO-5 if you want the broadest coverage.', act: () => { state.pathway = 'owner'; state.q.q_owner = 'Yes'; renderStep1(mount); } },
      { icon: '🔑', title: "It's my rental / investment property", body: 'Tenant-occupied or between tenants. That’s a DP-3 landlord dwelling policy — we broker those too, same application.', act: () => { state.pathway = 'landlord'; state.policy_form = 'DP3'; state.q.q_owner = 'Yes'; renderLandlordInterstitial(mount); } },
      { icon: '🧳', title: 'I rent my home', body: 'You need renters insurance (HO-4) — contents + liability. We broker it; it takes five minutes by phone or email.', act: () => renderRenterCard(mount) }
    ];
    routes.forEach(r => {
      const c = mk('button', { class: 'wz-route-card', type: 'button' });
      const ic = mk('span', { class: 'wz-route-icon' }); ic.textContent = r.icon;
      const h3 = mk('h3'); h3.textContent = r.title;
      const p = mk('p'); p.textContent = r.body;
      c.appendChild(ic); c.appendChild(h3); c.appendChild(p);
      c.addEventListener('click', r.act);
      cards.appendChild(c);
    });
    card.appendChild(cards);
    const note = mk('p', { style: 'font-size:0.78rem;color:#575f52;margin-top:18px;line-height:1.6;' });
    note.textContent = 'Independent brokerage — WJB Services, Inc. dba Bollinsure Insurance Services, CA DOI Lic. #6013787, licensed in all 50 states. No broker fee.';
    card.appendChild(note);
    swapCard(mount, card);
  }

  function renderLandlordInterstitial(mount) {
    const card = mk('div', { class: 'wz-card' });
    const h2 = mk('h2'); h2.textContent = 'Rental property → DP-3 dwelling policy'; card.appendChild(h2);
    const sub = mk('p'); sub.textContent = 'Right form, same 5-minute application.'; card.appendChild(sub);
    const note = mk('div', { class: 'wz-note-accent' });
    note.innerHTML = 'Non-owner-occupied homes are written on the <strong>DP-3 (dwelling fire, special form)</strong> — open-perils dwelling coverage, fair-rental-value income protection, and premises liability. An HO-3 would misrepresent the occupancy and can void claims. We prepare your application on a DP-3 basis automatically. <a href="/landlord-dp3" target="_blank" rel="noopener" style="color:#1d5741;font-weight:700;">Read the landlord DP-3 guide →</a>';
    card.appendChild(note);
    const tenant = mk('div', { style: 'margin-top:18px;' });
    tenant.appendChild(mk('div', { class: 'wz-section-title' }, 'Current occupancy of the rental'));
    const seg = mk('div', { class: 'wz-seg' });
    [{ v: 'tenant', l: 'Tenant-occupied' }, { v: 'vacant', l: 'Currently vacant' }].forEach(opt => {
      const btn = mk('button', { type: 'button', class: 'wz-seg-btn' + ((state.occupancy_landlord || 'tenant') === opt.v ? ' selected' : '') });
      btn.textContent = opt.l;
      btn.addEventListener('click', () => {
        state.occupancy_landlord = opt.v;
        if (opt.v === 'vacant') state.vacancy = 'Vacant'; else state.vacancy = 'No';
        seg.querySelectorAll('.wz-seg-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        refreshTopEst();
      });
      seg.appendChild(btn);
    });
    if (!state.occupancy_landlord) state.occupancy_landlord = 'tenant';
    tenant.appendChild(seg);
    card.appendChild(tenant);
    card.appendChild(navRow(() => renderOpening(mount), () => renderStep1(mount), 'Start DP-3 application →'));
    swapCard(mount, card);
  }

  function renderRenterCard(mount) {
    const card = mk('div', { class: 'wz-card wz-success' });
    card.innerHTML = '<div class="wz-success-icon">🧳</div>' +
      '<h2>Renters (HO-4) — fastest by phone or email</h2>' +
      '<p>Renters policies are quick: contents value, liability limit, address, done. Call <a href="tel:+13108045017">310-804-5017</a> or email <a href="mailto:quotes@bollinsure.com?subject=Renters%20insurance%20quote">quotes@bollinsure.com</a> and a licensed broker will have options for you same day.</p>' +
      '<p style="margin-top:10px;">Buying a home soon? Come back for your HO-3 — or read the <a href="/california-homeowners-insurance">California homeowners guide</a> in the meantime.</p>' +
      '<a href="#" class="wz-success-back" id="wz-renter-back">← Back</a>';
    card.querySelector('#wz-renter-back').addEventListener('click', (e) => { e.preventDefault(); renderOpening(mount); });
    swapCard(mount, card);
  }

  // ─── Step 1 — Property & occupancy ────────────────────────────────────────
  function renderStep1(mount) {
    updateStickyStep(1);
    const card = mk('div', { class: 'wz-card' });
    card.appendChild(stepper(1));
    const h2 = mk('h2'); h2.textContent = state.pathway === 'landlord' ? 'Where is the rental property?' : 'Where is the home?'; card.appendChild(h2);
    const sub = mk('p'); sub.textContent = 'Location drives wildfire mapping, protection class, and carrier appetite — the three biggest CA pricing levers.'; card.appendChild(sub);

    const g = mk('div', { class: 'wz-grid' });
    const addr = textInput('risk_address', { placeholder: '123 Oak Canyon Rd', autocomplete: 'address-line1' });
    g.appendChild(mk('div', { class: 'wz-full' }, mkField('Street address *', addr, 'err-s1-addr')));
    const city = textInput('risk_city', { placeholder: 'Los Angeles', autocomplete: 'address-level2' });
    g.appendChild(mkField('City *', city, 'err-s1-city'));
    const county = textInput('risk_county', { placeholder: 'Los Angeles County' });
    g.appendChild(mkField('County', county));
    const st = textInput('risk_state', { placeholder: 'CA', maxlength: '2', style: 'text-transform:uppercase' });
    g.appendChild(mkField('State *', st, 'err-s1-state'));
    const zip = textInput('risk_zip', { placeholder: '90049', inputmode: 'numeric', maxlength: '10', autocomplete: 'postal-code' });
    g.appendChild(mkField('ZIP *', zip, 'err-s1-zip'));
    card.appendChild(g);

    card.appendChild(mk('div', { class: 'wz-section-title' }, 'Residence type *'));
    card.appendChild(segGroup('residence_type', [
      { v: 'dwelling', l: 'Single-family dwelling' }, { v: 'townhouse', l: 'Townhouse' }, { v: 'rowhouse', l: 'Rowhouse' },
      { v: 'condominium', l: 'Condominium' }, { v: 'cooperative', l: 'Co-op' }, { v: 'apartment', l: 'Apartment bldg' }
    ], (v) => {
      const el = document.getElementById('wz-restype-note');
      if (el) el.style.display = (v === 'condominium' || v === 'cooperative') ? '' : 'none';
    }));
    const condoNote = mk('div', { class: 'wz-note-accent', id: 'wz-restype-note', style: (state.residence_type === 'condominium' || state.residence_type === 'cooperative') ? '' : 'display:none' });
    condoNote.innerHTML = 'Condos and co-ops are usually written on an <strong>HO-6</strong> (walls-in) policy coordinated with your HOA master policy. Keep going — the same application works, and your broker will quote the right form. See <a href="/ho3-vs-ho6-condo" target="_blank" rel="noopener" style="color:#1d5741;font-weight:700;">HO-3 vs HO-6</a>.';
    card.appendChild(condoNote);
    card.appendChild(mk('span', { class: 'wz-error', id: 'err-s1-restype' }));

    if (state.pathway !== 'landlord') {
      card.appendChild(mk('div', { class: 'wz-section-title' }, 'How do you use it? *'));
      card.appendChild(segGroup('usage', [
        { v: 'primary', l: 'Primary residence' }, { v: 'seasonal', l: 'Seasonal' }, { v: 'secondary', l: 'Secondary' }, { v: 'other', l: 'Other' }
      ]));
      card.appendChild(mk('div', { class: 'wz-section-title' }, 'Currently vacant or unoccupied?'));
      card.appendChild(segGroup('vacancy', [
        { v: 'No', l: 'No — lived in' }, { v: 'Unoccupied', l: 'Unoccupied (furnished, temporary)' }, { v: 'Vacant', l: 'Vacant' }
      ]));
    }

    const g2 = mk('div', { class: 'wz-grid', style: 'margin-top:20px' });
    const fam = selectEl('number_of_families', [
      { v: '1', l: '1 family' }, { v: '2', l: '2 families (duplex)' }, { v: '3', l: '3 families' }, { v: '4', l: '4 families' }
    ]);
    g2.appendChild(mkField('Number of families *', fam));
    const icl = selectEl('in_city_limits', [{ v: 'Yes', l: 'Yes' }, { v: 'No', l: 'No' }]);
    g2.appendChild(mkField('Inside city limits?', icl));
    card.appendChild(g2);

    card.appendChild(mk('div', { class: 'wz-section-title' }, 'Is the home in or near a brush / wildland area? *'));
    const ctx = mk('p', { class: 'wz-rate-note', style: 'margin-bottom:10px' });
    ctx.textContent = 'The single biggest CA pricing factor. "Near" means canyon, hillside, or open brush within a few hundred feet.';
    card.appendChild(ctx);
    card.appendChild(segGroup('wildfire_exposure', [
      { v: 'no', l: 'No — urban / suburban' }, { v: 'yes', l: 'Yes — brush or canyon nearby' }, { v: 'unsure', l: 'Not sure' }
    ]));
    card.appendChild(mk('span', { class: 'wz-error', id: 'err-s1-wf' }));

    card.appendChild(navRow(() => (state.pathway === 'landlord' ? renderLandlordInterstitial(mount) : renderOpening(mount)), () => {
      let ok = true;
      if (!state.risk_address.trim()) { showErr('err-s1-addr', 'Street address is required'); ok = false; } else clearErr('err-s1-addr');
      if (!state.risk_city.trim()) { showErr('err-s1-city', 'City is required'); ok = false; } else clearErr('err-s1-city');
      if (!/^[A-Za-z]{2}$/.test(state.risk_state.trim())) { showErr('err-s1-state', '2-letter state'); ok = false; } else clearErr('err-s1-state');
      if (!/^\d{5}(-\d{4})?$/.test(state.risk_zip.trim())) { showErr('err-s1-zip', 'Enter a 5-digit ZIP'); ok = false; } else clearErr('err-s1-zip');
      if (!state.residence_type) { showErr('err-s1-restype', 'Choose a residence type'); ok = false; } else clearErr('err-s1-restype');
      if (!state.wildfire_exposure) { showErr('err-s1-wf', 'Choose one — it drives your estimate'); ok = false; } else clearErr('err-s1-wf');
      if (ok) { state.risk_state = state.risk_state.toUpperCase(); renderStep2(mount); }
    }));
    swapCard(mount, card);
  }

  // ─── Step 2 — Structure ───────────────────────────────────────────────────
  function renderStep2(mount) {
    updateStickyStep(2);
    const card = mk('div', { class: 'wz-card' });
    card.appendChild(stepper(2));
    const h2 = mk('h2'); h2.textContent = 'Tell us about the structure'; card.appendChild(h2);
    const sub = mk('p'); sub.textContent = 'Year built, size, and construction set the replacement cost — the anchor for everything else.'; card.appendChild(sub);

    const g = mk('div', { class: 'wz-grid' });
    const yb = textInput('year_built', { placeholder: '1968', inputmode: 'numeric', maxlength: '4' });
    g.appendChild(mkField('Year built *', yb, 'err-s2-yb'));
    const sqft = textInput('total_living_area', { placeholder: '1,850', inputmode: 'numeric' });
    const sqftField = mkField('Total living area (sq ft) *', sqft, 'err-s2-sqft');
    sqftField.appendChild(mk('div', { class: 'wz-rate-note' }, 'Drives the suggested dwelling limit at ~$' + COST_PER_SQFT + '/sq ft — you can adjust it on the Coverage step.'));
    g.appendChild(sqftField);
    card.appendChild(g);

    card.appendChild(mk('div', { class: 'wz-section-title' }, 'Construction type *'));
    card.appendChild(segGroup('construction_type', [
      { v: 'frame', l: 'Frame (wood)' }, { v: 'masonry', l: 'Masonry' }, { v: 'masonry_veneer', l: 'Masonry veneer' }, { v: 'other', l: 'Other' }
    ]));
    card.appendChild(mk('span', { class: 'wz-error', id: 'err-s2-ct' }));
    card.appendChild(mk('p', { class: 'wz-rate-note' }, 'Most CA homes are frame — that\'s the seismic-friendly default here.'));

    card.appendChild(mk('div', { class: 'wz-section-title' }, 'Foundation type (optional)'));
    card.appendChild(segGroup('foundation_type', [
      { v: 'closed', l: 'Closed / slab or perimeter' }, { v: 'open', l: 'Open / piers' }, { v: 'none', l: 'None' }, { v: '', l: 'Skip' }
    ]));

    card.appendChild(mk('div', { class: 'wz-section-title' }, 'Roof material *'));
    card.appendChild(segGroup('roof_material', [
      { v: 'comp', l: 'Composition shingle' }, { v: 'tile', l: 'Tile (clay/concrete)' }, { v: 'metal', l: 'Metal' },
      { v: 'shake', l: 'Wood shake' }, { v: 'flat', l: 'Flat (tar & gravel)' }, { v: 'other', l: 'Other' }
    ], (v) => {
      const el = document.getElementById('wz-shake-note');
      if (el) el.style.display = v === 'shake' ? '' : 'none';
    }));
    const shakeNote = mk('div', { class: 'wz-note-warn', id: 'wz-shake-note', style: state.roof_material === 'shake' ? '' : 'display:none' });
    shakeNote.textContent = 'Wood-shake roofs have very limited carrier appetite in California brush zones — expect surcharges or a re-roof requirement. We\'ll still shop it.';
    card.appendChild(shakeNote);
    card.appendChild(mk('span', { class: 'wz-error', id: 'err-s2-roof' }));

    card.appendChild(navRow(() => renderStep1(mount), () => {
      let ok = true;
      const y = parseInt(state.year_built, 10);
      if (!(y >= 1800 && y <= THIS_YEAR + 1)) { showErr('err-s2-yb', 'Enter a 4-digit year'); ok = false; } else clearErr('err-s2-yb');
      if (parseDollar(state.total_living_area) < 200) { showErr('err-s2-sqft', 'Enter total living area'); ok = false; } else clearErr('err-s2-sqft');
      if (!state.construction_type) { showErr('err-s2-ct', 'Choose a construction type'); ok = false; } else clearErr('err-s2-ct');
      if (!state.roof_material) { showErr('err-s2-roof', 'Choose a roof material'); ok = false; } else clearErr('err-s2-roof');
      if (ok) renderStep3(mount);
    }));
    swapCard(mount, card);
  }

  // ─── Step 3 — Systems & condition ─────────────────────────────────────────
  function updRow(labelText, updKey, yearKey) {
    const frag = document.createDocumentFragment();
    frag.appendChild(mk('div', { class: 'wz-upd-label' }, labelText));
    const yr = mk('input', { class: 'wz-input', type: 'text', placeholder: 'Year', inputmode: 'numeric', maxlength: '4', style: state[updKey] === 'none' ? 'visibility:hidden' : '' });
    yr.value = state[yearKey] || '';
    yr.addEventListener('input', () => { state[yearKey] = yr.value; refreshTopEst(); });
    const seg = mk('div', { class: 'wz-seg' });
    [{ v: 'none', l: 'Original / unknown' }, { v: 'partial', l: 'Partial update' }, { v: 'full', l: 'Full update' }].forEach(opt => {
      const btn = mk('button', { type: 'button', class: 'wz-seg-btn' + (state[updKey] === opt.v ? ' selected' : '') });
      btn.textContent = opt.l;
      btn.addEventListener('click', () => {
        state[updKey] = opt.v;
        seg.querySelectorAll('.wz-seg-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        yr.style.visibility = opt.v === 'none' ? 'hidden' : 'visible';
        refreshTopEst();
      });
      seg.appendChild(btn);
    });
    frag.appendChild(seg);
    frag.appendChild(yr);
    return frag;
  }

  function renderStep3(mount) {
    updateStickyStep(3);
    const card = mk('div', { class: 'wz-card' });
    card.appendChild(stepper(3));
    const h2 = mk('h2'); h2.textContent = 'Systems, updates & condition'; card.appendChild(h2);
    const sub = mk('p'); sub.textContent = 'Carriers price the roof, plumbing, electrical, and heating by their last full update — not the year the house was built.'; card.appendChild(sub);

    const ctx = mk('div', { class: 'wz-step-context' });
    ctx.innerHTML = 'If a system was never updated (or you don\'t know), leave it on <strong>Original / unknown</strong> — we assume original unless a public record shows an update. A <strong>partial</strong> update with its year still helps your pricing.';
    card.appendChild(ctx);

    const grid = mk('div', { class: 'wz-upd-grid' });
    grid.appendChild(updRow('Roof', 'roof_updated', 'roof_update_year'));
    grid.appendChild(updRow('Heating', 'heating_updated', 'heating_update_year'));
    grid.appendChild(updRow('Plumbing', 'plumbing_updated', 'plumbing_update_year'));
    grid.appendChild(updRow('Electrical', 'wiring_updated', 'wiring_update_year'));
    card.appendChild(grid);

    card.appendChild(mk('div', { class: 'wz-section-title' }, 'Wiring type *'));
    card.appendChild(segGroup('wiring_type', [
      { v: 'copper', l: 'Copper / Romex' }, { v: 'aluminum', l: 'Aluminum' }, { v: 'knob_tube', l: 'Knob & tube' }, { v: 'mixed', l: 'Mixed' }, { v: 'unknown', l: 'Not sure' }
    ], (v) => {
      const el = document.getElementById('wz-wiring-note');
      if (el) el.style.display = (v === 'aluminum' || v === 'knob_tube') ? '' : 'none';
    }));
    const wireNote = mk('div', { class: 'wz-note-warn', id: 'wz-wiring-note', style: (state.wiring_type === 'aluminum' || state.wiring_type === 'knob_tube') ? '' : 'display:none' });
    wireNote.innerHTML = 'Aluminum and knob & tube wiring are material underwriting facts in CA — many standard carriers require remediation, and non-disclosure risks a denied claim. We disclose it properly and shop the carriers that accept it. See the <a href="/knob-and-tube-wiring" target="_blank" rel="noopener" style="color:#92400e;font-weight:700;text-decoration:underline;">wiring guide</a>.';
    card.appendChild(wireNote);
    card.appendChild(mk('span', { class: 'wz-error', id: 'err-s3-wire' }));

    const g2 = mk('div', { class: 'wz-grid', style: 'margin-top:20px' });
    const panel = selectEl('electrical_panel', [
      { v: '', l: 'Select…' }, { v: 'breakers', l: 'Circuit breakers' }, { v: 'fuses', l: 'Fuses' }
    ]);
    g2.appendChild(mkField('Electrical panel *', panel, 'err-s3-panel'));
    const amps = selectEl('electrical_amps', [
      { v: '', l: 'Not sure' }, { v: '60', l: '60 amps' }, { v: '100', l: '100 amps' }, { v: '125', l: '125 amps' }, { v: '200', l: '200 amps' }, { v: '400', l: '400 amps' }
    ]);
    g2.appendChild(mkField('Panel amperage', amps));
    card.appendChild(g2);

    card.appendChild(mk('div', { class: 'wz-section-title' }, 'Condition (your honest read — the inspection verifies)'));
    const g3 = mk('div', { class: 'wz-grid3' });
    const condOpts = [{ v: '', l: 'Select…' }, { v: 'excellent', l: 'Excellent' }, { v: 'good', l: 'Good' }, { v: 'average', l: 'Average' }, { v: 'below_average', l: 'Below average' }];
    g3.appendChild(mkField('Roof condition *', selectEl('roof_condition', condOpts), 'err-s3-rc'));
    g3.appendChild(mkField('Plumbing condition *', selectEl('plumbing_condition', condOpts), 'err-s3-pc'));
    g3.appendChild(mkField('Housekeeping *', selectEl('housekeeping', condOpts), 'err-s3-hk'));
    card.appendChild(g3);
    card.appendChild(mk('p', { class: 'wz-rate-note' }, '“Housekeeping” is underwriter-speak for general upkeep of the home and yard — debris, storage, maintenance.'));

    card.appendChild(navRow(() => renderStep2(mount), () => {
      let ok = true;
      if (!state.wiring_type) { showErr('err-s3-wire', 'Choose a wiring type (Not sure is fine)'); ok = false; } else clearErr('err-s3-wire');
      if (!state.electrical_panel) { showErr('err-s3-panel', 'Breakers or fuses?'); ok = false; } else clearErr('err-s3-panel');
      if (!state.roof_condition) { showErr('err-s3-rc', 'Required'); ok = false; } else clearErr('err-s3-rc');
      if (!state.plumbing_condition) { showErr('err-s3-pc', 'Required'); ok = false; } else clearErr('err-s3-pc');
      if (!state.housekeeping) { showErr('err-s3-hk', 'Required'); ok = false; } else clearErr('err-s3-hk');
      if (ok) renderStep4(mount);
    }));
    swapCard(mount, card);
  }

  // ─── Step 4 — Protection & features ───────────────────────────────────────
  function renderStep4(mount) {
    updateStickyStep(4);
    const card = mk('div', { class: 'wz-card' });
    card.appendChild(stepper(4));
    const h2 = mk('h2'); h2.textContent = 'Protection & features'; card.appendChild(h2);
    const sub = mk('p'); sub.textContent = 'Alarms and locks earn discounts; pools and trampolines change the liability picture.'; card.appendChild(sub);

    card.appendChild(mk('div', { class: 'wz-section-title' }, 'Exterior door locks *'));
    card.appendChild(segGroup('door_locks', [
      { v: 'deadbolt', l: 'Deadbolts' }, { v: 'spring', l: 'Spring latch only' }, { v: 'other', l: 'Other / smart locks' }
    ]));
    card.appendChild(mk('span', { class: 'wz-error', id: 'err-s4-locks' }));

    const g = mk('div', { class: 'wz-grid' });
    g.appendChild(mkField('Burglar alarm', selectEl('burglar_alarm', [
      { v: 'none', l: 'None' }, { v: 'local', l: 'Local (sounds on site)' }, { v: 'central', l: 'Central station monitored' }, { v: 'direct', l: 'Direct to police/fire' }
    ])));
    g.appendChild(mkField('Smoke alarm', selectEl('smoke_alarm', [
      { v: 'local', l: 'Local (standard detectors)' }, { v: 'central', l: 'Central station monitored' }, { v: 'direct', l: 'Direct to fire dept' }
    ])));
    g.appendChild(mkField('Fire sprinklers', selectEl('sprinklers', [
      { v: 'none', l: 'None' }, { v: 'partial', l: 'Partial' }, { v: 'full', l: 'Full system' }
    ])));
    g.appendChild(mkField('Fire extinguisher on premises?', selectEl('fire_extinguisher', [
      { v: '', l: 'Select…' }, { v: 'Yes', l: 'Yes' }, { v: 'No', l: 'No' }
    ]), 'err-s4-ext'));
    card.appendChild(g);

    card.appendChild(mk('div', { class: 'wz-section-title' }, 'Swimming pool *'));
    card.appendChild(segGroup('swimming_pool', [
      { v: 'no', l: 'No pool' }, { v: 'in_ground', l: 'In-ground' }, { v: 'above_ground', l: 'Above-ground' }
    ], (v) => {
      const el = document.getElementById('wz-pool-sub');
      if (el) el.style.display = v !== 'no' && v ? '' : 'none';
    }));
    card.appendChild(mk('span', { class: 'wz-error', id: 'err-s4-pool' }));
    const poolSub = mk('div', { id: 'wz-pool-sub', style: (state.swimming_pool && state.swimming_pool !== 'no') ? 'margin-top:14px' : 'display:none' });
    const pg = mk('div', { class: 'wz-grid3' });
    pg.appendChild(mkField('Approved fence?', selectEl('pool_fence', [{ v: 'No', l: 'No' }, { v: 'Yes', l: 'Yes' }])));
    pg.appendChild(mkField('Diving board?', selectEl('pool_diving_board', [{ v: 'No', l: 'No' }, { v: 'Yes', l: 'Yes' }])));
    pg.appendChild(mkField('Slide?', selectEl('pool_slide', [{ v: 'No', l: 'No' }, { v: 'Yes', l: 'Yes' }])));
    poolSub.appendChild(pg);
    card.appendChild(poolSub);

    card.appendChild(navRow(() => renderStep3(mount), () => {
      let ok = true;
      if (!state.door_locks) { showErr('err-s4-locks', 'Choose your lock type'); ok = false; } else clearErr('err-s4-locks');
      if (!state.fire_extinguisher) { showErr('err-s4-ext', 'Yes or no'); ok = false; } else clearErr('err-s4-ext');
      if (!state.swimming_pool) { showErr('err-s4-pool', 'Pool or no pool?'); ok = false; } else clearErr('err-s4-pool');
      if (ok) renderStep5(mount);
    }));
    swapCard(mount, card);
  }

  // ─── Step 5 — Applicant & coverage ────────────────────────────────────────
  function renderStep5(mount) {
    updateStickyStep(5);
    const card = mk('div', { class: 'wz-card' });
    card.appendChild(stepper(5));
    const h2 = mk('h2'); h2.textContent = 'About you & your coverage'; card.appendChild(h2);
    const sub = mk('p'); sub.textContent = 'Exactly what the ACORD application asks — nothing more.'; card.appendChild(sub);

    const g = mk('div', { class: 'wz-grid' });
    g.appendChild(mk('div', { class: 'wz-full' }, mkField('Applicant full name *', textInput('applicant_full_name', { placeholder: 'As it should appear on the policy', autocomplete: 'name' }), 'err-s5-name')));
    const dob = mk('input', { class: 'wz-input', type: 'date' });
    dob.value = state.applicant_dob || '';
    dob.addEventListener('input', () => { state.applicant_dob = dob.value; });
    g.appendChild(mkField('Date of birth *', dob, 'err-s5-dob'));
    g.appendChild(mkField('Occupation *', textInput('applicant_occupation', { placeholder: 'e.g., Teacher' }), 'err-s5-occ'));
    g.appendChild(mkField('Email *', textInput('applicant_email', { placeholder: 'you@example.com', type: 'email', autocomplete: 'email' }), 'err-s5-email'));
    const phoneWrap = mk('div');
    const phone = textInput('applicant_phone', { placeholder: '(310) 555-0123', type: 'tel', autocomplete: 'tel' });
    phoneWrap.appendChild(mkField('Phone *', phone, 'err-s5-phone'));
    const ptSeg = segGroup('applicant_phone_type', [{ v: 'cell', l: 'Cell' }, { v: 'home', l: 'Home' }, { v: 'business', l: 'Business' }]);
    ptSeg.style.marginTop = '8px';
    phoneWrap.appendChild(ptSeg);
    g.appendChild(phoneWrap);
    card.appendChild(g);

    // honeypot
    const hp = mk('input', { class: 'wz-honeypot', type: 'text', name: 'website_hp', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
    hp.addEventListener('input', () => { state.website_hp = hp.value; });
    card.appendChild(hp);

    card.appendChild(mk('div', { class: 'wz-section-title' }, 'Mailing address'));
    const msSeg = segGroup('mailing_same', [{ v: 'Yes', l: 'Same as the property' }, { v: 'No', l: 'Different mailing address' }], (v) => {
      const el = document.getElementById('wz-mailing-sub');
      if (el) el.style.display = v === 'No' ? '' : 'none';
    });
    card.appendChild(msSeg);
    const mailSub = mk('div', { id: 'wz-mailing-sub', style: state.mailing_same === 'No' ? 'margin-top:14px' : 'display:none' });
    const mg = mk('div', { class: 'wz-grid' });
    mg.appendChild(mk('div', { class: 'wz-full' }, mkField('Mailing street address', textInput('mailing_address', { placeholder: 'PO Box or street' }))));
    mg.appendChild(mkField('City', textInput('mailing_city', {})));
    mg.appendChild(mkField('State', textInput('mailing_state', { maxlength: '2', style: 'text-transform:uppercase' })));
    mg.appendChild(mkField('ZIP', textInput('mailing_zip', { maxlength: '10', inputmode: 'numeric' })));
    mailSub.appendChild(mg);
    card.appendChild(mailSub);

    if (state.pathway !== 'landlord') {
      card.appendChild(mk('div', { class: 'wz-section-title' }, 'Policy form'));
      const fc = mk('div', { class: 'wz-form-cards' });
      const forms = [
        { v: 'HO3', tag: 'HO-3 · SPECIAL FORM', h: 'Standard homeowners', p: 'Open-perils on the house, named-perils on your belongings. The California default — best price.' },
        { v: 'HO5', tag: 'HO-5 · COMPREHENSIVE', h: 'Broadest coverage, better value', p: 'Open-perils on the house AND your belongings, replacement cost throughout. Typically 10–20% more premium.' }
      ];
      forms.forEach(f => {
        const c = mk('button', { type: 'button', class: 'wz-form-card' + (state.policy_form === f.v ? ' selected' : '') });
        c.innerHTML = '<span class="wz-form-tag">' + f.tag + '</span><h4>' + f.h + '</h4><p>' + f.p + '</p>';
        c.addEventListener('click', () => {
          state.policy_form = f.v;
          fc.querySelectorAll('.wz-form-card').forEach(x => x.classList.remove('selected'));
          c.classList.add('selected');
          const n = document.getElementById('wz-ho5-note');
          if (n) n.style.display = f.v === 'HO5' ? '' : 'none';
          refreshTopEst();
        });
        fc.appendChild(c);
      });
      card.appendChild(fc);
      const ho5note = mk('div', { class: 'wz-note-accent', id: 'wz-ho5-note', style: state.policy_form === 'HO5' ? '' : 'display:none' });
      ho5note.innerHTML = 'Comprehensive-form shoppers: our sister site <a href="https://www.bestho5.com" target="_blank" rel="noopener" style="color:#1d5741;font-weight:700;">BestHO5.com</a> is dedicated to HO-5 placements. This application covers both — we\'ll quote HO-5 and show the HO-3 delta so you can judge the value. <a href="/ho3-vs-ho5" target="_blank" rel="noopener" style="color:#1d5741;font-weight:700;">Compare the forms →</a>';
      card.appendChild(ho5note);
    } else {
      const dpNote = mk('div', { class: 'wz-note-accent' });
      dpNote.innerHTML = 'Being prepared as a <strong>DP-3 landlord dwelling application</strong>. Ask about pairing it with an umbrella for tenant-suit protection.';
      card.appendChild(dpNote);
    }

    card.appendChild(mk('div', { class: 'wz-section-title' }, 'Coverage & deductible'));
    const cg = mk('div', { class: 'wz-grid3' });
    const dwl = textInput('dwelling_limit', { placeholder: suggestedDwelling() ? suggestedDwelling().toLocaleString() : 'e.g., 650,000', inputmode: 'numeric' }, () => { state.dwelling_touched = true; });
    // Track the sqft-based suggestion until the applicant edits the limit themselves.
    if (!state.dwelling_touched && suggestedDwelling()) {
      dwl.value = suggestedDwelling().toLocaleString();
      state.dwelling_limit = String(suggestedDwelling());
    }
    const dwlField = mkField('Dwelling limit (Coverage A) *', dwl, 'err-s5-dwl');
    dwlField.appendChild(mk('div', { class: 'wz-rate-note' }, 'Rebuild cost, not market value. Suggested from your square footage at ~$' + COST_PER_SQFT + '/sq ft — your broker verifies with a full replacement-cost valuation.'));
    cg.appendChild(dwlField);
    cg.appendChild(mkField('Deductible *', selectEl('deductible', [
      { v: '1000', l: '$1,000' }, { v: '2500', l: '$2,500' }, { v: '5000', l: '$5,000' }, { v: '10000', l: '$10,000' }
    ])));
    const liaWrap = mk('div');
    liaWrap.appendChild(mkField('Personal liability (Cov. E)', selectEl('personal_liability_limit', [
      { v: '100000', l: '$100,000' }, { v: '300000', l: '$300,000' }, { v: '500000', l: '$500,000' }
    ])));
    liaWrap.appendChild(mkField('Medical payments (Cov. F)', selectEl('med_pay_limit', [
      { v: '1000', l: '$1,000' }, { v: '5000', l: '$5,000' }
    ])));
    liaWrap.querySelectorAll('.wz-field')[1].style.marginTop = '12px';
    cg.appendChild(liaWrap);
    card.appendChild(cg);

    const eg = mk('div', { class: 'wz-grid', style: 'margin-top:20px' });
    const eff = mk('input', { class: 'wz-input', type: 'date' });
    eff.value = state.effective_date || '';
    eff.addEventListener('input', () => { state.effective_date = eff.value; });
    const effField = mkField('Desired effective date (optional)', eff);
    effField.appendChild(mk('div', { class: 'wz-rate-note' }, 'Escrow closing? Use the close-of-escrow date.'));
    eg.appendChild(effField);
    card.appendChild(eg);

    card.appendChild(navRow(() => renderStep4(mount), () => {
      let ok = true;
      if (!state.applicant_full_name.trim()) { showErr('err-s5-name', 'Full name is required'); ok = false; } else clearErr('err-s5-name');
      if (!state.applicant_dob) { showErr('err-s5-dob', 'Date of birth is required'); ok = false; } else clearErr('err-s5-dob');
      if (!state.applicant_occupation.trim()) { showErr('err-s5-occ', 'Occupation is required'); ok = false; } else clearErr('err-s5-occ');
      if (!isValidEmail(state.applicant_email)) { showErr('err-s5-email', 'Valid email required'); ok = false; } else clearErr('err-s5-email');
      if (state.applicant_phone.replace(/\D/g, '').length < 10) { showErr('err-s5-phone', 'Valid phone required'); ok = false; } else clearErr('err-s5-phone');
      if (parseDollar(state.dwelling_limit) < 25000) { showErr('err-s5-dwl', 'Enter your dwelling limit'); ok = false; } else clearErr('err-s5-dwl');
      if (ok) renderStep6(mount);
    }));
    swapCard(mount, card);
  }

  // ─── Step 6 — History ─────────────────────────────────────────────────────
  function renderStep6(mount) {
    updateStickyStep(6);
    const card = mk('div', { class: 'wz-card' });
    card.appendChild(stepper(6));
    const h2 = mk('h2'); h2.textContent = 'Insurance & loss history'; card.appendChild(h2);
    const sub = mk('p'); sub.textContent = 'Prior carriers over the last 3–5 years, and any losses or claims — insured or not.'; card.appendChild(sub);

    card.appendChild(mk('div', { class: 'wz-section-title' }, 'Prior insurance'));
    const npc = mk('label', { class: 'wz-check-label' });
    const npcInput = mk('input', { type: 'checkbox' });
    npcInput.checked = state.no_prior_coverage;
    npc.appendChild(npcInput);
    npc.appendChild(document.createTextNode('No prior insurance (new purchase, first policy, or a lapse)'));
    card.appendChild(npc);
    const priorWrap = mk('div', { id: 'wz-prior-wrap', style: state.no_prior_coverage ? 'display:none' : '' });
    const pg = mk('div', { class: 'wz-grid3' });
    pg.appendChild(mkField('Current / most recent carrier *', textInput('prior_insurer_1', { placeholder: 'e.g., State Farm' }), 'err-s6-pi1'));
    pg.appendChild(mkField('Prior carrier (if different)', textInput('prior_insurer_2', { placeholder: 'Over the last 3–5 years' })));
    const pexp = mk('input', { class: 'wz-input', type: 'date' });
    pexp.value = state.prior_expiration || '';
    pexp.addEventListener('input', () => { state.prior_expiration = pexp.value; });
    pg.appendChild(mkField('Current policy expiration', pexp));
    priorWrap.appendChild(pg);
    card.appendChild(priorWrap);
    npcInput.addEventListener('change', () => {
      state.no_prior_coverage = npcInput.checked;
      priorWrap.style.display = npcInput.checked ? 'none' : '';
    });

    card.appendChild(mk('div', { class: 'wz-section-title' }, 'Losses or claims in the last 5 years? *'));
    const cb = mk('div', { class: 'wz-claims-btns' });
    const noBtn = mk('button', { type: 'button', class: 'wz-claims-btn' + (state.hasClaims === 'no' ? ' selected-no' : '') });
    noBtn.innerHTML = '✓ No losses or claims';
    const yesBtn = mk('button', { type: 'button', class: 'wz-claims-btn' + (state.hasClaims === 'yes' ? ' selected-yes' : '') });
    yesBtn.innerHTML = 'Yes — I\'ll list them';
    cb.appendChild(noBtn); cb.appendChild(yesBtn);
    card.appendChild(cb);
    card.appendChild(mk('span', { class: 'wz-error', id: 'err-s6-claims' }));
    const lossWrap = mk('div', { id: 'wz-loss-wrap', style: state.hasClaims === 'yes' ? '' : 'display:none' });

    function drawLossRows() {
      lossWrap.innerHTML = '';
      const tbl = mk('table', { class: 'wz-loss-table' });
      const thead = mk('thead');
      thead.innerHTML = '<tr><th style="width:130px">Date</th><th>What happened</th><th style="width:130px">Amount paid</th><th style="width:40px"></th></tr>';
      tbl.appendChild(thead);
      const tbody = mk('tbody');
      if (!state.lossRows.length) state.lossRows.push({ date: '', description: '', amount: '' });
      state.lossRows.forEach((row, i) => {
        const tr = mk('tr');
        const d = mk('input', { type: 'text', placeholder: 'MM/YYYY' }); d.value = row.date;
        d.addEventListener('input', () => { row.date = d.value; });
        const de = mk('input', { type: 'text', placeholder: 'e.g., Water damage — pipe leak' }); de.value = row.description;
        de.addEventListener('input', () => { row.description = de.value; });
        const a = mk('input', { type: 'text', placeholder: '$', inputmode: 'numeric' }); a.value = row.amount;
        a.addEventListener('input', () => { row.amount = a.value; refreshTopEst(); });
        const rm = mk('button', { type: 'button', class: 'wz-row-remove', title: 'Remove' }); rm.textContent = '✕';
        rm.addEventListener('click', () => { state.lossRows.splice(i, 1); drawLossRows(); refreshTopEst(); });
        [d, de, a, rm].forEach(el => { const td = mk('td'); td.appendChild(el); tr.appendChild(td); });
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      lossWrap.appendChild(tbl);
      if (state.lossRows.length < 4) {
        const add = mk('button', { type: 'button', class: 'wz-add-row-btn' });
        add.textContent = '+ Add another loss';
        add.addEventListener('click', () => { state.lossRows.push({ date: '', description: '', amount: '' }); drawLossRows(); });
        lossWrap.appendChild(add);
      }
    }
    noBtn.addEventListener('click', () => {
      state.hasClaims = 'no'; state.lossRows = [];
      noBtn.classList.add('selected-no'); yesBtn.classList.remove('selected-yes');
      lossWrap.style.display = 'none'; clearErr('err-s6-claims'); refreshTopEst();
    });
    yesBtn.addEventListener('click', () => {
      state.hasClaims = 'yes';
      yesBtn.classList.add('selected-yes'); noBtn.classList.remove('selected-no');
      lossWrap.style.display = ''; drawLossRows(); clearErr('err-s6-claims'); refreshTopEst();
    });
    if (state.hasClaims === 'yes') drawLossRows();
    card.appendChild(lossWrap);

    card.appendChild(navRow(() => renderStep5(mount), () => {
      let ok = true;
      if (!state.no_prior_coverage && !state.prior_insurer_1.trim()) { showErr('err-s6-pi1', 'Carrier name — or check "no prior insurance"'); ok = false; } else clearErr('err-s6-pi1');
      if (state.hasClaims == null) { showErr('err-s6-claims', 'Tell us either way — carriers pull CLUE reports, so surprises hurt more than claims do'); ok = false; } else clearErr('err-s6-claims');
      if (state.hasClaims === 'yes' && !state.lossRows.some(r => r.description.trim())) { showErr('err-s6-claims', 'Describe at least one loss (or choose No)'); ok = false; }
      if (ok) renderStep7(mount);
    }));
    swapCard(mount, card);
  }

  // ─── Step 7 — 16 questions, indication, consents, sign ───────────────────
  function renderStep7(mount) {
    updateStickyStep(7);
    const card = mk('div', { class: 'wz-card' });
    card.appendChild(stepper(7));
    const h2 = mk('h2'); h2.textContent = 'The 16 underwriting questions'; card.appendChild(h2);
    const sub = mk('p'); sub.textContent = 'Straight off the ACORD application. Answer honestly — a "Yes" rarely blocks coverage, but a wrong "No" can void it.'; card.appendChild(sub);

    // Default q_hazard from the step-1 wildfire answer (changeable here).
    if (!state.q.q_hazard && state.wildfire_exposure === 'yes') state.q.q_hazard = 'Yes';
    if (!state.q.q_hazard && state.wildfire_exposure === 'no') state.q.q_hazard = 'No';

    const qWrap = mk('div', { id: 'wz-qq-list' });
    QUESTIONS.forEach((q, idx) => {
      const box = mk('div', { class: 'wz-qq', 'data-q': q.key });
      const row = mk('div', { class: 'wz-qq-row' });
      const t = mk('div', { class: 'wz-qq-text' });
      const num = mk('span', { class: 'wz-qq-num' }); num.textContent = String(idx + 1).padStart(2, '0');
      t.appendChild(num); t.appendChild(document.createTextNode(q.text));
      const btns = mk('div', { class: 'wz-qq-btns' });
      ['Yes', 'No'].forEach(v => {
        const b = mk('button', { type: 'button', class: 'wz-qq-btn' + (state.q[q.key] === v ? (v === 'Yes' ? ' sel-yes' : ' sel-no') : '') });
        b.textContent = v;
        b.addEventListener('click', () => {
          state.q[q.key] = v;
          btns.querySelectorAll('.wz-qq-btn').forEach(x => x.classList.remove('sel-yes', 'sel-no'));
          b.classList.add(v === 'Yes' ? 'sel-yes' : 'sel-no');
          box.classList.remove('missing');
          updateExplain();
          refreshTopEst();
        });
        btns.appendChild(b);
      });
      row.appendChild(t); row.appendChild(btns);
      box.appendChild(row);
      qWrap.appendChild(box);
    });
    card.appendChild(qWrap);

    const explWrap = mk('div', { id: 'wz-expl-wrap', style: 'display:none;margin-top:14px' });
    explWrap.appendChild(mk('div', { class: 'wz-section-title' }, 'Briefly explain your "Yes" answers'));
    const expl = mk('textarea', { class: 'wz-textarea', placeholder: 'e.g., Q2: canyon behind the house; Q6: one golden retriever…' });
    expl.value = state.q_explanations;
    expl.addEventListener('input', () => { state.q_explanations = expl.value; });
    explWrap.appendChild(expl);
    card.appendChild(explWrap);
    function updateExplain() {
      const anyYes = EXPLAIN_KEYS.some(k => state.q[k] === 'Yes');
      explWrap.style.display = anyYes ? '' : 'none';
    }
    updateExplain();

    const notes = mk('textarea', { class: 'wz-textarea', placeholder: 'Anything else we should know? (optional)', style: 'margin-top:16px' });
    notes.value = state.additional_notes;
    notes.addEventListener('input', () => { state.additional_notes = notes.value; });
    card.appendChild(notes);

    card.appendChild(mk('div', { class: 'wz-divider' }));
    card.appendChild(renderIndicationBox());

    const cg = mk('div', { class: 'wz-callout-grid' });
    function callout(title, items) {
      const box = mk('div', { class: 'wz-callout' });
      const h4 = mk('h4'); h4.textContent = title; box.appendChild(h4);
      const ul = mk('ul');
      items.forEach(t => { const li = mk('li'); li.textContent = t; ul.appendChild(li); });
      box.appendChild(ul); return box;
    }
    cg.appendChild(callout('What typically lowers it', ['Newer or fully updated roof', 'Central-station alarm', 'Higher deductible ($5k–$10k)', 'Wildfire hardening (Safer from Wildfires)', 'Clean 5-year loss history']));
    cg.appendChild(callout('What can raise it', ['Brush / WUI wildfire zone', 'Roof over 20 years old', 'Knob & tube or aluminum wiring', 'Open or recent claims', 'Vacant or seasonal occupancy']));
    const brokerBox = mk('div', { class: 'wz-callout' });
    const bh4 = mk('h4'); bh4.textContent = 'Why an independent broker'; brokerBox.appendChild(bh4);
    const bul = mk('ul');
    [
      'Admitted carriers, FAIR Plan, and E&S — one application',
      'Identical homes priced 20–40% apart by carrier',
      'FAIR Plan + DIC pairing done right',
      'No broker fee — the carrier pays our commission',
      'Aaron Bollinger · CA DOI Lic. #6013787'
    ].forEach((t, i) => {
      const li = mk('li');
      if (i === 4) { li.style.color = '#1d5741'; li.style.fontWeight = '600'; }
      li.textContent = t;
      bul.appendChild(li);
    });
    brokerBox.appendChild(bul);
    cg.appendChild(brokerBox);
    card.appendChild(cg);

    const cw = mk('div', { style: 'margin-top:24px;padding-top:20px;border-top:2px solid #e8ece2' });
    const c1w = mk('label', { class: 'wz-check-label' });
    const c1 = mk('input', { type: 'checkbox' }); c1.checked = state.consent_indication;
    c1w.appendChild(c1);
    c1w.appendChild(document.createTextNode('I understand this is a preliminary indication — not a quote, binder, or policy, and coverage is subject to carrier underwriting.'));
    cw.appendChild(c1w);
    const c2w = mk('label', { class: 'wz-check-label' });
    const c2 = mk('input', { type: 'checkbox' }); c2.checked = state.consent_contact;
    c2w.appendChild(c2);
    c2w.appendChild(document.createTextNode('I consent to being contacted by a licensed Bollinsure broker about my options.'));
    cw.appendChild(c2w);
    const errDiv = mk('div', { class: 'wz-form-error', id: 'wz-submit-error' });
    cw.appendChild(errDiv);
    card.appendChild(cw);

    // ── Signed ACORD 80 flow (ho-review-signing.js) ─────────────────────────
    const signMount = mk('div', { id: 'ho-sign-mount' });
    const gateNote = mk('p', { id: 'wz-sign-gate', class: 'wz-rate-note', style: 'margin-top:16px;color:#17493a;' });
    gateNote.textContent = 'Answer all 16 questions and check both boxes above to generate and sign your application.';
    card.appendChild(gateNote);
    card.appendChild(signMount);
    const gate = () => {
      const allAnswered = QUESTIONS.every(q => state.q[q.key] === 'Yes' || state.q[q.key] === 'No');
      const ok = state.consent_indication && state.consent_contact && allAnswered;
      signMount.style.opacity = ok ? '1' : '0.35';
      signMount.style.pointerEvents = ok ? 'auto' : 'none';
      gateNote.style.display = ok ? 'none' : '';
      return ok;
    };
    c1.addEventListener('change', () => { state.consent_indication = c1.checked; gate(); });
    c2.addEventListener('change', () => { state.consent_contact = c2.checked; gate(); });
    qWrap.addEventListener('click', () => setTimeout(gate, 0));
    gate();

    function markMissingQuestions() {
      let firstMissing = null;
      QUESTIONS.forEach(q => {
        const el = qWrap.querySelector('[data-q="' + q.key + '"]');
        const answered = state.q[q.key] === 'Yes' || state.q[q.key] === 'No';
        if (el) el.classList.toggle('missing', !answered);
        if (!answered && !firstMissing) firstMissing = el;
      });
      if (firstMissing) firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return !firstMissing;
    }

    window.__ho = {
      getPayload() {
        const ind = calcIndication();
        return {
          fields: {
            pathway: state.pathway || 'owner',
            policy_form: state.pathway === 'landlord' ? 'DP3' : state.policy_form,
            applicant_full_name: state.applicant_full_name,
            applicant_dob: state.applicant_dob,
            applicant_occupation: state.applicant_occupation,
            applicant_email: state.applicant_email,
            applicant_phone: state.applicant_phone,
            applicant_phone_type: state.applicant_phone_type,
            mailing_same: state.mailing_same,
            mailing_address: state.mailing_same === 'No' ? state.mailing_address : state.risk_address,
            mailing_city: state.mailing_same === 'No' ? state.mailing_city : state.risk_city,
            mailing_state: state.mailing_same === 'No' ? (state.mailing_state || '').toUpperCase() : state.risk_state,
            mailing_zip: state.mailing_same === 'No' ? state.mailing_zip : state.risk_zip,
            risk_address: state.risk_address, risk_city: state.risk_city,
            risk_county: state.risk_county, risk_state: state.risk_state, risk_zip: state.risk_zip,
            in_city_limits: state.in_city_limits,
            occupancy: state.pathway === 'landlord' ? (state.vacancy === 'Vacant' ? 'vacant' : 'tenant') : (state.vacancy === 'Vacant' ? 'vacant' : state.vacancy === 'Unoccupied' ? 'unoccupied' : 'owner'),
            usage: state.pathway === 'landlord' ? 'other' : state.usage,
            residence_type: state.residence_type,
            number_of_families: state.number_of_families,
            year_built: state.year_built,
            total_living_area: String(parseDollar(state.total_living_area) || ''),
            construction_type: state.construction_type,
            foundation_type: state.foundation_type,
            roof_material: state.roof_material,
            roof_condition: state.roof_condition,
            plumbing_condition: state.plumbing_condition,
            housekeeping: state.housekeeping,
            wiring_type: state.wiring_type,
            electrical_panel: state.electrical_panel,
            electrical_amps: state.electrical_amps,
            roof_updated: state.roof_updated, roof_update_year: state.roof_update_year,
            heating_updated: state.heating_updated, heating_update_year: state.heating_update_year,
            plumbing_updated: state.plumbing_updated, plumbing_update_year: state.plumbing_update_year,
            wiring_updated: state.wiring_updated, wiring_update_year: state.wiring_update_year,
            door_locks: state.door_locks,
            burglar_alarm: state.burglar_alarm, smoke_alarm: state.smoke_alarm,
            sprinklers: state.sprinklers, fire_extinguisher: state.fire_extinguisher,
            swimming_pool: state.swimming_pool, pool_fence: state.pool_fence,
            pool_diving_board: state.pool_diving_board, pool_slide: state.pool_slide,
            wildfire_exposure: state.wildfire_exposure,
            dwelling_limit: String(effectiveDwelling() || ''),
            deductible: state.deductible,
            personal_liability_limit: state.personal_liability_limit,
            med_pay_limit: state.med_pay_limit,
            effective_date: state.effective_date,
            no_prior_coverage: state.no_prior_coverage ? 'Yes' : 'No',
            prior_insurer_1: state.prior_insurer_1, prior_insurer_2: state.prior_insurer_2,
            prior_expiration: state.prior_expiration,
            no_losses: state.hasClaims === 'no' ? 'Yes' : 'No',
            q_owner: state.q.q_owner || '', q_hazard: state.q.q_hazard || '',
            q_code_violation: state.q.q_code_violation || '', q_business: state.q.q_business || '',
            q_employees: state.q.q_employees || '', q_animals: state.q.q_animals || '',
            q_trampoline: state.q.q_trampoline || '', q_commercial_300ft: state.q.q_commercial_300ft || '',
            q_co_alarm: state.q.q_co_alarm || '', q_lead_paint: state.q.q_lead_paint || '',
            q_for_sale: state.q.q_for_sale || '', q_converted: state.q.q_converted || '',
            q_declined_cancelled: state.q.q_declined_cancelled || '', q_bankruptcy: state.q.q_bankruptcy || '',
            q_lien: state.q.q_lien || '', q_fraud_arson: state.q.q_fraud_arson || '',
            q_explanations: state.q_explanations,
            additional_notes: state.additional_notes,
            website_hp: state.website_hp
          },
          lossRows: state.hasClaims === 'yes'
            ? state.lossRows.filter(r => r.date || r.description || r.amount).slice(0, 4).map(r => ({ date: r.date, description: r.description, amount: String(parseDollar(r.amount) || '') }))
            : [],
          quote: ind.ready ? { low: ind.low, high: ind.high, dwelling: ind.dwelling, form: ind.formLabel } : {}
        };
      },
      validateForSigning() {
        const err = document.getElementById('wz-submit-error');
        if (!markMissingQuestions()) {
          if (err) { err.textContent = 'Please answer all 16 questions first.'; err.classList.add('show'); }
          return false;
        }
        if (!(state.consent_indication && state.consent_contact)) {
          if (err) { err.textContent = 'Please check both consent boxes first.'; err.classList.add('show'); }
          return false;
        }
        if (err) err.classList.remove('show');
        return true;
      },
      onSigned(data) {
        card.innerHTML = successHTML(true);
        const ref = document.createElement('p');
        ref.style.cssText = 'font-family:var(--font-mono);font-size:0.8rem;color:#17493a;background:#eef3ec;border:1px solid rgba(29,87,65,0.35);border-radius:8px;padding:10px 14px;display:inline-block;margin-bottom:16px;';
        ref.textContent = 'Signed application submitted · Reference ' + (data.auditId || '—');
        const icon = card.querySelector('.wz-success-icon');
        if (icon && icon.parentNode) icon.parentNode.insertBefore(ref, icon.nextSibling);
        if (data.pdfBase64) {
          const a = document.createElement('a');
          a.href = 'data:application/pdf;base64,' + data.pdfBase64;
          a.download = data.filename || 'homeowner-application.pdf';
          a.textContent = 'Download your signed application (PDF)';
          a.style.cssText = 'display:block;margin:0 0 16px;color:#1d5741;font-size:0.85rem;';
          if (ref.parentNode) ref.parentNode.insertBefore(a, ref.nextSibling);
        }
      },
      legacySubmit() {
        if (!window.__ho.validateForSigning()) return;
        submitLegacy(card);
      }
    };

    card.appendChild(navRow(() => renderStep6(mount), null));
    swapCard(mount, card);
    document.dispatchEvent(new CustomEvent('hoWizardReviewStep'));
  }

  // ─── Legacy (no-signature) submission ─────────────────────────────────────
  function successHTML(signed) {
    const wf = state.wildfire_exposure === 'yes';
    return '<div class="wz-success">' +
      '<div class="wz-success-icon">🏠</div>' +
      '<h2>' + (signed ? 'Application signed and submitted' : 'Submitted — a broker takes it from here') + '</h2>' +
      '<p>We start shopping your ' + (state.pathway === 'landlord' ? 'DP-3' : (state.policy_form === 'HO5' ? 'HO-5' : 'HO-3')) + ' the same business day' + (wf ? ' — including the FAIR Plan + DIC pairing if the wildfire mapping calls for it' : '') + '. A copy went to your email.</p>' +
      '<p>Need us sooner? <a href="tel:+13108045017">310-804-5017</a> · <a href="mailto:quotes@bollinsure.com">quotes@bollinsure.com</a></p>' +
      '<a class="wz-success-back" href="/california-homeowners-insurance">Read the California homeowners guide →</a>' +
      '</div>';
  }

  async function submitLegacy(card) {
    const err = document.getElementById('wz-submit-error');
    const btns = card.querySelectorAll('.wz-btn-next, .ws-build-btn');
    btns.forEach(b => { b.disabled = true; });
    try {
      const payload = window.__ho.getPayload();
      const res = await fetch('/api/submit-ho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Submission failed (' + res.status + ')');
      card.innerHTML = successHTML(false);
    } catch (e) {
      if (err) { err.textContent = (e && e.message ? e.message : 'Submission failed.') + ' You can retry, or call 310-804-5017.'; err.classList.add('show'); }
      btns.forEach(b => { b.disabled = false; });
    }
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  function init() {
    const mount = document.getElementById('ho-wizard-mount');
    if (!mount) return;
    injectStyles();
    mountStickyBar(mount);
    renderTopEst();
    renderOpening(mount);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
