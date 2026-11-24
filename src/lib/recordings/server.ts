import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import Groq, { toFile } from 'groq-sdk';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { sessionFromCookies } from '@/lib/auth-cookie';
import { readJson } from '@/lib/request-json';
import { getStaffRole } from '@/lib/staff-access';
import {
  MAX_AUDIO_BYTES,
  extensionForMime,
  wallClockAt,
  type PauseInterval,
  type RecordingMode,
  type RecordingStatus,
  type Sentence,
  type Transcript,
} from '@/lib/recordings/model';

/** Bucket privato già usato da note e pubblicazioni. */
export const BUCKET = 'factory-assets';
/** Download paralleli dei chunk: alzarlo gonfia la memoria, abbassarlo allunga lo stop. */
export const RECOMPOSE_CONCURRENCY = 6;
/** Oltre questo tempo uno `transcribing` è considerato interrotto (timeout, deploy) e si può ritentare. */
export const TRANSCRIBE_LOCK_MS = 10 * 60_000;

const NO_STORE = { 'Cache-Control': 'private, no-store' };

export class RecordingError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'RecordingError';
  }
}

export function errorResponse(error: unknown, context: string) {
  // Riga unica da cercare nei log quando uno stop non produce la nota: vale per
  // ogni 5xx, anche quando il messaggio è già pronto per il client.
  if (error instanceof RecordingError && error.status < 500) {
    return Response.json({ error: error.message }, { status: error.status, headers: NO_STORE });
  }
  console.error(`[recordings] ${context}`, error);
  return Response.json(
    { error: error instanceof RecordingError ? error.message : 'Operazione non riuscita. Riprova.' },
    { status: error instanceof RecordingError ? error.status : 500, headers: NO_STORE },
  );
}

function env(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY') {
  const value = process.env[name];
  if (!value) {
    throw new RecordingError(`Configurazione server mancante: ${name}.`, 503);
  }
  return value;
}

/**
 * Un solo client, service role: verifica il token staff e legge/scrive le due
 * tabelle, che non hanno policy né grant per anon/authenticated. Nessun secondo
 * client "anon" da costruire e da tenere allineato.
 */
function serverClient(): SupabaseClient {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * POST dallo stesso sito: il recorder manda `Origin` same-origin, e da fuori
 * un form multipart non deve poter scrivere nella registrazione di qualcuno.
 *
 * Si confronta l'host, non `new URL(request.url)`: dietro un proxy (o in dev
 * con `-H 127.0.0.1`) quell'URL può portare l'host interno del server, e una
 * richiesta legittima da `127.0.0.1:3000` finirebbe 403 «Origine non valida».
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const expected =
    forwardedHost || request.headers.get('host') || new URL(request.url).host;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new RecordingError('Origine non valida.', 403);
  }
  if (originHost !== expected) throw new RecordingError('Origine non valida.', 403);
}

/** Token dal cookie di @supabase/ssr: così il recorder resta senza header custom. */
async function cookieToken(): Promise<string> {
  try {
    const jar = await cookies();
    return sessionFromCookies(jar.getAll(), env('NEXT_PUBLIC_SUPABASE_URL'))?.accessToken ?? '';
  } catch {
    return '';
  }
}

/**
 * Accesso staff: Bearer (script, curl) oppure cookie di sessione (pannello).
 * Il ruolo viene dalla allowlist `authorized_users`, mai dai metadata dell'utente.
 */
export async function requireStaff(
  request: Request,
): Promise<{ client: SupabaseClient; user: User }> {
  const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] ?? '';
  const token = bearer || (await cookieToken());
  if (!token) throw new RecordingError('Accesso staff richiesto.', 401);

  const client = serverClient();
  // `getUser(token)` valida il JWT sull'Auth server: non serve un client anon separato.
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new RecordingError('Sessione staff non valida.', 401);

  const role = await getStaffRole(client, data.user);
  if (!role) throw new RecordingError('Accesso staff richiesto.', 403);

  return { client, user: data.user };
}

/**
 * Corpo JSON facoltativo: senza corpo vale `{}`, così un retry di `stop` è un
 * `POST` vuoto che riusa `recorded_ms`, `pauses` e `chunk_count` già salvati.
 * Il corpo di un `create` invece è obbligatorio, e lo dicono i campi mancanti.
 */
export async function readBody(
  request: Request,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  if (!request.body) return {};
  try {
    const raw = await readJson(request, maxBytes);
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }
  } catch {
    // Corpo vuoto, oltre il limite o JSON malformato: un solo messaggio.
  }
  throw new RecordingError('Corpo JSON non valido.');
}

export type RecordingRow = {
  id: string;
  created_by: string;
  mode: RecordingMode;
  title: string;
  location: string | null;
  speaker_label: string | null;
  mime_type: string;
  started_at: string;
  recorded_ms: number;
  pauses: PauseInterval[] | null;
  chunk_count: number;
  status: RecordingStatus;
  note_id: string | null;
  transcript: Transcript | null;
  error: string | null;
  updated_at: string;
};

export async function loadRecording(client: SupabaseClient, id: string): Promise<RecordingRow> {
  const { data, error } = await client
    .from('meeting_recordings')
    .select(
      'id, created_by, mode, title, location, speaker_label, mime_type, started_at, recorded_ms, pauses, chunk_count, status, note_id, transcript, error, updated_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new RecordingError('Registrazione non leggibile.', 500);
  if (!data) throw new RecordingError('Registrazione non trovata.', 404);
  return data as unknown as RecordingRow;
}

export function chunkPath(recordingId: string, index: number): string {
  return `recordings/${recordingId}/chunks/${String(index).padStart(6, '0')}.bin`;
}

export function audioPath(recordingId: string, mimeType: string): string {
  return `recordings/${recordingId}/audio.${extensionForMime(mimeType)}`;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export type RecomposeResult = { buffer: Buffer; missing: number[] };

/**
 * Ricompone i chunk nell'ordine di `index`. Sono fette contigue dello stesso
 * stream `MediaRecorder`, quindi concatenarle ricostruisce il file originale.
 *
 * Se mancano indici non si indovina: si torna la lista dei buchi, così lo stop
 * può rispondere 409 e il client riprova il caricamento invece di produrre un
 * audio mutilato (e una nota sbagliata) senza dirlo.
 */
export async function recompose(
  client: SupabaseClient,
  recordingId: string,
  expectedChunks: number,
): Promise<RecomposeResult> {
  const { data, error } = await client
    .from('meeting_recording_chunks')
    .select('chunk_index, storage_path')
    .eq('recording_id', recordingId)
    .order('chunk_index', { ascending: true });
  if (error) throw new RecordingError('Elenco dei chunk non leggibile.', 500);

  const rows = (data ?? []) as Array<{ chunk_index: number; storage_path: string }>;
  const present = new Set(rows.map((row) => row.chunk_index));
  const missing: number[] = [];
  for (let index = 0; index < expectedChunks; index += 1) {
    if (!present.has(index)) missing.push(index);
  }
  if (missing.length > 0 || rows.length === 0) return { buffer: Buffer.alloc(0), missing };

  const parts: Buffer[] = new Array<Buffer>(rows.length);
  for (let start = 0; start < rows.length; start += RECOMPOSE_CONCURRENCY) {
    const slice = rows.slice(start, start + RECOMPOSE_CONCURRENCY);
    await Promise.all(
      slice.map(async (row, offset) => {
        const { data: blob, error: downloadError } = await client.storage
          .from(BUCKET)
          .download(row.storage_path);
        if (downloadError || !blob) {
          throw new RecordingError(`Chunk ${row.chunk_index} non scaricabile.`, 502);
        }
        parts[start + offset] = Buffer.from(await blob.arrayBuffer());
      }),
    );
  }

  return { buffer: Buffer.concat(parts), missing: [] };
}

let groq: Groq | null = null;

function getGroq(): Groq {
  if (groq) return groq;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new RecordingError('GROQ_API_KEY non configurata: la trascrizione non è disponibile.', 503);
  }
  groq = new Groq({ apiKey });
  return groq;
}

export type SttSegment = { startMs: number; endMs: number; text: string };
export type SttResult = { text: string; durationMs: number; segments: SttSegment[] };

/**
 * Trascrizione con Groq (whisper-large-v3), l'unico motore già in dipendenze.
 * `verbose_json` + `timestamp_granularities: ['segment']` danno gli istanti
 * delle frasi, che servono a datarle sull'orologio di parete.
 *
 * Nota: whisper non fa diarizzazione. Con una traccia per partecipante il nome
 * è quello della traccia; su un mix unico il "chi" non c'è, e va aggiunto
 * cambiando solo questa funzione (AssemblyAI/ElevenLabs) senza toccare il resto.
 */
export async function transcribe(
  buffer: Buffer,
  mimeType: string,
  hint: { title: string; location: string | null },
): Promise<SttResult> {
  if (buffer.byteLength > MAX_AUDIO_BYTES) {
    throw new RecordingError(
      'Audio oltre i 25 MB di whisper-large-v3: spezza la riunione in segmenti più corti (o alza CHUNK_MS/usa un altro motore).',
      413,
    );
  }

  const prompt = [
    `Riunione: ${hint.title}.`,
    hint.location ? `Luogo: ${hint.location}.` : '',
    'Vocabolario: UTTF, Under The Tower Factory, CRM, preventivo, sopralluogo.',
  ]
    .filter(Boolean)
    .join(' ');

  const file = await toFile(new Uint8Array(buffer), `riunione.${extensionForMime(mimeType)}`);
  const raw = await getGroq().audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
    language: 'it',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
    temperature: 0,
    prompt,
  });

  // Il tipo del SDK non si restringe su `response_format`: si legge la forma vera.
  const verbose = raw as unknown as {
    text?: string;
    duration?: number;
    segments?: Array<{ start: number; end: number; text: string }>;
  };

  const segments: SttSegment[] = (verbose.segments ?? [])
    .map((segment) => ({
      startMs: Math.max(0, Math.round((segment.start ?? 0) * 1000)),
      endMs: Math.max(0, Math.round((segment.end ?? 0) * 1000)),
      text: (segment.text ?? '').trim(),
    }))
    .filter((segment) => segment.text.length > 0);

  return {
    text: (verbose.text ?? '').trim(),
    durationMs: Math.round((verbose.duration ?? 0) * 1000),
    segments,
  };
}

/** Dà a ogni frase l'ora reale: `startedAt` + tempo registrato + pause precedenti. */
export function dateSegments(
  startedAtMs: number,
  pauses: PauseInterval[],
  segments: SttSegment[],
  speaker: string | null,
): Sentence[] {
  return segments.map((segment) => ({
    atMs: segment.startMs,
    endMs: segment.endMs,
    at: new Date(wallClockAt(startedAtMs, pauses, segment.startMs)).toISOString(),
    text: segment.text,
    speaker,
  }));
}
