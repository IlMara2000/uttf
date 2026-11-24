import type { SupabaseClient } from '@supabase/supabase-js';
import type { RetentionReport } from './retention';

/**
 * Traccia durevole delle esecuzioni della retention.
 *
 * I log runtime di Vercel durano circa un'ora sul piano Hobby: quando qualcuno
 * guarda, la riga del job notturno è già sparita. Per questo ogni esecuzione
 * lascia un oggetto immutabile `runs/<timestamp>.json` nel bucket privato
 * `retention-runs`, più un `latest.json` sovrascritto che mostra l'ultimo esito
 * senza dover elencare la cartella. Il bucket è privato e si crea da solo al
 * primo giro: nessuna migrazione SQL da ricordare.
 */
export const RETENTION_TRACE_BUCKET = 'retention-runs';

export type RetentionTrace = RetentionReport & {
  /** `error` se una qualsiasi fase ha segnalato un problema (o la traccia non è stata scritta). */
  outcome: 'ok' | 'error';
  source: string;
  recordedAt: string;
};

export type RetentionTraceResult = {
  /** Percorso dell'oggetto scritto, `null` se la scrittura non è riuscita. */
  path: string | null;
  error: string | null;
};

/** `2026-11-25T04:12:33.120Z` → `2026-11-25T04-12-33-120Z`: ordinabile e senza `:` nei nomi. */
function traceName(executedAt: string) {
  return executedAt.replace(/[:.]/g, '-');
}

export async function saveRetentionTrace(
  client: SupabaseClient,
  report: RetentionReport,
  options: { source?: string; recordedAt?: Date } = {},
): Promise<RetentionTraceResult> {
  const trace: RetentionTrace = {
    ...report,
    outcome: report.errors.length > 0 ? 'error' : 'ok',
    source: options.source ?? 'cron',
    recordedAt: (options.recordedAt ?? new Date()).toISOString(),
  };

  const created = await client.storage.createBucket(RETENTION_TRACE_BUCKET, {
    public: false,
  });
  // Il bucket esiste già dalla prima esecuzione: non è un errore.
  if (created.error && !/exist/i.test(created.error.message)) {
    return {
      path: null,
      error: `bucket ${RETENTION_TRACE_BUCKET}: ${created.error.message}`,
    };
  }

  const bucket = client.storage.from(RETENTION_TRACE_BUCKET);
  const body = JSON.stringify(trace, null, 2);
  const path = `runs/${traceName(trace.executedAt)}.json`;

  const written = await bucket.upload(path, body, {
    contentType: 'application/json',
    upsert: false,
  });
  if (written.error) return { path: null, error: `trace: ${written.error.message}` };

  const latest = await bucket.upload('latest.json', body, {
    contentType: 'application/json',
    upsert: true,
  });
  if (latest.error) return { path, error: `latest: ${latest.error.message}` };

  return { path, error: null };
}
