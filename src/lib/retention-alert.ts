import * as Sentry from '@sentry/nextjs';
import type { RetentionReport } from './retention';

/**
 * Avviso quando un giro di retention fallisce.
 *
 * Due canali, perché nessuno dei due basta da solo:
 * - Sentry: l'SDK è già inizializzato lato server, ma resta spento finché
 *   `NEXT_PUBLIC_SENTRY_DSN` non è configurato;
 * - webhook `RETENTION_ALERT_WEBHOOK_URL` (Slack, Discord o qualsiasi endpoint
 *   JSON): è il canale che avvisa subito, senza aspettare il DSN.
 *
 * Il messaggio contiene sempre esito, conteggi ed errori, così l'avviso è
 * leggibile senza aprire la traccia nel bucket.
 */
export type RetentionAlertResult = {
  /** Canali che hanno accettato l'avviso. Vuoto = nessun canale configurato. */
  sent: string[];
  /** Errore di recapito: non nasconde il guasto, si somma agli errori del giro. */
  error: string | null;
};

export function retentionAlertText(
  report: RetentionReport,
  failures: string[],
): string {
  const counts = Object.entries(report.deleted)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
  return [
    `Retention fallita (${report.mode}) alle ${report.executedAt}`,
    `conteggi: ${counts}`,
    `errori: ${failures.join('; ')}`,
  ].join('\n');
}

export async function alertRetentionFailure(
  report: RetentionReport,
  failures: string[],
): Promise<RetentionAlertResult> {
  const text = retentionAlertText(report, failures);
  const sent: string[] = [];

  Sentry.captureMessage(text, {
    level: 'error',
    tags: { job: 'retention' },
    extra: { deleted: report.deleted, errors: failures, mode: report.mode },
  });

  const url = process.env.RETENTION_ALERT_WEBHOOK_URL;
  if (!url) return { sent, error: null };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `text` per Slack, `content` per Discord: lo stesso corpo va bene a entrambi.
      body: JSON.stringify({ text, content: text }),
    });
    if (!response.ok) {
      return { sent, error: `avviso non recapitato: HTTP ${response.status}` };
    }
    sent.push('webhook');
    return { sent, error: null };
  } catch (error) {
    return {
      sent,
      error: `avviso non recapitato: ${error instanceof Error ? error.message : 'errore sconosciuto'}`,
    };
  }
}
