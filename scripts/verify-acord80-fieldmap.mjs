/* verify-acord80-fieldmap.mjs — asserts every ACORD 80 field name referenced by
   api/ho-application.js exists in the actual AcroForm of the committed template.
   A name that is not in the form makes setText/check a SILENT NO-OP, so this
   test failing means applicant answers would be dropped from the PDF.
   Run: npm run test:fields */
import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

const root = process.cwd();
const src = fs.readFileSync(path.join(root, "api", "ho-application.js"), "utf8");
const templateBytes = fs.readFileSync(path.join(root, "api", "acord-80-homeowner-application.pdf"));

const pdf = await PDFDocument.load(templateBytes);
const form = pdf.getForm();
const actual = new Map(form.getFields().map((f) => [f.getName(), f.constructor.name]));
console.log(`Template AcroForm: ${actual.size} fields`);

const refs = new Set();
// P<n> + "Name" concatenations
for (const m of src.matchAll(/P(\d)\s*\+\s*"([^"]+)"/g)) refs.add(`F[0].P${m[1]}[0].${m[2]}`);
// P<n> + `Name_${L}[0]` template literals (loss rows A–D)
for (const m of src.matchAll(/P(\d)\s*\+\s*`([^`]+)`/g)) {
  if (m[2].includes("${L}")) for (const L of "ABCD") refs.add(`F[0].P${m[1]}[0].${m[2].replaceAll("${L}", L)}`);
  else refs.add(`F[0].P${m[1]}[0].${m[2]}`);
}
// Condition prefix+suffix combinations
const condPrefixes = ["ResidentialStructure_RoofCondition_", "ResidentialStructure_PlumbingCondition_", "ResidentialStructure_Housekeeping_"];
const condSuffixes = ["ExcellentIndicator_A[0]", "GoodIndicator_A[0]", "AverageIndicator_A[0]", "BelowAverageIndicator_A[0]"];
for (const p of condPrefixes) {
  refs.delete(`F[0].P2[0].${p}`); // the bare prefix constant itself is never a field
  for (const s of condSuffixes) refs.add(`F[0].P2[0].${p}${s}`);
}

let missing = 0;
for (const name of [...refs].sort()) {
  if (!actual.has(name)) {
    console.error(`MISSING: ${name}`);
    missing++;
  }
}
console.log(`Checked ${refs.size} referenced field names — ${missing} missing.`);
if (missing) {
  console.error("FAIL: fix api/ho-application.js / docs/acord-80-field-map.md before shipping.");
  process.exit(1);
}
console.log("OK: every referenced ACORD 80 field name exists in the template.");
