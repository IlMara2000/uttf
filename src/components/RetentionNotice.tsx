'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Status = {
  outcome: 'ok' | 'error' | null;
  executedAt: string | null;
  mode: string | null;
  errors: string[];
  stale: boolean;
  deferred: boolean;
};

/**
 * Avviso nell'area staff quando l'ultimo giro di conservazione dati è fallito
 * oppure non è partito da più di 36 ore.
 *
 * Non dipende da Sentry né da webhook: legge `latest.json`, che contiene solo i
 * giri dello scheduler, tramite una route riservata allo staff. Errori di rete
 * o traccia
 * illeggibile non mostrano nulla: meglio nessun banner di un falso allarme.
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
  const isStale = status.stale === true;
  const isError = status.outcome === 'error';

  const when = status.executedAt
    ? new Date(status.executedAt).toLocaleString('it-IT', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'mai registrato';

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
          Ultimo giro: {when}. Si è fermato al limite di lavoro per esecuzione: il
          resto verrà elaborato al prossimo giro.
        </p>
      </div>
    );
  }

  const title = isError
    ? 'Conservazione dati non riuscita'
    : 'Nessun giro recente di conservazione dati';
  const detail = isStale
    ? `Ultimo giro: ${when}${status.mode ? ` (${status.mode})` : ''}. Il giro automatico delle 03:00 UTC potrebbe non essere partito.`
    : `Ultimo giro: ${when}${status.mode ? ` (${status.mode})` : ''}. I dati scaduti potrebbero non essere stati cancellati.`;

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
