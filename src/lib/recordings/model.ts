/**
 * Regole condivise dagli endpoint di registrazione: niente import di Next o
 * Supabase, così i calcoli (ora di parete, validazione) si provano da soli.
 * Il client ha la stessa matematica in `components/recorder/audioTime.ts`.
 */

export type RecordingMode = 'call' | 'standalone';
export type RecordingStatus = 'recording' | 'stopped' | 'transcribing' | 'ready' | 'failed';

/** Ancorata al tempo REGISTRATO: `atRecordedMs` è quanto audio c'era già. */
export type PauseInterval = { atRecordedMs: number; durationMs: number };

/** Una frase del trascritto, già datata sull'orologio di parete. */
export type Sentence = {
  /** inizio in tempo registrato (pause escluse) */
  atMs: number;
  endMs: number;
  /** ISO dell'ora reale in cui è stata detta */
  at: string;
  text: string;
  /** valorizzato solo per sessioni a un solo parlante (una traccia per persona) */
  speaker: string | null;
};

export type Transcript = { text: string; sentences: Sentence[] };

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_CHUNK_BYTES = 4 * 1024 * 1024;
export const MAX_CHUNKS = 6_000;
export const MAX_RECORDED_MS = 8 * 60 * 60_000;
export const MAX_PAUSES = 500;
/** Limite di whisper-large-v3 su Groq: oltre, l'audio va spezzato. */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** Stringa ripulita e tagliata; `null` se manca o è vuota. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

export function sanitizePauses(value: unknown): PauseInterval[] | null {
  if (!Array.isArray(value) || value.length > MAX_PAUSES) return null;
  const pauses: PauseInterval[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const { atRecordedMs, durationMs } = entry as Record<string, unknown>;
    const at = Number(atRecordedMs);
    const duration = Number(durationMs);
    if (!Number.isFinite(at) || !Number.isFinite(duration)) return null;
    if (at < 0 || duration < 0 || at > MAX_RECORDED_MS || duration > MAX_RECORDED_MS) return null;
    pauses.push({ atRecordedMs: Math.round(at), durationMs: Math.round(duration) });
  }
  return pauses.sort((a, b) => a.atRecordedMs - b.atRecordedMs);
}

export function totalPausedMs(pauses: PauseInterval[]): number {
  return pauses.reduce((sum, pause) => sum + pause.durationMs, 0);
}

/**
 * Tempo registrato → ora di parete. Le pause sono tempo che l'audio non
 * contiene, quindi vanno aggiunte a ogni istante successivo al loro inizio.
 */
export function wallClockAt(startedAt: number, pauses: PauseInterval[], recordedMs: number): number {
  const extra = pauses
    .filter((pause) => pause.atRecordedMs <= recordedMs)
    .reduce((sum, pause) => sum + pause.durationMs, 0);
  return startedAt + recordedMs + extra;
}

export function extensionForMime(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg')) return 'mp3';
  return 'webm';
}

/** 65_000 → "01:05", 3_725_000 → "1:02:05" */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** "15:04:12" */
export function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** "23/11/2026, 15:04" */
export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Corpo della nota: intestazione con durata e pause, poi la cronologia delle
 * frasi con l'ora reale. Se `speaker` è valorizzato (una traccia per persona)
 * la riga dice anche chi parlava.
 */
export function buildNoteContent(input: {
  title: string;
  location: string | null;
  mode: RecordingMode;
  startedAt: number;
  recordedMs: number;
  pauses: PauseInterval[];
  sentences: Sentence[];
  audioPath: string | null;
}): string {
  const pausedMs = totalPausedMs(input.pauses);
  const end = input.startedAt + input.recordedMs + pausedMs;
  const lines: string[] = [
    `**${input.title}** — ${input.mode === 'call' ? 'audio della videochiamata' : 'riunione in presenza'}`,
    `**Registrazione**: ${formatDateTime(input.startedAt)} → ${formatTime(end)} (${formatClock(
      input.recordedMs,
    )} di audio${pausedMs > 0 ? `, ${formatClock(pausedMs)} in pausa` : ''})`,
  ];
  if (input.location) lines.push(`**Luogo**: ${input.location}`);
  if (input.audioPath) lines.push(`**Audio**: ${input.audioPath}`);
  lines.push('', '### Chi ha detto cosa, quando', '');
  if (input.sentences.length === 0) {
    lines.push('_Nessuna frase riconosciuta: audio vuoto, troppo basso o non trascrivibile._');
  } else {
    for (const sentence of input.sentences) {
      const who = sentence.speaker ? `**${sentence.speaker}** · ` : '';
      lines.push(`- **${formatTime(Date.parse(sentence.at))}** · ${who}${sentence.text}`);
    }
  }
  return lines.join('\n');
}
