"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { ArrowUpRight, Pencil, Plus } from "lucide-react";
import { type LabCategory } from "@/app/labs/lab-data";
import RegistrationSettings from "./RegistrationSettings";
import RegistrationForm from "./RegistrationForm";
import {
  configOf,
  configError,
  defaultConfig,
} from "@/lib/registrations/model";
import { optimizeUpload } from "@/lib/optimize-upload";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function LabCards({
  initialLabs,
  ready,
}: {
  initialLabs: LabCategory[];
  ready: boolean;
}) {
  const [labs, setLabs] = useState(initialLabs);
  const [allowed, setAllowed] = useState(false);
  const masonry = useRef<HTMLElement>(null);
  useEffect(() => {
    const grid = masonry.current;
    if (!grid || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      for (const item of Array.from(grid.children) as HTMLElement[]) {
        const card = item.firstElementChild as HTMLElement | null;
        if (card)
          item.style.gridRowEnd = `span ${Math.ceil(card.offsetHeight + 26)}`;
      }
      grid.dataset.masonry = "ready";
    };
    const observer = new ResizeObserver(measure);
    for (const item of Array.from(grid.children))
      if (item.firstElementChild) observer.observe(item.firstElementChild);
    measure();
    return () => observer.disconnect();
  }, [labs, allowed]);
  const [draft, setDraft] = useState<LabCategory | null>(null);
  const [preview, setPreview] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    async function init() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      const { supabase } = await import("@/lib/supabase");
      if (!alive) return;
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!alive) return;
        const canEdit = !!session?.user && !session.user.is_anonymous;
        setAllowed(canEdit);
        if (!canEdit) setDraft(null);
      });
      unsubscribe = () => subscription.unsubscribe();
    }
    void init();
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || busy) return;
    const invalid = configError(configOf(draft.registration_config));
    if (invalid) {
      setMessage(invalid);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { supabase } = await import("@/lib/supabase");
      const { slug, version, ...fields } = draft;
      const values = {
        ...fields,
        primaryUrl: `/labs/${slug}`,
        secondaryUrl: `/labs/${slug}#iscrizione`,
        title: fields.title.trim(),
        tags: [
          ...new Set(fields.tags.map((tag) => tag.trim()).filter(Boolean)),
        ],
      };
      const { data, error } = isNew
        ? await supabase
            .from("labs")
            .insert({ ...values, slug })
            .select()
            .single()
        : await supabase
            .from("labs")
            .update({ ...values, version: version + 1 })
            .eq("slug", slug)
            .eq("version", version)
            .select()
            .maybeSingle();
      if (error) throw error;
      if (!data) {
        setMessage(
          "Il laboratorio è stato modificato da un altro account oppure la sessione è scaduta. Ricarica la pagina prima di riprovare.",
        );
        return;
      }
      setLabs((items) =>
        isNew
          ? [...items, data as LabCategory]
          : items.map((item) =>
              item.slug === slug ? (data as LabCategory) : item,
            ),
      );
      setDraft(null);
      setNotice("Laboratorio aggiornato.");
    } catch {
      setMessage(
        "Salvataggio non riuscito. Le modifiche sono ancora nel modulo: riprova.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function upload(files: FileList | null) {
    if (!files || !draft || busy) return;
    if (draft.photos.length + files.length > 8) {
      setMessage("Puoi allegare al massimo 8 foto per laboratorio.");
      return;
    }
    const selected = Array.from(files);
    if (
      selected.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 10 * 1024 * 1024,
      )
    ) {
      setMessage("Scegli foto JPG, PNG o WebP fino a 10 MB ciascuna.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { supabase } = await import("@/lib/supabase");
      for (const original of selected) {
        const file = await optimizeUpload(original);
        const extension = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        }[file.type];
        const path = `${draft.slug}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage
          .from("lab-photos")
          .upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data } = supabase.storage.from("lab-photos").getPublicUrl(path);
        setDraft((current) =>
          current
            ? { ...current, photos: [...current.photos, data.publicUrl] }
            : current,
        );
      }
    } catch {
      setMessage(
        "Caricamento non riuscito. Le foto già caricate restano nel modulo; puoi riprovare con quelle mancanti.",
      );
    } finally {
      setBusy(false);
    }
  }

  const textFields = [
    ["title", "Titolo", 120],
    ["description", "Descrizione", 2000],
    ["detailIntro", "Testo della pagina del laboratorio", 4000],
    ["primaryLabel", "Testo del primo link", 80],
    ["secondaryLabel", "Testo del secondo link", 80],
  ] as const;
  return (
    <>
      <p role="status">{notice}</p>
      {!ready && (
        <p role="status">
          Impossibile caricare gli aggiornamenti dei laboratori. Ricarica la
          pagina per riprovare.
        </p>
      )}
      <section
        ref={masonry}
        className="lab-list"
        aria-label="Laboratori e iniziative"
      >
        {[...labs]
          .sort((a, b) => Number(b.active) - Number(a.active))
          .map((lab) => (
            <div className="lab-masonry-item" key={lab.slug}>
              <article
                className={`lab-card${lab.active ? "" : " lab-card-inactive"}`}
                key={lab.slug}
              >
                <div className="lab-heading">
                  <div className="lab-status-row">
                    <span
                      className={`lab-status lab-status-pixel ${lab.active ? "is-active" : "is-inactive"}`}
                    >
                      <span
                        className="lab-status-pixel-light"
                        aria-hidden="true"
                      />
                      {lab.active ? "Attivo" : "Non attivo"}
                      <span className="lab-status-signal" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>
                    {allowed && (
                      <button
                        type="button"
                        className="text-link lab-edit"
                        disabled={!ready}
                        onClick={() => {
                          setIsNew(false);
                          setDraft({
                            ...lab,
                            registration_config: configOf(
                              lab.registration_config,
                            ),
                            photos: [...lab.photos],
                          });
                          setMessage("");
                        }}
                      >
                        <Pencil size={14} /> Modifica
                        <span className="sr-only"> {lab.title}</span>
                      </button>
                    )}
                  </div>
                  {lab.photos.length > 0 && (
                    <div className="lab-photos">
                      {lab.photos.map((url, i) => (
                        <a
                          key={url}
                          href={lab.active ? url : undefined}
                          aria-disabled={!lab.active || undefined}
                          tabIndex={lab.active ? undefined : -1}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Apri foto ${i + 1} di ${lab.title}`}
                        >
                          <Image
                            unoptimized
                            width={800}
                            height={600}
                            src={url}
                            alt={`${lab.title}, foto ${i + 1}`}
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <h2>{lab.title}</h2>
                <p>{lab.description}</p>
                <div className="tags">
                  {lab.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="lab-actions">
                  <a
                    className="clay-button light"
                    href={lab.active ? `/labs/${lab.slug}` : undefined}
                    aria-disabled={!lab.active || undefined}
                    tabIndex={lab.active ? undefined : -1}
                  >
                    {lab.primaryLabel}
                    <ArrowUpRight size={17} />
                  </a>
                  <a
                    className="text-link"
                    href={
                      lab.active ? `/labs/${lab.slug}#iscrizione` : undefined
                    }
                    aria-disabled={!lab.active || undefined}
                    tabIndex={lab.active ? undefined : -1}
                  >
                    {lab.secondaryLabel}
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </article>
            </div>
          ))}
        {allowed && (
          <div className="lab-masonry-item">
            <button
              className="lab-add-card"
              type="button"
              disabled={!ready}
              onClick={() => {
                setIsNew(true);
                setMessage("");
                const slug = `attivita-${crypto.randomUUID()}`;
                setDraft({
                  slug,
                  title: "",
                  description: "",
                  detailIntro: "",
                  tags: [],
                  active: false,
                  primaryLabel: "Scopri e iscriviti",
                  primaryUrl: `/labs/${slug}`,
                  secondaryLabel: "Iscriviti",
                  secondaryUrl: `/labs/${slug}#iscrizione`,
                  photos: [],
                  version: 0,
                  registration_config: defaultConfig(),
                });
              }}
            >
              <Plus size={48} />
              <span>Aggiungi attività</span>
              <small>
                Laboratorio, evento, attività esterna o collaborazione
              </small>
            </button>
          </div>
        )}
      </section>
      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open && !busy) setDraft(null);
        }}
      >
        <DialogContent className="lab-editor" showCloseButton={!busy}>
          <DialogTitle>
            {isNew ? "Aggiungi attività" : "Modifica attività"}
          </DialogTitle>
          <DialogDescription>
            Le modifiche salvate saranno visibili a tutti.
          </DialogDescription>
          {draft && (
            <form onSubmit={save}>
              <fieldset disabled={busy}>
                <label>
                  Stato
                  <select
                    value={draft.active ? "active" : "inactive"}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        active: e.target.value === "active",
                      })
                    }
                  >
                    <option value="active">Attivo (verde)</option>
                    <option value="inactive">Non attivo (rosso)</option>
                  </select>
                </label>
                {textFields.map(([key, label, max]) => (
                  <label key={key}>
                    {label}
                    {key === "description" || key === "detailIntro" ? (
                      <textarea
                        required
                        maxLength={max}
                        value={draft[key]}
                        onChange={(e) =>
                          setDraft({ ...draft, [key]: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        required
                        maxLength={max}
                        value={draft[key]}
                        onChange={(e) =>
                          setDraft({ ...draft, [key]: e.target.value })
                        }
                      />
                    )}
                  </label>
                ))}
                <RegistrationSettings
                  value={configOf(draft.registration_config)}
                  onChange={(registration_config) =>
                    setDraft({ ...draft, registration_config })
                  }
                />
                <label>
                  Tag (separati da virgola)
                  <input
                    maxLength={500}
                    value={draft.tags.join(",")}
                    onChange={(e) =>
                      setDraft({ ...draft, tags: e.target.value.split(",") })
                    }
                  />
                </label>
                <label>
                  Foto del laboratorio
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      void upload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p>
                  Fino a 8 foto JPG, PNG o WebP, massimo 10 MB ciascuna. Clicca
                  Salva per pubblicarle.
                </p>
                <div className="lab-photo-previews">
                  {draft.photos.map((url, i) => (
                    <div key={url}>
                      <Image
                        unoptimized
                        width={800}
                        height={600}
                        src={url}
                        alt={`Foto allegata ${i + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            photos: draft.photos.filter(
                              (photo) => photo !== url,
                            ),
                          })
                        }
                      >
                        Rimuovi foto {i + 1}
                      </button>
                    </div>
                  ))}
                </div>
              </fieldset>
              {message && <p role="alert">{message}</p>}
              <div className="lab-editor-actions">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPreview(true)}
                >
                  Anteprima modulo
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDraft(null)}
                >
                  Annulla
                </button>
                <button type="submit" disabled={busy}>
                  {busy ? "Operazione in corso…" : "Salva modifiche"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={preview && !!draft} onOpenChange={setPreview}>
        <DialogContent className="lab-editor registration-preview">
          <DialogTitle>Anteprima iscrizione</DialogTitle>
          <DialogDescription>
            Puoi provare i campi e scaricare il documento. Nessun dato viene
            inviato.
          </DialogDescription>
          {draft && (
            <RegistrationForm key={draft.slug} lab={draft} ready preview />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
