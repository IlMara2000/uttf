import * as Sentry from '@sentry/nextjs';
import { dataCollectionOptions, scrubBreadcrumb, scrubEvent } from '@/lib/sentry-options';

/**
 * Sentry per il runtime Edge: qui girano `src/proxy.ts` e le eventuali route
 * con `runtime = 'edge'`. Stessa configurazione minima del server.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  dataCollection: dataCollectionOptions,
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
});
