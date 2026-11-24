"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Folder, Download, ChevronLeft, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStaffRole } from "@/lib/staff-access";
import {
  responseText,
  type RegistrationAnswers,
  type RegistrationConfig,
} from "@/lib/registrations/model";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
type Entry = {
  id: string;
  created_at: string;
  activity_title: string;
  participant_name: string;
  status: string;
  lab_slug: string;
  stale?: boolean;
};
type Detail = Entry & {
  snapshot: { responses: RegistrationAnswers; config: RegistrationConfig };
  files: { name: string }[];
};
const statusLabels: Record<string, string> = {
  received: "In attesa di verifica",
  reviewed: "Documenti verificati",
  declined: "Non accolta",
};
export default function RegistrationsArchivePage() {
  return (
    <Suspense
      fallback={<p className="p-5 md:p-10 text-zinc-400">Caricamento…</p>}
    >
      <RegistrationsArchive />
    </Suspense>
  );
}
function RegistrationsArchive() {
  // I filtri vivono anche nell'URL: ricaricando il link la vista resta quella.
  const params = useSearchParams();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [search, setSearch] = useState(() => params.get("search") ?? "");
  const [filter, setFilter] = useState(() => params.get("activity") ?? "");
  const [statusFilter, setStatusFilter] = useState(() => {
    const value = params.get("status") ?? "";
    return ["received", "reviewed", "declined"].includes(value) ? value : "";
  });
  const [onlyWaiting, setOnlyWaiting] = useState(
    () => params.get("waiting") === "1",
  );
  const [labs, setLabs] = useState<{ slug: string; title: string }[]>([]);
  const [page, setPage] = useState(() => {
    const value = Number(params.get("page"));
    return Number.isInteger(value) && value > 0 ? value : 0;
  });
  const [total, setTotal] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  // Falso finché un caricamento non è concluso: lo stato vuoto non deve
  // comparire mentre le righe stanno ancora arrivando.
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState(false);
  const [working, setWorking] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  async function request(path: string, init: RequestInit = {}) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session)
      throw new Error("Accedi all’Area Staff per consultare le iscrizioni.");
    const r = await fetch(path, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: "no-store",
    });
    if (!r.ok) {
      let message = "Operazione non riuscita.";
      try {
        message = (await r.json()).error || message;
      } catch {}
      throw new Error(message);
    }
    return r;
  }
  const load = useCallback(async () => {
    setLoading(true);
    setReady(false);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        search,
        activity: filter,
        status: onlyWaiting ? "" : statusFilter,
        waiting: onlyWaiting ? "1" : "",
      });
      const data = await (await request(`/api/registrations?${params}`)).json();
      setEntries(data.registrations);
      setTotal(data.total);
      setWaiting(data.waitingTooLong ?? 0);
      setSelected(new Set());
      // Un esito vecchio non deve restare accanto a un elenco ricaricato.
      setNotice("");
    } catch (e) {
      setEntries([]);
      setError(e instanceof Error ? e.message : "Archivio non disponibile.");
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [page, search, filter, statusFilter, onlyWaiting]);
  // L'URL riflette i filtri con replaceState: nessuna navigazione, nessuna
  // voce di cronologia, e ricaricando il link non si perde la vista.
  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    if (filter) next.set("activity", filter);
    if (onlyWaiting) next.set("waiting", "1");
    else if (statusFilter) next.set("status", statusFilter);
    if (page > 0) next.set("page", String(page));
    const query = next.toString();
    const timer = setTimeout(() => {
      window.history.replaceState(
        null,
        "",
        query ? `?${query}` : window.location.pathname,
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filter, statusFilter, onlyWaiting, page]);
  useEffect(() => {
    let alive = true;
    let generation = 0;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = ++generation;
      setAccess(false);
      setEntries([]);
      setReady(false);
      setDetail(null);
      if (!session) {
        setLoading(false);
        setError("Accedi all’Area Staff per consultare le iscrizioni.");
        return;
      }
      setTimeout(() => {
        void getStaffRole(supabase, session.user)
          .then((role) => {
            if (!alive || current !== generation) return;
            if (!role) {
              setError("Accesso riservato allo staff autorizzato.");
              setLoading(false);
              return;
            }
            setAccess(true);
          })
          .catch(() => {
            if (alive) {
              setLoading(false);
              setError("Impossibile verificare l’accesso.");
            }
          });
      }, 0);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!access) return;
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [access, load]);
  useEffect(() => {
    if (access)
      void supabase
        .from("labs")
        .select("slug,title")
        .then(({ data }) => setLabs(data || []));
  }, [access]);
  async function open(id: string) {
    setWorking(true);
    setError("");
    try {
      setDetail(
        (await (await request(`/api/registrations?id=${id}`)).json())
          .registration,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento.");
    } finally {
      setWorking(false);
    }
  }
  async function download(name?: string) {
    if (!detail) return;
    setWorking(true);
    setError("");
    try {
      const params = new URLSearchParams({
        id: detail.id,
        ...(name ? { file: name } : { zip: "1" }),
      });
      const r = await request(`/api/registrations?${params}`);
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download =
        name ||
        `${detail.participant_name.replace(/[^\p{L}\p{N} -]/gu, "")}_${detail.id.slice(0, 8)}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download non riuscito.");
    } finally {
      setWorking(false);
    }
  }
  async function setStatus(status: "received" | "reviewed" | "declined") {
    if (!detail) return;
    setWorking(true);
    try {
      await request("/api/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: detail.id, status }),
      });
      setDetail({ ...detail, status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore aggiornamento.");
    } finally {
      setWorking(false);
    }
  }
  async function closeSelected(status: "reviewed" | "declined") {
    const ids = [...selected];
    if (!ids.length) return;
    const label = status === "reviewed" ? "verificate" : "non accolte";
    const count = `${ids.length} ${ids.length === 1 ? "richiesta" : "richieste"}`;
    if (
      !window.confirm(
        `Confermi di chiudere ${count} come ${label}?${status === "declined" ? " Le richieste non accolte vengono cancellate dopo 12 mesi." : ""}`,
      )
    )
      return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const result = await (
        await request("/api/registrations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, status }),
        })
      ).json();
      await load();
      const updated = result.updated ?? ids.length;
      setNotice(
        updated === ids.length
          ? `${count} chiuse come ${label}.`
          : `${updated} richieste chiuse come ${label} su ${ids.length} selezionate:`
              + " le altre erano già state gestite o non sono più disponibili.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore aggiornamento.");
    } finally {
      setWorking(false);
    }
  }
  return (
    <main className="min-h-screen text-white p-5 md:p-10">
      <div className="max-w-6xl mx-auto">
        <Link
          className="inline-flex items-center gap-2 text-zinc-400 mb-8"
          href="/dashboard"
        >
          <ChevronLeft size={18} />
          Gestionale
        </Link>
        <p className="text-xs uppercase tracking-widest text-[#ff914d]">
          Area Staff / Archivio
        </p>
        <h1 className="text-3xl font-bold mt-3">Risposte laboratori</h1>
        <p className="text-zinc-400 mt-3 mb-8">
          Una cartella per ogni iscrizione. Risposte, documento generato e
          autorizzazione firmata, quando richiesta. Verifica gli allegati prima
          di confermare la partecipazione. Le richieste segnate come non accolte
          vengono cancellate dopo 12 mesi dalla richiesta; quelle in attesa
          restano in archivio finché non le verifichi o le chiudi, e dopo 12
          mesi dalla richiesta vengono segnalate qui.
        </p>
        {!access && !loading && (
          <Link href="/login" className="underline">
            Accedi all’Area Staff
          </Link>
        )}
        {access && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <label className="text-sm">
              Cerca nome o riferimento
              <input
                className="block w-full bg-zinc-900 border border-zinc-700 p-3 mt-2"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            <label className="text-sm">
              Attività
              <select
                className="block w-full bg-zinc-900 border border-zinc-700 p-3 mt-2"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Tutte le attività</option>
                {labs.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Stato
              <select
                className="block w-full bg-zinc-900 border border-zinc-700 p-3 mt-2 disabled:opacity-40"
                value={statusFilter}
                disabled={onlyWaiting}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Tutti gli stati</option>
                <option value="received">In attesa di verifica</option>
                <option value="reviewed">Documenti verificati</option>
                <option value="declined">Non accolta</option>
              </select>
            </label>
            <label className="flex items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={onlyWaiting}
                onChange={(e) => {
                  setOnlyWaiting(e.target.checked);
                  if (e.target.checked) setStatusFilter("");
                  setPage(0);
                }}
              />
              Solo da chiudere
            </label>
            <button
              className="border border-zinc-700 p-3 self-end"
              onClick={() => void load()}
              disabled={loading}
            >
              Aggiorna archivio
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-red-300 mb-5">
            {error}
          </p>
        )}
        {access && waiting > 0 && (
          <button
            type="button"
            className="w-full text-left border border-amber-400 text-amber-200 p-3 mb-5"
            onClick={() => {
              setOnlyWaiting(true);
              setStatusFilter("");
              setPage(0);
            }}
          >
            {waiting === 1
              ? "Una richiesta è in attesa di verifica da oltre 12 mesi."
              : `${waiting} richieste sono in attesa di verifica da oltre 12 mesi.`}{" "}
            Verificale o segnale come non accolte: finché restano aperte, i dati
            non scadono. <span className="underline">Mostra solo queste</span>
          </button>
        )}
        {notice && (
          <p role="status" className="text-emerald-300 mb-5">
            {notice}
          </p>
        )}
        {access && onlyWaiting && entries.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={entries.every((e) => selected.has(e.id))}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? new Set(entries.map((entry) => entry.id))
                      : new Set(),
                  )
                }
              />
              Seleziona tutte ({entries.length})
            </label>
            <button
              disabled={working || selected.size === 0}
              className="border border-zinc-600 p-2 text-sm disabled:opacity-40"
              onClick={() => void closeSelected("reviewed")}
            >
              Segna verificate ({selected.size})
            </button>
            <button
              disabled={working || selected.size === 0}
              className="border border-zinc-600 p-2 text-sm disabled:opacity-40"
              onClick={() => void closeSelected("declined")}
            >
              Segna non accolte ({selected.size})
            </button>
          </div>
        )}
        {loading ? (
          <p role="status">Caricamento…</p>
        ) : access && ready && entries.length === 0 ? (
          <p>
            {onlyWaiting
              ? "Nessuna richiesta da chiudere: tutte le cartelle in attesa sono state verificate."
              : "Nessuna iscrizione trovata."}
          </p>
        ) : null}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {access && entries.map((e) => (
            <div
              key={e.id}
              className="relative border border-zinc-700 rounded-xl bg-zinc-900 hover:border-[#ff914d] transition-colors"
            >
              {onlyWaiting && (
                <label className="absolute right-4 top-4 flex items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selected.has(e.id)}
                    onChange={(ev) =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (ev.target.checked) next.add(e.id);
                        else next.delete(e.id);
                        return next;
                      })
                    }
                  />
                  Seleziona
                </label>
              )}
              <button
                disabled={working}
                className="text-left w-full p-6"
                onClick={() => void open(e.id)}
              >
                <Folder size={36} className="text-[#ff914d] mb-5" />
                <h2 className="font-bold text-lg break-words pr-24">
                  {e.participant_name}
                </h2>
                <p className="text-zinc-400 mt-2">{e.activity_title}</p>
                <p className="text-xs text-zinc-500 mt-3">
                  {new Date(e.created_at).toLocaleString("it-IT")}
                </p>
                <p className="text-xs mt-4">
                  {statusLabels[e.status] ?? "In attesa di verifica"}{" "}
                  · {e.id.slice(0, 8)}
                </p>
                {e.stale && (
                  <p className="text-xs mt-1 text-amber-300">
                    In attesa da oltre 12 mesi: verifica o chiudi la richiesta
                  </p>
                )}
              </button>
            </div>
          ))}
        </div>
        {access && (
          <div className="flex justify-between items-center my-8">
            <button
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Precedenti
            </button>
            <span>
              {total} iscrizioni · Pagina {page + 1}
            </span>
            <button
              disabled={(page + 1) * 30 >= total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Successive
            </button>
          </div>
        )}
        <Dialog
          open={access && !!detail}
          onOpenChange={(open) => {
            if (!open) setDetail(null);
          }}
        >
          <DialogContent
            className="max-w-3xl max-h-[90dvh] overflow-y-auto bg-zinc-950 text-white border-zinc-700"
            showCloseButton={false}
          >
            <button
              aria-label="Chiudi cartella"
              className="absolute right-4 top-4"
              onClick={() => setDetail(null)}
            >
              <X size={20} />
            </button>
            <DialogTitle>{detail?.participant_name}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {detail?.activity_title} · Documentazione riservata
            </DialogDescription>
            {detail && (
              <>
                <div className="flex flex-wrap gap-3">
                  <button
                    disabled={working}
                    className="inline-flex gap-2 bg-[#ff914d] text-black p-3"
                    onClick={() => void download()}
                  >
                    <Download size={18} />
                    Scarica cartella ZIP
                  </button>
                  <button
                    disabled={working}
                    className="border border-zinc-600 p-3"
                    onClick={() =>
                      void setStatus(
                        detail.status === "reviewed" ? "received" : "reviewed",
                      )
                    }
                  >
                    {detail.status === "reviewed"
                      ? "Segna da verificare"
                      : "Segna documenti verificati"}
                  </button>
                  <button
                    disabled={working}
                    className="border border-zinc-600 p-3"
                    onClick={() =>
                      void setStatus(
                        detail.status === "declined" ? "received" : "declined",
                      )
                    }
                  >
                    {detail.status === "declined"
                      ? "Ripristina richiesta"
                      : "Segna come non accolta"}
                  </button>
                </div>
                {error && (
                  <p role="alert" className="text-red-300">
                    {error}
                  </p>
                )}
                <h3 className="font-bold mt-5">File nella cartella</h3>
                {detail.files.map((f) => (
                  <button
                    disabled={working}
                    key={f.name}
                    className="text-left underline py-2"
                    onClick={() => void download(f.name)}
                  >
                    {f.name}
                  </button>
                ))}
                <details>
                  <summary className="cursor-pointer py-3">
                    Leggi tutte le risposte e i testi presentati
                  </summary>
                  <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">
                    {responseText(
                      detail.snapshot.responses,
                      detail.snapshot.config,
                      detail.activity_title,
                      detail.id,
                      detail.created_at,
                    )}
                  </pre>
                </details>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
