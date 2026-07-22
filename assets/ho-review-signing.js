/* ho-review-signing.js — ACORD 80 review + e-signature step for the HO wizard.
   Ported from the workers-comp/earthquake family review-signing module, adapted
   to /api/ho-application's contract:
     preview:  POST {preview:true, fields, lossRows, quote} -> {ok, pdf, pageCount}
     submit:   POST {...same, signature, eSignConsent}      -> {ok, emailed, auditId, filename, pdfBase64?}
   The wizard exposes window.__ho.getPayload() / .validateForSigning() and
   dispatches "hoWizardReviewStep" after mounting <div id="ho-sign-mount"> on its
   final step. */
(function () {
  "use strict";

  /* Self-hosted pdf.js 3.11.174 (Apache-2.0) — vendored under /assets/vendor so
     the app has no third-party script/worker origin and the CSP can stay
     'self'-only. Update both files together via scripts/vendor-pdfjs.md. */
  var PDF_URL = "/assets/vendor/pdfjs/pdf.min.js";
  var PDF_WORKER_URL = "/assets/vendor/pdfjs/pdf.worker.min.js";

  var CONSENT_VERSION = "2026-07-16.bestho3.1";
  var CONSENT_TEXT = "I agree to conduct this application electronically. I can access, view, download, print, and keep the completed PDF. By selecting this box and clicking Sign & Submit, I intend my electronic signature, typed name, date/time, email address, IP address, browser/device information, and related audit data to be attached to and logically associated with this ACORD 80 homeowner application and to have the same legal effect as a handwritten signature to the fullest extent allowed by applicable law. I may request a paper copy or withdraw consent before submission by emailing quotes@bollinsure.com.";

  var STYLES = [
    { id: "dancing", font: '"Dancing Script", cursive',   label: "Cursive" },
    { id: "serif",   font: "Georgia, serif",              label: "Serif"   },
    { id: "mono",    font: '"JetBrains Mono", monospace', label: "Mono"    }
  ];

  var state = {
    pdfUrl: "", pageCount: 0, fullRendered: false,
    reviewStartedAt: "", previewGeneratedAt: "", consentedAt: "",
    sigImage: "", activePane: "type", selectedStyle: "dancing",
    consentEsign: false, consentCoverage: false,
    pdfLibPromise: null, previewFingerprint: "", building: false
  };
  var sigPad = null, sigCtx = null, sigSized = false, sigDrawing = false;

  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? el.value.trim() : ""; }
  function stopEvent(e) { e.preventDefault(); e.stopImmediatePropagation(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fingerprint(str) {
    var h1 = 0x811c9dc5, h2 = 0x1000193;
    for (var i = 0; i < str.length; i++) { h1 = ((h1 ^ str.charCodeAt(i)) * 16777619) >>> 0; h2 = ((h2 + str.charCodeAt(i)) * 31) >>> 0; }
    return ("00000000" + h1.toString(16)).slice(-8) + ("00000000" + h2.toString(16)).slice(-8) + "-" + str.length;
  }

  // ── styles ────────────────────────────────────────────────────────────────
  function injectCss() {
    if ($("ho-sign-css")) return;
    var css = [
      "#ho-sign-mount{margin-top:26px;padding-top:22px;border-top:2px solid #e8ece2;}",
      "#ho-sign-mount .hs-kicker{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#17493a;margin-bottom:6px;}",
      "#ho-sign-mount h3{font-size:1.15rem;font-weight:800;color:#262b23;margin:0 0 8px;}",
      "#ho-sign-mount .hs-sub{font-size:0.85rem;color:#575f52;line-height:1.6;margin:0 0 14px;}",
      ".hs-build-btn{display:inline-flex;align-items:center;gap:8px;background:#1d5741;color:#f6f2e9;font-weight:700;font-size:0.95rem;border:none;border-radius:10px;padding:13px 22px;cursor:pointer;}",
      ".hs-build-btn:disabled{opacity:0.55;cursor:default;}",
      ".hs-loader{margin:14px 0;padding:12px 16px;background:#eef3ec;border:1px solid rgba(29,87,65,0.35);border-radius:10px;font-size:0.85rem;color:#17493a;}",
      ".hs-review-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px 0 8px;}",
      ".hs-ringwrap{display:flex;align-items:center;gap:9px;font-size:0.78rem;color:#575f52;}",
      ".hs-scroll{max-height:520px;overflow-y:auto;border:1px solid #e2d9c6;border-radius:12px;background:#f6f2e9;padding:14px;}",
      ".hs-scroll .pdf-page{margin:0 auto 14px;box-shadow:0 6px 20px rgba(38,43,35,0.12);background:#fff;}",
      ".hs-scroll .pdf-status{font-size:0.78rem;color:#575f52;text-align:center;padding:6px 0;}",
      ".hs-open{font-size:0.8rem;color:#1d5741;text-decoration:underline;}",
      ".hs-sign-grid{display:grid;grid-template-columns:1fr;gap:12px;margin:16px 0 10px;max-width:420px;}",
      ".hs-input{width:100%;background:#fff;border:1.5px solid #cfc3a9;border-radius:9px;padding:11px 13px;font-size:0.92rem;color:#262b23;}",
      ".hs-input:focus{outline:none;border-color:#1d5741;box-shadow:0 0 0 3px rgba(29,87,65,0.18);}",
      ".hs-lbl{display:block;font-size:0.78rem;font-weight:600;color:#575f52;margin-bottom:5px;}",
      ".hs-tabs{display:flex;gap:8px;margin:14px 0 10px;}",
      ".hs-tab{flex:1;padding:9px 12px;border:1.5px solid #cfc3a9;background:#fff;border-radius:9px;font-size:0.85rem;font-weight:600;color:#575f52;cursor:pointer;}",
      ".hs-tab.active{border-color:#1d5741;background:#eef3ec;color:#17493a;}",
      ".hs-pane{display:none;}.hs-pane.show{display:block;}",
      ".hs-style-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px;margin-bottom:10px;}",
      ".hs-style-opt{display:flex;align-items:center;gap:9px;border:1.5px solid #cfc3a9;border-radius:9px;padding:8px 11px;background:#fff;cursor:pointer;overflow:hidden;}",
      ".hs-style-opt.sel{border-color:#1d5741;background:#eef3ec;}",
      ".hs-sigpad{width:100%;height:130px;border:1.5px dashed #cfc3a9;border-radius:10px;background:#fff;touch-action:none;display:block;}",
      ".hs-sig-actions{display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap;}",
      ".hs-adopt{background:#262b23;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:0.83rem;font-weight:600;cursor:pointer;}",
      ".hs-clear{background:none;border:none;color:#575f52;font-size:0.8rem;cursor:pointer;text-decoration:underline;}",
      ".hs-adopt-state{display:none;font-size:0.8rem;color:#2e6b3f;font-weight:600;}",
      ".hs-adopt-state.show{display:inline;}",
      ".hs-check{display:flex;gap:10px;align-items:flex-start;margin:10px 0;font-size:0.82rem;color:#575f52;line-height:1.6;cursor:pointer;}",
      ".hs-check input{margin-top:3px;flex:none;}",
      ".hs-submit{width:100%;margin-top:14px;background:#1d5741;color:#f6f2e9;font-weight:800;font-size:1rem;border:none;border-radius:10px;padding:15px 20px;cursor:pointer;}",
      ".hs-submit:disabled{opacity:0.5;cursor:default;}",
      ".hs-err{display:none;margin-top:10px;padding:11px 14px;background:#f7ece9;border:1px solid rgba(163,61,42,0.4);border-radius:9px;color:#a33d2a;font-size:0.84rem;}",
      ".hs-err.show{display:block;}",
      ".hs-fallback{margin-top:12px;font-size:0.78rem;color:#575f52;text-align:center;}",
      ".hs-fallback a{color:#1d5741;}"
    ].join("\n");
    var el = document.createElement("style");
    el.id = "ho-sign-css";
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ── pdf.js loader ─────────────────────────────────────────────────────────
  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + url + '"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        if (window.pdfjsLib) resolve();
        return;
      }
      var s = document.createElement("script");
      s.src = url; s.async = true;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  async function ensurePdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    if (!state.pdfLibPromise) {
      state.pdfLibPromise = (async function () {
        await loadScript(PDF_URL);
        if (!window.pdfjsLib) throw new Error("PDF renderer unavailable");
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        return window.pdfjsLib;
      })();
    }
    return state.pdfLibPromise;
  }

  // ── UI skeleton ───────────────────────────────────────────────────────────
  function buildUi(mount) {
    mount.innerHTML =
      '<div class="hs-kicker">Signed application · ACORD 80</div>' +
      '<h3>Generate, review, and sign your application</h3>' +
      '<p class="hs-sub">We fill the actual ACORD 80 homeowner application with your answers. Review every page, adopt a signature, and submit — you\'ll get the signed copy and our broker team starts shopping it same day.</p>' +
      '<button type="button" class="hs-build-btn" id="hsBuild">Generate my application &rarr;</button>' +
      '<div class="hs-loader" id="hsLoader" style="display:none"></div>' +
      '<div id="hsReview" style="display:none">' +
        '<div class="hs-review-head">' +
          '<div class="hs-ringwrap"><svg width="34" height="34" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="#e2d9c6" stroke-width="5"/><circle id="hsRing" cx="28" cy="28" r="24" fill="none" stroke="#1d5741" stroke-width="5" stroke-linecap="round" stroke-dasharray="150.8" stroke-dashoffset="150.8" transform="rotate(-90 28 28)"/></svg><span><b id="hsPct">0%</b> reviewed</span></div>' +
          '<a class="hs-open" id="hsOpen" target="_blank" rel="noopener" hidden>Open in new tab</a>' +
        '</div>' +
        '<div class="hs-scroll" id="hsScroll"><div id="hsPages"></div></div>' +
        '<div class="hs-sign-grid">' +
          '<div><label class="hs-lbl" for="hs_name">Applicant signature name *</label><input class="hs-input" id="hs_name" type="text" autocomplete="name"></div>' +
        '</div>' +
        '<div class="hs-tabs">' +
          '<button type="button" class="hs-tab active" id="hsTabType">Type signature</button>' +
          '<button type="button" class="hs-tab" id="hsTabDraw">Draw signature</button>' +
        '</div>' +
        '<div class="hs-pane show" id="hsPaneType">' +
          '<div class="hs-style-list" id="hsStyles"></div>' +
          '<div class="hs-sig-actions"><button type="button" class="hs-adopt" id="hsAdoptType">Adopt signature</button><span class="hs-adopt-state" id="hsAdoptTypeState">&#10003; Signature adopted</span></div>' +
        '</div>' +
        '<div class="hs-pane" id="hsPaneDraw">' +
          '<canvas class="hs-sigpad" id="hsPad"></canvas>' +
          '<div class="hs-sig-actions"><button type="button" class="hs-adopt" id="hsAdoptDraw">Adopt signature</button><button type="button" class="hs-clear" id="hsClear">Clear</button><span class="hs-adopt-state" id="hsAdoptDrawState">&#10003; Signature adopted</span></div>' +
        '</div>' +
        '<label class="hs-check"><input type="checkbox" id="hsConsentEsign"><span><strong>I agree to sign electronically.</strong> ' + esc(CONSENT_TEXT) + '</span></label>' +
        '<label class="hs-check"><input type="checkbox" id="hsConsentCoverage"><span><strong>I reviewed the completed application above</strong> and understand this is a request for quotes — not a policy, binder, or guarantee of coverage. The premium range shown is a preliminary indication only; coverage and final premium are subject to carrier underwriting, inspection, and approval.</span></label>' +
        '<button type="button" class="hs-submit" id="hsSubmit" disabled>Sign &amp; Submit Application &rarr;</button>' +
        '<div class="hs-err" id="hsErr"></div>' +
      '</div>' +
      '<div class="hs-fallback" id="hsFallback">Trouble generating the PDF? <a href="#" id="hsLegacy">Submit without signing</a> and we\'ll prepare the application for you.</div>';
  }

  // ── preview build + render ────────────────────────────────────────────────
  async function buildPreview() {
    var btn = $("hsBuild"), loader = $("hsLoader"), review = $("hsReview");
    if (state.building) return;
    if (window.__ho && window.__ho.validateForSigning && !window.__ho.validateForSigning()) return;
    state.building = true;
    if (btn) { btn.disabled = true; btn.textContent = "Building your application…"; }
    if (loader) { loader.style.display = ""; loader.textContent = "Filling the ACORD 80 with your answers…"; }
    try {
      var payload = window.__ho && window.__ho.getPayload ? window.__ho.getPayload() : null;
      if (!payload) throw new Error("Wizard data unavailable");
      state.reviewStartedAt = state.reviewStartedAt || new Date().toISOString();
      state.previewFingerprint = fingerprint(JSON.stringify(payload));
      var res = await fetch("/api/ho-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({ preview: true }, payload))
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.pdf) throw new Error(data.error || "Preview failed (" + res.status + ")");
      state.previewGeneratedAt = new Date().toISOString();

      var bin = atob(data.pdf);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (state.pdfUrl) URL.revokeObjectURL(state.pdfUrl);
      state.pdfUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      var open = $("hsOpen");
      if (open) { open.href = state.pdfUrl; open.hidden = false; }

      if (loader) loader.style.display = "none";
      if (btn) btn.style.display = "none";
      if (review) review.style.display = "";

      var name = $("hs_name");
      if (name && !name.value && payload.fields && payload.fields.applicant_full_name) name.value = payload.fields.applicant_full_name;
      buildStyleList(); updateSubmitState();

      await renderPdfBytes(bytes);
    } catch (err) {
      console.warn("[ho-sign] preview error:", err);
      if (loader) {
        loader.style.display = "";
        loader.textContent = "We couldn't build the PDF preview right now. You can retry, or use “Submit without signing” below and our broker team will prepare the application for you.";
      }
      if (btn) { btn.disabled = false; btn.style.display = ""; btn.textContent = "Retry generating my application →"; }
    } finally {
      state.building = false;
    }
  }

  async function renderPdfBytes(bytes) {
    var pages = $("hsPages");
    if (!pages) return;
    var pdfjs = await ensurePdfJs();
    var copy = new Uint8Array(bytes.length); copy.set(bytes);
    var pdf = await pdfjs.getDocument({ data: copy }).promise;
    state.pageCount = pdf.numPages;
    pages.innerHTML = "";
    var status = document.createElement("div");
    status.className = "pdf-status";
    status.textContent = "Loading all " + pdf.numPages + " pages…";
    pages.appendChild(status);
    var container = $("hsScroll");
    for (var p = 1; p <= pdf.numPages; p++) {
      var page = await pdf.getPage(p);
      var base = page.getViewport({ scale: 1 });
      var available = Math.max(280, Math.min((container.clientWidth || 700) - 40, 700));
      var scale = Math.max(0.42, Math.min(available / base.width, 1.15));
      var viewport = page.getViewport({ scale: scale });
      var outScale = Math.min(window.devicePixelRatio || 1, 1.5);
      var holder = document.createElement("div");
      holder.className = "pdf-page";
      holder.style.width = viewport.width + "px";
      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d", { alpha: false });
      canvas.width = Math.floor(viewport.width * outScale);
      canvas.height = Math.floor(viewport.height * outScale);
      canvas.style.width = viewport.width + "px";
      canvas.style.height = viewport.height + "px";
      canvas.style.display = "block";
      ctx.setTransform(outScale, 0, 0, outScale, 0, 0);
      holder.appendChild(canvas);
      pages.appendChild(holder);
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      if (p % 2 === 0) await new Promise(function (r) { setTimeout(r, 0); });
    }
    state.fullRendered = true;
    status.textContent = "Full application loaded — " + pdf.numPages + " pages. Scroll through before signing.";
    wireScrollRing();
    updateSubmitState();
  }

  function wireScrollRing() {
    var area = $("hsScroll"), ring = $("hsRing"), pct = $("hsPct");
    if (!area || !ring || area.dataset.ringReady === "1") return;
    area.dataset.ringReady = "1";
    area.addEventListener("scroll", function () {
      var scrollable = area.scrollHeight - area.clientHeight;
      if (scrollable <= 0) return;
      var progress = Math.min(area.scrollTop / scrollable, 1);
      ring.style.strokeDashoffset = 150.8 * (1 - progress);
      if (pct) pct.textContent = Math.round(progress * 100) + "%";
    }, { passive: true });
  }

  // ── signatures ────────────────────────────────────────────────────────────
  async function ensureSignatureFonts() {
    if (!document.fonts || !document.fonts.load) return;
    try { await Promise.all([document.fonts.load('52px "Dancing Script"'), document.fonts.load('76px "Dancing Script"')]); } catch (e) {}
  }
  function buildStyleList() {
    var list = $("hsStyles");
    if (!list) return;
    list.innerHTML = "";
    var name = val("hs_name") || "Your Name";
    STYLES.forEach(function (sty) {
      var label = document.createElement("label");
      label.className = "hs-style-opt" + (sty.id === state.selectedStyle ? " sel" : "");
      label.innerHTML = '<input type="radio" name="_hsStyle" value="' + sty.id + '"' + (sty.id === state.selectedStyle ? " checked" : "") + '><span data-styled style="font-family:' + sty.font.replace(/"/g, "&quot;") + ';font-size:26px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(name) + "</span>";
      label.querySelector("input").addEventListener("change", function () {
        state.selectedStyle = sty.id;
        document.querySelectorAll(".hs-style-opt").forEach(function (el) { el.classList.remove("sel"); });
        label.classList.add("sel");
      });
      list.appendChild(label);
    });
  }
  async function adoptTypedSig() {
    var name = val("hs_name");
    if (!name) { var el = $("hs_name"); if (el) el.focus(); return; }
    var sty = STYLES.find(function (s) { return s.id === state.selectedStyle; }) || STYLES[0];
    await ensureSignatureFonts();
    var canvas = document.createElement("canvas");
    canvas.width = 760; canvas.height = 140;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0c1014";
    ctx.font = "76px " + sty.font;
    ctx.textBaseline = "middle";
    ctx.fillText(name, 24, 76);
    state.sigImage = canvas.toDataURL("image/png");
    var st = $("hsAdoptTypeState"); if (st) st.classList.add("show");
    var sd = $("hsAdoptDrawState"); if (sd) sd.classList.remove("show");
    updateSubmitState();
  }
  function sizeSigPad() {
    if (!sigPad || !sigPad.offsetWidth || sigSized) return;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    sigPad.width = sigPad.offsetWidth * ratio;
    sigPad.height = sigPad.offsetHeight * ratio;
    sigCtx = sigPad.getContext("2d");
    sigCtx.setTransform(1, 0, 0, 1, 0, 0);
    sigCtx.scale(ratio, ratio);
    sigCtx.lineWidth = 2.4; sigCtx.lineCap = "round"; sigCtx.lineJoin = "round"; sigCtx.strokeStyle = "#0a1410";
    sigSized = true;
  }
  function padPoint(e) { var r = sigPad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function setupSigPad() {
    sigPad = $("hsPad");
    if (!sigPad || sigPad.dataset.ready === "1") return;
    sigPad.dataset.ready = "1";
    sigPad.addEventListener("pointerdown", function (e) { stopEvent(e); if (sigPad.setPointerCapture && e.pointerId != null) sigPad.setPointerCapture(e.pointerId); sizeSigPad(); if (!sigCtx) return; sigDrawing = true; sigCtx.beginPath(); var p = padPoint(e); sigCtx.moveTo(p.x, p.y); }, true);
    sigPad.addEventListener("pointermove", function (e) { if (!sigDrawing || !sigCtx) return; stopEvent(e); var p = padPoint(e); sigCtx.lineTo(p.x, p.y); sigCtx.stroke(); }, true);
    var end = function (e) { if (!sigDrawing) return; if (e) stopEvent(e); sigDrawing = false; };
    sigPad.addEventListener("pointerup", end, true);
    sigPad.addEventListener("pointercancel", end, true);
    window.addEventListener("resize", function () { sigSized = false; }, { passive: true });
  }
  function adoptDrawSig() {
    if (!sigPad) return;
    state.sigImage = sigPad.toDataURL("image/png");
    var st = $("hsAdoptDrawState"); if (st) st.classList.add("show");
    var so = $("hsAdoptTypeState"); if (so) so.classList.remove("show");
    updateSubmitState();
  }
  function clearDrawSig(e) {
    if (e) stopEvent(e);
    sigSized = false; sizeSigPad();
    if (sigCtx && sigPad) sigCtx.clearRect(0, 0, sigPad.width, sigPad.height);
    if (state.activePane === "draw") {
      state.sigImage = "";
      var st = $("hsAdoptDrawState"); if (st) st.classList.remove("show");
      updateSubmitState();
    }
  }

  // ── consents / submit ─────────────────────────────────────────────────────
  function updateSubmitState() {
    var btn = $("hsSubmit");
    if (!btn) return;
    btn.disabled = !(state.sigImage && state.consentEsign && state.consentCoverage && val("hs_name"));
  }
  function showError(msg) {
    var err = $("hsErr");
    if (err) { err.textContent = msg; err.classList.add("show"); }
  }
  async function submitSigned() {
    var btn = $("hsSubmit");
    var err = $("hsErr");
    if (err) err.classList.remove("show");
    if (btn) { btn.disabled = true; btn.textContent = "Submitting…"; }
    try {
      var payload = window.__ho && window.__ho.getPayload ? window.__ho.getPayload() : null;
      if (!payload) throw new Error("Wizard data unavailable");
      payload.fields.signer_name = val("hs_name");
      var body = Object.assign({}, payload, {
        signature: state.sigImage,
        eSignConsent: {
          accepted: true,
          fullDocumentRendered: state.fullRendered,
          coverageAck: state.consentCoverage,
          version: CONSENT_VERSION,
          text: CONSENT_TEXT,
          reviewStartedAt: state.reviewStartedAt,
          previewGeneratedAt: state.previewGeneratedAt,
          consentedAt: state.consentedAt || new Date().toISOString(),
          timezone: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || "",
          pageCount: state.pageCount,
          reviewFingerprint: state.previewFingerprint
        }
      });
      var res = await fetch("/api/ho-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.ok) throw new Error(data.error || "Submission failed (" + res.status + ")");
      if (window.__ho && window.__ho.onSigned) window.__ho.onSigned(data);
    } catch (e2) {
      showError((e2 && e2.message ? e2.message : "Submission failed.") + " You can retry, or call 310-804-5017.");
      if (btn) { btn.textContent = "Sign & Submit Application →"; updateSubmitState(); }
    }
  }

  // ── init ──────────────────────────────────────────────────────────────────
  function initReviewStep() {
    var mount = $("ho-sign-mount");
    if (!mount || mount.dataset.ready === "1") return;
    mount.dataset.ready = "1";
    injectCss();
    buildUi(mount);
    state.reviewStartedAt = new Date().toISOString();
    ensureSignatureFonts();
    $("hsBuild").addEventListener("click", buildPreview);
    $("hs_name").addEventListener("input", function () { buildStyleList(); updateSubmitState(); });
    $("hsTabType").addEventListener("click", function () {
      state.activePane = "type";
      $("hsTabType").classList.add("active"); $("hsTabDraw").classList.remove("active");
      $("hsPaneType").classList.add("show"); $("hsPaneDraw").classList.remove("show");
    });
    $("hsTabDraw").addEventListener("click", function () {
      state.activePane = "draw";
      $("hsTabDraw").classList.add("active"); $("hsTabType").classList.remove("active");
      $("hsPaneDraw").classList.add("show"); $("hsPaneType").classList.remove("show");
      setupSigPad(); setTimeout(sizeSigPad, 60);
    });
    $("hsAdoptType").addEventListener("click", adoptTypedSig);
    $("hsAdoptDraw").addEventListener("click", adoptDrawSig);
    $("hsClear").addEventListener("click", clearDrawSig);
    $("hsConsentEsign").addEventListener("change", function (e) {
      state.consentEsign = e.target.checked;
      if (e.target.checked) state.consentedAt = new Date().toISOString();
      updateSubmitState();
    });
    $("hsConsentCoverage").addEventListener("change", function (e) { state.consentCoverage = e.target.checked; updateSubmitState(); });
    $("hsSubmit").addEventListener("click", submitSigned);
    $("hsLegacy").addEventListener("click", function (e) {
      e.preventDefault();
      if (window.__ho && window.__ho.legacySubmit) window.__ho.legacySubmit();
    });
  }

  document.addEventListener("hoWizardReviewStep", initReviewStep);
})();
