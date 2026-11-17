import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
function load(file) {
  const exports = {};
  new Function(
    "exports",
    "require",
    ts.transpileModule(fs.readFileSync(new URL("../" + file, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  )(exports, (name) => require(name));
  return exports;
}
const { validateBookingForm, formatDay, formatRange } = load("src/lib/bookings/model.ts");

const base = {
  name: "Alessandro Rossi",
  email: "alessandro@example.it",
  phone: "333 123 4567",
  people: 3,
  notes: "",
  privacy: true,
};

test("validateBookingForm accepts a complete form", () => {
  assert.equal(validateBookingForm(base), null);
});

test("validateBookingForm rejects missing name, bad email, short phone, no privacy and bad people count", () => {
  assert.match(validateBookingForm({ ...base, name: "" }), /nome/i);
  assert.match(validateBookingForm({ ...base, email: "notanemail" }), /email/i);
  assert.match(validateBookingForm({ ...base, phone: "1" }), /numero/i);
  assert.match(validateBookingForm({ ...base, privacy: false }), /privacy/i);
  assert.ok(validateBookingForm({ ...base, people: 0 }));
  assert.ok(validateBookingForm({ ...base, people: 25 }));
});

test("formatDay and formatRange format Italian labels without timezone shift", () => {
  assert.equal(formatDay("2026-08-08"), "Sabato 8 ago");
  assert.equal(formatRange({ start_time: "18:00:00", end_time: "20:30:00" }), "18:00–20:30");
});
