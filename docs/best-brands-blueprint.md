# Best Brands Website Blueprint

This document turns the BestHO3 experience into a repeatable starting point for future Best Brands sites. It preserves the existing static/Vercel architecture, quote flow, ACORD generation, and API integrations while making the presentation system portable.

## What stays consistent

- A direct hero promise, one primary action, and one broker-assisted alternative.
- Education before intake: explain the risk, available markets, and what improves placement.
- Proof close to the decision: a specific client outcome, a concise path, and a clear limitation statement.
- Motion that explains sequence or hierarchy instead of looping decoration.
- Accessible fallbacks: the page remains complete without JavaScript and respects reduced-motion preferences.

## What changes by brand

Keep brand decisions in the existing primary stylesheet rather than in `motion.css`:

- Type families and type scale.
- Core color tokens such as the page background, accent, ink, borders, and cards.
- Photography, illustration, maps, icons, and texture.
- Product facts, eligibility rules, disclosures, contact details, and testimonials.
- CTA labels when the product requires a different intake path.

`assets/motion.css` only owns timing, reveal behavior, progress cues, story layouts, and interaction states. This separation allows a future brand to look distinct without rebuilding its motion system.

## Page sequence

1. **Orient:** product identity, audience, primary promise, and immediate CTA.
2. **Route:** show the market or coverage paths so visitors understand that the first option is not always the only option.
3. **Educate:** explain underwriting inputs and how the broker improves the submission.
4. **Prove:** present a real problem, the work performed, and the result. Avoid anonymous praise without an outcome.
5. **Convert:** repeat the indication CTA and provide a broker conversation for nuanced situations.
6. **Intake:** keep the existing quote wizard and operational integrations unchanged unless the product workflow requires it.

## Motion API

Load `assets/motion.css` after the brand stylesheet and keep the shared motion initialization in `assets/app.js`.

### Entrance motion

Add `data-hero-motion` to hero elements that should enter in reading order. Add `data-hero-group` to the hero content container, `data-hero-copy` to the copy column, and `data-hero-visual` to the inner supporting visual. Keeping the visual's entrance wrapper separate from its scroll-driven stage prevents transform collisions.

The shared hero scene also supports a progress-driven exploration cue, ambient-layer parallax, a perspective shift on the visual, and a restrained copy exit. These mechanisms use the same normalized scene value and should remain scrubbed to actual scroll position rather than autoplaying.

### Scroll reveal

Add `data-motion` to meaningful content. Supported values are:

- `rise`
- `slide-right`
- `slide-left`
- `scale`
- `fade`

Wrap related items in `data-motion-group` to assign their stagger order automatically. A reveal should correspond to a reading sequence; avoid assigning it to every paragraph.

### Scroll-linked scenes

Add `data-scroll-scene` to a section whose progress should drive a visual cue. JavaScript supplies a normalized `--scene-progress` value from `0` to `1`. BestHO3 uses this for the hero visual and the market-route line.

### Active route

Use `.market-route-grid` around `.market-card` elements. The card nearest the viewport center receives `.is-active`, reinforcing the path without adding a carousel or hiding content.

## Proof-story pattern

Use the brush-risk outcome section as the default proof pattern:

- Lead with the operating principle: explore appropriate markets before defaulting to the FAIR Plan.
- Show the work in three stages: document, remarket, coordinate.
- Include the complete client statement when permission allows.
- Summarize the result in a short before-to-after sequence.
- State that eligibility, pricing, and availability are carrier-specific and not guaranteed.
- Describe FAIR Plan plus DIC as a coordinated fallback when proper—not as an inferior outcome or a guaranteed alternative.

Future stories should replace the facts rather than merely changing the nouns. Verify every carrier, savings, timing, and coverage claim before publishing.

## CTA rules

- Keep one visually dominant action: `Get a pricing indication` for the current BestHO3 flow.
- Keep `Talk to a broker` as the secondary action for edge cases and people who are not ready for intake.
- Do not introduce a third competing CTA in the same viewport.
- Preserve existing destinations and tracking when restyling buttons.
- Repeat the primary/secondary pair after the strongest proof point.

## Reduced motion and performance

- All movement is disabled or simplified under `prefers-reduced-motion: reduce`.
- Navigation state, page progress, and scroll scenes are consolidated into one `requestAnimationFrame` update.
- Intersection Observer triggers entrances; no animation library is required.
- Animate opacity and transforms only. Avoid scroll-linked layout properties.
- Keep imagery responsive and compressed; motion should not delay the quote experience.

## Brand rollout workflow

1. Copy the semantic page sequence and shared motion layer.
2. Map the new brand's tokens, type, imagery, and voice in its primary stylesheet.
3. Replace all product facts, contact information, disclosures, and testimonials.
4. Connect CTAs to the existing product-specific intake and broker paths.
5. Verify keyboard navigation, focus visibility, landmarks, headings, labels, contrast, and reduced motion.
6. Test at 390px mobile, tablet, and 1440px desktop with no horizontal overflow.
7. Exercise every form branch, API integration, document-generation path, and submission state.
8. Run the repository's automated tests and inspect console errors before preview deployment.
9. Review the preview with underwriting/compliance before production promotion.

## Acceptance checklist

- The page communicates audience, product, and next action above the fold.
- The proof story contains a concrete challenge, intervention, and outcome.
- The primary CTA retains the current functional destination.
- No required information depends on animation.
- Reduced-motion users receive an immediate, stable layout.
- Mobile navigation and CTAs remain usable at 390px.
- There is no horizontal overflow at tested breakpoints.
- Quote, ACORD, API, and signed-submit tests pass.
- Console output is free of errors and warnings in the tested flow.
