import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const exports = {};
  new Function(
    "exports",
    "require",
    ts.transpileModule(
      fs.readFileSync(new URL("../" + file, import.meta.url), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
  )(exports, (name) => (name in mocks ? mocks[name] : require(name)));
  return exports;
}
const model = load("src/lib/registrations/model.ts");
const { defaultConfig, ageOn, validateAnswers, configError, responseText } =
  model;
const base = {
  firstName: "Alex",
  lastName: "Prova",
  birthDate: "1990-01-01",
  email: "test@example.test",
  phone: "+3902123456",
  answers: { "workshop-0": "Nessuna esperienza" },
  privacyRead: true,
  participationAccepted: true,
  mediaConsent: false,
};
test("Age boundary, impossible dates and future dates", () => {
  const today = new Date("2026-10-25T12:00:00Z");
  assert.equal(ageOn("2008-10-25", today), 18);
  assert.equal(ageOn("2008-10-26", today), 17);
  assert.equal(ageOn("2025-02-30", today), -1);
  assert.equal(ageOn("2026-10-26", today), -1);
});
test("Required registration data and guardian authorization are enforced server-side", () => {
  const c = defaultConfig();
  assert.equal(validateAnswers(base, c).mediaConsent, false);
  assert.throws(() => validateAnswers({ ...base, privacyRead: false }, c));
  assert.throws(() => validateAnswers({ ...base, birthDate: "2015-01-01" }, c));
  assert.equal(
    validateAnswers(
      {
        ...base,
        birthDate: "2015-01-01",
        guardianName: "Genitore Prova",
        guardianCapacity: "Genitore",
        guardianDeclaration: true,
      },
      c,
    ).guardianName,
    "Genitore Prova",
  );
  assert.throws(() =>
    validateAnswers(
      {
        ...base,
        birthDate: "2015-01-01",
        guardianName: "Genitore",
        guardianCapacity: "Genitore",
        guardianDeclaration: true,
      },
      { ...c, allowMinors: false },
    ),
  );
});
test("Optional media consent, pickup and custom required questions", () => {
  const c = defaultConfig();
  assert.throws(() => validateAnswers({ ...base, answers: {} }, c));
  const a = validateAnswers(
    {
      ...base,
      guardianName: "Ignore",
      pickupName: "Ignore",
      mediaConsent: true,
    },
    { ...c, media: "" },
  );
  assert.equal(a.guardianName, "");
  assert.equal(a.pickupName, "");
  assert.equal(a.mediaConsent, false);
  assert.throws(() =>
    validateAnswers(
      {
        ...base,
        birthDate: "2015-01-01",
        guardianName: "Genitore",
        guardianCapacity: "Tutore",
        guardianDeclaration: true,
        pickupName: "Delegato",
        pickupPhone: "",
      },
      { ...c, pickup: true },
    ),
  );
});
test("A form cannot open without concrete activity information", () => {
  const c = defaultConfig();
  assert.equal(configError(c), null);
  assert.ok(configError({ ...c, open: true }));
  assert.equal(
    configError({
      ...c,
      open: true,
      schedule: "Sabato 10:00",
      location: "Sede",
      fee: "Gratuito",
      materials: "Forniti",
    }),
    null,
  );
});
test("Generated document is a multi-page PDF and response archive includes the snapshot", async () => {
  const c = defaultConfig();
  const a = validateAnswers(base, c);
  const { authorizationPdf } = load("src/lib/registrations/document.ts", {
    "./model": model,
  });
  const bytes = await authorizationPdf(
    a,
    c,
    "Prova attività",
    fs.readFileSync(
      new URL("../public/fonts/NotoSans-Regular.ttf", import.meta.url),
    ),
  );
  assert.ok(bytes.length > 1000);
  const { PDFDocument } = require("pdf-lib");
  const doc = await PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() >= 2);
  const txt = responseText(a, c, "Attività", "ref", "2026-10-25");
  assert.ok(txt.includes("Consenso foto/video: No"));
  assert.ok(txt.includes(c.privacy));
});
const { readJson } = load("src/lib/request-json.ts");
function intake({ uploadFails = false, staff = false } = {}) {
  const rows = new Map(),
    stored = new Map();
  const c = {
    ...defaultConfig(),
    open: true,
    schedule: "Sabato",
    location: "Sede",
    materials: "Forniti",
    fee: "Gratuito",
  };
  const client = {
    rpc: async () => ({ data: true }),
    from(table) {
      let op = "select",
        values,
        identifier;
      const chain = {
        select() {
          return this;
        },
        eq(k, v) {
          if (k === "id") identifier = v;
          return this;
        },
        neq() {
          return this;
        },
        insert(v) {
          op = "insert";
          values = v;
          return this;
        },
        update(v) {
          op = "update";
          values = v;
          return this;
        },
        delete() {
          op = "delete";
          return this;
        },
        single: async () => finish(),
        maybeSingle: async () => finish(),
        then(resolve, reject) {
          return Promise.resolve(finish()).then(resolve, reject);
        },
      };
      function finish() {
        if (table === "labs")
          return {
            data: {
              slug: "test",
              title: "Test",
              active: true,
              version: 1,
              registration_config: c,
            },
          };
        if (op === "insert") {
          rows.set(values.id, values);
          return { error: null };
        }
        if (op === "delete") {
          rows.delete(identifier);
          return { error: null };
        }
        if (op === "update") {
          rows.set(identifier, { ...rows.get(identifier), ...values });
          return { data: rows.get(identifier), error: null };
        }
        return { data: rows.get(identifier) || null, error: null };
      }
      return chain;
    },
    storage: {
      from() {
        return {
          upload: async (path, bytes) => {
            if (uploadFails) return { error: new Error("test") };
            stored.set(path, bytes);
            return { error: null };
          },
          download: async (path) => ({ data: stored.has(path) ? new Blob([stored.get(path)]) : null, error: stored.has(path) ? null : new Error("missing") }),
          remove: async (paths) => {
            paths.forEach((p) => stored.delete(p));
            return {};
          },
        };
      },
    },
  };
  const api = load("src/app/api/registrations/route.ts", {
    "next/server": {
      NextResponse: { json: (x, init) => Response.json(x, init) },
    },
    "@/lib/request-json": { readJson },
    "@/lib/registrations/model": model,
    "@/lib/registrations/document": {
      authorizationPdf: async () => new Uint8Array([1, 2, 3]),
    },
    "@/lib/registrations/server": {
      registrationAdmin: () => client,
      requireRegistrationStaff: async () => {
        if (!staff) throw new Response("Denied", { status: 403 });
        return client;
      },
    },
  });
  return { api, rows, stored };
}
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key-not-real";
const payload = {
  id: "10000000-0000-4000-8000-000000000009",
  slug: "test",
  version: 1,
  responses: base,
};
const post = (p) =>
  new Request("https://local/api/registrations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(p),
  });
test("Submission archives text and PDF once, and retries are idempotent", async () => {
  const { api, rows, stored } = intake();
  assert.equal((await api.POST(post(payload))).status, 200);
  assert.equal(rows.get(payload.id).status, "received");
  assert.equal(stored.size, 2);
  assert.equal((await api.POST(post(payload))).status, 200);
  assert.equal(rows.size, 1);
  assert.equal(stored.size, 2);
});
test("Minors cannot submit without signed attachment and malformed files are rejected", async () => {
  const { api, rows } = intake();
  assert.equal(
    (
      await api.POST(
        post({
          ...payload,
          responses: {
            ...base,
            birthDate: "2015-01-01",
            guardianName: "Test",
            guardianCapacity: "Genitore",
            guardianDeclaration: true,
          },
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await api.POST(
        post({
          ...payload,
          attachment: "data:application/pdf;base64,QUFBQUFBQUFBQUFB",
        }),
      )
    ).status,
    400,
  );
  assert.equal(rows.size, 0);
});
test("Upload failure rolls back pending enrollment and never returns success", async () => {
  const { api, rows, stored } = intake({ uploadFails: true });
  assert.equal((await api.POST(post(payload))).status, 500);
  assert.equal(rows.size, 0);
  assert.equal(stored.size, 0);
});
test("Archive and verification updates reject nonstaff access", async () => {
  const { api } = intake();
  assert.equal(
    (await api.GET(new Request("https://local/api/registrations"))).status,
    403,
  );
  assert.equal(
    (
      await api.PATCH(
        new Request("https://local/api/registrations", {
          method: "PATCH",
          body: "{}",
        }),
      )
    ).status,
    403,
  );
});

test("Staff downloads a named ZIP folder and arbitrary file names are rejected", async () => {
  const {api} = intake({staff:true});
  assert.equal((await api.POST(post(payload))).status,200);
  const zip = await api.GET(new Request(`https://local/api/registrations?id=${payload.id}&zip=1`));
  assert.equal(zip.status,200);
  const files=require('fflate').unzipSync(new Uint8Array(await zip.arrayBuffer()));
  assert.ok(Object.keys(files).some(name=>name.startsWith('Alex_Prova_')&&name.endsWith('/risposte.txt')));
  assert.ok(Object.keys(files).some(name=>name.endsWith('/autorizzazione-generata.pdf')));
  assert.equal((await api.GET(new Request(`https://local/api/registrations?id=${payload.id}&file=../../private.pdf`))).status,404);
});
