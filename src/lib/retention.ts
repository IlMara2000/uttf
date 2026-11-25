import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cancellazione dei dati scaduti secondo i termini pubblicati in /privacy (§07).
 *
 * La logica sta qui e non nella route perché deve poter girare sia dal cron di
 * Vercel sia, dopo la migrazione, da un Cron Trigger di Cloudflare: il Worker
 * chiama `runRetention` direttamente nel suo `scheduled` handler.
 *
 * Senza `RETENTION_ENABLED=true` il job è in sola lettura: conta le righe che
 * sarebbero cancellate e non tocca nulla. Così un cron configurato per errore
 * non distrugge dati.
 *
 * Nota sui termini: la newsletter non traccia aperture o clic, quindi "nessuna
 * interazione da 24 mesi" viene applicata sulla data di iscrizione.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const NEWSLETTER_RETENTION_DAYS = 730; // 24 mesi
const BOOKING_RETENTION_DAYS = 365; // 12 mesi dall'appuntamento
const REVIEW_RETENTION_DAYS = 1826; // 5 anni dalla pubblicazione
const REGISTRATION_RETENTION_DAYS = 365; // 12 mesi per le richieste non accolte

export type RetentionReport = {
  mode: 'dry-run' | 'delete';
  executedAt: string;
  deleted: {
    newsletterSubscribers: number;
    bookingReservations: number;
    reviews: number;
    activityRegistrations: number;
    registrationFiles: number;
    bookingRateLimits: number;
    registrationRateLimits: number;
  };
  /**
   * Identificativi delle righe rimosse (o idonee, in dry-run) per categoria.
   * Per gli allegati si tratta dei percorsi nel bucket `registration-files`.
   * Serve all'audit: la traccia conserva gli ID anche dopo la cancellazione.
   */
  ids: {
    newsletterSubscribers: string[];
    bookingReservations: string[];
    reviews: string[];
    activityRegistrations: string[];
    registrationFiles: string[];
    bookingRateLimits: string[];
    registrationRateLimits: string[];
  };
  /**
   * `true` se il limite di blocchi per esecuzione ha fermato il giro: i
   * conteggi sono parziali e il resto viene elaborato al giro successivo.
   */
  deferred: boolean;
  errors: string[];
};

type StepResult = {
  count: number;
  error: string | null;
  ids: string[];
  /** true se il limite di blocchi ha fermato il passo: il resto al prossimo giro. */
  deferred?: boolean;
};

export type RetentionOptions = {
  /** true = cancella davvero; false/assente = solo conteggio. */
  enabled?: boolean;
  /** Iniettabile nei test. */
  now?: Date;
  /** Blocchi di lavoro per esecuzione (default `MAX_BLOCKS_PER_RUN`). */
  maxBlocks?: number;
};

function isoDaysAgo(now: Date, days: number) {
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}

function dateDaysAgo(now: Date, days: number) {
  return isoDaysAgo(now, days).slice(0, 10);
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

/** Righe restituite da PostgREST → elenco degli ID (o chiavi) presenti. */
function idList(data: unknown, column: string): string[] {
  return ((data ?? []) as Record<string, unknown>[])
    .map((row) => row[column])
    .filter((value): value is string => typeof value === 'string');
}

/**
 * Conteggio (dry-run) o cancellazione delle righe più vecchie della soglia, con
 * gli ID toccati. `count: 'exact'` serve anche in dry-run: il corpo della
 * risposta è limitato alle righe massime dell'API (1000 di default), il
 * conteggio no.
 */
async function purgeOlderThan(
  client: SupabaseClient,
  table: string,
  column: string,
  cutoff: string,
  enabled: boolean,
  idColumn = 'id',
): Promise<StepResult> {
  const { data, count, error } = enabled
    ? await client.from(table).delete({ count: 'exact' }).lt(column, cutoff).select(idColumn)
    : await client.from(table).select(idColumn, { count: 'exact' }).lt(column, cutoff);

  if (error) return { count: 0, error: error.message, ids: [] };
  const ids = idList(data, idColumn);
  return { count: count ?? ids.length, error: null, ids };
}

/** Pagina massima restituita dall'API: il corpo della risposta è troncato qui. */
const API_PAGE_SIZE = 1000;

/** Una delete o una rimozione dallo storage copre al massimo 100 righe o percorsi. */
const BLOCK_SIZE = 100;

/**
 * Blocchi di lavoro per esecuzione. La route ha `maxDuration = 60`: con un
 * arretrato grande la sola paginazione non basta, il giro verrebbe ucciso a
 * metà (allegati rimossi, righe no) e senza traccia. Quando i blocchi
 * finiscono il giro si ferma pulito, marca `deferred` e riprende la volta dopo
 * dalla prima riga rimasta: quelle già cancellate non ci sono più.
 */
const MAX_BLOCKS_PER_RUN = 50;

/** Blocchi ancora disponibili in questa esecuzione. */
type Budget = { left: number };

/**
 * Prenotazioni: la data che conta è quella dello slot, non `created_at`.
 * PostgREST non filtra una risorsa incorporata durante la DELETE, quindi si
 * leggono le prenotazioni con un join interno sullo slot (`!inner`) e poi le
 * si cancella per id. Gli slot restano: sono pianificazione dello staff e non
 * contengono dati personali.
 *
 * Leggere le prenotazioni invece degli slot evita di riscorrere ogni volta gli
 * slot ormai senza prenotazioni, che restano in tabella per sempre: a ogni
 * giro esaurirebbero il budget senza cancellare nulla. Il cursore sull'id
 * tiene ferma la paginazione mentre le righe spariscono.
 */
async function purgeBookings(
  client: SupabaseClient,
  enabled: boolean,
  now: Date,
  budget: Budget,
): Promise<StepResult> {
  const cutoff = dateDaysAgo(now, BOOKING_RETENTION_DAYS);
  let count = 0;
  let deferred = false;
  const ids: string[] = [];
  let after: string | null = null;

  for (;;) {
    if (budget.left <= 0) {
      deferred = true;
      break;
    }
    budget.left -= 1;

    const page = client
      .from('booking_reservations')
      .select('id, booking_slots!inner(date)')
      .lt('booking_slots.date', cutoff);
    const { data, error } = await (after ? page.gt('id', after) : page)
      .order('id')
      .limit(API_PAGE_SIZE);
    if (error) return { count, error: `booking_reservations: ${error.message}`, ids, deferred };

    const rows = idList(data, 'id');
    if (rows.length === 0) break;
    after = rows[rows.length - 1];

    if (!enabled) {
      ids.push(...rows);
      count += rows.length;
    } else {
      let handled = 0;
      while (handled < rows.length && budget.left > 0) {
        const group = rows.slice(handled, handled + BLOCK_SIZE);
        handled += group.length;
        budget.left -= 1;

        const { data: deleted, count: total, error: deleteError } = await client
          .from('booking_reservations')
          .delete({ count: 'exact' })
          .in('id', group)
          .select('id');
        if (deleteError)
          return { count, error: `booking_reservations: ${deleteError.message}`, ids, deferred };
        const chunkIds = idList(deleted, 'id');
        ids.push(...chunkIds);
        count += total ?? chunkIds.length;
      }

      if (handled < rows.length) {
        deferred = true;
        break;
      }
    }

    if (rows.length < API_PAGE_SIZE) break;
  }

  return { count, error: null, ids, deferred };
}

type RegistrationRow = { id: string; files?: { path?: string }[] | null };

function expiredRegistrationsQuery(client: SupabaseClient, cutoff: string) {
  return client
    .from('activity_registrations')
    .select('id, files', { count: 'exact' })
    .in('status', ['pending', 'declined'])
    .lt('created_at', cutoff)
    .order('id');
}

/** Percorsi degli allegati di una richiesta, saltando valori vuoti. */
function rowFilePaths(row: RegistrationRow): string[] {
  return (Array.isArray(row.files) ? row.files : [])
    .map((file) => file.path)
    .filter((path): path is string => typeof path === 'string' && path.length > 0);
}

/**
 * Richieste di iscrizione alle attività: oltre i 12 mesi si cancellano riga e
 * allegati nel bucket privato, ma solo per le richieste chiuse come non accolte.
 *
 * Gli stati distinguono la valutazione dello staff, non solo la verifica della
 * cartella: `pending` è un invio interrotto prima del caricamento (non compare
 * nell'archivio), `received` è un invio completato che lo staff non ha ancora
 * verificato, `reviewed` è una cartella con i documenti verificati, `declined`
 * è una richiesta valutata e non accolta (o ritirata dal richiedente).
 *
 * Il termine di 12 mesi pubblicato in /privacy §07 vale per le richieste non
 * accolte: la retention cancella `declined` e gli invii interrotti, non
 * `received`. Una richiesta in attesa di verifica non è un rifiuto e non va
 * cancellata come tale: resta finché lo staff non la chiude come `reviewed` o
 * `declined`. Le richieste verificate restano per gli obblighi amministrativi e
 * assicurativi.
 */
async function purgeRegistrations(
  client: SupabaseClient,
  enabled: boolean,
  now: Date,
  budget: Budget,
): Promise<{
  records: number;
  files: number;
  error: string | null;
  ids: string[];
  filePaths: string[];
  deferred: boolean;
}> {
  const cutoff = isoDaysAgo(now, REGISTRATION_RETENTION_DAYS);
  const ids: string[] = [];
  const filePaths: string[] = [];
  let records = 0;
  let files = 0;
  let deferred = false;
  let after: string | null = null;

  const failed = (message: string) => ({ records, files, error: message, ids, filePaths, deferred });

  for (;;) {
    if (budget.left <= 0) {
      deferred = true;
      break;
    }
    budget.left -= 1;

    // Cursore sull'id invece dell'offset: le righe appena cancellate
    // sposterebbero le pagine e ne farebbero saltare alcune.
    const { data, error } = await (after
      ? expiredRegistrationsQuery(client, cutoff).gt('id', after)
      : expiredRegistrationsQuery(client, cutoff)
    ).limit(API_PAGE_SIZE);
    if (error) return failed(`activity_registrations: ${error.message}`);

    const rows = (data ?? []) as RegistrationRow[];
    if (rows.length === 0) break;
    after = rows[rows.length - 1].id;

    if (!enabled) {
      for (const row of rows) {
        ids.push(row.id);
        filePaths.push(...rowFilePaths(row));
      }
      records = ids.length;
      files = filePaths.length;
    } else {
      let handled = 0;
      while (handled < rows.length && budget.left > 0) {
        const group = rows.slice(handled, handled + BLOCK_SIZE);
        handled += group.length;
        budget.left -= 1;

        // Allegati prima delle righe, dentro lo stesso blocco: se il giro si
        // ferma non resta una riga che punta a file già spariti.
        for (const paths of chunks(group.flatMap(rowFilePaths), BLOCK_SIZE)) {
          const { data: removed, error: removeError } = await client.storage
            .from('registration-files')
            .remove(paths);
          if (removeError) return failed(`storage: ${removeError.message}`);
          const removedPaths = (removed ?? []).map((entry) => entry.name);
          files += removedPaths.length;
          filePaths.push(...removedPaths);
        }

        const { data: deletedRows, count, error: deleteError } = await client
          .from('activity_registrations')
          .delete({ count: 'exact' })
          .in('id', group.map((row) => row.id))
          .select('id');
        if (deleteError) return failed(`activity_registrations: ${deleteError.message}`);

        const deletedIds = idList(deletedRows, 'id');
        ids.push(...deletedIds);
        records += count ?? deletedIds.length;
      }

      if (handled < rows.length) {
        deferred = true;
        break;
      }
    }

    if (rows.length < API_PAGE_SIZE) break;
  }

  return { records, files, error: null, ids, filePaths, deferred };
}

export async function runRetention(
  client: SupabaseClient,
  options: RetentionOptions = {},
): Promise<RetentionReport> {
  const enabled = options.enabled === true;
  const now = options.now ?? new Date();
  const errors: string[] = [];
  // Budget condiviso da tutti i passi: il limite vale per il giro intero, non
  // per singola tabella.
  const budget: Budget = { left: options.maxBlocks ?? MAX_BLOCKS_PER_RUN };
  let deferred = false;

  const deleted: RetentionReport['deleted'] = {
    newsletterSubscribers: 0,
    bookingReservations: 0,
    reviews: 0,
    activityRegistrations: 0,
    registrationFiles: 0,
    bookingRateLimits: 0,
    registrationRateLimits: 0,
  };

  const ids: RetentionReport['ids'] = {
    newsletterSubscribers: [],
    bookingReservations: [],
    reviews: [],
    activityRegistrations: [],
    registrationFiles: [],
    bookingRateLimits: [],
    registrationRateLimits: [],
  };

  // `deleted` e `ids` hanno le stesse chiavi: una sola `key` per entrambi.
  const steps: { key: keyof RetentionReport['deleted']; run: () => Promise<StepResult> }[] = [
    {
      key: 'newsletterSubscribers',
      run: () =>
        purgeOlderThan(
          client,
          'newsletter_subscribers',
          'created_at',
          isoDaysAgo(now, NEWSLETTER_RETENTION_DAYS),
          enabled,
        ),
    },
    { key: 'bookingReservations', run: () => purgeBookings(client, enabled, now, budget) },
    {
      key: 'reviews',
      run: () =>
        purgeOlderThan(
          client,
          'reviews',
          'created_at',
          isoDaysAgo(now, REVIEW_RETENTION_DAYS),
          enabled,
        ),
    },
    {
      key: 'bookingRateLimits',
      run: () =>
        purgeOlderThan(client, 'booking_rate_limits', 'expires_at', now.toISOString(), enabled, 'key'),
    },
    {
      key: 'registrationRateLimits',
      run: () =>
        purgeOlderThan(
          client,
          'registration_rate_limits',
          'expires_at',
          now.toISOString(),
          enabled,
          'key',
        ),
    },
  ];

  for (const step of steps) {
    try {
      const result = await step.run();
      deleted[step.key] = result.count;
      ids[step.key] = result.ids;
      if (result.deferred) deferred = true;
      if (result.error) errors.push(`${step.key}: ${result.error}`);
    } catch (error) {
      errors.push(`${step.key}: ${error instanceof Error ? error.message : 'errore sconosciuto'}`);
    }
  }

  try {
    const registrations = await purgeRegistrations(client, enabled, now, budget);
    if (registrations.deferred) deferred = true;
    deleted.activityRegistrations = registrations.records;
    deleted.registrationFiles = registrations.files;
    ids.activityRegistrations = registrations.ids;
    ids.registrationFiles = registrations.filePaths;
    if (registrations.error) errors.push(`activityRegistrations: ${registrations.error}`);
  } catch (error) {
    errors.push(
      `activityRegistrations: ${error instanceof Error ? error.message : 'errore sconosciuto'}`,
    );
  }

  return {
    mode: enabled ? 'delete' : 'dry-run',
    executedAt: now.toISOString(),
    deleted,
    ids,
    deferred,
    errors,
  };
}
