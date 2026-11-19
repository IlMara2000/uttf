import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { getStaffRole } from '@/lib/staff-access';
import { driveKindFromMime, isDriveId, type DriveKind } from '@/lib/drive-model';

/** Tutto cio' che parla con l'agente locale o firma i suoi URL resta sul server. */

const AGENT_TIMEOUT_MS = 6000;
const DEFAULT_AGENT_URL = 'http://127.0.0.1:8787';
const MEDIA_TTL_MS = 60 * 60 * 1000;

export class DriveError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'DriveError';
    this.status = status;
  }
}

export type DriveMediaVariant = 'thumb' | 'file';

export function driveAgentUrl() {
  return (process.env.DRIVE_AGENT_URL?.trim() || DEFAULT_AGENT_URL).replace(/\/+$/, '');
}

/** Service token di Cloudflare Access: lo presenta il server Next al tunnel.
 * Il browser non lo vede mai e il disco non e' raggiungibile senza. */
function accessHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  const clientId = process.env.CF_ACCESS_CLIENT_ID?.trim();
  const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET?.trim();
  if (clientId && clientSecret) {
    headers['CF-Access-Client-Id'] = clientId;
    headers['CF-Access-Client-Secret'] = clientSecret;
  }

  // Stesso segreto che l'agente usa per le firme: qui autorizza le rotte di
  // controllo (elenco, cartelle, cancellazioni) quando si passa dal tunnel.
  const token = process.env.DRIVE_MEDIA_SECRET?.trim();
  if (token) headers['x-drive-token'] = token;

  return headers;
}

/** timeoutMs = 0 disattiva il timeout: serve ai trasferimenti con Range. */
export async function fetchAgent(
  pathname: string,
  init: RequestInit = {},
  timeoutMs = AGENT_TIMEOUT_MS,
) {
  return fetch(`${driveAgentUrl()}${pathname}`, {
    ...init,
    headers: { ...accessHeaders(), ...((init.headers as Record<string, string>) || {}) },
    cache: 'no-store',
    ...(timeoutMs > 0 ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
  });
}

export type IndexedAsset = {
  remoteId: string;
  name: string;
  folderPath: string;
  relPath: string;
  mime: string;
  kind: DriveKind;
  sizeBytes: number;
  sha256: string;
  duplicateOf: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  hasThumb: boolean;
  capturedAt: string;
};

type AgentAsset = Record<string, unknown>;

function text(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : '';
}

function positiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

/** Scarta le righe dell'agente che non rispettano i vincoli delle tabelle. */
export function toIndexedAsset(raw: AgentAsset): IndexedAsset | null {
  const remoteId = raw.id;
  if (!isDriveId(remoteId)) return null;

  const name = text(raw.name, 180);
  const relPath = text(raw.relPath, 1024);
  const sha256 = text(raw.sha256, 64).toLowerCase();
  const sizeBytes = Number(raw.size);
  const createdAt = text(raw.createdAt, 40);

  if (!name || !relPath || !/^[0-9a-f]{64}$/.test(sha256) || !(sizeBytes > 0)) return null;
  const captured = new Date(createdAt);
  if (Number.isNaN(captured.getTime())) return null;

  const mime = text(raw.mime, 160) || 'application/octet-stream';
  const folderPath = typeof raw.folder === 'string' ? text(raw.folder, 512) : '';
  const duplicateOf = isDriveId(raw.duplicateOf) && raw.duplicateOf !== remoteId ? raw.duplicateOf : null;
  const duration = Number(raw.duration);

  return {
    remoteId,
    name,
    folderPath,
    relPath,
    mime,
    kind: driveKindFromMime(mime),
    sizeBytes: Math.round(sizeBytes),
    sha256,
    duplicateOf,
    width: positiveInteger(raw.width),
    height: positiveInteger(raw.height),
    durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : null,
    hasThumb: raw.thumb === true,
    capturedAt: captured.toISOString(),
  };
}

export async function fetchAgentIndex() {
  // Prima l'agente rilegge la cartella del disco (file tolti, spostati, nuovi),
  // poi si legge l'indice aggiornato. Se l'analisi supera il tempo massimo
  // continua sul Mac e basta premere di nuovo per avere il resto.
  let rescanError: string | null = null;
  try {
    const rescan = await fetchAgent('/api/rescan', { method: 'POST' }, 50_000);
    if (!rescan.ok) {
      const body = (await rescan.json().catch(() => null)) as { error?: unknown } | null;
      rescanError = typeof body?.error === 'string' ? body.error : `HTTP ${rescan.status}`;
    }
  } catch {
    /* analisi lunga o agente non aggiornato: si prosegue con l'indice che c'e' */
  }
  if (rescanError) {
    throw new DriveError(`Analisi dell'hardisk non riuscita: ${rescanError}`, 502);
  }

  let response: Response;
  try {
    response = await fetchAgent('/api/files');
  } catch {
    throw new DriveError(
      "L'agente del drive non risponde: deve girare sullo stesso Mac del gestionale, con Hiksemi collegato.",
      503,
    );
  }
  if (!response.ok) {
    throw new DriveError(`L'agente del drive ha risposto ${response.status}.`, 502);
  }

  const payload = (await response.json().catch(() => null)) as
    | { root?: unknown; assets?: unknown }
    | null;
  if (!payload || !Array.isArray(payload.assets)) {
    throw new DriveError("Risposta dell'agente non riconosciuta.", 502);
  }

  const assets = payload.assets
    .map((item) => (item && typeof item === 'object' ? toIndexedAsset(item as AgentAsset) : null))
    .filter((item): item is IndexedAsset => item !== null);

  return {
    root: typeof payload.root === 'string' ? payload.root : null,
    assets,
  };
}

/** Firma condivisa con l'agente (`modo|bersaglio|scadenza`). Deve essere lo
 * stesso DRIVE_MEDIA_SECRET configurato sull'agente, altrimenti l'agente
 * rifiuta le chiamate e gli URL diretti restano spenti. */
function directSecret() {
  return process.env.DRIVE_MEDIA_SECRET?.trim() || '';
}

function directQuery(mode: 'file' | 'upload', target: string, ttlMs: number) {
  const secret = directSecret();
  if (!secret) return null;

  const expiresAt = Date.now() + ttlMs;
  const signature = createHmac('sha256', secret)
    .update(`${mode}|${target}|${expiresAt}`)
    .digest('base64url');
  return new URLSearchParams({ exp: String(expiresAt), sig: signature }).toString();
}

/** Firma per la lettura di un asset direttamente dall'agente (proxy o browser). */
export function signAgentFile(id: string, ttlMs = MEDIA_TTL_MS) {
  return directQuery('file', id, ttlMs);
}

/** Firma per un caricamento diretto: copre nome e cartella, non solo il tempo. */
export function signAgentUpload(name: string, folder: string, ttlMs = 15 * 60 * 1000) {
  return directQuery('upload', `${name}|${folder}`, ttlMs);
}

/** URL pubblico dell'agente dietro il tunnel (vuoto = accesso diretto spento). */
export function drivePublicUrl() {
  return (process.env.DRIVE_PUBLIC_URL?.trim() || '').replace(/\/+$/, '');
}

function mediaSecret() {
  const value = process.env.DRIVE_MEDIA_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new DriveError('Configurazione server non disponibile.', 500);
  return value;
}

function mediaSignature(id: string, variant: DriveMediaVariant, expiresAt: number) {
  return createHmac('sha256', mediaSecret())
    .update(`v1|${variant}|${id}|${expiresAt}`)
    .digest('base64url');
}

/** Token breve nell'URL: <img> e <video> non possono mandare header Authorization. */
export function signDriveMedia(id: string, variant: DriveMediaVariant, ttlMs = MEDIA_TTL_MS) {
  const expiresAt = Date.now() + ttlMs;
  return `${expiresAt}.${mediaSignature(id, variant, expiresAt)}`;
}

export function verifyDriveMedia(
  id: string,
  variant: DriveMediaVariant,
  value: string | null,
) {
  if (!value) return false;
  const [expiresRaw, signature] = value.split('.');
  const expiresAt = Number(expiresRaw);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  let given: Buffer;
  let expected: Buffer;
  try {
    given = Buffer.from(signature, 'base64url');
    expected = Buffer.from(mediaSignature(id, variant, expiresAt), 'base64url');
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

let anonClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

function supabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new DriveError('Configurazione Supabase mancante.', 500);
  return value;
}

function anonKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) throw new DriveError('Configurazione Supabase pubblica mancante.', 500);
  return value;
}

export function driveAnonClient() {
  if (!anonClient) {
    anonClient = createClient(supabaseUrl(), anonKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return anonClient;
}

export function driveAdminClient() {
  if (!adminClient) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      throw new DriveError(
        'Configurazione server mancante: aggiungi SUPABASE_SERVICE_ROLE_KEY.',
        500,
      );
    }
    adminClient = createClient(supabaseUrl(), serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

/** Stessa verifica delle altre API staff: token Bearer + allowlist authorized_users. */
export async function requireDriveStaff(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] || '';
  if (!token) throw new DriveError('Accesso staff richiesto.', 401);

  const {
    data: { user },
    error,
  } = await driveAnonClient().auth.getUser(token);
  if (error || !user) throw new DriveError('Sessione staff non valida.', 401);

  const client = driveAdminClient();
  const role = await getStaffRole(client, user as User);
  if (!role) throw new DriveError('Accesso staff richiesto.', 403);

  return { client, user: user as User, role };
}

export function driveErrorResponse(error: unknown, context: string) {
  if (error instanceof DriveError) {
    return Response.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
  }
  console.error(context);
  return Response.json(
    { error: 'Operazione non riuscita. Riprova.' },
    { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
