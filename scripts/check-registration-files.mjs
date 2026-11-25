#!/usr/bin/env node
/**
 * Controllo di sola lettura degli allegati dell'archivio iscrizioni.
 *
 * Usa la stessa libreria del cron settimanale (`src/lib/files-audit.ts`), così
 * script e controllo automatico non possono divergere. Elenca:
 *
 * - orfani: oggetti nel bucket `registration-files` che nessuna riga cita;
 * - mancanti: percorsi citati in `activity_registrations.files` ma assenti dal
 *   bucket.
 *
 * Non scrive e non cancella nulla: solo `list`, `select`. Esce 0 quando non
 * trova niente, 2 quando trova orfani o mancanti, 1 se non riesce a leggere.
 *
 *   node --env-file=.env.local scripts/check-registration-files.mjs
 *   node --env-file=.env.local scripts/check-registration-files.mjs --json
 *
 * Richiede Node ≥ 22.18: importa il `.ts` del progetto direttamente, come
 * `scripts/backfill-recording-duration.mjs`.
 */
import { createClient } from "@supabase/supabase-js";
import { auditRegistrationFiles, FILES_BUCKET } from "../src/lib/files-audit.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Servono NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local).",
  );
  process.exit(1);
}

const asJson = process.argv.includes("--json");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function formatDate(value) {
  if (!value) return "data sconosciuta";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : date.toISOString().slice(0, 16).replace("T", " ");
}

try {
  const audit = await auditRegistrationFiles(client);
  if (audit.error) {
    console.error("Controllo non riuscito:", audit.error);
    process.exit(1);
  }

  if (asJson) {
    console.log(JSON.stringify(audit, null, 2));
  } else {
    console.log(`Bucket ${FILES_BUCKET}: ${audit.bucketObjects} oggetti.`);
    console.log(
      `Archivio: ${audit.registrations} righe, ${audit.citedPaths} percorsi citati.`,
    );
    console.log(`Orfani: ${audit.orphans.count}.`);
    for (const path of audit.orphans.sample) console.log(`  - ${path}`);
    if (audit.orphans.count > audit.orphans.sample.length) {
      console.log(`  … e altri ${audit.orphans.count - audit.orphans.sample.length}.`);
    }
    console.log(`Mancanti: ${audit.missing.count}.`);
    for (const entry of audit.missing.sample) {
      console.log(`  - ${entry.path} ← ${entry.registrations.join(", ")}`);
    }
    if (audit.missing.count > audit.missing.sample.length) {
      console.log(`  … e altri ${audit.missing.count - audit.missing.sample.length}.`);
    }
    if (audit.unreadable.count > 0) {
      console.log(`Righe non leggibili: ${audit.unreadable.count}.`);
      for (const row of audit.unreadable.sample) console.log(`  - ${row.id}: ${row.reason}`);
    }
    console.log(`Controllo del ${formatDate(audit.executedAt)}.`);
  }

  const problems = audit.orphans.count + audit.missing.count + audit.unreadable.count;
  process.exitCode = problems > 0 ? 2 : 0;
} catch (error) {
  console.error("Controllo non riuscito:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
