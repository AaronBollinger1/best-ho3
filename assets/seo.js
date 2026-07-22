/* =============================================================
   BestInsurance — SEO / structured-data layer  (shared chassis)
   -------------------------------------------------------------
   Emits a single JSON-LD @graph (Organization, WebSite, WebPage,
   BreadcrumbList, and — where configured — Service + FAQPage) on
   every page, driven by config, not hand-authored per page:

     • platform operator defaults live here (the one operating
       entity behind every line);
     • per-line values come from window.BEST_BRAND (brand.js);
     • per-page overrides come from window.PAGE_SEO.

   Zero-config is fully functional: with no PAGE_SEO and no brand.js
   it still derives Organization + WebSite + WebPage + BreadcrumbList
   from the document + URL, and auto-detects an on-page FAQ.
   A new line/page opts into richer data by setting PAGE_SEO — it
   never edits this file. Load with `defer` after brand.js.
   ============================================================= */
(function () {
  "use strict";

  /* The single operating entity behind every BestInsurance line. */
  var OPERATOR = {
    name: "Bollinsure Insurance Services",
    legalName: "WJB Services, Inc. dba Bollinsure Insurance Services",
    telephone: "+1-310-804-5017",
    email: "quotes@bollinsure.com",
    license: "CA DOI License #6013787",
    areaServed: "US",
    locality: "Los Angeles",
    region: "CA"
  };

  var brand = window.BEST_BRAND || {};
  var page = window.PAGE_SEO || {};

  function text(el) { return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : ""; }
  function attr(sel, name) { var el = document.querySelector(sel); return el ? el.getAttribute(name) : ""; }

  var origin = location.origin && location.origin !== "null" ? location.origin : "";
  var canonical = page.canonical || attr('link[rel="canonical"]', "href") || (origin + location.pathname);
  canonical = canonical.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
  var siteRoot = origin || canonical.replace(/(https?:\/\/[^/]+).*/, "$1") || "";

  var orgId = siteRoot + "/#organization";
  var siteId = siteRoot + "/#website";
  var pageId = canonical + "#webpage";

  var docTitle = (document.title || "").trim();
  var metaDesc = page.description || attr('meta[name="description"]', "content") || "";

  /* Defer to any hand-authored structured data already on the page: collect the
     @types present in static JSON-LD so we never emit a duplicate of them. */
  var staticTypes = collectStaticTypes();

  var graph = [];

  /* — Organization (the licensed operator) — */
  graph.push({
    "@type": "InsuranceAgency",
    "@id": orgId,
    "name": OPERATOR.name,
    "legalName": OPERATOR.legalName,
    "url": siteRoot + "/",
    "telephone": OPERATOR.telephone,
    "email": OPERATOR.email,
    "areaServed": OPERATOR.areaServed,
    "hasCredential": OPERATOR.license,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": OPERATOR.locality,
      "addressRegion": OPERATOR.region,
      "addressCountry": "US"
    }
  });

  /* — WebSite — */
  graph.push({
    "@type": "WebSite",
    "@id": siteId,
    "url": siteRoot + "/",
    "name": brand.name || docTitle.split("|").pop().trim() || OPERATOR.name,
    "publisher": { "@id": orgId }
  });

  /* — WebPage — */
  var webPage = {
    "@type": "WebPage",
    "@id": pageId,
    "url": canonical,
    "name": docTitle || (brand.name || OPERATOR.name),
    "isPartOf": { "@id": siteId },
    "about": { "@id": orgId }
  };
  if (metaDesc) webPage.description = metaDesc;
  graph.push(webPage);

  /* — BreadcrumbList — explicit config wins; otherwise derive from the path. */
  var crumbs = Array.isArray(page.breadcrumbs) && page.breadcrumbs.length
    ? page.breadcrumbs.slice()
    : deriveBreadcrumbs();
  if (crumbs.length && !staticTypes.BreadcrumbList) {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": canonical + "#breadcrumb",
      "itemListElement": crumbs.map(function (c, i) {
        return {
          "@type": "ListItem",
          "position": i + 1,
          "name": c.name,
          "item": c.item ? absolute(c.item) : undefined
        };
      })
    });
  }

  /* — Service (per line) — only on pages that declare one. — */
  var svc = page.service;
  if (svc) {
    graph.push({
      "@type": svc.type === "FinancialProduct" ? "FinancialProduct" : "Service",
      "@id": canonical + "#service",
      "name": svc.name || ((brand.name || "") + " insurance"),
      "serviceType": svc.serviceType || svc.name || "Insurance brokerage",
      "provider": { "@id": orgId },
      "areaServed": svc.areaServed || OPERATOR.areaServed,
      "description": svc.description || metaDesc || undefined
    });
  }

  /* — FAQPage — explicit config, else auto-detect an on-page <details> FAQ. */
  var faqs = Array.isArray(page.faqs) && page.faqs.length ? page.faqs : scrapeFaqs();
  if (faqs.length && !staticTypes.FAQPage) {
    graph.push({
      "@type": "FAQPage",
      "@id": canonical + "#faq",
      "mainEntity": faqs.map(function (f) {
        return {
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a }
        };
      })
    });
  }

  inject({ "@context": "https://schema.org", "@graph": prune(graph) });

  // ── helpers ────────────────────────────────────────────────────────────────
  function collectStaticTypes() {
    var seen = {};
    document.querySelectorAll('script[type="application/ld+json"]:not([data-seo-graph])').forEach(function (s) {
      /* Capture both "@type":"X" and array forms "@type":["X","Y"]. */
      var m = (s.textContent || "").match(/"@type"\s*:\s*(\[[^\]]*\]|"[^"]+")/g) || [];
      m.forEach(function (frag) {
        (frag.match(/"([^"]+)"/g) || []).forEach(function (q, i) {
          if (i === 0) return; // the first quoted token is "@type" itself
          seen[q.slice(1, -1)] = true;
        });
      });
    });
    return seen;
  }
  function deriveBreadcrumbs() {
    var seg = location.pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "");
    var list = [{ name: "Home", item: siteRoot + "/" }];
    if (seg) list.push({ name: prettify(seg), item: canonical });
    return list;
  }
  function prettify(slug) {
    return slug.split(/[-/]/).map(function (w) {
      return w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    }).join(" ");
  }
  function absolute(u) {
    if (/^https?:\/\//.test(u)) return u;
    return siteRoot + (u.charAt(0) === "/" ? "" : "/") + u;
  }
  function scrapeFaqs() {
    var items = document.querySelectorAll(".faq-item");
    var out = [];
    items.forEach(function (item) {
      var qEl = item.querySelector(".faq-q, summary");
      var aEl = item.querySelector(".faq-a");
      if (!qEl || !aEl) return;
      var q = text(qEl).replace(/\s*\+\s*$/, "").trim();
      var a = text(aEl);
      if (q && a) out.push({ q: q, a: a });
    });
    return out.slice(0, 20);
  }
  function prune(arr) {
    return JSON.parse(JSON.stringify(arr, function (k, v) {
      return v === undefined || v === "" ? undefined : v;
    }));
  }
  function inject(obj) {
    if (document.querySelector('script[type="application/ld+json"][data-seo-graph]')) return;
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute("data-seo-graph", "1");
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }
})();
