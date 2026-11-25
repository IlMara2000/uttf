import { timingSafeEqual } from 'node:crypto';

/**
 * Token condiviso delle route di manutenzione (cron di Vercel o trigger
 * esterno). Una sola implementazione: due copie del confronto a tempo
 * costante sono il modo più facile per introdurre una divergenza silenziosa.
 */
export function maintenanceToken() {
  return process.env.RETENTION_TOKEN ?? process.env.CRON_SECRET ?? null;
}

function tokensMatch(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** `Authorization: Bearer <token>`, confrontato in tempo costante. */
export function isMaintenanceAuthorized(request: Request, expected: string) {
  const header = request.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;
  return tokensMatch(header.slice(prefix.length), expected);
}
