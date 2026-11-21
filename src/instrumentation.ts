import * as Sentry from '@sentry/nextjs';

/** Carica la configurazione Sentry giusta per il runtime in uso. */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * Next.js passa qui gli errori di render e delle route: senza questo hook gli
 * errori dei server component non arrivano a Sentry.
 */
export const onRequestError = Sentry.captureRequestError;
