import { NextResponse } from 'next/server';
import { requireRegistrationStaff } from '@/lib/registrations/server';
import { RETENTION_TRACE_BUCKET } from '@/lib/retention-trace';

/**
 * Ultimo esito della retention per l'area staff.
 *
 * Legge `latest.json` dal bucket privato con la service role e restituisce
 * solo i campi che servono al banner: così un guasto notturno si vede anche
 * senza Sentry o webhook configurati. L'endpoint è riservato allo staff e non
 * è mai cacheabile.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

type Trace = {
  outcome?: unknown;
  executedAt?: unknown;
  mode?: unknown;
  errors?: unknown;
  pruned?: unknown;
  alerts?: unknown;
};

function strings(value: unknown, max: number) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string').slice(0, max)
    : [];
}

export async function GET(request: Request) {
  let client;
  try {
    client = await requireRegistrationStaff(request);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'Accesso non verificabile.' }, { status: 503, headers });
  }

  const { data, error } = await client.storage
    .from(RETENTION_TRACE_BUCKET)
    .download('latest.json');
  if (error || !data) return NextResponse.json({ outcome: null }, { headers });

  let trace: Trace;
  try {
    trace = JSON.parse(await data.text()) as Trace;
  } catch {
    return NextResponse.json({ error: 'Traccia illeggibile.' }, { status: 500, headers });
  }

  // Un esito diverso da `ok`/`error` (traccia vecchia o corrotta) vale come
  // "non lo so": meglio nessun banner di un falso allarme.
  const outcome =
    trace.outcome === 'ok' || trace.outcome === 'error' ? trace.outcome : null;

  return NextResponse.json(
    {
      outcome,
      executedAt: typeof trace.executedAt === 'string' ? trace.executedAt : null,
      mode: typeof trace.mode === 'string' ? trace.mode : null,
      errors: strings(trace.errors, 10),
      pruned: typeof trace.pruned === 'number' ? trace.pruned : 0,
      alerts: strings(trace.alerts, 5),
    },
    { headers },
  );
}
