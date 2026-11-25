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
  errors: string[];
};

type StepResult = { count: number; error: string | null; ids: string[] };

export type RetentionOptions = {
  /** true = cancella davvero; false/assente = solo conteggio. */
  enabled?: boolean;
  /** Iniettabile nei test. */
  now?: Date;
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

/**
 * Tutte le righe di una query, non solo la prima pagina. PostgREST tronca il
 * corpo della risposta al limite dell'API (1000 righe di default): senza
 * paginare, le righe successive resterebbero fuori — mai cancellate, con gli
 * allegati orfani nel bucket, e in dry-run contate in meno. Si pagina finché
 * non si raggiunge il `count` dichiarato dalla risposta.
 */
async function allRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown;
    count: number | null;
    error: { message: string } | null;
  }>,
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  for (;;) {
    const { data, count, error } = await page(rows.length, rows.length + API_PAGE_SIZE - 1);
    if (error) return { rows, error: error.message };
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length === 0 || (count !== null && rows.length >= count)) {
      return { rows, error: null };
    }
  }
}

/** Slot con appuntamento più vecchio della soglia, tutti. */
async function expiredSlotIds(
  client: SupabaseClient,
  cutoff: string,
): Promise<{ ids: string[]; error: string | null }> {
  const { rows, error } = await allRows<{ id: string }>((from, to) =>
    client
      .from('booking_slots')
      .select('id', { count: 'exact' })
      .lt('date', cutoff)
      .order('id')
      .range(from, to),
  );
  return { ids: idList(rows, 'id'), error: error ? `booking_slots: ${error}` : null };
}

/**
 * Prenotazioni: la data che conta è quella dello slot, non `created_at`.
 * PostgREST non filtra una risorsa incorporata durante la DELETE, quindi prima
 * raccogliamo gli slot scaduti e poi cancelliamo le prenotazioni collegate.
 * Gli slot restano: sono pianificazione dello staff e non contengono dati
 * personali.
 */
async function purgeBookings(
  client: SupabaseClient,
  enabled: boolean,
  now: Date,
): Promise<StepResult> {
  const cutoff = dateDaysAgo(now, BOOKING_RETENTION_DAYS);
  const { ids: slotIds, error } = await expiredSlotIds(client, cutoff);
  if (error) return { count: 0, error, ids: [] };
  if (slotIds.length === 0) return { count: 0, error: null, ids: [] };

  // Stessi blocchi della cancellazione: una sola `.in()` con tutti gli slot
  // scaduti supererebbe la lunghezza massima dell'URL accettata da PostgREST.
  let deleted = 0;
  const ids: string[] = [];
  for (const group of chunks(slotIds, 100)) {
    if (!enabled) {
      const { data, count, error: countError } = await client
        .from('booking_reservations')
        .select('id', { count: 'exact' })
        .in('slot_id', group);
      if (countError)
        return { count: deleted, error: `booking_reservations: ${countError.message}`, ids };
      const chunkIds = idList(data, 'id');
      ids.push(...chunkIds);
      deleted += count ?? chunkIds.length;
      continue;
    }

    const { data, count, error: deleteError } = await client
      .from('booking_reservations')
      .delete({ count: 'exact' })
      .in('slot_id', group)
      .select('id');
    if (deleteError) return { count: deleted, error: `booking_reservations: ${deleteError.message}`, ids };
    const chunkIds = idList(data, 'id');
    ids.push(...chunkIds);
    deleted += count ?? chunkIds.length;
  }

  return { count: deleted, error: null, ids };
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

function expiredRegistrations(client: SupabaseClient, cutoff: string) {
  return allRows<RegistrationRow>((from, to) =>
    expiredRegistrationsQuery(client, cutoff).range(from, to),
  );
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
): Promise<{ records: number; files: number; error: string | null; ids: string[]; filePaths: string[] }> {
  const cutoff = isoDaysAgo(now, REGISTRATION_RETENTION_DAYS);

  // Si leggono tutte le righe idonee, in dry-run per contarle e in
  // cancellazione per non lasciare fuori quelle oltre la prima pagina con i
  // loro allegati. Righe e file si eliminano poi a blocchi di 100.
  const { rows, error } = await expiredRegistrations(client, cutoff);
  if (error) {
    return {
      records: 0,
      files: 0,
      error: `activity_registrations: ${error}`,
      ids: [],
      filePaths: [],
    };
  }

  if (rows.length === 0) return { records: 0, files: 0, error: null, ids: [], filePaths: [] };

  const filePaths = rows
    .flatMap((row) => (Array.isArray(row.files) ? row.files : []))
    .map((file) => file.path)
    .filter((path): path is string => typeof path === 'string' && path.length > 0);

  const ids = rows.map((row) => row.id);

  if (!enabled) return { records: rows.length, files: filePaths.length, error: null, ids, filePaths };

  let removedFiles = 0;
  for (const group of chunks(filePaths, 100)) {
    const { data: removed, error: removeError } = await client.storage
      .from('registration-files')
      .remove(group);
    if (removeError) return { records: 0, files: removedFiles, error: `storage: ${removeError.message}`, ids: [], filePaths };
    removedFiles += removed?.length ?? 0;
  }

  // Come per slot e storage: una sola `.in()` con molti id supererebbe la
  // lunghezza massima dell'URL accettata da PostgREST.
  let records = 0;
  const deletedIds: string[] = [];
  for (const group of chunks(
    rows.map((row) => row.id),
    100,
  )) {
    const { data: deletedRows, count, error: deleteError } = await client
      .from('activity_registrations')
      .delete({ count: 'exact' })
      .in('id', group)
      .select('id');

    if (deleteError) {
      return {
        records,
        files: removedFiles,
        error: `activity_registrations: ${deleteError.message}`,
        ids: deletedIds,
        filePaths,
      };
    }
    const chunkIds = idList(deletedRows, 'id');
    deletedIds.push(...chunkIds);
    records += count ?? chunkIds.length;
  }

  return { records, files: removedFiles, error: null, ids: deletedIds, filePaths };
}

export async function runRetention(
  client: SupabaseClient,
  options: RetentionOptions = {},
): Promise<RetentionReport> {
  const enabled = options.enabled === true;
  const now = options.now ?? new Date();
  const errors: string[] = [];

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
    { key: 'bookingReservations', run: () => purgeBookings(client, enabled, now) },
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
      if (result.error) errors.push(`${step.key}: ${result.error}`);
    } catch (error) {
      errors.push(`${step.key}: ${error instanceof Error ? error.message : 'errore sconosciuto'}`);
    }
  }

  try {
    const registrations = await purgeRegistrations(client, enabled, now);
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
    errors,
  };
}
