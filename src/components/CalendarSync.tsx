'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarPlus,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { FeedScope } from '@/lib/calendar-filter';

type CalendarLinks = { httpsUrl: string; webcalUrl: string };

type GoogleStatus = {
  configured: boolean;
  ready: boolean;
  connected: boolean;
  email: string | null;
  lastSyncedAt: string | null;
};

type Person = {
  id: string;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
};

const personLabel = (person: Person) =>
  person.username ||
  person.full_name ||
  (person.email ? person.email.split('@')[0] : 'Account');

const GOOGLE_ADD_BY_URL =
  'https://calendar.google.com/calendar/u/0/r/settings/addbyurl';

export default function CalendarSync() {
  const [links, setLinks] = useState<CalendarLinks | null>(null);
  const [google, setGoogle] = useState<GoogleStatus | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const [busy, setBusy] = useState<'connect' | 'sync' | 'disconnect' | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [scope, setScope] = useState<FeedScope>('all');
  const [assignee, setAssignee] = useState('');
  const [people, setPeople] = useState<Person[]>([]);

  const feedUrls = useMemo(() => {
    if (!links) return null;
    const url = new URL(links.httpsUrl);
    if (scope !== 'all') url.searchParams.set('scope', scope);
    if (assignee) url.searchParams.set('assignee', assignee);
    const https = url.toString();
    return { https, webcal: https.replace(/^https:/, 'webcal:') };
  }, [links, scope, assignee]);

  const staffFetch = useCallback(async (path: string, init?: RequestInit) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sessione scaduta.');

    return fetch(path, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: 'no-store',
    });
  }, []);

  const syncNow = useCallback(
    async (force: boolean, announce = true) => {
      if (announce) setBusy('sync');
      try {
        const response = await staffFetch('/api/calendar/google/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force }),
        });
        const payload = (await response.json()) as {
          imported?: number;
          removed?: number;
          lastSyncedAt?: string | null;
          connected?: boolean;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || 'Sincronizzazione non riuscita.');

        if (payload.imported || payload.removed)
          window.dispatchEvent(new Event('refreshCalendar'));

        setGoogle((current) =>
          current
            ? { ...current, lastSyncedAt: payload.lastSyncedAt ?? current.lastSyncedAt }
            : current,
        );

        if (announce)
          setNotice(
            payload.connected === false
              ? 'Google Calendar non collegato.'
              : `${payload.imported ?? 0} eventi importati, ${payload.removed ?? 0} rimossi.`,
          );
      } catch (err) {
        if (announce)
          setNotice(err instanceof Error ? err.message : 'Sincronizzazione non riuscita.');
      } finally {
        if (announce) setBusy(null);
      }
    },
    [staffFetch],
  );

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await staffFetch('/api/calendar/link');
        if (!response.ok) throw new Error('link');
        const payload = (await response.json()) as CalendarLinks;
        if (active) setLinks(payload);
      } catch {
        if (active) setError(true);
      }

      try {
        const response = await staffFetch('/api/calendar/google');
        if (!response.ok || !active) return;
        const status = (await response.json()) as GoogleStatus;
        if (!active) return;
        setGoogle(status);
        if (status.connected) await syncNow(false, false);
      } catch {
        /* Lo stato Google non blocca il feed in sola lettura. */
      }
    })();

    return () => {
      active = false;
    };
  }, [staffFetch, syncNow]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, username, full_name')
        .order('username', { ascending: true });
      if (data) setPeople(data as Person[]);
    })();
  }, []);

  const copy = async () => {
    if (!feedUrls) return;
    try {
      await navigator.clipboard.writeText(feedUrls.https);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
  };

  const connect = async () => {
    setBusy('connect');
    setNotice(null);
    try {
      const response = await staffFetch('/api/calendar/google/connect', {
        method: 'POST',
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url)
        throw new Error(payload.error || 'Connessione non disponibile.');
      window.location.href = payload.url;
    } catch (err) {
      setBusy(null);
      setNotice(err instanceof Error ? err.message : 'Connessione non disponibile.');
    }
  };

  const disconnect = async () => {
    if (
      !confirm(
        'Scollegare Google Calendar? Gli eventi importati verranno rimossi dal calendario.',
      )
    )
      return;

    setBusy('disconnect');
    setNotice(null);
    try {
      const response = await staffFetch('/api/calendar/google', {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Scollegamento non riuscito.');
      setGoogle((current) =>
        current
          ? { ...current, connected: false, email: null, lastSyncedAt: null }
          : current,
      );
      window.dispatchEvent(new Event('refreshCalendar'));
      setNotice('Google Calendar scollegato.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Scollegamento non riuscito.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/20 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-3 border-b border-zinc-800/80 bg-zinc-950/30 p-4 md:p-5">
        <CalendarPlus className="shrink-0 text-[#FF914D]" size={18} />
        <div className="min-w-0">
          <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#FF914D]">
            Sincronizzazione
          </p>
          <h2 className="truncate text-sm font-semibold tracking-tight text-white">
            Planner su Apple e Google Calendar
          </h2>
        </div>
      </div>

      <div className="space-y-5 p-4 md:p-5">
        {error ? (
          <p className="text-[11px] font-mono uppercase text-zinc-500">
            Link calendario non disponibile. Ricarica la pagina o chiedi a un
            amministratore.
          </p>
        ) : !links ? (
          <p className="inline-flex items-center gap-2 text-[11px] font-mono uppercase text-zinc-500">
            <Loader2 size={14} className="animate-spin" /> Preparazione link…
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500">
                Contenuto
                <select
                  value={scope}
                  onChange={(event) => setScope(event.target.value as FeedScope)}
                  className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-xs font-semibold normal-case tracking-normal text-zinc-200 outline-none focus:border-[#FF914D]/40"
                >
                  <option value="all">Tutto il planner</option>
                  <option value="shifts">Solo turni in sede</option>
                  <option value="tasks">Solo task</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500">
                Persona
                <select
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                  className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-xs font-semibold normal-case tracking-normal text-zinc-200 outline-none focus:border-[#FF914D]/40"
                >
                  <option value="">Tutte le persone</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {personLabel(person)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-[10px] text-zinc-500">
              Cambiando i filtri cambia il link: va aggiunto di nuovo al
              calendario.
            </p>

            <div className="space-y-2">
              <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500">
                Indirizzo del feed
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-white/5 bg-black/40 p-3 text-[10px] font-mono text-zinc-300">
                  {feedUrls?.https ?? ''}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#FF914D] px-4 text-xs font-semibold text-zinc-950 transition-opacity hover:opacity-95"
                >
                  {copied === 'done' ? <Check size={16} /> : <Copy size={16} />}
                  {copied === 'done' ? 'Copiato' : 'Copia link'}
                </button>
              </div>
              <p aria-live="polite" className="text-[10px] text-zinc-500">
                {copied === 'failed'
                  ? 'Copia non riuscita: seleziona il link e copialo a mano.'
                  : 'Il feed è in sola lettura: le modifiche restano nel gestionale.'}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-black/25 p-4">
                <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#FF914D]">
                  Google Calendar
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  Apri Google Calendar, scegli «Altri calendari → Da URL» e
                  incolla qui il link. Google aggiorna i feed esterni ogni
                  12-24 ore.
                </p>
                <a
                  href={GOOGLE_ADD_BY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#FF914D] underline underline-offset-4"
                >
                  Aggiungi da URL <ExternalLink size={14} />
                </a>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/25 p-4">
                <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#FF914D]">
                  Apple Calendar
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  Su Mac apri l&apos;abbonamento qui sotto. Su iPhone:
                  Impostazioni → Calendario → Account → Altro → Aggiungi
                  calendario con abbonamento, incollando il link.
                </p>
                <a
                  href={feedUrls?.webcal ?? '#'}
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#FF914D] underline underline-offset-4"
                >
                  Apri in Apple Calendar <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#FF914D]">
                  Google Calendar · import eventi
                </p>
                {google?.connected && (
                  <span className="inline-flex items-center gap-2 text-[9px] font-mono uppercase text-zinc-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Collegato
                  </span>
                )}
              </div>

              {!google ? (
                <p className="mt-2 text-[11px] font-mono uppercase text-zinc-500">
                  Stato non disponibile.
                </p>
              ) : !google.ready ? (
                <p className="mt-2 text-xs leading-relaxed text-amber-300">
                  Esegui la migrazione google-calendar-tables.sql nel SQL editor
                  di Supabase per attivare l&apos;import.
                </p>
              ) : !google.configured ? (
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  Richiede <code className="text-zinc-300">GOOGLE_CLIENT_ID</code>{' '}
                  e <code className="text-zinc-300">GOOGLE_CLIENT_SECRET</code>.
                  Finché non sono impostate, il calendario resta in sola
                  esportazione.
                </p>
              ) : !google.connected ? (
                <>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    Collega il tuo account Google per portare nel planner gli
                    eventi del calendario. Accesso in sola lettura: il gestionale
                    non modifica Google.
                  </p>
                  <button
                    type="button"
                    onClick={() => void connect()}
                    disabled={busy !== null}
                    className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#FF914D] px-4 text-xs font-semibold text-zinc-950 transition-opacity hover:opacity-95 disabled:opacity-50"
                  >
                    {busy === 'connect' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CalendarPlus size={16} />
                    )}
                    Collega Google Calendar
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    {google.email} · ultimo sync{' '}
                    {google.lastSyncedAt
                      ? new Date(google.lastSyncedAt).toLocaleString('it-IT')
                      : 'mai'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void syncNow(true)}
                      disabled={busy !== null}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#FF914D] px-4 text-xs font-semibold text-zinc-950 transition-opacity hover:opacity-95 disabled:opacity-50"
                    >
                      {busy === 'sync' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                      Sincronizza ora
                    </button>
                    <button
                      type="button"
                      onClick={() => void disconnect()}
                      disabled={busy !== null}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-xs font-semibold text-zinc-300 transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                    >
                      {busy === 'disconnect' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <LogOut size={16} />
                      )}
                      Scollega
                    </button>
                  </div>
                </>
              )}

              {notice && (
                <p aria-live="polite" className="mt-2 text-[10px] text-zinc-400">
                  {notice}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
