import { NextResponse } from 'next/server';
import { runRetention } from './retention';
import { cappedIds, pruneRetentionTraces, saveRetentionTrace } from './retention-trace';
import { alertRetentionFailure } from './retention-alert';
import { maintenanceClient } from './maintenance-auth';

/**
 * Corpo comune delle due route di retention.
 *
 * La divisione è deliberata: `/api/maintenance/retention` non cancella mai,
 * `/api/maintenance/retention/apply` è l'unico punto che cancella. Prima un
 * solo endpoint faceva entrambe le cose, quindi bastava un trigger manuale sul
 * path sbagliato (o un `vercel crons run`, che non accetta query string) per
 * eseguire una cancellazione al posto di una verifica. Ora un errore di path
 * produce un dry-run: il danno massimo è una lettura.
 *
 * `/apply` risponde solo allo scheduler (`x-vercel-cron`) e rifiuta
 * esplicitamente `?dry=1` e `?source=manual`: chi vuole contare le righe usa
 * `/retention`, chi vuole cancellare lo fa solo dal cron configurato in
 * `vercel.json`.
 *
 * Una sola implementazione perché le due route devono continuare a scrivere la
 * stessa traccia, potare allo stesso modo e avvisare con lo stesso testo.
 */

export type RetentionMode = 'dry' | 'apply';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Origine dell'esecuzione da annotare nella traccia. Lo scheduler di Vercel
 * aggiunge sempre `x-vercel-cron`: senza quell'header la chiamata è manuale.
 * Accettiamo solo `?source=manual`, così nessuno può etichettare come `cron`
 * un'esecuzione che non viene dallo scheduler.
 */
export function executionSource(request: Request, url: URL) {
  if (url.searchParams.get('source') === 'manual') return 'manual';
  return request.headers.get('x-vercel-cron') ? 'cron' : 'manual';
}

export async function handleRetention(request: Request, mode: RetentionMode) {
  const setup = maintenanceClient(request);
  if ('error' in setup) return setup.error;
  const client = setup.client;

  const url = new URL(request.url);

  if (mode === 'apply') {
    if (!request.headers.get('x-vercel-cron')) {
      return NextResponse.json(
        { error: 'La cancellazione è riservata allo scheduler.' },
        { status: 403, headers: NO_STORE },
      );
    }
    // Un test manuale che finisce su `/apply` non deve cancellare: lo si
    // rimanda al path di sola lettura invece di interpretare la richiesta.
    if (url.searchParams.get('dry') === '1' || url.searchParams.get('source') === 'manual') {
      return NextResponse.json(
        { error: 'Per il dry-run usa /api/maintenance/retention.' },
        { status: 400, headers: NO_STORE },
      );
    }
  }

  const enabled = mode === 'apply' && process.env.RETENTION_ENABLED === 'true';
  const source = mode === 'apply' ? 'cron' : executionSource(request, url);
  const report = await runRetention(client, { enabled });
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
    {
      pruned: pruned.removed,
      alerts,
      source,
      // `latest.json` è l'evidenza del giro che cancella: un dry-run non deve
      // poterlo aggiornare nemmeno se arriva dallo scheduler.
      latest: mode === 'apply' && report.mode === 'delete',
    },
  );
  if (trace.error) failures.push(trace.error);

  const outcome = failures.length > 0 ? 'error' : 'ok';
  // Stesso tetto della traccia: la risposta non deve portarsi dietro tutte le
  // righe idonee dentro un unico body. I conteggi restano esatti.
  const { ids, truncated } = cappedIds(report.ids);

  console.info(
    `[retention] ${mode} ${report.mode} ${outcome}: ${JSON.stringify(report.deleted)} potate: ${pruned.removed}${
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
      headers: NO_STORE,
    },
  );
}
