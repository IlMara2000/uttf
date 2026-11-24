'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mediaRecorderMimeType, totalPausedMs } from './audioTime';
import { withWebmDuration } from './webmDuration';
import {
  deleteSession,
  listChunks,
  listOpenSessions,
  markChunkUploaded,
  saveChunk,
  saveSession,
} from './chunkStore';
import { ChunkUploader, sha256Hex } from './uploader';
import type { ChunkStats, PauseInterval, RecorderMode, RecorderStatus, SessionMeta } from './types';

const CHUNK_MS = 5_000;      // ogni quanto MediaRecorder consegna un chunk
const HEARTBEAT_MS = 5_000;  // ogni quanto aggiorniamo IndexedDB
const STALE_MS = 20_000;     // oltre questo silenzio una sessione è da recuperare
const SILENCE_MS = 60_000;   // avviso microfono muto
const SILENCE_RMS = 0.012;

export type UseRecorderOptions = {
  apiBase?: string;
  mode?: RecorderMode;
  audioConstraints?: MediaTrackConstraints;
};

export type StartOptions = {
  title?: string;
  location?: string;
  /** stream già pronto (es. traccia della videochiamata) invece del microfono */
  stream?: MediaStream;
};

export type UseRecorderApi = {
  status: RecorderStatus;
  isActive: boolean;
  /** durata registrata, pause escluse */
  recordedMs: number;
  /** tempo totale passato in pausa */
  pausedMs: number;
  level: number;
  silent: boolean;
  chunkStats: ChunkStats;
  error: string | null;
  startedAt: number | null;
  playbackUrl: string | null;
  pendingSession: SessionMeta | null;
  start: (options?: StartOptions) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<string | null>;
  recoverPending: () => Promise<void>;
  discardPending: () => Promise<void>;
  clearError: () => void;
};

/**
 * Messaggio del server quando c'è, altrimenti il solo codice HTTP: «HTTP 503»
 * non dice perché lo stop è fallito, «GROQ_API_KEY non configurata» sì.
 */
async function failureMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body?.error === 'string' && body.error.trim()) return body.error.trim();
  } catch {
    // corpo non JSON: resta lo status
  }
  return `HTTP ${response.status}`;
}

export function useRecorder(options: UseRecorderOptions = {}): UseRecorderApi {
  const apiBase = options.apiBase ?? '/api';
  const mode = options.mode ?? 'standalone';

  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [recordedMs, setRecordedMs] = useState(0);
  const [pausedMs, setPausedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [silent, setSilent] = useState(false);
  const [chunkStats, setChunkStats] = useState<ChunkStats>({ total: 0, uploaded: 0, failed: 0 });
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<SessionMeta | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ownsStreamRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const mimeRef = useRef('audio/webm');
  const titleRef = useRef('Riunione');
  const locationRef = useRef<string | undefined>(undefined);
  const startedAtRef = useRef(0);
  const recordedBaseRef = useRef(0);   // audio accumulato prima dell'ultima pausa
  const segmentStartRef = useRef(0);   // performance.now() all'ultimo resume (0 = non registra)
  const pauseStartWallRef = useRef(0); // performance.now() all'inizio della pausa
  const pausesRef = useRef<PauseInterval[]>([]);
  const chunkIndexRef = useRef(0);
  const chunkChainRef = useRef<Promise<void>>(Promise.resolve());
  const stoppingRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const lastLevelAtRef = useRef(0);
  const silentSinceRef = useRef<number | null>(null);
  const playbackUrlRef = useRef<string | null>(null);
  const tabIdRef = useRef('');

  const uploader = useMemo(
    () =>
      new ChunkUploader({
        endpoint: (sessionId) => `${apiBase}/recordings/${sessionId}/chunks`,
        maxConcurrent: 2,
        onResult: (job, outcome) => {
          setChunkStats((prev) =>
            outcome === 'uploaded'
              ? { ...prev, uploaded: prev.uploaded + 1 }
              : { ...prev, failed: prev.failed + 1 },
          );
          if (outcome === 'uploaded') void markChunkUploaded(job.sessionId, job.index).catch(() => {});
        },
      }),
    [apiBase],
  );

  // L'id del tab nasce dopo il mount: `Math.random()` durante il render è impuro.
  useEffect(() => {
    tabIdRef.current = Math.random().toString(36).slice(2, 10);
  }, []);

  /** Orologio: tempo registrato (pause escluse) e tempo in pausa. */
  const readClock = useCallback(() => {
    const base = recordedBaseRef.current;
    const segmentStart = segmentStartRef.current;
    const recorded = segmentStart ? base + (performance.now() - segmentStart) : base;
    let paused = totalPausedMs(pausesRef.current);
    if (pauseStartWallRef.current) paused += performance.now() - pauseStartWallRef.current;
    return { recorded, paused };
  }, []);

  const persistSession = useCallback(
    async (patch: Partial<SessionMeta> = {}) => {
      const id = sessionIdRef.current;
      if (!id) return;
      const clock = readClock();
      const meta: SessionMeta = {
        id,
        mode,
        title: titleRef.current,
        location: locationRef.current,
        status: 'recording',
        startedAt: startedAtRef.current,
        recordedMs: Math.round(patch.recordedMs ?? clock.recorded),
        pauses: pausesRef.current.slice(),
        mimeType: mimeRef.current,
        chunkCount: chunkIndexRef.current,
        ownerTabId: tabIdRef.current,
        updatedAt: Date.now(),
        ...patch,
      };
      try {
        await saveSession(meta);
      } catch {
        // Senza IndexedDB si perde solo il recupero, non la registrazione.
      }
    },
    [mode, readClock],
  );

  const cleanupMedia = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (ownsStreamRef.current && streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    // Uno stream passato dalla call non va fermato: è della videochiamata.
    streamRef.current = null;
    ownsStreamRef.current = false;
    silentSinceRef.current = null;
    setLevel(0);
    setSilent(false);
  }, []);

  const startMeter = useCallback((stream: MediaStream) => {
    try {
      const Ctor = window.AudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.fftSize);

      const loop = () => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const now = performance.now();
        if (now - lastLevelAtRef.current > 100) {
          lastLevelAtRef.current = now;
          setLevel((prev) => prev * 0.6 + Math.min(1, rms * 4) * 0.4);
        }
        if (rms < SILENCE_RMS) {
          silentSinceRef.current ??= now;
          if (now - silentSinceRef.current > SILENCE_MS) setSilent(true);
        } else {
          silentSinceRef.current = null;
          setSilent(false);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      // Il misuratore è accessorio: se il browser lo nega, si registra lo stesso.
    }
  }, []);

  const queueChunk = useCallback(
    async (blob: Blob) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId || !blob || blob.size === 0) return;
      const index = chunkIndexRef.current;
      chunkIndexRef.current = index + 1;

      let hash = '';
      try {
        hash = await sha256Hex(blob);
      } catch {
        hash = '';
      }
      try {
        await saveChunk({ sessionId, index, blob, hash, uploaded: false, createdAt: Date.now() });
      } catch {
        // niente IndexedDB: si carica e basta
      }
      setChunkStats((prev) => ({ ...prev, total: prev.total + 1 }));
      uploader.enqueue({ sessionId, index, blob, hash });
    },
    [uploader],
  );

  const buildPlayback = useCallback(
    async (sessionId: string, durationMs: number): Promise<string | null> => {
      try {
        const chunks = await listChunks(sessionId);
        if (chunks.length === 0) return null;
        const raw = new Blob(chunks.map((c) => c.blob), { type: mimeRef.current || 'audio/webm' });
        // MediaRecorder non scrive `Duration`: senza, l'<audio> mostra Infinity.
        const blob = await withWebmDuration(raw, durationMs);
        if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
        const url = URL.createObjectURL(blob);
        playbackUrlRef.current = url;
        return url;
      } catch {
        return null;
      }
    },
    [],
  );

  const start = useCallback(
    async (startOptions: StartOptions = {}) => {
      if (stoppingRef.current) return;
      if (recorderRef.current && recorderRef.current.state !== 'inactive') return;

      setError(null);
      setChunkStats({ total: 0, uploaded: 0, failed: 0 });

      let stream: MediaStream | null = startOptions.stream ?? null;
      try {
        if (!stream) {
          if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Microfono non disponibile: serve HTTPS o localhost.');
          }
          stream = await navigator.mediaDevices.getUserMedia({
            audio: options.audioConstraints ?? {
              // In call l'eco va tolta, in una stanza reale no: taglierebbe le voci lontane.
              echoCancellation: mode === 'call',
              noiseSuppression: mode === 'call',
              autoGainControl: true,
              channelCount: 1,
            },
          });
          ownsStreamRef.current = true;
        }

        const mime = mediaRecorderMimeType();
        const recorder = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
        if (recorder.state !== 'inactive') throw new Error('Registratore già attivo.');

        const startedAtValue = Date.now();
        const response = await fetch(`${apiBase}/recordings`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            mode,
            title: startOptions.title?.trim() || 'Riunione',
            location: startOptions.location?.trim() || null,
            mimeType: recorder.mimeType || mime,
            startedAt: new Date(startedAtValue).toISOString(),
          }),
        });
        if (!response.ok) {
          throw new Error(`Creazione sessione non riuscita: ${await failureMessage(response)}.`);
        }
        const created = (await response.json()) as { id?: string };
        if (!created?.id) throw new Error('Il server non ha restituito l’id della registrazione.');

        sessionIdRef.current = created.id;
        recorderRef.current = recorder;
        streamRef.current = stream;
        mimeRef.current = recorder.mimeType || mime || 'audio/webm';
        titleRef.current = startOptions.title?.trim() || 'Riunione';
        locationRef.current = startOptions.location?.trim() || undefined;
        startedAtRef.current = startedAtValue;
        recordedBaseRef.current = 0;
        segmentStartRef.current = 0;
        pauseStartWallRef.current = 0;
        pausesRef.current = [];
        chunkIndexRef.current = 0;
        chunkChainRef.current = Promise.resolve();

        recorder.ondataavailable = (event: BlobEvent) => {
          // In catena: l'ordine degli indici deve seguire l'ordine dei chunk.
          chunkChainRef.current = chunkChainRef.current
            .then(() => queueChunk(event.data))
            .catch(() => {});
        };
        recorder.onerror = () => {
          setError('Il registratore si è fermato per un errore del browser: l’audio fino a qui è salvato.');
        };

        startMeter(stream);
        segmentStartRef.current = performance.now();
        recorder.start(CHUNK_MS);

        setStartedAt(startedAtValue);
        setRecordedMs(0);
        setPausedMs(0);
        setStatus('recording');
        void persistSession();
      } catch (err) {
        cleanupMedia();
        recorderRef.current = null;
        sessionIdRef.current = null;
        setError(err instanceof Error ? err.message : 'Avvio registrazione non riuscito.');
        setStatus('error');
      }
    },
    [apiBase, cleanupMedia, mode, options.audioConstraints, persistSession, queueChunk, startMeter],
  );

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;

    const recorded = recordedBaseRef.current + (performance.now() - segmentStartRef.current);
    recordedBaseRef.current = recorded;
    segmentStartRef.current = 0;
    pauseStartWallRef.current = performance.now();
    pausesRef.current = [
      ...pausesRef.current,
      { atRecordedMs: Math.round(recorded), durationMs: 0 },
    ];

    recorder.pause();
    setRecordedMs(recorded);
    setStatus('paused');

    void persistSession({ recordedMs: recorded });
  }, [persistSession]);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;

    const pausedFor = pauseStartWallRef.current ? performance.now() - pauseStartWallRef.current : 0;
    const pauses = pausesRef.current.slice();
    const last = pauses[pauses.length - 1];
    if (last) pauses[pauses.length - 1] = { ...last, durationMs: Math.round(pausedFor) };
    pausesRef.current = pauses;
    pauseStartWallRef.current = 0;

    segmentStartRef.current = performance.now();
    recorder.resume();
    setStatus('recording');
    void persistSession();
  }, [persistSession]);

  const stop = useCallback(async (): Promise<string | null> => {
    const recorder = recorderRef.current;
    const id = sessionIdRef.current;
    if (!recorder || !id || stoppingRef.current) return id;

    stoppingRef.current = true;
    setStatus('finalizing');

    // Se si chiude mentre è in pausa, l'intervallo va chiuso adesso.
    if (pauseStartWallRef.current) {
      const pausedFor = performance.now() - pauseStartWallRef.current;
      const pauses = pausesRef.current.slice();
      const last = pauses[pauses.length - 1];
      if (last) pauses[pauses.length - 1] = { ...last, durationMs: Math.round(pausedFor) };
      pausesRef.current = pauses;
      pauseStartWallRef.current = 0;
    }

    const finalRecorded =
      recordedBaseRef.current + (segmentStartRef.current ? performance.now() - segmentStartRef.current : 0);
    recordedBaseRef.current = finalRecorded;
    segmentStartRef.current = 0;
    setRecordedMs(finalRecorded);
    setPausedMs(totalPausedMs(pausesRef.current));

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      if (recorder.state === 'inactive') resolve();
      else recorder.stop();
    });

    cleanupMedia();

    // Aspetta l'ultimo chunk (sha256 + IndexedDB), poi svuota la coda di upload.
    try {
      await chunkChainRef.current;
    } catch {
      /* chunk perso: si procede con quelli che ci sono */
    }
    await uploader.flush(120_000);
    await persistSession({ recordedMs: finalRecorded, status: 'finalizing' });

    try {
      const response = await fetch(`${apiBase}/recordings/${id}/stop`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          recordedMs: Math.round(finalRecorded),
          pauses: pausesRef.current,
          chunkCount: chunkIndexRef.current,
        }),
      });
      if (!response.ok) {
        throw new Error(
          `Chiusura non riuscita: ${await failureMessage(response)} I chunk sono comunque sul server.`,
        );
      }
      await persistSession({ recordedMs: finalRecorded, status: 'closed' });
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chiusura sessione non riuscita.');
      setStatus('error');
    }

    const url = await buildPlayback(id, finalRecorded);
    if (url) setPlaybackUrl(url);

    recorderRef.current = null;
    stoppingRef.current = false;
    return id;
  }, [apiBase, buildPlayback, cleanupMedia, persistSession, uploader]);

  const recoverPending = useCallback(async () => {
    const pending = pendingSession;
    if (!pending) return;

    setStatus('finalizing');
    setError(null);

    sessionIdRef.current = pending.id;
    mimeRef.current = pending.mimeType || 'audio/webm';
    pausesRef.current = pending.pauses ?? [];
    startedAtRef.current = pending.startedAt;
    recordedBaseRef.current = pending.recordedMs;
    setStartedAt(pending.startedAt);
    setRecordedMs(pending.recordedMs);
    setPausedMs(totalPausedMs(pending.pauses ?? []));

    try {
      const chunks = await listChunks(pending.id);
      const notUploaded = chunks.filter((chunk) => !chunk.uploaded);
      setChunkStats({
        total: chunks.length,
        uploaded: chunks.length - notUploaded.length,
        failed: 0,
      });
      for (const chunk of notUploaded) {
        uploader.enqueue({
          sessionId: pending.id,
          index: chunk.index,
          blob: chunk.blob,
          hash: chunk.hash,
        });
      }
      await uploader.flush(180_000);

      const response = await fetch(`${apiBase}/recordings/${pending.id}/stop`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          recordedMs: pending.recordedMs,
          pauses: pending.pauses,
          chunkCount: chunks.length,
        }),
      });
      if (!response.ok) throw new Error(`Chiusura non riuscita: ${await failureMessage(response)}.`);

      await persistSession({ recordedMs: pending.recordedMs, status: 'closed' });
      await saveSession({ ...pending, status: 'closed', updatedAt: Date.now() });

      const url = await buildPlayback(pending.id, pending.recordedMs);
      if (url) setPlaybackUrl(url);
      setPendingSession(null);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recupero della sessione non riuscito.');
      setStatus('error');
    }
  }, [apiBase, buildPlayback, persistSession, pendingSession, uploader]);

  const discardPending = useCallback(async () => {
    if (!pendingSession) return;
    try {
      await deleteSession(pendingSession.id);
    } catch {
      /* niente da cancellare */
    }
    setPendingSession(null);
    setStatus('idle');
  }, [pendingSession]);

  const clearError = useCallback(() => setError(null), []);

  // Orologio a schermo: gira sia in registrazione sia in pausa.
  useEffect(() => {
    if (status !== 'recording' && status !== 'paused') return;
    const timer = window.setInterval(() => {
      const clock = readClock();
      setRecordedMs(clock.recorded);
      setPausedMs(clock.paused);
    }, 250);
    return () => window.clearInterval(timer);
  }, [readClock, status]);

  // Heartbeat: rende la sessione "viva" per non farla recuperare da un altro tab.
  useEffect(() => {
    if (status !== 'recording' && status !== 'paused') return;
    const timer = window.setInterval(() => void persistSession(), HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [persistSession, status]);

  // Alla chiusura della pagina il browser avvisa.
  useEffect(() => {
    if (status !== 'recording' && status !== 'paused') return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [status]);

  // Sessione interrotta: la offriamo solo se non c'è un altro tab che la sta tenendo viva.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const open = await listOpenSessions();
        const stale = open
          .filter((meta) => Date.now() - meta.updatedAt > STALE_MS)
          .sort((a, b) => b.updatedAt - a.updatedAt);
        if (!cancelled && stale.length > 0 && !sessionIdRef.current) {
          setPendingSession(stale[0]);
        }
      } catch {
        // Senza IndexedDB non c'è recupero possibile.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      cleanupMedia();
      if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
    },
    [cleanupMedia],
  );

  return {
    status,
    isActive: status === 'recording' || status === 'paused',
    recordedMs,
    pausedMs,
    level,
    silent,
    chunkStats,
    error,
    startedAt,
    playbackUrl,
    pendingSession,
    start,
    pause,
    resume,
    stop,
    recoverPending,
    discardPending,
    clearError,
  };
}
