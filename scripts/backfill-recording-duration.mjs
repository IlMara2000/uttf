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
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const BUCKET = 'factory-assets';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Servono NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local).');
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const idFilter = args.includes('--id') ? args[args.indexOf('--id') + 1] : null;

const auth = { apikey: key, Authorization: `Bearer ${key}` };

/** Il patcher è TypeScript: si compila al volo, così una sola copia del codice. */
async function loadPatcher() {
  const dir = await mkdtemp(path.join(tmpdir(), 'uttf-webm-'));
  const outfile = path.join(dir, 'webm.mjs');
  await build({
    entryPoints: [fileURLToPath(new URL('../src/lib/recordings/webm.ts', import.meta.url))],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'silent',
  });
  const mod = await import(pathToFileURL(outfile).href);
  return { patchWebmDuration: mod.patchWebmDuration, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

function extensionForMime(mimeType) {
  const mime = (mimeType ?? '').toLowerCase();
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

const { patchWebmDuration, cleanup } = await loadPatcher();

try {
  const query = idFilter ? `id=eq.${idFilter}` : '';
  const response = await fetch(
    `${url}/rest/v1/meeting_recordings?select=id,status,recorded_ms,mime_type${query ? `&${query}` : ''}&order=created_at.asc`,
    { headers: auth },
  );
  if (!response.ok) throw new Error(`Elenco sessioni non leggibile (HTTP ${response.status}).`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Risposta inattesa da PostgREST.');
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
} finally {
  await cleanup?.();
}
