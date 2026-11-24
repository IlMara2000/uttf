#!/usr/bin/env node
/**
 * Backfill della durata nei WebM già salvati su Storage.
 *
 * I file registrati prima della patch dello stop non hanno `Duration`
 * nell'header: un player che li legge mostra `Infinity` (ffprobe: `N/A`).
 * Qui si riscrive l'header con `recorded_ms` della sessione, usando la stessa
 * funzione dell'app (`src/lib/recordings/webm.ts`), quindi lo stesso risultato
 * che produce oggi lo stop. Idempotente: rilanciarlo su un file già patchato
 * riscrive lo stesso valore.
 *
 *   node --env-file=.env.local scripts/backfill-recording-duration.mjs --dry-run
 *   node --env-file=.env.local scripts/backfill-recording-duration.mjs
 *   node --env-file=.env.local scripts/backfill-recording-duration.mjs --id <uuid>
 *
 * Richiede Node ≥ 22.18: importa i `.ts` del progetto direttamente, senza
 * passare da un bundler (Node toglie i tipi a runtime).
 */
import { patchWebmDuration } from '../src/lib/recordings/webm.ts';
import { extensionForMime, isUuid } from '../src/lib/recordings/model.ts';

const BUCKET = 'factory-assets';
const PAGE_SIZE = 500;
/** Riga restituita da PostgREST: solo i campi che servono. */
const COLUMNS = 'id,status,recorded_ms,mime_type';

const USAGE = `Uso: node --env-file=.env.local scripts/backfill-recording-duration.mjs [--dry-run] [--id <uuid>]`;

function fail(message) {
  console.error(message);
  console.error(USAGE);
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
let idFilter = null;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--dry-run') continue;
  if (arg === '--help' || arg === '-h') {
    console.log(USAGE);
    process.exit(0);
  }
  if (arg === '--id') {
    const value = args[i + 1];
    // Senza questo controllo un `--id` a fine comando diventerebbe "nessun
    // filtro", cioè patch di tutte le sessioni: l'opposto dell'intenzione.
    if (!value || value.startsWith('--')) fail('--id richiede un uuid.');
    if (!isUuid(value)) fail(`--id non è un uuid: ${value}`);
    idFilter = value;
    i += 1;
    continue;
  }
  fail(`Argomento sconosciuto: ${arg}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  fail('Servono NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local).');
}

const auth = { apikey: key, Authorization: `Bearer ${key}` };

/** Tutte le sessioni, a pagine: PostgREST si ferma a `db-max-rows` e senza offset si perderebbero righe in silenzio. */
async function listRecordings() {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const params = new URLSearchParams({
      select: COLUMNS,
      order: 'created_at.asc',
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (idFilter) params.set('id', `eq.${idFilter}`);

    const response = await fetch(`${url}/rest/v1/meeting_recordings?${params}`, { headers: auth });
    if (!response.ok) throw new Error(`Elenco sessioni non leggibile (HTTP ${response.status}).`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error('Risposta inattesa da PostgREST.');
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function main() {
  const rows = await listRecordings();
  console.log(`sessioni: ${rows.length}${dryRun ? ' (dry run)' : ''}`);

  let patched = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const objectPath = `recordings/${row.id}/audio.${extensionForMime(row.mime_type)}`;
    const recordedMs = Number(row.recorded_ms);
    if (!Number.isFinite(recordedMs) || recordedMs <= 0) {
      console.log(`- ${row.id}: salto, recorded_ms non valido (${row.recorded_ms})`);
      skipped += 1;
      continue;
    }

    const download = await fetch(`${url}/storage/v1/object/${BUCKET}/${objectPath}`, { headers: auth });
    if (!download.ok) {
      console.log(`- ${row.id}: salto, ${objectPath} non presente (HTTP ${download.status})`);
      skipped += 1;
      continue;
    }
    const original = new Uint8Array(await download.arrayBuffer());
    const fixed = patchWebmDuration(original, recordedMs);
    if (!fixed) {
      console.log(`- ${row.id}: non patchabile (non WebM o header inatteso), resta com'è`);
      failed += 1;
      continue;
    }

    if (!dryRun) {
      const upload = await fetch(`${url}/storage/v1/object/${BUCKET}/${objectPath}`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/octet-stream', 'x-upsert': 'true' },
        body: fixed,
      });
      if (!upload.ok) {
        console.log(`- ${row.id}: upload fallito (HTTP ${upload.status})`);
        failed += 1;
        continue;
      }
    }
    console.log(
      `- ${row.id}: ${dryRun ? 'da patchare' : 'patchato'}, ${recordedMs} ms, ${original.byteLength} → ${fixed.byteLength} byte`,
    );
    patched += 1;
  }

  console.log(`totale: ${patched} ${dryRun ? 'da patchare' : 'patchati'}, ${skipped} saltati, ${failed} non patchabili`);
  if (failed > 0) process.exitCode = 2;
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
