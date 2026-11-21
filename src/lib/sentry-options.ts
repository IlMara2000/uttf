import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

/**
 * Opzioni di raccolta dati condivise dai tre runtime (browser, Node, Edge).
 *
 * Il CRM tratta iscrizioni, prenotazioni e allegati: gli errori servono, i dati
 * personali no. Sentry v11 sostituisce `sendDefaultPii` con `dataCollection`,
 * quindi chiudiamo tutto ciò che potrebbe portare fuori un dato:
 * - niente cookie, header di richiesta/risposta (qui viaggia anche
 *   `x-drive-token`), query string, body HTTP o dati delle query al database;
 * - niente variabili locali negli stack frame (un form in errore le contiene);
 * - niente `user.*` compilato in automatico.
 *
 * Restano messaggio, stack trace, route e ambiente: abbastanza per capire cosa
 * si è rotto senza spedire l'anagrafica di nessuno.
 */
export const dataCollectionOptions = {
  userInfo: false,
  cookies: false,
  httpBodies: [],
  httpHeaders: { request: false, response: false },
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  queues: false,
};

/**
 * Le opzioni qui sopra non bastano: un messaggio di eccezione può contenere
 * un'email (per esempio un errore di Postgres che riporta il valore in
 * conflitto) e le briciole `fetch` riportano l'URL completo, query string
 * compresa. Questi due filtri sono la seconda barriera.
 */

/** Email in chiaro, l'unico dato personale che compare spesso nei messaggi. */
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function redact(value: string) {
  return value.replace(EMAIL, "[email]");
}

/** Via la query string: è lì che finiscono token e identificativi. */
function stripQuery(value: string) {
  const index = value.indexOf("?");
  return index === -1 ? value : value.slice(0, index);
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  // Difesa in profondità: anche se `dataCollection` è cambiato, questi campi
  // non devono mai uscire.
  delete event.user;

  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.query_string;
    if (event.request.url) event.request.url = stripQuery(event.request.url);
  }

  if (event.message) event.message = redact(event.message);
  if (event.logentry?.message) event.logentry.message = redact(event.logentry.message);

  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = redact(exception.value);
  }

  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (breadcrumb.message) breadcrumb.message = redact(stripQuery(breadcrumb.message));
    const url = breadcrumb.data?.url;
    if (typeof url === "string") breadcrumb.data!.url = stripQuery(url);
  }

  return event;
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  if (typeof breadcrumb.message === "string") {
    breadcrumb.message = redact(stripQuery(breadcrumb.message));
  }
  const url = breadcrumb.data?.url;
  if (typeof url === "string") breadcrumb.data!.url = stripQuery(url);
  return breadcrumb;
}
