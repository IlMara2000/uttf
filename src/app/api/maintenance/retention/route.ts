import { NextResponse } from 'next/server';
import { runRetention } from '@/lib/retention';
import { saveRetentionTrace, pruneRetentionTraces, cappedIds } from '@/lib/retention-trace';
import { alertRetentionFailure } from '@/lib/retention-alert';
import { maintenanceClient } from '@/lib/maintenance-auth';

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
  const setup = maintenanceClient(request);
  if ('error' in setup) return setup.error;
  const client = setup.client;

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
