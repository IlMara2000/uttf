import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Confronto di sola lettura tra il bucket degli allegati e l'archivio delle
 * iscrizioni.
 *
 * Due problemi non si vedono dall'archivio: gli oggetti che nessuna riga cita
 * (la retention non li conosce e restano per sempre) e i percorsi citati da una
 * riga che nel bucket non esistono più. Lo stesso confronto serve al cron
 * settimanale e allo script `scripts/check-registration-files.mjs`, così una
 * correzione da una parte vale per entrambi.
 */

export const FILES_BUCKET = 'registration-files';

/** Chiave della traccia scritta dal cron e letta dallo stato staff. */
export const FILES_AUDIT_TRACE_KEY = 'files-audit.json';

/** Elementi elencati per tipo nell'esito: il conteggio resta completo. */
export const FILES_AUDIT_SAMPLE = 20;

const LIST_PAGE = 100;
const ROW_PAGE = 1000;

export type FilesAudit = {
  executedAt: string;
  bucketObjects: number;
  registrations: number;
  citedPaths: number;
  orphans: { count: number; sample: string[] };
  missing: { count: number; sample: { path: string; registrations: string[] }[] };
  unreadable: { count: number; sample: { id: string; reason: string }[] };
  error: string | null;
};

type RegistrationRow = { id: string; files?: unknown };

function message(error: unknown) {
  return error instanceof Error ? error.message : 'errore sconosciuto';
}

/** Tutti gli oggetti del bucket: `list` restituisce una cartella per volta. */
async function listObjects(client: SupabaseClient, prefix = ''): Promise<string[]> {
  const bucket = client.storage.from(FILES_BUCKET);
  const objects: string[] = [];
  for (let page = 0; ; page += 1) {
    const { data, error } = await bucket.list(prefix, {
      limit: LIST_PAGE,
      offset: page * LIST_PAGE,
    });
    if (error) throw new Error(`elenco ${prefix || '/'}: ${error.message}`);
    const entries = data ?? [];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Le voci di cartella non hanno id: si scende invece di contarle.
      if (entry.id === null) objects.push(...(await listObjects(client, path)));
      else objects.push(path);
    }
    if (entries.length < LIST_PAGE) return objects;
  }
}

async function listRegistrations(client: SupabaseClient) {
  const rows: RegistrationRow[] = [];
  const unreadable: { id: string; reason: string }[] = [];
  for (let from = 0; ; from += ROW_PAGE) {
    const { data, error } = await client
      .from('activity_registrations')
      .select('id, files')
      .order('id')
      .range(from, from + ROW_PAGE - 1);
    if (error) throw new Error(`activity_registrations: ${error.message}`);
    const page = (data ?? []) as RegistrationRow[];
    for (const row of page) {
      let files = row.files;
      // Il formato atteso è un array di `{ name, path }`. Una stringa JSON si
      // tollera; qualunque altra cosa si segnala invece di sparire in silenzio.
      if (typeof files === 'string') {
        try {
          files = JSON.parse(files);
        } catch {
          unreadable.push({ id: row.id, reason: 'files non è JSON valido' });
          files = [];
        }
      }
      if (files !== null && files !== undefined && !Array.isArray(files)) {
        unreadable.push({ id: row.id, reason: `files è ${typeof files}, non un array` });
        files = [];
      }
      rows.push({ id: row.id, files: files ?? [] });
    }
    if (page.length < ROW_PAGE) return { rows, unreadable };
  }
}

function pathsOf(row: RegistrationRow): string[] {
  return (Array.isArray(row.files) ? row.files : [])
    .map((file) =>
      file && typeof file === 'object' ? (file as { path?: unknown }).path : undefined,
    )
    .filter((path): path is string => typeof path === 'string' && path.length > 0);
}

export async function auditRegistrationFiles(
  client: SupabaseClient,
  options: { now?: Date } = {},
): Promise<FilesAudit> {
  const audit: FilesAudit = {
    executedAt: (options.now ?? new Date()).toISOString(),
    bucketObjects: 0,
    registrations: 0,
    citedPaths: 0,
    orphans: { count: 0, sample: [] },
    missing: { count: 0, sample: [] },
    unreadable: { count: 0, sample: [] },
    error: null,
  };

  let objects: string[];
  let rows: RegistrationRow[];
  let unreadable: { id: string; reason: string }[];
  try {
    objects = await listObjects(client);
    ({ rows, unreadable } = await listRegistrations(client));
  } catch (error) {
    return { ...audit, error: message(error) };
  }

  const cited = new Map<string, string[]>();
  for (const row of rows) {
    for (const path of pathsOf(row)) {
      cited.set(path, [...(cited.get(path) ?? []), row.id]);
    }
  }

  const inBucket = new Set(objects);
  const orphans = objects.filter((path) => !cited.has(path));
  const missing = [...cited]
    .filter(([path]) => !inBucket.has(path))
    .map(([path, registrations]) => ({ path, registrations }));

  return {
    ...audit,
    bucketObjects: objects.length,
    registrations: rows.length,
    citedPaths: cited.size,
    orphans: { count: orphans.length, sample: orphans.slice(0, FILES_AUDIT_SAMPLE) },
    missing: { count: missing.length, sample: missing.slice(0, FILES_AUDIT_SAMPLE) },
    unreadable: { count: unreadable.length, sample: unreadable.slice(0, FILES_AUDIT_SAMPLE) },
  };
}
