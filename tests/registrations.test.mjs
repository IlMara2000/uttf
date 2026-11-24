import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  checkSeedTarget,
  DEFAULT_EMAIL,
  parseArgs,
} from "../scripts/seed-args.mjs";
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
test("Requests waiting for review are flagged only after 12 months", () => {
  const { waitingTooLong, waitingCutoff } = load("src/lib/registrations/waiting.ts");
  const now = new Date("2026-06-15T12:00:00.000Z");
  const daysAgo = (days) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(waitingTooLong(daysAgo(364), now), false);
  assert.equal(waitingTooLong(daysAgo(365), now), false);
  assert.equal(waitingTooLong(daysAgo(366), now), true);
  assert.equal(waitingTooLong("non-una-data", now), false);
  assert.equal(waitingCutoff(now), daysAgo(365));
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
// Valori dentro or(): le virgolette proteggono virgole e parentesi, come in
// PostgREST.
const unquote = (value) =>
  value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1).replace(/\\([\\"])/g, "$1")
    : value;
const splitTopLevel = (text) => {
  const parts = [];
  let quoted = false,
    depth = 0,
    current = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === "\\") {
        current += ch + (text[++i] ?? "");
        continue;
      }
      if (ch === '"') quoted = false;
      current += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
};
const orPredicate = (text) => {
  const filter = text.trim();
  const group = /^(and|or)\((.*)\)$/s.exec(filter);
  if (group) {
    const items = splitTopLevel(group[2]).map(orPredicate);
    return group[1] === "and"
      ? (row) => items.every((item) => item(row))
      : (row) => items.some((item) => item(row));
  }
  const parsed = /^([A-Za-z0-9_]+)\.([a-z]+)\.(.*)$/s.exec(filter);
  if (!parsed) throw new Error(`filtro or non previsto nei test: ${filter}`);
  const [, column, op, raw] = parsed;
  const value = unquote(raw);
  if (op === "ilike") {
    const needle = value.replace(/%/g, "").toLowerCase();
    return (row) =>
      String(row[column] ?? "").toLowerCase().includes(needle);
  }
  if (op === "eq") return (row) => String(row[column] ?? "") === value;
  if (op === "neq") return (row) => String(row[column] ?? "") !== value;
  if (op === "gte") return (row) => row[column] >= value;
  if (op === "lte") return (row) => row[column] <= value;
  if (op === "lt") return (row) => row[column] < value;
  throw new Error(`operatore or non previsto nei test: ${op}`);
};
function intake({ uploadFails = false, staff = false, list = [], countError = false } = {}) {
  const rows = new Map(),
    stored = new Map(),
    archive = structuredClone(list);
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
      let head = false,
        countMode = false,
        sliceFrom,
        sliceTo;
      const filters = [];
      const chain = {
        select(_columns, options = {}) {
          head = options.head === true;
          countMode = options.count === "exact";
          return this;
        },
        eq(k, v) {
          if (k === "id") identifier = v;
          filters.push((row) => row[k] === v);
          return this;
        },
        neq(k, v) {
          filters.push((row) => row[k] !== v);
          return this;
        },
        in(k, values) {
          filters.push((row) => values.includes(row[k]));
          return this;
        },
        lt(k, v) {
          filters.push((row) => row[k] < v);
          return this;
        },
        gte(k, v) {
          filters.push((row) => row[k] >= v);
          return this;
        },
        lte(k, v) {
          filters.push((row) => row[k] <= v);
          return this;
        },
        or(expression) {
          const items = splitTopLevel(expression).map(orPredicate);
          filters.push((row) => items.some((item) => item(row)));
          return this;
        },
        ilike(k, pattern) {
          const needle = String(pattern).replace(/%/g, "").toLowerCase();
          filters.push((row) => String(row[k] ?? "").toLowerCase().includes(needle));
          return this;
        },
        order() {
          return this;
        },
        range(from, to) {
          sliceFrom = from;
          sliceTo = to;
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
          if (!identifier) {
            const matched = [...rows.values()].filter((row) =>
              filters.every((filter) => filter(row)),
            );
            for (const row of matched) Object.assign(row, values);
            return { data: matched.map((row) => ({ id: row.id })), error: null };
          }
          rows.set(identifier, { ...rows.get(identifier), ...values });
          return { data: rows.get(identifier), error: null };
        }
        if (countMode && head) {
          if (countError) return { data: null, count: null, error: new Error("count failed") };
          const matched = archive.filter((row) => filters.every((filter) => filter(row)));
          return { data: null, count: matched.length, error: null };
        }
        if (identifier) return { data: rows.get(identifier) || null, error: null };
        const matched = archive.filter((row) => filters.every((filter) => filter(row)));
        return {
          data: sliceTo === undefined ? matched : matched.slice(sliceFrom, sliceTo + 1),
          count: matched.length,
          error: null,
        };
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
    "@/lib/registrations/waiting": load("src/lib/registrations/waiting.ts"),
    "@/lib/registrations/document": {
      authorizationPdf: async () => new Uint8Array([1, 2, 3]),
    },
    "@/lib/registrations/font": {
      // Il font arriva da public/fonts via fetch: qui il PDF e' gia' finto.
      notoSansBytes: async () => new Uint8Array([0, 1, 2, 3]),
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
test("Staff closes a request as declined and can reopen it, unknown statuses are rejected", async () => {
  const { api, rows } = intake({ staff: true });
  assert.equal((await api.POST(post(payload))).status, 200);
  const patch = (status) =>
    api.PATCH(
      new Request("https://local/api/registrations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: payload.id, status }),
      }),
    );
  assert.equal((await patch("declined")).status, 200);
  assert.equal(rows.get(payload.id).status, "declined");
  assert.equal((await patch("received")).status, 200);
  assert.equal(rows.get(payload.id).status, "received");
  assert.equal((await patch("archived")).status, 400);
  assert.equal(rows.get(payload.id).status, "received");
});
const bulkId = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const bulkPatch = (api, body) =>
  api.PATCH(
    new Request("https://local/api/registrations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
test("Bulk close updates only the selected requests and reports the count", async () => {
  const { api, rows } = intake({ staff: true });
  for (const n of [1, 2, 3]) rows.set(bulkId(n), { id: bulkId(n), status: "received" });
  rows.set(bulkId(4), { id: bulkId(4), status: "pending" });

  const response = await bulkPatch(api, {
    ids: [bulkId(1), bulkId(2), bulkId(4)],
    status: "declined",
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, updated: 2 });
  assert.equal(rows.get(bulkId(1)).status, "declined");
  assert.equal(rows.get(bulkId(2)).status, "declined");
  assert.equal(rows.get(bulkId(3)).status, "received");
  assert.equal(rows.get(bulkId(4)).status, "pending");

  const duplicate = await bulkPatch(api, {
    ids: [bulkId(3), bulkId(3)],
    status: "reviewed",
  });
  assert.deepEqual(await duplicate.json(), { success: true, updated: 1 });
  assert.equal(rows.get(bulkId(3)).status, "reviewed");
});
test("Bulk close rejects empty, oversized and invalid selections", async () => {
  const { api, rows } = intake({ staff: true });
  rows.set(bulkId(1), { id: bulkId(1), status: "received" });
  const oversized = Array.from({ length: 101 }, (_, i) => bulkId(i));

  assert.equal(
    (await bulkPatch(api, { ids: [], status: "reviewed" })).status,
    400,
  );
  assert.equal(
    (await bulkPatch(api, { ids: oversized, status: "reviewed" })).status,
    400,
  );
  assert.equal(
    (await bulkPatch(api, { ids: ["non-un-uuid"], status: "reviewed" })).status,
    400,
  );
  assert.equal(
    (await bulkPatch(api, { ids: [bulkId(1)], status: "archived" })).status,
    400,
  );
  assert.equal(rows.get(bulkId(1)).status, "received");
});
test("waiting=1 narrows the archive to requests waiting over 12 months", async () => {
  const daysAgo = (days) =>
    new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const list = [
    { id: "r-old", created_at: daysAgo(400), activity_title: "Test", participant_name: "Uno", status: "received", lab_slug: "test" },
    { id: "r-declined", created_at: daysAgo(400), activity_title: "Test", participant_name: "Due", status: "declined", lab_slug: "test" },
    { id: "r-new", created_at: daysAgo(10), activity_title: "Test", participant_name: "Tre", status: "received", lab_slug: "test" },
    { id: "r-reviewed", created_at: daysAgo(400), activity_title: "Test", participant_name: "Quattro", status: "reviewed", lab_slug: "test" },
  ];
  const { api } = intake({ staff: true, list });

  const waiting = await (
    await api.GET(new Request("https://local/api/registrations?waiting=1"))
  ).json();
  assert.deepEqual(waiting.registrations.map((row) => row.id), ["r-old"]);
  assert.equal(waiting.registrations[0].stale, true);
  assert.equal(waiting.total, 1);
  assert.equal(waiting.waitingTooLong, 1);

  const all = await (
    await api.GET(new Request("https://local/api/registrations"))
  ).json();
  assert.equal(all.registrations.length, 4);
  assert.equal(all.total, 4);
  assert.equal(all.waitingTooLong, 1);
  assert.deepEqual(
    all.registrations.filter((row) => row.stale).map((row) => row.id),
    ["r-old"],
  );
});
test("status narrows the archive server-side and rejects unknown states", async () => {
  const list = [
    { id: "r-old", created_at: "2025-01-01T00:00:00.000Z", activity_title: "Test", participant_name: "Uno", status: "received", lab_slug: "test" },
    { id: "r-declined", created_at: "2025-01-01T00:00:00.000Z", activity_title: "Test", participant_name: "Due", status: "declined", lab_slug: "test" },
    { id: "r-reviewed", created_at: "2025-01-01T00:00:00.000Z", activity_title: "Test", participant_name: "Tre", status: "reviewed", lab_slug: "test" },
  ];
  const { api } = intake({ staff: true, list });

  const declined = await (
    await api.GET(new Request("https://local/api/registrations?status=declined"))
  ).json();
  assert.deepEqual(declined.registrations.map((row) => row.id), ["r-declined"]);
  assert.equal(declined.total, 1);

  const reviewed = await (
    await api.GET(new Request("https://local/api/registrations?status=reviewed"))
  ).json();
  assert.deepEqual(reviewed.registrations.map((row) => row.id), ["r-reviewed"]);

  // Lo stato sconosciuto è un errore, non un filtro ignorato.
  assert.equal(
    (await api.GET(new Request("https://local/api/registrations?status=archived")))
      .status,
    400,
  );

  // Filtro per stato e «solo da chiudere» si sommano.
  const combined = await (
    await api.GET(
      new Request("https://local/api/registrations?status=received&waiting=1"),
    )
  ).json();
  assert.deepEqual(combined.registrations.map((row) => row.id), ["r-old"]);
});

test("search accepts the short folder reference as well as the participant name", async () => {
  const rows = [
    { id: "7e570000-0000-4000-8000-000000000001", created_at: "2026-01-01T00:00:00.000Z", activity_title: "Test", participant_name: "Uno", status: "received", lab_slug: "test" },
    { id: "7e570000-0000-4000-8000-000000000002", created_at: "2026-01-01T00:00:00.000Z", activity_title: "Test", participant_name: "Due", status: "reviewed", lab_slug: "test" },
    { id: "9f3a1000-0000-4000-8000-000000000003", created_at: "2026-01-01T00:00:00.000Z", activity_title: "Test", participant_name: "Tre", status: "declined", lab_slug: "test" },
    // Nome di persona composto da soli caratteri esadecimali: non deve essere
    // scambiato per un riferimento.
    { id: "0d0c0a00-0000-4000-8000-000000000004", created_at: "2026-01-01T00:00:00.000Z", activity_title: "Test", participant_name: "Decade", status: "received", lab_slug: "test" },
  ];
  const { api } = intake({ staff: true, list: rows });
  const ids = async (query) =>
    (
      await (
        await api.GET(new Request(`https://local/api/registrations?${query}`))
      ).json()
    ).registrations.map((row) => row.id);

  // Riferimento breve come lo mostra l'archivio (8 caratteri), anche maiuscolo.
  assert.deepEqual(await ids("search=7e570000"), [
    "7e570000-0000-4000-8000-000000000001",
    "7e570000-0000-4000-8000-000000000002",
  ]);
  assert.deepEqual((await ids("search=7E570000")).length, 2);
  // Prefisso più corto: il resto è riempito con zeri.
  assert.deepEqual((await ids("search=7e5700")).length, 2);
  // Il nome continua a funzionare.
  assert.deepEqual(await ids("search=Tre"), [
    "9f3a1000-0000-4000-8000-000000000003",
  ]);
  // Anche quando il nome sembra un riferimento (6-8 caratteri esadecimali).
  assert.deepEqual(await ids("search=decade"), [
    "0d0c0a00-0000-4000-8000-000000000004",
  ]);
  // Spazi iniziali e finali ignorati in entrambi i rami.
  assert.deepEqual(await ids(`search=${encodeURIComponent("  Tre  ")}`), [
    "9f3a1000-0000-4000-8000-000000000003",
  ]);
  assert.equal(
    (await ids(`search=${encodeURIComponent("  7e5700  ")}`)).length,
    2,
  );
  // Riferimento inesistente: elenco vuoto, non errore.
  assert.deepEqual(await ids("search=ffffffff"), []);
});

test("a name that looks like a reference is still found, ignoring surrounding spaces", async () => {
  const list = [
    { id: "0d0c0a00-0000-4000-8000-000000000001", created_at: "2026-01-01T00:00:00.000Z", activity_title: "Test", participant_name: "Decade", status: "received", lab_slug: "test" },
    { id: "11111111-0000-4000-8000-000000000002", created_at: "2026-01-01T00:00:00.000Z", activity_title: "Test", participant_name: "Ada", status: "received", lab_slug: "test" },
  ];
  const { api } = intake({ staff: true, list });
  const find = async (search) =>
    (
      await (
        await api.GET(
          new Request(
            `https://local/api/registrations?search=${encodeURIComponent(search)}`,
          ),
        )
      ).json()
    ).registrations.map((row) => row.id);

  // «Decade» sono solo caratteri esadecimali: prima veniva cercato come id.
  assert.deepEqual(await find("Decade"), [
    "0d0c0a00-0000-4000-8000-000000000001",
  ]);
  assert.deepEqual(await find("  decade  "), [
    "0d0c0a00-0000-4000-8000-000000000001",
  ]);
  assert.deepEqual(await find("  Ada "), [
    "11111111-0000-4000-8000-000000000002",
  ]);
});

test("Archive fails instead of reporting zero when the waiting count errors", async () => {
  const { api } = intake({
    staff: true,
    countError: true,
    list: [
      {
        id: "r-old",
        created_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        activity_title: "Test",
        participant_name: "Uno",
        status: "received",
        lab_slug: "test",
      },
    ],
  });
  const response = await api.GET(new Request("https://local/api/registrations"));
  assert.equal(response.status, 500);
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

test("Staff downloads a single attachment with download headers and its own bytes", async () => {
  const { api, stored } = intake({ staff: true });
  assert.equal((await api.POST(post(payload))).status, 200);
  const res = await api.GET(
    new Request(`https://local/api/registrations?id=${payload.id}&file=risposte.txt`),
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/octet-stream");
  assert.equal(
    res.headers.get("content-disposition"),
    'attachment; filename="risposte.txt"',
  );
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("cache-control"), "private, no-store");
  const body = new Uint8Array(await res.arrayBuffer());
  const storedBytes = new Uint8Array(
    await new Blob([stored.get(`${payload.id}/risposte.txt`)]).arrayBuffer(),
  );
  assert.deepEqual(body, storedBytes);
  assert.match(new TextDecoder().decode(body), /Nome: Alex\n\nCognome: Prova/);
});

test("Staff downloads a named ZIP folder and arbitrary file names are rejected", async () => {
  const { api, stored } = intake({ staff: true });
  assert.equal((await api.POST(post(payload))).status, 200);
  const zip = await api.GET(
    new Request(`https://local/api/registrations?id=${payload.id}&zip=1`),
  );
  assert.equal(zip.status, 200);
  assert.equal(zip.headers.get("content-type"), "application/zip");
  assert.equal(
    zip.headers.get("content-disposition"),
    'attachment; filename="Alex_Prova_10000000.zip"',
  );
  assert.equal(zip.headers.get("cache-control"), "private, no-store");
  const files = require("fflate").unzipSync(
    new Uint8Array(await zip.arrayBuffer()),
  );
  const folder = `Alex_Prova_${payload.id.slice(0, 8)}`;
  assert.deepEqual(Object.keys(files).sort(), [
    `${folder}/LEGGIMI.txt`,
    `${folder}/autorizzazione-generata.pdf`,
    `${folder}/risposte.txt`,
  ]);
  assert.match(
    new TextDecoder().decode(files[`${folder}/risposte.txt`]),
    /Nome: Alex\n\nCognome: Prova/,
  );
  assert.deepEqual(
    Array.from(files[`${folder}/autorizzazione-generata.pdf`]),
    Array.from(stored.get(`${payload.id}/autorizzazione-generata.pdf`)),
  );
  assert.match(
    new TextDecoder().decode(files[`${folder}/LEGGIMI.txt`]),
    /Documenti riservati allo staff autorizzato/,
  );
  for (const name of ["../../private.pdf", "assente.txt"]) {
    assert.equal(
      (
        await api.GET(
          new Request(
            `https://local/api/registrations?id=${payload.id}&file=${encodeURIComponent(name)}`,
          ),
        )
      ).status,
      404,
      name,
    );
  }
});

test("Seed flags accept --flag=value and --flag value", () => {
  const attached = parseArgs([
    "--production",
    "--clean",
    "--email=prova.archivio@example.test",
    "--password=una-password-di-prova",
  ]);
  assert.deepEqual(attached.problems, []);
  assert.equal(attached.values.email, "prova.archivio@example.test");
  assert.equal(attached.values.password, "una-password-di-prova");
  assert.equal(attached.values.production, true);
  assert.equal(attached.values.clean, true);

  const spaced = parseArgs(["--email", "Prova.Archivio@Example.Test"]);
  assert.deepEqual(spaced.problems, []);
  assert.equal(spaced.values.email, "prova.archivio@example.test");

  const absent = parseArgs([]);
  assert.deepEqual(absent.problems, []);
  assert.equal(absent.values.email, undefined);
  assert.equal(DEFAULT_EMAIL, "staff.test@example.test");
});

test("Seed flags without a value fail instead of falling back to the default email", () => {
  for (const argv of [["--email"], ["--email", "--clean"], ["--email="]]) {
    const parsed = parseArgs(argv);
    assert.equal(parsed.values.email, undefined, argv.join(" "));
    assert.equal(parsed.problems.length, 1, argv.join(" "));
    assert.match(parsed.problems[0], /--email/);
  }
  assert.match(parseArgs(["--password"]).problems[0], /--password/);
});

test("Unknown, repeated and malformed seed flags are rejected", () => {
  const rejected = [
    ["--emial=prova.archivio@example.test"],
    ["--clean=1"],
    ["--email=non-un-indirizzo"],
    ["--email=a@b.test", "--email=c@d.test"],
    ["posizionale"],
  ];
  for (const argv of rejected) {
    const parsed = parseArgs(argv);
    assert.equal(parsed.problems.length, 1, argv.join(" "));
  }
  assert.match(
    parseArgs(["--emial=prova.archivio@example.test"]).problems[0],
    /flag sconosciuto «--emial»/,
  );
});

test("Seed writes to a remote host only with --production, never blocks localhost", () => {
  const remote = checkSeedTarget("https://prova.supabase.co", parseArgs([]).values);
  assert.equal(remote.host, "prova.supabase.co");
  assert.equal(remote.local, false);
  assert.match(remote.refusal, /Target remoto: prova\.supabase\.co/);
  assert.match(remote.refusal, /--production/);

  const confirmed = checkSeedTarget(
    "https://prova.supabase.co",
    parseArgs(["--production"]).values,
  );
  assert.equal(confirmed.local, false);
  assert.equal(confirmed.refusal, null);

  for (const url of [
    "http://localhost:54321",
    "http://127.0.0.1:54321",
    "http://[::1]:54321",
    "http://0.0.0.0:54321",
  ]) {
    const local = checkSeedTarget(url, parseArgs([]).values);
    assert.equal(local.local, true, url);
    assert.equal(local.refusal, null, url);
  }

  assert.match(
    checkSeedTarget("non-un-url", parseArgs(["--production"]).values).refusal,
    /non è un URL valido/,
  );
});
