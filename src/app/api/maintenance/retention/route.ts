import { handleRetention } from '@/lib/retention-endpoint';

/**
 * Verifica della conservazione dei dati (privacy §07): **sola lettura**.
 *
 * Conta le righe che sarebbero cancellate e scrive la traccia, ma non cancella
 * mai — nemmeno con `RETENTION_ENABLED=true`. Serve a verificare in produzione
 * query, paginazione e tempi senza poter toccare dati: la si può chiamare dal
 * terminale, da un test o da uno script senza rischi.
 *
 * La cancellazione vera sta in `/api/maintenance/retention/apply`, l'unico path
 * che il cron di Vercel (`vercel.json`) invoca. Prima un unico endpoint faceva
 * entrambe le cose e un trigger manuale sul path sbagliato cancellava.
 *
 * Autenticazione invariata: `Authorization: Bearer` con `CRON_SECRET` o
 * `RETENTION_TOKEN`. `?source=manual` marca come test una chiamata che passa
 * dallo scheduler. Ogni esecuzione lascia una traccia durevole nel bucket
 * `retention-runs` (vedi `@/lib/retention-trace`); `latest.json` lo aggiorna
 * solo il giro che cancella.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const handle = (request: Request) => handleRetention(request, 'dry');

export const GET = handle;
export const POST = handle;
