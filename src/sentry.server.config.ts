import * as Sentry from '@sentry/nextjs';
import { dataCollectionOptions, scrubBreadcrumb, scrubEvent } from '@/lib/sentry-options';

/**
 * Sentry lato server (runtime Node.js: route API, server components, cron).
 * Stesso DSN del browser perché il progetto Sentry è lo stesso; se manca,
 * il SDK resta spento.
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
