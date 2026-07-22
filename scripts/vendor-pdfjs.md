# Vendored pdf.js

The e-sign review step (`assets/ho-review-signing.js`) renders the ACORD 80
preview with **pdf.js**, self-hosted under `assets/vendor/pdfjs/` so the site
serves no third-party script/worker origin and the CSP stays `'self'`-only.

- **Version:** `pdfjs-dist@3.11.174` (Apache-2.0, © Mozilla Foundation)
- **Files:** `pdf.min.js` (UMD build — sets `window.pdfjsLib`) and
  `pdf.worker.min.js` (must match the main build version exactly).
- **License:** the Apache-2.0 notice is retained inline in each file header.

## Updating

```bash
npm install pdfjs-dist@<version> --no-save
cp node_modules/pdfjs-dist/build/pdf.min.js        assets/vendor/pdfjs/pdf.min.js
cp node_modules/pdfjs-dist/build/pdf.worker.min.js assets/vendor/pdfjs/pdf.worker.min.js
```

Bump the version comment in `assets/ho-review-signing.js`, then run `npm test`.
Keep the two files on the **same** version — a worker/main mismatch throws at
`getDocument()`.
