"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUpRight,
  HandHeart,
  MapPin,
  Mic2,
  Music2,
  Palette,
  Users,
  X,
} from "lucide-react";
import { Dialog } from "radix-ui";

type Publication = {
  id: string | number;
  created_at: string;
  title: string;
  description: string | null;
  image_url: string;
};
const fallback: Publication[] = [
  {
    id: "factory-update",
    created_at: "",
    title: "La Factory si muove.",
    description:
      "Stiamo preparando i prossimi appuntamenti. Qui trovi le novità e le storie della nostra comunità.",
    image_url: "/instagram/post2.jpeg",
  },
];
const activities = [
  {
    slug: "rap-fcktory",
    title: "Rap F*cktory",
    label: "Trova la tua voce",
    text: "Scrittura, flow e microfoni aperti. Le tue storie diventano parole, le parole diventano musica.",
    icon: Mic2,
  },
  {
    slug: "beat-making",
    title: "Beat making",
    label: "Dai forma al suono",
    text: "Dal primo sample alla tua base. Sperimentiamo, ascoltiamo e produciamo insieme.",
    icon: Music2,
  },
  {
    slug: "urban-arts",
    title: "Urban arts",
    label: "Lascia il tuo segno",
    text: "Graffiti, fotografia e grafica. Nuovi linguaggi per raccontare quello che ci circonda.",
    icon: Palette,
  },
  {
    slug: "community-hub",
    title: "Community hub",
    label: "Fai spazio alle idee",
    text: "Un luogo per incontrarsi, confrontarsi e costruire progetti che partono dal territorio.",
    icon: Users,
  },
];

export default function HomePage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selected, setSelected] = useState<Publication | null>(null);
  const newsRef = useRef<HTMLElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
      return;
    let active = true;
    async function fetchPublications() {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("publications")
          .select("id, created_at, title, description, image_url")
          .order("created_at", { ascending: false })
          .limit(6);
        if (active && !error && data?.length)
          setPublications(data as Publication[]);
      } catch {
        /* Keep the editorial fallback when publications are unavailable. */
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          void fetchPublications();
        }
      },
      { rootMargin: "500px" },
    );
    if (newsRef.current) observer.observe(newsRef.current);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);
  const mediaUrl = (url: string) =>
    url.startsWith("http") || url.startsWith("/")
      ? url
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/publications/${url}`;
  const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)(?:\?|$)/i.test(url);

  return (
    <main className="home-page">
      <section className="home-hero content-width">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="status-dot" /> Cultura urbana. Impegno sociale.
          </span>
          <h1>
            Qui si cresce.
            <br />
            <span>Insieme.</span>
          </h1>
          <p>
            Siamo Under The Tower Factory, un’associazione di promozione sociale
            a Rozzano. Mettiamo al centro i ragazzi, le loro idee e la forza di
            fare comunità attraverso l’arte.
          </p>
          <div className="hero-actions">
            <Link href="/labs" className="clay-button">
              Scopri i laboratori <ArrowUpRight size={19} />
            </Link>
            <a href="#associazione" className="text-link">
              La nostra storia <ArrowDown size={17} />
            </a>
          </div>
          <div className="hero-footnote">
            <span>RADICI NEL QUARTIERE.</span>
            <span>SPAZIO ALLE POSSIBILITÀ.</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-photo">
            <Image
              src="/labs/foto1.jpeg"
              alt="Il gruppo Under The Tower Factory allo stand dell’associazione"
              fill
              preload
              sizes="(min-width: 900px) 48vw, 100vw"
            />
            <span className="photo-caption">
              <MapPin size={13} /> Dalla nostra parte di città.
            </span>
          </div>
          <div className="hero-sticker">
            <span>
              HIP-HOP
              <br />È COMUNITÀ
            </span>
            <ArrowUpRight size={25} />
          </div>
          <div className="logo-clay">
            <Image
              src="/icons/homelogo.png"
              alt="Under The Tower Factory"
              width={190}
              height={190}
            />
          </div>
          <span className="photo-index">01 — PERSONE, PRIMA DI TUTTO.</span>
        </div>
      </section>
      <div className="values-strip" aria-label="I nostri valori">
        <span>RADICI URBANE</span>
        <span aria-hidden="true">✳</span>
        <span>SPAZIO ALLE IDEE</span>
        <span aria-hidden="true">✳</span>
        <span>CRESCITA CONDIVISA</span>
        <span aria-hidden="true">✳</span>
        <span>ROZZANO, CASA NOSTRA</span>
        <span aria-hidden="true">✳</span>
      </div>
      <section id="associazione" className="mission-section">
        <div className="content-width">
          <div className="section-kicker">
            <span>01 / L’associazione</span>
            <span>Dal territorio, per il territorio.</span>
          </div>
          <div className="mission-grid">
            <h2>
              Sotto la torre,
              <br />
              c’è spazio
              <br />
              <span>anche per te.</span>
            </h2>
            <div>
              <span className="clay-icon">
                <HandHeart size={34} strokeWidth={1.7} />
              </span>
              <p>
                Crediamo nell’arte come occasione per incontrarsi, esprimersi e
                crescere. Il rap, la musica e la cultura urbana sono il nostro
                modo di aprire possibilità.
              </p>
              <p>
                Artisti, educatori e ragazzi condividono esperienze e
                competenze. Un laboratorio, un incontro, un progetto alla volta:
                così costruiamo la nostra comunità.
              </p>
              <Link href="/team" className="text-link">
                Conosci le persone della Factory <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="activities-section content-width">
        <div className="section-kicker">
          <span>02 / Cosa facciamo</span>
          <span>Imparare facendo. Farlo insieme.</span>
        </div>
        <div className="section-heading">
          <h2>
            Le idee escono.
            <br />
            Le persone crescono.
          </h2>
          <Link href="/labs" className="text-link">
            Tutti i laboratori <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="activity-grid">
          {activities.map((activity, index) => (
            <Link
              href={`/labs/${activity.slug}`}
              className="activity-card"
              key={activity.slug}
            >
              <div className="activity-top">
                <span className="clay-icon">
                  <activity.icon size={29} strokeWidth={1.8} />
                </span>
                <span className="card-index">0{index + 1}</span>
              </div>
              <span className="eyebrow">{activity.label}</span>
              <h3>{activity.title}</h3>
              <p>{activity.text}</p>
              <span className="card-bottom">
                Entra nel laboratorio <ArrowUpRight size={20} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="community-section content-width">
        <div className="community-photo">
          <Image
            src="/labs/foto3.jpeg"
            alt="Un momento di confronto durante un laboratorio rap della Factory"
            fill
            sizes="(min-width: 900px) 50vw, 100vw"
          />
        </div>
        <div className="community-copy">
          <span className="eyebrow">La cultura si fa, insieme.</span>
          <h2>
            Una voce.
            <br />
            Tante storie.
          </h2>
          <p>
            Un microfono che passa di mano. Un’idea che prende forma. Un gruppo
            che ti ascolta. La Factory vive in questi momenti.
          </p>
          <Link href="/galleria" className="clay-button light">
            Guarda cosa nasce qui <ArrowUpRight size={18} />
          </Link>
          <Link href="/stream" className="text-link">
            Video e live dalla Factory <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <section ref={newsRef} className="news-section content-width">
        <div className="section-kicker">
          <span>03 / Diario della Factory</span>
          <span>Storie, incontri, prossimi passi.</span>
        </div>
        <div className="section-heading">
          <h2>
            Succede sotto
            <br />
            la torre.
          </h2>
          <Link href="/feed" className="text-link">
            Tutto il diario <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="news-grid">
          {(publications.length ? publications : fallback).map((post) => (
            <button
              key={post.id}
              className="news-card"
              onClick={(event) => {
                lastTrigger.current = event.currentTarget;
                setSelected({ ...post, image_url: mediaUrl(post.image_url) });
              }}
            >
              <div className="news-photo">
                {isVideo(post.image_url) ? (
                  <video
                    src={mediaUrl(post.image_url)}
                    preload="metadata"
                    muted
                    playsInline
                    aria-label={post.title}
                  />
                ) : (
                  <Image
                    src={mediaUrl(post.image_url)}
                    alt={post.title}
                    fill
                    sizes="(min-width: 900px) 33vw, 100vw"
                    unoptimized={post.image_url.startsWith("http")}
                  />
                )}
              </div>
              <div className="news-copy">
                <span className="eyebrow">
                  {post.created_at
                    ? new Date(post.created_at).toLocaleDateString("it-IT")
                    : "Dalla Factory"}
                </span>
                <h3>
                  {post.title} <ArrowUpRight size={22} />
                </h3>
                <p>{post.description}</p>
                <span className="text-link">Leggi l’aggiornamento</span>
              </div>
            </button>
          ))}
          {!publications.length && (
            <Link href="/feed" className="diary-invite">
              <span className="eyebrow">Ci trovi anche qui</span>
              <h3>
                La nostra
                <br />
                quotidianità,
                <br />
                senza filtri.
              </h3>
              <p>
                Foto, racconti e voci da dentro la Factory. Segui quello che
                stiamo costruendo.
              </p>
              <span className="card-bottom">
                Apri il diario <ArrowUpRight size={24} />
              </span>
            </Link>
          )}
        </div>
      </section>
      <section id="partecipa" className="participate-section">
        <div className="content-width">
          <div className="section-kicker">
            <span>04 / Fanne parte</span>
            <span>Il prossimo passo è il tuo.</span>
          </div>
          <div className="participate-heading">
            <h2>
              Porta quello
              <br />
              che <span>sei.</span>
            </h2>
            <p>
              La curiosità è un buon inizio.
              <br />
              C’è più di un modo per entrare nella Factory.
            </p>
          </div>
          <div className="participate-grid">
            <a
              href="https://forms.gle/gbkbEvaavFaHFkkG9"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Mic2 size={25} />
              <h3>Partecipa a un lab</h3>
              <p>
                Scopri un linguaggio, coltiva una passione, mettiti in gioco.
              </p>
              <span>
                Vai al modulo di iscrizione <ArrowUpRight size={19} />
              </span>
            </a>
            <Link href="/team#collabora">
              <HandHeart size={26} />
              <h3>Dai una mano</h3>
              <p>Metti tempo, idee e competenze al servizio della comunità.</p>
              <span>
                Collabora con noi <ArrowUpRight size={19} />
              </span>
            </Link>
            <a href="mailto:ass.uttf@gmail.com">
              <Users size={26} />
              <h3>Costruiamo qualcosa</h3>
              <p>Sei una realtà del territorio? Parliamo del tuo progetto.</p>
              <span>
                Scrivi all’associazione <ArrowUpRight size={19} />
              </span>
            </a>
          </div>
        </div>
      </section>
      <section className="visit-section content-width">
        <div>
          <span className="eyebrow">
            <MapPin size={15} /> Ci vediamo a Rozzano
          </span>
          <h2>
            Il nostro punto
            <br />
            di incontro.
          </h2>
          <p>Via dei Biancospini, 4 · Rozzano (MI)</p>
          <a className="text-link" href="mailto:ass.uttf@gmail.com">
            Scrivici per venire a conoscerci <ArrowUpRight size={17} />
          </a>
        </div>
        <div className="visit-art">
          <Image
            src="/bg-uttf.jpg"
            alt="Identità visiva Under The Tower Factory"
            fill
            sizes="(min-width: 900px) 45vw, 100vw"
          />
          <a
            className="clay-button light"
            href="https://www.google.com/maps/search/?api=1&query=Via+dei+Biancospini+4+Rozzano"
            target="_blank"
            rel="noopener noreferrer"
          >
            Come raggiungerci <ArrowUpRight size={18} />
          </a>
        </div>
      </section>
      <Dialog.Root
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="editorial-modal-overlay" />
          <Dialog.Content
            className="editorial-modal"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              lastTrigger.current?.focus();
            }}
          >
            {selected && (
              <>
                <Dialog.Close
                  className="modal-close"
                  aria-label="Chiudi aggiornamento"
                >
                  <X size={22} />
                </Dialog.Close>
                <div className="modal-media">
                  {isVideo(selected.image_url) ? (
                    <video
                      src={selected.image_url}
                      controls
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <Image
                      src={selected.image_url}
                      alt={selected.title}
                      width={1000}
                      height={1000}
                      unoptimized
                    />
                  )}
                </div>
                <div className="modal-copy">
                  <Dialog.Title>{selected.title}</Dialog.Title>
                  <Dialog.Description>
                    {selected.description ||
                      "Un aggiornamento dalla comunità Under The Tower Factory."}
                  </Dialog.Description>
                  {selected.created_at && (
                    <time dateTime={selected.created_at}>
                      {new Date(selected.created_at).toLocaleDateString(
                        "it-IT",
                      )}
                    </time>
                  )}
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
