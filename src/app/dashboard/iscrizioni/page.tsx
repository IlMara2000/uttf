"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
};
type Detail = Entry & {
  snapshot: { responses: RegistrationAnswers; config: RegistrationConfig };
  files: { name: string }[];
};
export default function RegistrationsArchive() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [labs, setLabs] = useState<{ slug: string; title: string }[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState(false);
  const [working, setWorking] = useState(false);
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
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        search,
        activity: filter,
      });
      const data = await (await request(`/api/registrations?${params}`)).json();
      setEntries(data.registrations);
      setTotal(data.total);
    } catch (e) {
      setEntries([]);
      setError(e instanceof Error ? e.message : "Archivio non disponibile.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);
  useEffect(() => {
    let alive = true;
    let generation = 0;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = ++generation;
      setAccess(false);
      setEntries([]);
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
  async function review() {
    if (!detail) return;
    setWorking(true);
    try {
      const status = detail.status === "reviewed" ? "received" : "reviewed";
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
          di confermare la partecipazione.
        </p>
        {!access && !loading && (
          <Link href="/login" className="underline">
            Accedi all’Area Staff
          </Link>
        )}
        {access && (
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <label className="text-sm">
              Cerca partecipante
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
        {loading ? (
          <p role="status">Caricamento…</p>
        ) : access && entries.length === 0 ? (
          <p>Nessuna iscrizione trovata.</p>
        ) : null}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {access && entries.map((e) => (
            <button
              key={e.id}
              disabled={working}
              className="text-left border border-zinc-700 rounded-xl bg-zinc-900 p-6 hover:border-[#ff914d] transition-colors"
              onClick={() => void open(e.id)}
            >
              <Folder size={36} className="text-[#ff914d] mb-5" />
              <h2 className="font-bold text-lg break-words">
                {e.participant_name}
              </h2>
              <p className="text-zinc-400 mt-2">{e.activity_title}</p>
              <p className="text-xs text-zinc-500 mt-3">
                {new Date(e.created_at).toLocaleString("it-IT")}
              </p>
              <p className="text-xs mt-4">
                {e.status === "reviewed"
                  ? "Documenti verificati"
                  : "Da verificare"}{" "}
                · {e.id.slice(0, 8)}
              </p>
            </button>
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
                    onClick={() => void review()}
                  >
                    {detail.status === "reviewed"
                      ? "Segna da verificare"
                      : "Segna documenti verificati"}
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
