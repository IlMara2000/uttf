"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  defaultBioLinks,
  isSafeBioUrl,
  type BioLink,
  type BioSection,
  bioSections,
  normalizeBioLinks,
} from "@/lib/bio-links";

export default function BioPage({ section }: { section: BioSection }) {
  const [links, setLinks] = useState(() => normalizeBioLinks(defaultBioLinks));
  const [draft, setDraft] = useState<BioLink[]>([]);
  const [version, setVersion] = useState(0);
  const [staff, setStaff] = useState(false);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    let active = true;
    let authCheckId = 0;
    let unsubscribe: (() => void) | undefined;
    async function load() {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
        return;
      const { supabase } = await import("@/lib/supabase");
      if (!active) return;
      async function checkStaff() {
        const checkId = ++authCheckId;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        let allowed = false;
        if (user?.email && !user.is_anonymous) {
          const { data, error } = await supabase
            .from("authorized_users")
            .select("email")
            .eq("email", user.email.toLowerCase())
            .maybeSingle();
          allowed = !error && !!data;
        }
        if (active && checkId === authCheckId) {
          setStaff(allowed);
          if (!allowed) setEditing(false);
        }
      }
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT" && active) {
          authCheckId++;
          setStaff(false);
          setEditing(false);
        } else
          setTimeout(() => {
            if (active)
              void checkStaff().catch(() => {
                if (active) setStaff(false);
              });
          }, 0);
      });
      unsubscribe = () => subscription.unsubscribe();
      void checkStaff().catch(() => {
        if (active) setStaff(false);
      });
      const { data, error } = await supabase
        .from("bio_page")
        .select("links, version")
        .eq("id", 1)
        .single();
      if (!active) return;
      setLoading(false);
      if (error) {
        setMessage("Impossibile caricare i link aggiornati. Riprova tra poco.");
        return;
      }
      setLinks(normalizeBioLinks(data.links as BioLink[]));
      setVersion(data.version);
      setReady(true);
    }
    void load().catch(() => {
      if (active) {
        setLoading(false);
        setMessage("Connessione non disponibile. Riprova tra poco.");
      }
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (draft.some((link) => !link.title.trim() || !isSafeBioUrl(link.url))) {
      setMessage(
        "Inserisci un titolo e un indirizzo valido per ogni pannello.",
      );
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase
        .from("bio_page")
        .update({
          links: [
            ...links.filter((link) => link.section !== section),
            ...draft.map((link) => ({ ...link, title: link.title.trim() })),
          ],
          version: version + 1,
        })
        .eq("id", 1)
        .eq("version", version)
        .select("links, version")
        .maybeSingle();
      if (error)
        throw new Error(
          "Salvataggio non riuscito. Verifica la connessione e il tuo accesso staff.",
        );
      if (!data)
        throw new Error(
          "La pagina è stata modificata da un altro membro dello staff oppure il tuo accesso è scaduto. Copia le modifiche e ricarica la pagina.",
        );
      setLinks(normalizeBioLinks(data.links as BioLink[]));
      setVersion(data.version);
      setEditing(false);
      setMessage("Modifiche pubblicate.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Salvataggio non riuscito.",
      );
    } finally {
      setSaving(false);
    }
  }
  function update(id: string, patch: Partial<BioLink>) {
    setDraft((current) =>
      current.map((link) => (link.id === id ? { ...link, ...patch } : link)),
    );
  }
  function move(index: number, direction: number) {
    setDraft((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
  }
  async function share() {
    const url = `${window.location.origin}${bioSections[section].path}`;
    try {
      if (navigator.share)
        await navigator.share({ title: "Under The Tower Factory", url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage("Link copiato.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setShareUrl(url);
        setMessage("Copia questo indirizzo per condividere la pagina.");
      }
    }
  }

  return (
    <main className={`bio-page bio-page-${section}`}>
      <div className="bio-toolbar">
        <Link href={section === "main" ? "/" : "/bio"}>
          {section === "main" ? "Torna al sito" : "Tutti i link"}
        </Link>
        <button type="button" onClick={share}>
          Condividi
        </button>
      </div>
      <header className="bio-heading">
        <Image
          src="/icons/homelogo.png"
          alt=""
          width={264}
          height={264}
          priority
        />
        <p className="eyebrow">Rozzano / Cultura urbana</p>
        <h1>
          UNDER THE TOWER
          <br />
          <span>FACTORY</span>
        </h1>
        <p>Arte, musica e persone. Tutto parte da qui.</p>
        <div className="bio-edition" aria-hidden="true">
          UTTF / ROZZANO /{" "}
          {section === "main" ? "01" : section === "socials" ? "02" : "03"}
        </div>
      </header>
      {staff && (
        <div className="bio-staff">
          <Link href="/dashboard">Area staff</Link>
          <button
            type="button"
            disabled={!ready || editing}
            onClick={() => {
              setDraft(
                links
                  .filter((link) => link.section === section)
                  .map((link) => ({ ...link })),
              );
              setEditing(true);
              setMessage("");
            }}
          >
            Modifica
          </button>
        </div>
      )}
      <p role="status" className="bio-status">
        {loading ? "Caricamento link…" : message}
      </p>
      {shareUrl && (
        <input
          aria-label="Link da condividere"
          readOnly
          value={shareUrl}
          onFocus={(event) => event.target.select()}
        />
      )}
      {editing && staff ? (
        <form onSubmit={save} className="bio-editor">
          <h2>Modifica {bioSections[section].label}</h2>
          <p>
            Crea i pannelli, scegli l’ordine e pubblica le modifiche quando sono
            pronte.
          </p>
          <fieldset disabled={saving}>
            {draft.map((link, index) => (
              <fieldset key={link.id} className="bio-edit-card">
                <legend>Pannello {index + 1}</legend>
                <label>
                  Sezione
                  <select
                    aria-label="Sezione"
                    value={link.section}
                    onChange={(event) =>
                      update(link.id, {
                        section: event.target.value as BioSection,
                      })
                    }
                  >
                    {Object.entries(bioSections).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Titolo
                  <input
                    required
                    maxLength={100}
                    value={link.title}
                    onChange={(event) =>
                      update(link.id, { title: event.target.value })
                    }
                  />
                </label>
                <label>
                  Indirizzo
                  <input
                    required
                    maxLength={2000}
                    placeholder="https://… oppure /labs"
                    value={link.url}
                    onChange={(event) =>
                      update(link.id, { url: event.target.value.trim() })
                    }
                  />
                </label>
                <label>
                  Descrizione
                  <input
                    maxLength={200}
                    value={link.description}
                    onChange={(event) =>
                      update(link.id, { description: event.target.value })
                    }
                  />
                </label>
                <label className="bio-checkbox">
                  <input
                    type="checkbox"
                    checked={link.visible}
                    onChange={(event) =>
                      update(link.id, { visible: event.target.checked })
                    }
                  />{" "}
                  Visibile al pubblico
                </label>
                <div className="bio-controls">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Sposta su ${link.title || "pannello"}`}
                  >
                    Su
                  </button>
                  <button
                    type="button"
                    disabled={index === draft.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Sposta giù ${link.title || "pannello"}`}
                  >
                    Giù
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) =>
                        current.filter((item) => item.id !== link.id),
                      )
                    }
                  >
                    Rimuovi
                  </button>
                </div>
              </fieldset>
            ))}
            <button
              type="button"
              disabled={
                draft.length +
                  links.filter((link) => link.section !== section).length >=
                50
              }
              onClick={() =>
                setDraft((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    section,
                    title: "",
                    url: "",
                    description: "",
                    visible: true,
                  },
                ])
              }
            >
              Aggiungi pannello
            </button>
            <div className="bio-controls bio-save">
              <button type="submit">
                {saving ? "Salvataggio…" : "Pubblica modifiche"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setMessage("");
                }}
              >
                Annulla
              </button>
            </div>
          </fieldset>
        </form>
      ) : (
        <>
          <div className="bio-section-label">
            <span>
              {section === "main" ? "01" : section === "socials" ? "02" : "03"}{" "}
              /
            </span>
            <h2>{bioSections[section].label}</h2>
          </div>
          <nav className="bio-links" aria-label={bioSections[section].label}>
            {(loading ? [] : links)
              .filter(
                (link) =>
                  link.section === section &&
                  link.visible &&
                  isSafeBioUrl(link.url),
              )
              .map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  className={`bio-card${link.id === "site" ? " bio-featured" : ""}`}
                  {...(/^https?:/.test(link.url)
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {link.id === "site" && (
                    <Image
                      src="/images/uttf-bio-cover.jpg"
                      alt="Logo Under The Tower Factory su sfondo arancione e nero"
                      width={1280}
                      height={853}
                      loading="eager"
                      sizes="(max-width: 640px) 100vw, 592px"
                    />
                  )}
                  <span>
                    <strong>{link.title}</strong>
                    {link.description && <small>{link.description}</small>}
                  </span>
                  <ArrowUpRight size={22} aria-hidden="true" />
                </a>
              ))}
            {!loading &&
              !links.some(
                (link) => link.section === section && link.visible,
              ) && (
                <p>
                  I nuovi link arrivano presto.{" "}
                  <Link href="/">Visita il sito</Link>.
                </p>
              )}
          </nav>
          <nav className="bio-section-nav" aria-label="Esplora il link in bio">
            {Object.entries(bioSections)
              .filter(([key]) => key !== section)
              .map(([key, value]) => (
                <Link key={key} href={value.path}>
                  {key === "main" ? "Tutti i link" : value.label}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              ))}
          </nav>
        </>
      )}
      <footer className="bio-footer">
        <Link href="/">Under The Tower Factory</Link>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Termini</Link>
        </div>
      </footer>
    </main>
  );
}
