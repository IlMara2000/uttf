import type { SupabaseClient } from '@supabase/supabase-js';
import type { RetentionReport } from './retention';

/**
 * Traccia durevole delle esecuzioni della retention.
 *
 * I log runtime di Vercel durano circa un'ora sul piano Hobby: quando qualcuno
 * guarda, la riga del job notturno è già sparita. Per questo ogni esecuzione
 * lascia un oggetto immutabile `runs/<timestamp>.json` nel bucket privato
 * `retention-runs`, più un `latest.json` che mostra l'ultimo esito senza dover
 * elencare la cartella. `latest.json` lo aggiorna solo lo scheduler: un test
 * manuale lascia la sua traccia immutabile ma non cancella l'evidenza del giro
 * notturno. Il bucket è privato e si crea da solo al primo giro: nessuna
 * migrazione SQL da ricordare.
 */
export const RETENTION_TRACE_BUCKET = 'retention-runs';

export type RetentionTrace = RetentionReport & {
  /** `error` se una qualsiasi fase ha segnalato un problema (o la traccia non è stata scritta). */
  outcome: 'ok' | 'error';
  /** `cron` se ha invocato lo scheduler, `manual` per un test o una chiamata diretta. */
  source: string;
  recordedAt: string;
  /** Tracce più vecchie di 90 giorni rimosse in questo giro. */
  pruned: number;
  /** Canali che hanno accettato l'avviso di guasto (`webhook`), se ce n'erano. */
  alerts: string[];
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

/** Nome dell'oggetto → timestamp dell'esecuzione, `NaN` se il nome non torna. */
function traceTime(name: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.json$/.exec(name);
  if (!match) return Number.NaN;
  return Date.parse(`${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`);
}

export const RETENTION_TRACE_KEEP_DAYS = 90;

export type RetentionPruneResult = { removed: number; error: string | null };

/**
 * Pota le tracce più vecchie di `keepDays` (90 di default): il job gira ogni
 * notte e senza potatura il bucket crescerebbe all'infinito. Restano intatte le
 * tracce recenti e `latest.json`, che non sta in `runs/`.
 */
export async function pruneRetentionTraces(
  client: SupabaseClient,
  options: { now?: Date; keepDays?: number } = {},
): Promise<RetentionPruneResult> {
  const keepDays = options.keepDays ?? RETENTION_TRACE_KEEP_DAYS;
  const cutoff = (options.now ?? new Date()).getTime() - keepDays * 24 * 60 * 60 * 1000;
  const bucket = client.storage.from(RETENTION_TRACE_BUCKET);

  const stale: string[] = [];
  for (let page = 0; page < 100; page++) {
    const { data, error } = await bucket.list('runs', {
      limit: 100,
      offset: page * 100,
    });
    if (error) return { removed: 0, error: `elenco tracce: ${error.message}` };
    const entries = data ?? [];
    for (const entry of entries) {
      const time = traceTime(entry.name);
      if (Number.isFinite(time) && time < cutoff) stale.push(`runs/${entry.name}`);
    }
    if (entries.length < 100) break;
  }

  let removed = 0;
  for (let index = 0; index < stale.length; index += 100) {
    const group = stale.slice(index, index + 100);
    const { data, error } = await bucket.remove(group);
    if (error) return { removed, error: `potatura tracce: ${error.message}` };
    removed += data?.length ?? 0;
  }

  return { removed, error: null };
}

export async function saveRetentionTrace(
  client: SupabaseClient,
  report: RetentionReport,
  options: {
    source?: string;
    recordedAt?: Date;
    pruned?: number;
    alerts?: string[];
  } = {},
): Promise<RetentionTraceResult> {
  const trace: RetentionTrace = {
    ...report,
    outcome: report.errors.length > 0 ? 'error' : 'ok',
    source: options.source ?? 'manual',
    recordedAt: (options.recordedAt ?? new Date()).toISOString(),
    pruned: options.pruned ?? 0,
    alerts: options.alerts ?? [],
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

  // Solo il giro dello scheduler aggiorna `latest.json`: un `vercel crons run`
  // o un dry-run non deve far sembrare passato il giro delle 03:00 (o
  // viceversa). Ogni esecuzione resta comunque in `runs/<timestamp>.json`.
  if (trace.source !== 'cron') return { path, error: null };

  const latest = await bucket.upload('latest.json', body, {
    contentType: 'application/json',
    upsert: true,
  });
  if (latest.error) return { path, error: `latest: ${latest.error.message}` };

  return { path, error: null };
}
