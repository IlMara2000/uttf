import { handleRetention } from '@/lib/retention-endpoint';

/**
 * Cancellazione dei dati scaduti: **l'unico punto che cancella**.
 *
 * La chiama il cron di Vercel (`vercel.json`, 03:00 UTC) con
 * `Authorization: Bearer $CRON_SECRET`. Accetta solo richieste dello scheduler:
 * senza header `x-vercel-cron` risponde 403, e rifiuta `?dry=1` e
 * `?source=manual` rimandando a `/api/maintenance/retention`. Così un trigger
 * manuale non può cancellare per sbaglio: il path di verifica è un altro e non
 * ha effetti.
 *
 * Senza `RETENTION_ENABLED=true` anche questa route si limita ai conteggi
 * (`runRetention` non cancella) e non aggiorna `latest.json`.
 *
 * GET e POST per non dipendere dal metodo dello scheduler. Header di risposta
 * mai cacheabili; ogni esecuzione lascia la traccia in `runs/` e, se ha
 * cancellato, aggiorna `latest.json`.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const handle = (request: Request) => handleRetention(request, 'apply');

export const GET = handle;
export const POST = handle;
