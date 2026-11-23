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
  errors: string[];
};

type StepResult = { count: number; error: string | null };

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

/** Conteggio (dry-run) o cancellazione delle righe più vecchie della soglia. */
async function purgeOlderThan(
  client: SupabaseClient,
  table: string,
  column: string,
  cutoff: string,
  enabled: boolean,
): Promise<StepResult> {
  if (!enabled) {
    const { count, error } = await client
      .from(table)
      .select('*', { count: 'exact', head: true })
      .lt(column, cutoff);
    return { count: count ?? 0, error: error?.message ?? null };
  }

  const { count, error } = await client.from(table).delete({ count: 'exact' }).lt(column, cutoff);
  return { count: count ?? 0, error: error?.message ?? null };
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
  const { data, error } = await client
    .from('booking_slots')
    .select('id')
    .lt('date', cutoff);

  if (error) return { count: 0, error: `booking_slots: ${error.message}` };

  const slotIds = (data ?? []).map((row) => row.id as string);
  if (slotIds.length === 0) return { count: 0, error: null };

  if (!enabled) {
    const { count, error: countError } = await client
      .from('booking_reservations')
      .select('*', { count: 'exact', head: true })
      .in('slot_id', slotIds);
    return { count: count ?? 0, error: countError?.message ?? null };
  }

  let deleted = 0;
  for (const group of chunks(slotIds, 100)) {
    const { count, error: deleteError } = await client
      .from('booking_reservations')
      .delete({ count: 'exact' })
      .in('slot_id', group);
    if (deleteError) return { count: deleted, error: `booking_reservations: ${deleteError.message}` };
    deleted += count ?? 0;
  }

  return { count: deleted, error: null };
}

/**
 * Richieste di iscrizione alle attività non accolte: oltre i 12 mesi si
 * cancellano riga e allegati nel bucket privato. Contano `pending` (mai inviate)
 * e `received` (inviate e mai esaminate); le richieste esaminate (`reviewed`)
 * restano per gli obblighi amministrativi e assicurativi.
 */
async function purgeRegistrations(
  client: SupabaseClient,
  enabled: boolean,
  now: Date,
): Promise<{ records: number; files: number; error: string | null }> {
  const cutoff = isoDaysAgo(now, REGISTRATION_RETENTION_DAYS);
  const { data, error } = await client
    .from('activity_registrations')
    .select('id, files')
    .in('status', ['pending', 'received'])
    .lt('created_at', cutoff);

  if (error) return { records: 0, files: 0, error: `activity_registrations: ${error.message}` };

  const rows = (data ?? []) as { id: string; files?: { path?: string }[] | null }[];
  if (rows.length === 0) return { records: 0, files: 0, error: null };

  const paths = rows
    .flatMap((row) => (Array.isArray(row.files) ? row.files : []))
    .map((file) => file.path)
    .filter((path): path is string => typeof path === 'string' && path.length > 0);

  if (!enabled) return { records: rows.length, files: paths.length, error: null };

  let removedFiles = 0;
  for (const group of chunks(paths, 100)) {
    const { data: removed, error: removeError } = await client.storage
      .from('registration-files')
      .remove(group);
    if (removeError) return { records: 0, files: removedFiles, error: `storage: ${removeError.message}` };
    removedFiles += removed?.length ?? 0;
  }

  // Come per slot e storage: una sola `.in()` con molti id supererebbe la
  // lunghezza massima dell'URL accettata da PostgREST.
  let records = 0;
  for (const group of chunks(
    rows.map((row) => row.id),
    100,
  )) {
    const { count, error: deleteError } = await client
      .from('activity_registrations')
      .delete({ count: 'exact' })
      .in('id', group);

    if (deleteError) {
      return {
        records,
        files: removedFiles,
        error: `activity_registrations: ${deleteError.message}`,
      };
    }
    records += count ?? 0;
  }

  return { records, files: removedFiles, error: null };
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
        purgeOlderThan(client, 'booking_rate_limits', 'expires_at', now.toISOString(), enabled),
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
        ),
    },
  ];

  for (const step of steps) {
    try {
      const result = await step.run();
      deleted[step.key] = result.count;
      if (result.error) errors.push(`${step.key}: ${result.error}`);
    } catch (error) {
      errors.push(`${step.key}: ${error instanceof Error ? error.message : 'errore sconosciuto'}`);
    }
  }

  try {
    const registrations = await purgeRegistrations(client, enabled, now);
    deleted.activityRegistrations = registrations.records;
    deleted.registrationFiles = registrations.files;
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
    errors,
  };
}
