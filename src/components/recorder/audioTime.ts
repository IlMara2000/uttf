import type { PauseInterval, SessionMeta } from './types';

/** 65_000 → "01:05", 3_725_000 → "1:02:05" */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${String(m).padStart(2, '0')}:${ss}`;
}

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

/** Formato migliore supportato dal browser ('' = lascia decidere al browser). */
export function mediaRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const candidate of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    } catch {
      /* alcuni browser lanciano su tipi sconosciuti */
    }
  }
  return '';
}

export function extensionForMime(mime: string): string {
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4')) return 'm4a';
  return 'webm';
}

export function totalPausedMs(pauses: PauseInterval[]): number {
  return pauses.reduce((sum, p) => sum + (p.durationMs || 0), 0);
}

/**
 * Converte un istante del trascritto (tempo registrato, pause escluse)
 * nell'ora di parete in cui è stato detto.
 * Esempio: registrazione iniziata alle 15:00:00, pausa di 4 min dopo 10 min
 * → il minuto 12:00 del trascritto è alle 15:16:00 reali.
 */
export function wallClockAt(
  session: Pick<SessionMeta, 'startedAt' | 'pauses'>,
  recordedMs: number,
): number {
  const extra = (session.pauses ?? [])
    .filter((p) => p.atRecordedMs <= recordedMs)
    .reduce((sum, p) => sum + (p.durationMs || 0), 0);
  return session.startedAt + recordedMs + extra;
}

/** "23/11/2026, 15:04" in italiano, senza dipendenze. */
export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
