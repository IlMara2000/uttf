import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireRegistrationStaff } from '@/lib/registrations/server';
import { RETENTION_TRACE_BUCKET } from '@/lib/retention-trace';
import { FILES_AUDIT_TRACE_KEY } from '@/lib/files-audit';

/**
 * Ultimo esito della retention e del controllo allegati per l'area staff.
 *
 * Legge `latest.json` e `files-audit.json` dal bucket privato con la service
 * role e restituisce solo i campi che servono al banner: così un guasto
 * notturno o un allegato orfano si vedono anche senza Sentry o webhook.
 * `latest.json` contiene solo i giri dello scheduler, quindi un test manuale
 * non può mascherare un giro mancato. L'endpoint è riservato allo staff e non è
 * mai cacheabile.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Il cron di retention gira una volta al giorno alle 03:00 UTC. Se l'ultima
// traccia è più vecchia di 36 ore, il giro automatico probabilmente non è
// partito: va segnalato anche senza un esito esplicito di errore.
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

// Il controllo allegati gira una volta a settimana: 8 giorni lasciano margine a
// un'esecuzione saltata o in ritardo.
const FILES_STALE_AFTER_MS = 8 * 24 * 60 * 60 * 1000;

const headers = { 'Cache-Control': 'private, no-store' };

type Trace = {
  outcome?: unknown;
  executedAt?: unknown;
  mode?: unknown;
  errors?: unknown;
  pruned?: unknown;
  alerts?: unknown;
  deferred?: unknown;
};

type FilesTrace = {
  executedAt?: unknown;
  orphans?: unknown;
  missing?: unknown;
  unreadable?: unknown;
  error?: unknown;
};

function strings(value: unknown, max: number) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string').slice(0, max)
    : [];
}

function countOf(value: unknown) {
  const count = (value as { count?: unknown } | null)?.count;
  return typeof count === 'number' ? count : 0;
}

/** Esempi di percorso: gli orfani sono stringhe, i mancanti oggetti `{ path }`. */
function samplePaths(value: unknown) {
  const sample = (value as { sample?: unknown } | null)?.sample;
  if (!Array.isArray(sample)) return [];
  return sample
    .map((entry) =>
      typeof entry === 'string' ? entry : (entry as { path?: unknown } | null)?.path,
    )
    .filter((path): path is string => typeof path === 'string' && path.length > 0);
}

function isStale(executedAt: string | null, limitMs: number) {
  if (!executedAt) return true;
  const timestamp = Date.parse(executedAt);
  if (Number.isNaN(timestamp)) return true;
  return Date.now() - timestamp > limitMs;
}

async function readFilesAudit(client: SupabaseClient) {
  const { data, error } = await client.storage
    .from(RETENTION_TRACE_BUCKET)
    .download(FILES_AUDIT_TRACE_KEY);
  if (error || !data) return null;

  let trace: FilesTrace;
  try {
    trace = JSON.parse(await data.text()) as FilesTrace;
  } catch {
    return null;
  }

  const executedAt = typeof trace.executedAt === 'string' ? trace.executedAt : null;
  return {
    executedAt,
    orphans: countOf(trace.orphans),
    missing: countOf(trace.missing),
    unreadable: countOf(trace.unreadable),
    samples: [...samplePaths(trace.orphans), ...samplePaths(trace.missing)].slice(0, 3),
    error: typeof trace.error === 'string' ? trace.error : null,
    stale: isStale(executedAt, FILES_STALE_AFTER_MS),
  };
}

export async function GET(request: Request) {
  let client;
  try {
    client = await requireRegistrationStaff(request);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'Accesso non verificabile.' }, { status: 503, headers });
  }

  const latest = await client.storage.from(RETENTION_TRACE_BUCKET).download('latest.json');
  let trace: Trace | null = null;
  if (!latest.error && latest.data) {
    try {
      trace = JSON.parse(await latest.data.text()) as Trace;
    } catch {
      return NextResponse.json({ error: 'Traccia illeggibile.' }, { status: 500, headers });
    }
  }

  // Un esito diverso da `ok`/`error` (traccia vecchia o corrotta) vale come
  // "non lo so": meglio nessun banner di un falso allarme.
  const outcome =
    trace && (trace.outcome === 'ok' || trace.outcome === 'error') ? trace.outcome : null;
  const executedAt =
    trace && typeof trace.executedAt === 'string' ? trace.executedAt : null;

  return NextResponse.json(
    {
      outcome,
      executedAt,
      mode: trace && typeof trace.mode === 'string' ? trace.mode : null,
      errors: strings(trace?.errors, 10),
      pruned: trace && typeof trace.pruned === 'number' ? trace.pruned : 0,
      alerts: strings(trace?.alerts, 5),
      // Il giro si è fermato al limite di lavoro: non è un guasto, ma senza
      // questo campo uno smaltimento lungo sembrerebbe un giro completo.
      deferred: trace?.deferred === true,
      stale: isStale(executedAt, STALE_AFTER_MS),
      files: await readFilesAudit(client),
    },
    { headers },
  );
}
