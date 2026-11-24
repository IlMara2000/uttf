'use client';

import { useCallback, useRef, useState } from 'react';
import { formatClock } from './audioTime';
import { useRecorder } from './useRecorder';
import type { RecorderMode } from './types';

export type RecorderPanelProps = {
  /** prefisso delle API del gestionale, es. "/api" */
  apiBase?: string;
  mode?: RecorderMode;
  title?: string;
  location?: string;
  /** Modalità A: passa qui la traccia della videochiamata invece del microfono */
  sourceStream?: MediaStream | null;
  onStopped?: (sessionId: string) => void;
  className?: string;
};

export function RecorderPanel({
  apiBase = '/api',
  mode = 'standalone',
  title = 'Riunione',
  location,
  sourceStream = null,
  onStopped,
  className,
}: RecorderPanelProps) {
  const [sessionTitle, setSessionTitle] = useState(title);
  const [sessionLocation, setSessionLocation] = useState(location ?? '');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rec = useRecorder({ apiBase, mode });

  const busy = rec.status === 'finalizing';
  const active = rec.isActive;

  const handleStart = useCallback(() => {
    void rec.start({
      title: sessionTitle,
      location: sessionLocation || undefined,
      stream: sourceStream ?? undefined,
    });
  }, [rec, sessionTitle, sessionLocation, sourceStream]);

  const handleStop = useCallback(() => {
    void rec.stop().then((id) => {
      if (id) onStopped?.(id);
    });
  }, [onStopped, rec]);

  const statusLabel =
    rec.status === 'recording'
      ? '● REC'
      : rec.status === 'paused'
        ? '❚❚ IN PAUSA'
        : rec.status === 'finalizing'
          ? 'Caricamento…'
          : rec.status === 'done'
            ? 'Salvata'
            : rec.status === 'error'
              ? 'Errore'
              : 'Pronta';

  return (
    <section
      className={['rec-panel', className].filter(Boolean).join(' ')}
      aria-label="Registrazione riunione"
    >
      {rec.pendingSession ? (
        <div className="rec-recovery" role="alert">
          <p>
            <strong>Sessione interrotta trovata</strong> — «{rec.pendingSession.title}»,{' '}
            {formatClock(rec.pendingSession.recordedMs)} già registrati il{' '}
            {new Date(rec.pendingSession.startedAt).toLocaleString('it-IT')}.
          </p>
          <div className="rec-row">
            <button
              type="button"
              className="rec-btn rec-btn--primary"
              onClick={() => void rec.recoverPending()}
              disabled={busy}
            >
              Recupera e trascrivi
            </button>
            <button
              type="button"
              className="rec-btn"
              onClick={() => void rec.discardPending()}
              disabled={busy}
            >
              Scarta
            </button>
          </div>
        </div>
      ) : null}

      <header className="rec-head">
        <span className={`rec-pill rec-pill--${rec.status}`} aria-live="polite">
          {statusLabel}
        </span>
        <span className="rec-timer" aria-label={`Tempo registrato ${formatClock(rec.recordedMs)}`}>
          {formatClock(rec.recordedMs)}
        </span>
        {rec.pausedMs >= 1000 ? (
          <span className="rec-paused">in pausa {formatClock(rec.pausedMs)}</span>
        ) : null}
      </header>

      <div className="rec-level" aria-hidden="true">
        <span style={{ width: `${Math.round(rec.level * 100)}%` }} />
      </div>

      {!active && !busy ? (
        <div className="rec-row">
          <input
            className="rec-input"
            value={sessionTitle}
            onChange={(event) => setSessionTitle(event.target.value)}
            placeholder="Titolo riunione"
            aria-label="Titolo riunione"
          />
          <input
            className="rec-input"
            value={sessionLocation}
            onChange={(event) => setSessionLocation(event.target.value)}
            placeholder="Luogo / sala"
            aria-label="Luogo"
          />
        </div>
      ) : null}

      <div className="rec-row">
        <button
          type="button"
          className="rec-btn rec-btn--rec"
          onClick={handleStart}
          disabled={active || busy}
        >
          REC
        </button>

        {rec.status === 'paused' ? (
          <button type="button" className="rec-btn" onClick={rec.resume} disabled={busy}>
            Riprendi
          </button>
        ) : (
          <button
            type="button"
            className="rec-btn"
            onClick={rec.pause}
            disabled={rec.status !== 'recording'}
          >
            Pausa
          </button>
        )}

        <button
          type="button"
          className="rec-btn rec-btn--stop"
          onClick={handleStop}
          disabled={!active}
        >
          Stop
        </button>

        <button
          type="button"
          className="rec-btn"
          onClick={() => void audioRef.current?.play()}
          disabled={!rec.playbackUrl}
        >
          ▶ Play
        </button>
      </div>

      {rec.silent ? (
        <p className="rec-warn">
          Microfono silenzioso da oltre un minuto: controlla che stia captando la stanza.
        </p>
      ) : null}

      {rec.chunkStats.total > 0 ? (
        <p className="rec-meta">
          Chunk audio: {rec.chunkStats.uploaded}/{rec.chunkStats.total}
          {rec.chunkStats.failed > 0
            ? ` · ${rec.chunkStats.failed} in attesa di retry`
            : ''}
        </p>
      ) : null}

      {rec.error ? (
        <p className="rec-error" role="alert">
          {rec.error}
        </p>
      ) : null}

      {rec.playbackUrl ? (
        <div className="rec-playback">
          <audio ref={audioRef} controls src={rec.playbackUrl} preload="metadata" />
          <a className="rec-link" href={rec.playbackUrl} download>
            Scarica
          </a>
        </div>
      ) : null}
    </section>
  );
}
