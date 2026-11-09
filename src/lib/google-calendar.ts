import 'server-only';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getStaffRole } from '@/lib/staff-access';
import { calendarAdmin } from './calendar-feed';
import {
  mapGoogleEvent,
  type GoogleEventLike,
  type ImportedGoogleEvent,
} from './google-calendar-model';

const OAUTH_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN = 'https://oauth2.googleapis.com/token';
const OAUTH_REVOKE = 'https://oauth2.googleapis.com/revoke';
const USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const SCOPE =
  'https://www.googleapis.com/auth/calendar.events.readonly openid email';

const STATE_TTL_MS = 10 * 60 * 1000;
const THROTTLE_MS = 30 * 60 * 1000;
const DAY_MS = 86_400_000;
const SYNC_BEFORE_DAYS = 30;
const SYNC_AFTER_DAYS = 180;
const MAX_PAGES = 5;

export class GoogleCalendarError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'GoogleCalendarError';
    this.status = status;
  }
}

type AccountRow = {
  user_id: string;
  email: string;
  refresh_token_encrypted: string;
  calendar_id: string | null;
  last_synced_at: string | null;
};

type GoogleCredentials = { clientId: string; clientSecret: string };

export type GoogleAccountStatus = {
  configured: boolean;
  ready: boolean;
  connected: boolean;
  email: string | null;
  lastSyncedAt: string | null;
};

export type GoogleSyncResult =
  | { connected: false }
  | {
      connected: true;
      imported: number;
      removed: number;
      skipped: boolean;
      lastSyncedAt: string | null;
    };

export function googleOAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

function credentials(): GoogleCredentials {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret)
    throw new GoogleCalendarError(
      'Google Calendar non configurato: mancano GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.',
      503,
    );
  return { clientId, clientSecret };
}

function secret() {
  const value =
    process.env.CALENDAR_TOKEN_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value)
    throw new GoogleCalendarError('Configurazione server non disponibile.', 500);
  return value;
}

export function signGoogleState(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      u: userId,
      e: Date.now() + STATE_TTL_MS,
      n: randomBytes(9).toString('base64url'),
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', secret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyGoogleState(value: string | null) {
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;

  const expected = createHmac('sha256', secret()).update(payload).digest();
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      u?: unknown;
      e?: unknown;
    };
    if (typeof data.u !== 'string' || typeof data.e !== 'number') return null;
    if (data.e < Date.now()) return null;
    return data.u;
  } catch {
    return null;
  }
}

function encryptionKey() {
  return createHash('sha256').update(secret()).digest();
}

function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    data.toString('base64url'),
  ].join('.');
}

function decryptToken(value: string) {
  const [version, iv, tag, data] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !data)
    throw new GoogleCalendarError(
      'Credenziali Google non leggibili. Ricollega il calendario.',
      409,
    );
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new GoogleCalendarError(
      'Credenziali Google non leggibili. Ricollega il calendario.',
      409,
    );
  }
}

export function googleAuthUrl(userId: string, redirectUri: string) {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: signGoogleState(userId),
  });
  return `${OAUTH_AUTH}?${params}`;
}

async function tokenRequest(body: URLSearchParams) {
  const response = await fetch(OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!response.ok)
    throw new GoogleCalendarError(
      'Autorizzazione Google non riuscita. Ricollega il calendario.',
      409,
    );
  return (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
  };
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = credentials();
  const result = await tokenRequest(
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  );
  if (!result.access_token || !result.refresh_token)
    throw new GoogleCalendarError(
      'Google non ha restituito un token rinnovabile. Riprova.',
      409,
    );
  return { accessToken: result.access_token, refreshToken: result.refresh_token };
}

async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = credentials();
  const result = await tokenRequest(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  );
  if (!result.access_token)
    throw new GoogleCalendarError(
      'Accesso al calendario revocato. Ricollega Google Calendar.',
      409,
    );
  return result.access_token;
}

export async function googleAccountEmail(accessToken: string) {
  const response = await fetch(USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) return 'Google Calendar';
  const payload = (await response.json()) as { email?: string };
  return payload.email || 'Google Calendar';
}

async function getGoogleAccount(userId: string) {
  const { data, error } = await calendarAdmin()
    .from('google_calendar_accounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as AccountRow | null) ?? null;
}

export async function googleAccountStatus(
  userId: string,
): Promise<GoogleAccountStatus> {
  const account = await getGoogleAccount(userId);
  return {
    configured: googleOAuthConfigured(),
    ready: true,
    connected: Boolean(account),
    email: account?.email ?? null,
    lastSyncedAt: account?.last_synced_at ?? null,
  };
}

export async function saveGoogleAccount(
  userId: string,
  email: string,
  refreshToken: string,
) {
  const { error } = await calendarAdmin()
    .from('google_calendar_accounts')
    .upsert(
      {
        user_id: userId,
        email,
        refresh_token_encrypted: encryptToken(refreshToken),
        calendar_id: 'primary',
        last_synced_at: null,
      },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}

export async function disconnectGoogleAccount(userId: string) {
  const account = await getGoogleAccount(userId);
  if (account) {
    try {
      await fetch(OAUTH_REVOKE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: decryptToken(account.refresh_token_encrypted),
        }),
        cache: 'no-store',
      });
    } catch {
      /* Revoca best effort: la cancellazione locale resta necessaria. */
    }
  }

  const admin = calendarAdmin();
  const { error } = await admin
    .from('google_calendar_accounts')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
  await admin.from('google_calendar_events').delete().eq('owner_id', userId);
}

function dayOffset(days: number) {
  const date = new Date(Date.now() + days * DAY_MS);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

async function fetchGoogleEvents(accessToken: string, calendarId: string) {
  const timeMin = new Date(Date.now() - SYNC_BEFORE_DAYS * DAY_MS).toISOString();
  const timeMax = new Date(Date.now() + SYNC_AFTER_DAYS * DAY_MS).toISOString();
  const collected: GoogleEventLike[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
      showDeleted: 'false',
      timeMin,
      timeMax,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await fetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      },
    );

    if (response.status === 401 || response.status === 403)
      throw new GoogleCalendarError(
        'Accesso al calendario revocato. Ricollega Google Calendar.',
        409,
      );
    if (!response.ok)
      throw new GoogleCalendarError('Lettura del calendario Google non riuscita.');

    const payload = (await response.json()) as {
      items?: GoogleEventLike[];
      nextPageToken?: string;
    };
    collected.push(...(payload.items || []));
    if (!payload.nextPageToken) break;
    pageToken = payload.nextPageToken;
  }

  return collected;
}

export async function syncGoogleCalendar(
  userId: string,
  options: { force?: boolean } = {},
): Promise<GoogleSyncResult> {
  const account = await getGoogleAccount(userId);
  if (!account) return { connected: false };

  const last = account.last_synced_at
    ? new Date(account.last_synced_at).getTime()
    : 0;
  if (!options.force && last && Date.now() - last < THROTTLE_MS) {
    return {
      connected: true,
      imported: 0,
      removed: 0,
      skipped: true,
      lastSyncedAt: account.last_synced_at,
    };
  }

  const accessToken = await refreshAccessToken(
    decryptToken(account.refresh_token_encrypted),
  );
  const events = await fetchGoogleEvents(
    accessToken,
    account.calendar_id || 'primary',
  );

  const mapped: ImportedGoogleEvent[] = [];
  for (const event of events) {
    const item = mapGoogleEvent(event);
    if (item) mapped.push(item);
  }

  const rows = Array.from(
    new Map(
      mapped.map((item) => [
        item.eventId,
        {
          id: `${userId}:${item.eventId}`,
          owner_id: userId,
          title: item.title,
          description: item.description,
          starts_on: item.startsOn,
          ends_on: item.endsOn,
          starts_at: item.startsAt,
          html_link: item.htmlLink,
          updated_at: new Date().toISOString(),
        },
      ]),
    ).values(),
  );

  const admin = calendarAdmin();
  if (rows.length) {
    const { error } = await admin
      .from('google_calendar_events')
      .upsert(rows, { onConflict: 'id' });
    if (error)
      throw new GoogleCalendarError(
        'Salvataggio degli eventi importati non riuscito. Verifica la migrazione SQL.',
        500,
      );
  }

  const { data: existing, error: existingError } = await admin
    .from('google_calendar_events')
    .select('id')
    .eq('owner_id', userId)
    .gte('starts_on', dayOffset(-SYNC_BEFORE_DAYS))
    .lte('starts_on', dayOffset(SYNC_AFTER_DAYS));

  if (existingError)
    throw new GoogleCalendarError(
      'Lettura degli eventi importati non riuscita. Verifica la migrazione SQL.',
      500,
    );

  const keep = new Set(rows.map((row) => row.id));
  const stale = ((existing || []) as { id: string }[])
    .map((row) => row.id)
    .filter((id) => !keep.has(id));

  if (stale.length) {
    const { error } = await admin
      .from('google_calendar_events')
      .delete()
      .in('id', stale);
    if (error)
      throw new GoogleCalendarError(
        'Pulizia degli eventi rimossi non riuscita.',
        500,
      );
  }

  const syncedAt = new Date().toISOString();
  await admin
    .from('google_calendar_accounts')
    .update({ last_synced_at: syncedAt })
    .eq('user_id', userId);

  return {
    connected: true,
    imported: rows.length,
    removed: stale.length,
    skipped: false,
    lastSyncedAt: syncedAt,
  };
}

export async function requireStaffUser(request: Request) {
  const token =
    request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] || '';
  if (!token) throw new Response('Accesso staff richiesto.', { status: 401 });

  const client: SupabaseClient = calendarAdmin();
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  if (error || !user)
    throw new Response('Sessione staff non valida.', { status: 401 });
  if (!(await getStaffRole(client, user)))
    throw new Response('Accesso staff richiesto.', { status: 403 });

  return { client, user: user as User };
}
