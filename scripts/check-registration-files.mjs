#!/usr/bin/env node
/**
 * Controllo di sola lettura degli allegati dell'archivio iscrizioni.
 *
 * Confronta gli oggetti del bucket `registration-files` con i percorsi citati
 * in `activity_registrations.files` e stampa due elenchi:
 *
 * - orfani: oggetti nel bucket che nessuna riga cita (la retention li
 *   lascerebbe lì per sempre);
 * - mancanti: percorsi citati da una riga ma assenti dal bucket (righe che
 *   puntano a un allegato già sparito).
 *
 * Non scrive e non cancella nulla: solo `list`, `select`. Esce 0 quando non
 * trova niente, 2 quando trova orfani o mancanti, 1 se non riesce a leggere.
 *
 *   node --env-file=.env.local scripts/check-registration-files.mjs
 *   node --env-file=.env.local scripts/check-registration-files.mjs --json
 */
import { createClient } from "@supabase/supabase-js";

const BUCKET = "registration-files";
const PAGE = 1000;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Servono NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local).");
  process.exit(1);
}

const asJson = process.argv.includes("--json");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const bucket = client.storage.from(BUCKET);

/** Tutti gli oggetti del bucket: `list` restituisce una cartella per volta. */
async function listObjects(prefix = "") {
  const objects = [];
  for (let page = 0; ; page += 1) {
    const { data, error } = await bucket.list(prefix, { limit: 100, offset: page * 100 });
    if (error) throw new Error(`elenco ${prefix || "/"}: ${error.message}`);
    const entries = data ?? [];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        objects.push(...(await listObjects(path)));
      } else {
        objects.push({ path, size: entry.metadata?.size ?? null, updated: entry.updated_at ?? null });
      }
    }
    if (entries.length < 100) return objects;
  }
}

/** Tutte le righe dell'archivio, a pagine, con i percorsi dichiarati. */
async function listRegistrations() {
  const rows = [];
  const unreadable = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("activity_registrations")
      .select("id, status, created_at, files")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`activity_registrations: ${error.message}`);
    const page = data ?? [];
    for (const row of page) {
      let files = row.files;
      // Il formato atteso è un array di `{ name, path }`; una stringa JSON è
      // tollerata, qualunque altra cosa viene segnalata invece di sparire.
      if (typeof files === "string") {
        try {
          files = JSON.parse(files);
        } catch {
          unreadable.push({ id: row.id, reason: "files non è JSON valido" });
          files = [];
        }
      }
      if (files !== null && files !== undefined && !Array.isArray(files)) {
        unreadable.push({ id: row.id, reason: `files è ${typeof files}, non un array` });
        files = [];
      }
      const paths = (files ?? [])
        .map((file) => (file && typeof file === "object" ? file.path : undefined))
        .filter((path) => typeof path === "string" && path.length > 0);
      rows.push({ id: row.id, status: row.status, createdAt: row.created_at, paths });
    }
    if (page.length < PAGE) return { rows, unreadable };
  }
}

function formatDate(value) {
  if (!value) return "data sconosciuta";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : date.toISOString().slice(0, 16).replace("T", " ");
}

async function main() {
  const objects = await listObjects();
  const { rows, unreadable } = await listRegistrations();

  const cited = new Map(); // percorso → id delle righe che lo citano
  for (const row of rows) {
    for (const path of row.paths) {
      if (!cited.has(path)) cited.set(path, []);
      cited.get(path).push(row.id);
    }
  }
  const inBucket = new Set(objects.map((object) => object.path));
  const orphans = objects.filter((object) => !cited.has(object.path));
  const missing = [...cited]
    .filter(([path]) => !inBucket.has(path))
    .map(([path, ids]) => ({ path, registrations: ids }));
  const problems = orphans.length + missing.length + unreadable.length;

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          bucket: { objects: objects.length, orphans },
          archive: {
            rows: rows.length,
            byStatus: rows.reduce((acc, row) => {
              acc[row.status] = (acc[row.status] ?? 0) + 1;
              return acc;
            }, {}),
            citedPaths: cited.size,
            rowsWithFiles: rows.filter((row) => row.paths.length > 0).length,
          },
          missing,
          unreadable,
        },
        null,
        2,
      ),
    );
    return problems;
  }

  const statuses = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Bucket ${BUCKET}: ${objects.length} oggetti.`);
  console.log(
    `Archivio: ${rows.length} righe (${Object.entries(statuses)
      .map(([status, total]) => `${status} ${total}`)
      .join(", ") || "nessuna"}), ${cited.size} percorsi citati da ${rows.filter((row) => row.paths.length > 0).length} righe.`,
  );

  console.log(`Orfani: ${orphans.length}.`);
  for (const orphan of orphans) {
    console.log(`  - ${orphan.path} (${orphan.size ?? "?"} byte, aggiornato ${formatDate(orphan.updated)})`);
  }

  console.log(`Mancanti: ${missing.length}.`);
  for (const entry of missing) {
    console.log(`  - ${entry.path} ← ${entry.registrations.join(", ")}`);
  }

  if (unreadable.length > 0) {
    console.log(`Righe non leggibili: ${unreadable.length}.`);
    for (const row of unreadable) console.log(`  - ${row.id}: ${row.reason}`);
  }

  console.log(
    problems === 0
      ? "Nessun allegato orfano o mancante."
      : `${problems} problemi da valutare (nessun dato modificato).`,
  );
  return problems;
}

try {
  const problems = await main();
  process.exitCode = problems > 0 ? 2 : 0;
} catch (error) {
  console.error("Controllo non riuscito:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
