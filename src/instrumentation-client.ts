import * as Sentry from '@sentry/nextjs';
import { dataCollectionOptions, scrubBreadcrumb, scrubEvent } from '@/lib/sentry-options';

/**
 * Sentry lato browser.
 *
 * Il DSN è pubblico per natura (sta nel bundle), quindi vive in una variabile
 * `NEXT_PUBLIC_*`. Se non c'è, Sentry resta spento: l'app funziona lo stesso e
 * in sviluppo non si invia nulla per errore.
 *
 * Session Replay è volutamente assente: registrerebbe schermate dei form di
 * iscrizione e del gestionale.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  dataCollection: dataCollectionOptions,
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
});
