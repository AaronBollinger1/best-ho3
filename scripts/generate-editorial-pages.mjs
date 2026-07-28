import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REVIEW_DATE = "2026-07-28";

const pages = [
  {
    slug: "research",
    title: "Best Insurance Research at BestHO3",
    description: "Free, broker-reviewed California homeowners insurance research, tools, methodology, and source standards from BestHO3.",
    eyebrow: "Best Insurance Research",
    summary: "BestHO3 is the homeowners vertical in a growing free insurance research network. We publish practical explanations, comparisons, tools, and case studies so readers can understand a decision before asking for a quote.",
    toc: [
      ["purpose", "Our purpose"],
      ["library", "What we publish"],
      ["relationships", "Brand relationships"],
      ["standards", "Research standard"]
    ],
    body: `
      <h2 id="purpose">Our purpose</h2>
      <p>Insurance information is often either too generic to use or written only to push a form. Best Insurance Research is designed to sit between those extremes: free information with enough evidence, context, and limitation language to help a reader make a better next decision.</p>
      <p>BestHO3 covers California homeowners insurance. It explains policy forms, underwriting, replacement cost, wildfire placement, the FAIR Plan, specialty markets, claims, and quote comparison. Personalized recommendations and insurance transactions remain the work of a licensed broker.</p>

      <h2 id="library">What we publish</h2>
      <div class="standard-card-grid">
        <article class="standard-card"><h3>Guides</h3><p>Plain-English explanations of policy language, underwriting questions, and California market pathways.</p></article>
        <article class="standard-card"><h3>Comparisons</h3><p>Evidence-led comparisons that show meaningful differences without turning context-dependent coverage into a universal score.</p></article>
        <article class="standard-card"><h3>Tools</h3><p>Calculators and application workflows that expose assumptions and keep preliminary indications separate from carrier quotes.</p></article>
        <article class="standard-card"><h3>Case studies</h3><p>Verified, anonymized, composite, or illustrative examples labeled so readers know what kind of evidence they are seeing.</p></article>
      </div>

      <h2 id="relationships">How the brands relate</h2>
      <p><strong>Best Insurance Research</strong> is the publishing standard. <strong>BestHO3</strong> is its homeowners subject hub. <strong>Covwell</strong> is the technology-assisted second-opinion experience. <strong>Bollinsure Insurance Services</strong> is the licensed brokerage that operates the sites, reviews insurance content, and handles any personalized advice, quoting, placement, or service requested by a consumer.</p>
      <div class="disclosure-box"><strong>Common ownership is not hidden.</strong> BestHO3 and Best Insurance Research are operated by WJB Services, Inc. dba Bollinsure Insurance Services. The brokerage may receive compensation if a reader voluntarily asks it to place or service insurance. Carriers cannot buy an editorial ranking.</div>

      <h2 id="standards">The research standard</h2>
      <p>Each substantive guide should identify its author or editorial owner, the licensed reviewing organization, its review date, sources close to material claims, applicable jurisdiction, and important limitations. We distinguish sourced facts, professional judgment, modeled estimates, and examples.</p>
      <p><a href="/editorial-standards">Read the editorial standards</a>, <a href="/review-methodology">review methodology</a>, or <a href="/corrections">report a correction</a>.</p>`
  },
  {
    slug: "about",
    title: "About BestHO3 and Best Insurance Research",
    description: "Who operates BestHO3, how Best Insurance Research relates to Bollinsure and Covwell, and what readers can expect.",
    eyebrow: "About BestHO3",
    summary: "BestHO3 is a free California homeowners insurance guide and application experience operated by WJB Services, Inc. dba Bollinsure Insurance Services.",
    toc: [
      ["who", "Who we are"],
      ["roles", "Brand roles"],
      ["money", "How we make money"],
      ["limits", "What this is not"]
    ],
    body: `
      <h2 id="who">Who we are</h2>
      <p>BestHO3 combines a public homeowners insurance library with a preliminary pricing indication and signed ACORD 80 application workflow. Its California focus reflects the market the brokerage works in most deeply: admitted carriers, wildfire underwriting, the California FAIR Plan, difference-in-conditions coverage, and surplus-lines placement.</p>
      <p>The legal operator is WJB Services, Inc. dba Bollinsure Insurance Services, California Department of Insurance License #6013787. Editorial direction for the homeowners library is led by <a href="/aaron-bollinger">Aaron Bollinger</a>; insurance review is performed under the licensed brokerage.</p>

      <h2 id="roles">The role of each brand</h2>
      <div class="standard-card-grid">
        <article class="standard-card"><h3>Best Insurance Research</h3><p>The free publishing standard and cross-line research identity.</p></article>
        <article class="standard-card"><h3>BestHO3</h3><p>The focused homeowners insurance library, tools, and application experience.</p></article>
        <article class="standard-card"><h3>Covwell</h3><p>A separate technology-assisted policy and quote second-opinion experience.</p></article>
        <article class="standard-card"><h3>Bollinsure</h3><p>The licensed brokerage for personalized recommendations, quoting, placement, and service.</p></article>
      </div>

      <h2 id="money">How we make money</h2>
      <p>Reading the guides and using the public educational tools is free. There is no paywall and no obligation to request insurance services. If a visitor chooses to ask Bollinsure to place or service insurance, the brokerage may receive commission or other compensation permitted for the transaction.</p>
      <p>That commercial relationship is why ownership is disclosed on the site and why carrier access is not presented as editorial independence. We describe Bollinsure as an independent broker because it can access multiple markets, not because BestHO3 is independent of Bollinsure.</p>

      <h2 id="limits">What this site is not</h2>
      <p>BestHO3 does not bind insurance through an article, confirm that a claim is covered, replace the actual policy contract, or provide legal advice. Preliminary pricing is not a carrier quote. Coverage, availability, eligibility, forms, and pricing remain subject to the carrier and the issued policy.</p>`
  },
  {
    slug: "editorial-standards",
    title: "Editorial Standards",
    description: "The sourcing, authorship, AI-use, commercial-disclosure, freshness, and correction standards used by BestHO3.",
    eyebrow: "Our standards",
    summary: "Our editorial standard is designed to make each important insurance claim easy to understand, verify, challenge, and update.",
    toc: [
      ["principles", "Core principles"],
      ["sources", "Sources"],
      ["ai", "AI and automation"],
      ["commercial", "Commercial separation"],
      ["maintenance", "Maintenance"]
    ],
    body: `
      <h2 id="principles">Core principles</h2>
      <div class="standard-card-grid">
        <article class="standard-card"><h3>Answer people first</h3><p>A page should help a reader complete a real task even if the reader never submits a form.</p></article>
        <article class="standard-card"><h3>Label uncertainty</h3><p>Facts, estimates, professional judgment, examples, and carrier decisions are different things.</p></article>
        <article class="standard-card"><h3>Show the relationship</h3><p>Ownership, compensation, appointments, and other material commercial relationships belong near the decision.</p></article>
        <article class="standard-card"><h3>Correct the record</h3><p>Material errors are fixed, re-reviewed, and reflected in the page's review date.</p></article>
      </div>

      <h2 id="sources">Source hierarchy</h2>
      <p>We prefer issued policy forms and endorsements; laws, regulations, and regulator publications; carrier underwriting material and filings; public program documentation; rating-agency publications; recognized insurance standards; and retained brokerage evidence. Secondary sources may add context but should not be the only support for a material coverage, pricing, or legal claim.</p>
      <p>Short excerpts may be quoted when the exact wording matters. The page should link readers to the primary source where possible and should not reproduce copyrighted policy forms or reports unnecessarily.</p>

      <h2 id="ai">AI and automation</h2>
      <p>Automation may help organize research, identify gaps, check internal consistency, or draft a first structure. It does not replace source verification or licensed insurance review. We do not instruct an automated system to invent prices, carrier appetites, customer outcomes, policy language, reviews, or citations.</p>
      <p>Content that materially relies on automation should receive human review before publication. Consumer-supplied documents are not processed through the public editorial workflow.</p>

      <h2 id="commercial">Commercial and editorial separation</h2>
      <p>Carriers cannot purchase favorable conclusions, placement in a ranking, or removal of a material limitation. Where Bollinsure has a carrier appointment, market-access relationship, or potential compensation relationship relevant to a review, that context should be disclosed.</p>
      <div class="disclosure-box"><strong>BestHO3 is broker-owned.</strong> Editorial governance means evidence and disclosures control the conclusion; it does not mean the publication is independent of its operator.</div>

      <h2 id="maintenance">Freshness and corrections</h2>
      <p>Pages carry a review date when they have been materially checked. Changing a date without checking the underlying facts is prohibited. Time-sensitive pages—carrier appetite, pricing, laws, and public programs—receive priority review. Readers can use the <a href="/corrections">corrections page</a> to identify an error or missing disclosure.</p>`
  },
  {
    slug: "review-methodology",
    title: "Insurance Review Methodology",
    description: "How BestHO3 researches carriers, coverage forms, comparisons, case studies, and preliminary pricing without false precision.",
    eyebrow: "Methodology",
    summary: "Insurance quality depends on the risk, policy form, jurisdiction, carrier appetite, and service needs. Our method favors evidence matrices and explicit tradeoffs over universal star ratings.",
    toc: [
      ["scope", "Define the question"],
      ["evidence", "Collect evidence"],
      ["compare", "Compare"],
      ["cases", "Case studies"],
      ["ratings", "Ratings policy"]
    ],
    body: `
      <h2 id="scope">1. Define the decision</h2>
      <p>A review begins with a specific consumer question and jurisdiction. “Which policy handles this roof settlement better?” is answerable. “What is the best insurance company?” usually is not. We state the audience, risk type, geography, and date before drawing a conclusion.</p>

      <h2 id="evidence">2. Collect and identify the evidence</h2>
      <p>Relevant evidence may include policy forms and endorsements, carrier filings and underwriting guidance, public regulator data, financial-strength publications, actual quotes, documented service experience, and verified case records. Each important conclusion should identify which kind of evidence supports it and what was unavailable.</p>

      <h2 id="compare">3. Compare meaningful dimensions</h2>
      <p>Homeowners comparisons may examine eligibility, policy form, settlement basis, replacement-cost features, sublimits, deductibles, wildfire restrictions, inspection requirements, available endorsements, market access, and service evidence. Price is compared only when the risk inputs and material terms are sufficiently similar.</p>
      <p>Carrier appetite changes. A carrier that fits one home may be unavailable or inappropriate for another. We therefore publish “as of” context and avoid turning an appointment list into a recommendation.</p>

      <h2 id="cases">4. Label case-study evidence</h2>
      <p>Stories are labeled as verified client cases, anonymized verified cases, composite educational examples, or illustrative scenarios. Savings statements identify whether limits, deductibles, forms, and services were comparable. Outcomes are never presented as guaranteed.</p>

      <h2 id="ratings">5. Avoid false precision</h2>
      <p>BestHO3 does not currently publish a universal carrier star score. If a future score is introduced, the factors, weights, evidence period, commercial relationships, reviewer, and limitations must be public. Consumer reviews, if used, remain separate from editorial analysis and must come from genuine customers.</p>`
  },
  {
    slug: "corrections",
    title: "Corrections and Feedback",
    description: "How to report an error, stale insurance fact, missing source, or disclosure concern to BestHO3.",
    eyebrow: "Corrections",
    summary: "Insurance information changes, and even carefully reviewed material can be wrong or become stale. Specific corrections help us investigate quickly.",
    toc: [
      ["report", "Report an issue"],
      ["include", "What to include"],
      ["process", "What happens next"],
      ["urgent", "Urgent insurance matters"]
    ],
    body: `
      <h2 id="report">Report an issue</h2>
      <p>Email <a href="mailto:quotes@bollinsure.com?subject=BestHO3%20content%20correction">quotes@bollinsure.com</a> with the subject “BestHO3 content correction.” You may also call <a href="tel:3108045017">310-804-5017</a>.</p>

      <h2 id="include">What to include</h2>
      <ul>
        <li>The page URL and the exact statement at issue.</li>
        <li>Why you believe it is inaccurate, incomplete, stale, or insufficiently disclosed.</li>
        <li>A primary source or policy-form reference when available.</li>
        <li>Whether the issue could cause an immediate consumer or coverage misunderstanding.</li>
      </ul>

      <h2 id="process">What happens next</h2>
      <p>We review the cited passage against the available evidence. Material corrections are made in the page, the review date is updated only after the relevant facts are checked, and related pages are searched for the same issue. A disagreement based on carrier-specific language may result in additional qualification rather than a universal rewrite.</p>

      <h2 id="urgent">Urgent insurance matters</h2>
      <div class="disclosure-box"><strong>Do not use the correction channel for a claim deadline, cancellation, non-renewal, binding request, or coverage confirmation.</strong> Contact your current insurer or licensed producer using the instructions on your policy. Submitting a website message does not bind coverage or preserve a deadline.</div>`
  },
  {
    slug: "aaron-bollinger",
    title: "Aaron Bollinger — Editorial Lead",
    description: "About Aaron Bollinger, BestHO3 editorial lead and personal-lines specialist at Bollinsure Insurance Services.",
    eyebrow: "Editorial lead",
    summary: "Aaron Bollinger leads the BestHO3 homeowners editorial program and works in personal lines at Bollinsure Insurance Services.",
    toc: [
      ["role", "Role"],
      ["review", "Review responsibilities"],
      ["principles", "Editorial principles"],
      ["contact", "Contact"]
    ],
    body: `
      <h2 id="role">Role</h2>
      <p>Aaron Bollinger leads the subject direction and practical review of BestHO3's California homeowners library. His focus includes homeowners, landlord, wildfire, high-value property, personal umbrella, and related personal-lines placement questions.</p>
      <p>Insurance review is performed through WJB Services, Inc. dba Bollinsure Insurance Services, California Department of Insurance License #6013787. The entity license is shown separately from Aaron's editorial role so the page does not imply that an entity license number is a personal credential.</p>

      <h2 id="review">Review responsibilities</h2>
      <p>The editorial lead is responsible for choosing questions that reflect real consumer decisions, requiring material claims to be sourceable, separating indications from quotes, identifying carrier-specific limitations, and routing personalized insurance decisions into the licensed brokerage workflow.</p>

      <h2 id="principles">Editorial principles</h2>
      <ul>
        <li>Explain the tradeoff, not only the recommendation.</li>
        <li>Use the policy form and primary source when exact wording matters.</li>
        <li>Never convert a carrier relationship into an undisclosed ranking advantage.</li>
        <li>Label modeled estimates, examples, and professional judgment.</li>
        <li>Correct material errors and avoid freshness theater.</li>
      </ul>

      <h2 id="contact">Contact</h2>
      <p>For editorial corrections, use the <a href="/corrections">corrections process</a>. For an insurance question or service request, call <a href="tel:3108045017">310-804-5017</a> or email <a href="mailto:quotes@bollinsure.com">quotes@bollinsure.com</a>. Contact does not bind or alter coverage.</p>`
  }
];

function pageShell(page) {
  const toc = page.toc.map(([id, label]) => `<a href="#${id}">${label}</a>`).join("\n          ");
  const ogType = page.slug === "aaron-bollinger" ? "profile" : page.slug === "about" ? "website" : "article";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title} | BestHO3</title>
  <meta name="description" content="${page.description}">
  <meta name="author" content="Aaron Bollinger">
  <link rel="canonical" href="https://www.bestho3.com/${page.slug}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..600&family=Public+Sans:wght@400..700&display=swap">
  <link rel="stylesheet" href="/assets/styles.css">
  <meta property="og:title" content="${page.title}">
  <meta property="og:description" content="${page.description}">
  <meta property="og:url" content="https://www.bestho3.com/${page.slug}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:image" content="https://www.bestho3.com/assets/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#f6f2e9">
  <script>
    window.PAGE_SEO = {
      type: ${page.slug === "about" || page.slug === "aaron-bollinger" ? '"AboutPage"' : '"WebPage"'},
      datePublished: "${REVIEW_DATE}",
      dateModified: "${REVIEW_DATE}",
      breadcrumbs: [
        { name: "Home", item: "/" },
        { name: ${JSON.stringify(page.title)}, item: "/${page.slug}" }
      ]
    };
  </script>
</head>
<body data-best-research="1">
<a class="skip-link" href="#main">Skip to content</a>
<nav class="nav" id="main-nav">
  <div class="nav-inner">
    <a href="/" class="nav-brand">Best<span>HO3</span></a>
    <button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links"><span></span><span></span><span></span></button>
    <ul class="nav-links" id="nav-links">
      <li><a href="/research">Research</a></li>
      <li><a href="/california-homeowners-insurance">CA Guide</a></li>
      <li><a href="/coverage">Coverage</a></li>
      <li><a href="/cost">Cost</a></li>
      <li><a href="/carriers">Carriers</a></li>
      <li><a href="/review-methodology">Methodology</a></li>
    </ul>
    <div class="nav-right">
      <a href="tel:3108045017" class="btn btn-ghost btn-sm">310-804-5017</a>
      <a href="/apply" class="btn btn-accent nav-cta">Start Application</a>
    </div>
  </div>
</nav>

<header class="policy-hero" id="main">
  <div class="container-narrow">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> <span>/</span> <span>${page.title}</span></nav>
    <span class="policy-eyebrow">${page.eyebrow}</span>
    <h1 class="section-title">${page.title}</h1>
    <p class="policy-summary">${page.summary}</p>
    <div class="policy-meta"><span>Published and reviewed ${REVIEW_DATE}</span><span>Editorial lead: Aaron Bollinger</span><span>Insurance review: Bollinsure Insurance Services · CA DOI #6013787</span></div>
  </div>
</header>

<main class="section">
  <div class="container policy-layout">
    <article class="prose">
      ${page.body}
    </article>
    <aside class="policy-toc" aria-label="On this page">
      <strong>On this page</strong>
      ${toc}
    </aside>
  </div>
</main>

<section class="cta-section">
  <div class="container">
    <span class="kicker">Keep exploring</span>
    <h2 class="section-title">Learn first. Ask for help when you want it.</h2>
    <p class="lead cta-lead">The research library is free. A licensed broker is available when your question becomes specific to your home or policy.</p>
    <a href="/california-homeowners-insurance" class="btn btn-accent btn-lg">Explore the homeowners guide →</a>
  </div>
</section>

<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <span class="research-mark">Part of Best Insurance Research</span>
        <a href="/" class="nav-brand footer-brand-link">Best<span>HO3</span></a>
        <p class="footer-disclaimer">Operated by WJB Services, Inc. dba Bollinsure Insurance Services. CA DOI Lic. #6013787.</p>
        <p class="footer-disclaimer">General information only. Nothing on this site is a quote, binder, coverage confirmation, or legal advice. Policy terms control.</p>
      </div>
      <div>
        <p class="footer-col-title">Research</p>
        <ul class="footer-links"><li><a href="/research">Research home</a></li><li><a href="/california-homeowners-insurance">CA homeowners guide</a></li><li><a href="/coverage">Coverage library</a></li><li><a href="/carriers">Carrier guide</a></li></ul>
      </div>
      <div>
        <p class="footer-col-title">Trust</p>
        <ul class="footer-links"><li><a href="/about">About</a></li><li><a href="/aaron-bollinger">Editorial lead</a></li><li><a href="/editorial-standards">Editorial standards</a></li><li><a href="/review-methodology">Methodology</a></li><li><a href="/corrections">Corrections</a></li></ul>
      </div>
      <div>
        <p class="footer-col-title">Help</p>
        <ul class="footer-links"><li><a href="/apply">Start application</a></li><li><a href="tel:3108045017">310-804-5017</a></li><li><a href="mailto:quotes@bollinsure.com">Email Bollinsure</a></li><li><a href="/privacy">Privacy &amp; CCPA</a></li><li><a href="/terms">Terms</a></li></ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Bollinsure Insurance Services.</span>
      <span>Best Insurance Research content is free; carriers cannot buy editorial rankings.</span>
      <span><a href="/editorial-standards">Standards</a> · <a href="/corrections">Corrections</a></span>
    </div>
  </div>
</footer>
<script src="/assets/brand.js" defer></script>
<script src="/assets/app.js" defer></script>
<script src="/assets/seo.js" defer></script>
</body>
</html>
`;
}

for (const page of pages) {
  fs.writeFileSync(path.join(ROOT, `${page.slug}.html`), pageShell(page));
}

console.log(`Generated ${pages.length} editorial trust pages.`);
