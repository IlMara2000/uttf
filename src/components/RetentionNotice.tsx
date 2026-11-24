'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Status = {
  outcome: 'ok' | 'error' | null;
  executedAt: string | null;
  mode: string | null;
  errors: string[];
  pruned: number;
  alerts: string[];
};

/**
 * Avviso nell'area staff quando l'ultimo giro di conservazione dati è fallito.
 *
 * Non dipende da Sentry né da webhook: legge `latest.json` dal bucket delle
 * tracce tramite una route riservata allo staff. Se manca la traccia o la
 * lettura fallisce non mostra nulla: meglio nessun banner di un falso allarme.
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

  if (!status || status.outcome !== 'error') return null;

  const when = status.executedAt
    ? new Date(status.executedAt).toLocaleString('it-IT', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'orario non registrato';

  return (
    <div
      role="alert"
      className="border-b-2 border-red-500 bg-red-950 px-4 py-3 text-sm text-red-50"
    >
      <p className="flex items-center gap-2 font-bold">
        <AlertTriangle size={16} aria-hidden />
        Conservazione dati non riuscita
      </p>
      <p className="mt-1 text-red-200">
        Ultimo giro: {when}
        {status.mode ? ` (${status.mode})` : ''}. I dati scaduti potrebbero non
        essere stati cancellati.
      </p>
      {status.errors.length > 0 && (
        <p className="mt-1 text-red-200">Errori: {status.errors.join(' · ')}</p>
      )}
    </div>
  );
}
