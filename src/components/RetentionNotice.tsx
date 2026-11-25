'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type FilesStatus = {
  executedAt: string | null;
  orphans: number;
  missing: number;
  unreadable: number;
  samples: string[];
  error: string | null;
  stale: boolean;
};

type Status = {
  outcome: 'ok' | 'error' | null;
  executedAt: string | null;
  mode: string | null;
  errors: string[];
  stale: boolean;
  deferred: boolean;
  files: FilesStatus | null;
};

function when(value: string | null) {
  return value
    ? new Date(value).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
    : 'mai registrato';
}

/**
 * Avviso nell'area staff quando l'ultimo giro di conservazione dati è fallito,
 * non è partito da più di 36 ore o si è fermato al limite di lavoro, e quando
 * il controllo settimanale degli allegati trova orfani o mancanti.
 *
 * Non dipende da Sentry né da webhook: legge `latest.json` e `files-audit.json`
 * tramite una route riservata allo staff. Errori di rete o traccia illeggibile
 * non mostrano nulla: meglio nessun banner di un falso allarme.
 */
export default function RetentionNotice() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;
        const response = await fetch('/api/maintenance/retention/status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        if (!response.ok) return;
        const data = (await response.json()) as Status;
        if (alive) setStatus(data);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!status) return null;
  return (
    <>
      <RetentionBanner status={status} />
      <FilesBanner files={status.files} />
    </>
  );
}

function RetentionBanner({ status }: { status: Status }) {
  const isStale = status.stale === true;
  const isError = status.outcome === 'error';

  // Giro fermato dal limite di lavoro: non è un errore, ma il lavoro non è
  // finito e lo staff deve saperlo.
  if (!isError && !isStale) {
    if (status.deferred !== true) return null;
    return (
      <div
        role="status"
        className="border-b-2 border-amber-500 bg-amber-950 px-4 py-3 text-sm text-amber-50"
      >
        <p className="flex items-center gap-2 font-bold">
          <Clock size={16} aria-hidden />
          Conservazione dati in più giri
        </p>
        <p className="mt-1 text-amber-200">
          Ultimo giro: {when(status.executedAt)}. Si è fermato al limite di lavoro per
          esecuzione: il resto verrà elaborato al prossimo giro.
        </p>
      </div>
    );
  }

  const title = isError
    ? 'Conservazione dati non riuscita'
    : 'Nessun giro recente di conservazione dati';
  const detail = isStale
    ? `Ultimo giro: ${when(status.executedAt)}${status.mode ? ` (${status.mode})` : ''}. Il giro automatico delle 03:00 UTC potrebbe non essere partito.`
    : `Ultimo giro: ${when(status.executedAt)}${status.mode ? ` (${status.mode})` : ''}. I dati scaduti potrebbero non essere stati cancellati.`;

  return (
    <div
      role="alert"
      className="border-b-2 border-red-500 bg-red-950 px-4 py-3 text-sm text-red-50"
    >
      <p className="flex items-center gap-2 font-bold">
        <AlertTriangle size={16} aria-hidden />
        {title}
      </p>
      <p className="mt-1 text-red-200">{detail}</p>
      {status.errors.length > 0 && (
        <p className="mt-1 text-red-200">Errori: {status.errors.join(' · ')}</p>
      )}
    </div>
  );
}

function FilesBanner({ files }: { files: FilesStatus | null }) {
  if (!files) return null;
  const problems = files.orphans + files.missing + files.unreadable;
  // Un controllo vecchio vale come un controllo mancato: senza questo caso il
  // banner mostrerebbe per sempre l'ultimo esito "pulito" e tacerebbe se il
  // cron settimanale smettesse di partire.
  if (problems === 0 && !files.error && !files.stale) return null;

  const hasFindings = problems > 0 || files.error !== null;
  const title = hasFindings
    ? "Allegati dell'archivio da verificare"
    : 'Nessun controllo recente degli allegati';
  const detail = hasFindings
    ? `Controllo del ${when(files.executedAt)}: ${files.orphans} orfani, ${files.missing} mancanti${
        files.unreadable > 0 ? `, ${files.unreadable} righe illeggibili` : ''
      }. Nessun dato è stato modificato.`
    : `Ultimo controllo: ${when(files.executedAt)}, più di 8 giorni fa. Il controllo settimanale potrebbe non essere partito.`;

  return (
    <div
      role="status"
      className="border-b-2 border-amber-500 bg-amber-950 px-4 py-3 text-sm text-amber-50"
    >
      <p className="flex items-center gap-2 font-bold">
        <AlertTriangle size={16} aria-hidden />
        {title}
      </p>
      <p className="mt-1 text-amber-200">{detail}</p>
      {hasFindings && files.samples.length > 0 && (
        <p className="mt-1 text-amber-200">Esempi: {files.samples.join(' · ')}</p>
      )}
      {files.error && (
        <p className="mt-1 text-amber-200">Controllo non riuscito: {files.error}</p>
      )}
    </div>
  );
}
