/**
 * Richieste di iscrizione rimaste in attesa di verifica.
 *
 * `received` significa invio completato e non ancora esaminato: non è un
 * rifiuto, quindi la retention non lo cancella (vedi `src/lib/retention.ts`).
 * Per non lasciare i dati in archivio senza limite, dopo 12 mesi la dashboard
 * segnala la cartella allo staff, che deve chiuderla come `reviewed` o
 * `declined`. La scelta è deliberata: nessun dato viene distrutto in automatico
 * mentre una richiesta è ancora aperta.
 */
export const WAITING_WARNING_DAYS = 365; // 12 mesi

const DAY_MS = 24 * 60 * 60 * 1000;

export function waitingTooLong(createdAt: string, now: Date = new Date()): boolean {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  return now.getTime() - created > WAITING_WARNING_DAYS * DAY_MS;
}

/** Limite oltre il quale una richiesta `received` è da chiudere. */
export function waitingCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - WAITING_WARNING_DAYS * DAY_MS).toISOString();
}
