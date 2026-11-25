import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runRetention } from '@/lib/retention';
import { saveRetentionTrace, pruneRetentionTraces, cappedIds } from '@/lib/retention-trace';
import { alertRetentionFailure } from '@/lib/retention-alert';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Job di conservazione dei dati (privacy §07).
 *
 * Lo chiama il cron di Vercel (`vercel.json`) con
 * `Authorization: Bearer $CRON_SECRET`; lo stesso endpoint, o direttamente
 * `runRetention`, funzionerà da Cron Trigger su Cloudflare dopo la migrazione.
 * Accetta sia GET sia POST per non dipendere dal metodo del scheduler.
 *
 * Senza `RETENTION_ENABLED=true` risponde con i soli conteggi: nessuna
 * cancellazione finché non lo si abilita esplicitamente. `?dry=1` forza lo
 * stesso giro in sola lettura anche a job abilitato, elencando gli ID idonei.
 *
 * La traccia registra l'origine: `cron` se la chiamata porta l'header
 * `x-vercel-cron` dello scheduler, altrimenti `manual`. `?source=manual` marca
 * come manuale anche un `vercel crons run`, che passa dallo stesso scheduler:
 * così `latest.json` non scambia un test per il giro delle 03:00.
 *
 * Ogni esecuzione lascia una traccia durevole nel bucket `retention-runs`
 * (vedi `@/lib/retention-trace`): i log di Vercel durano troppo poco perché il
 * job notturno sia verificabile a posteriori. Se una fase o la scrittura della
 * traccia fallisce la risposta è 500, così l'invocazione risulta fallita anche
 * a chi guarda solo lo stato dei cron.
 */

function tokensMatch(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isAuthorized(request: Request) {
  const expected = process.env.RETENTION_TOKEN ?? process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;
  return tokensMatch(header.slice(prefix.length), expected);
}

/**
 * Origine dell'esecuzione da annotare nella traccia. Lo scheduler di Vercel
 * aggiunge sempre `x-vercel-cron`: senza quell'header la chiamata è manuale.
 * Accettiamo solo `?source=manual`, così nessuno può etichettare come `cron`
 * un'esecuzione che non viene dallo scheduler.
 */
function executionSource(request: Request, url: URL) {
  if (url.searchParams.get('source') === 'manual') return 'manual';
  return request.headers.get('x-vercel-cron') ? 'cron' : 'manual';
}

async function handle(request: Request) {
  if (!process.env.RETENTION_TOKEN && !process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Job non configurato: imposta CRON_SECRET o RETENTION_TOKEN.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Non autorizzato.' },
      { status: 401, headers: { 'Cache-Control': 'no-store', 'WWW-Authenticate': 'Bearer' } },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Configurazione Supabase server mancante.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const url = new URL(request.url);
  const forceDry = url.searchParams.get('dry') === '1';
  const source = executionSource(request, url);
  const report = await runRetention(client, {
    enabled: !forceDry && process.env.RETENTION_ENABLED === 'true',
  });
  const failures = [...report.errors];

  // La potatura precede la scrittura della traccia: così il conteggio delle
  // righe rimosse finisce dentro la traccia stessa, e la traccia di oggi non
  // può essere potata da se stessa.
  const pruned = await pruneRetentionTraces(client);
  if (pruned.error) failures.push(pruned.error);

  // L'avviso parte con l'elenco completo: guasti del giro e della potatura. Un
  // guasto del recapito si aggiunge agli errori, non li sostituisce.
  let alerts: string[] = [];
  if (failures.length > 0) {
    const alert = await alertRetentionFailure(report, failures);
    alerts = alert.sent;
    if (alert.error) failures.push(alert.error);
  }

  const trace = await saveRetentionTrace(
    client,
    { ...report, errors: failures },
    { pruned: pruned.removed, alerts, source },
  );
  if (trace.error) failures.push(trace.error);

  const outcome = failures.length > 0 ? 'error' : 'ok';
  // Stesso tetto della traccia: la risposta non deve portarsi dietro tutte le
  // righe idonee dentro un unico body. I conteggi restano esatti.
  const { ids, truncated } = cappedIds(report.ids);

  console.info(
    `[retention] ${report.mode} ${outcome}: ${JSON.stringify(report.deleted)} potate: ${pruned.removed}${
      failures.length > 0 ? ` errori: ${failures.join('; ')}` : ''
    }${trace.path ? ` traccia: ${trace.path}` : ''}${
      alerts.length > 0 ? ` avvisi: ${alerts.join(',')}` : ''
    }`,
  );

  return NextResponse.json(
    {
      ...report,
      ids,
      idsTruncated: truncated,
      errors: failures,
      outcome,
      source,
      trace: trace.path,
      pruned: pruned.removed,
      alerts,
    },
    {
      status: failures.length > 0 ? 500 : 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export const GET = handle;
export const POST = handle;
