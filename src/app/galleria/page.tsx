"use client";
import { type FormEvent, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import PublicPageIntro from "@/components/PublicPageIntro";

const artworks = [
  {
    title: "Muro Vivo",
    type: "Urban Canvas",
    image: "/instagram/post1.jpeg",
    description:
      "Opera nata dal territorio, tra segni rapidi, materia urbana e identita locale. Un frammento visivo della factory lasciato respirare a pochi passi da casa.",
    techniques: ["Street Art", "Mixed Media", "Local Roots"],
    tags: ["KM0", "URBAN", "COMMUNITY"],
  },
  {
    title: "Factory Signs",
    type: "Visual Archive",
    image: "/instagram/post2.jpeg",
    description:
      "Tracce, dettagli e simboli raccolti dentro il flusso creativo UTTF. Ogni immagine conserva il rumore buono delle idee nate sul posto.",
    techniques: ["Photography", "Archive", "Composition"],
    tags: ["ARCHIVE", "DETAILS", "UTTF"],
  },
  {
    title: "Linea Locale",
    type: "Handmade Piece",
    image: "/instagram/post3.jpeg",
    description:
      "Un lavoro costruito con mani vicine, materiali accessibili e visione diretta. Arte a km0 significa partire da quello che abbiamo intorno.",
    techniques: ["Handmade", "Texture", "Color Study"],
    tags: ["HANDMADE", "LOCAL", "RAW"],
  },
  {
    title: "Sotto La Torre",
    type: "Community Work",
    image: "/instagram/post4.jpeg",
    description:
      "Un pezzo che tiene insieme luogo, persone e memoria. La galleria diventa mappa emotiva di quello che succede sotto la torre.",
    techniques: ["Community Art", "Storytelling", "Visual Map"],
    tags: ["PLACE", "PEOPLE", "MEMORY"],
  },
  {
    title: "Lab Session 01",
    type: "Creative Process",
    image: "/labs/foto1.jpeg",
    description:
      "Scatto dal processo creativo: prove, tentativi, strumenti e intuizioni. Qui la galleria mostra anche quello che arriva prima del risultato.",
    techniques: ["Process", "Workshop", "Experiment"],
    tags: ["LAB", "PROCESS", "SESSION"],
  },
  {
    title: "Lab Session 02",
    type: "Local Experiment",
    image: "/labs/foto2.jpeg",
    description:
      "Esperimento visivo nato in laboratorio, con energia diretta e spirito artigianale. Nessuna distanza: solo idee lavorate vicino alla community.",
    techniques: ["Experiment", "Craft", "Culture"],
    tags: ["LOCAL", "CRAFT", "CULTURE"],
  },
];

export default function GalleryPage() {
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalEmail, setProposalEmail] = useState("");
  const [proposalSubject, setProposalSubject] = useState("");
  const [proposalBody, setProposalBody] = useState("");
  const [proposalStatus, setProposalStatus] = useState<
    "idle" | "opening" | "ready"
  >("idle");

  const proposalHref = `mailto:ass.uttf@gmail.com?subject=${encodeURIComponent(proposalSubject)}&body=${encodeURIComponent(
    `Mail utente: ${proposalEmail}\n\n${proposalBody}`,
  )}`;

  const handleProposalSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProposalStatus("opening");
    window.setTimeout(() => {
      window.location.href = proposalHref;
      setProposalStatus("ready");
    }, 350);
  };

  return (
    <main className="public-page">
      <PublicPageIntro
        number="03"
        eyebrow="Arte a km 0"
        title={
          <>
            L’arte nasce
            <br />
            <span>qui vicino.</span>
          </>
        }
        description="Immagini, processi e frammenti creativi dal territorio. La nostra galleria racconta quello che nasce quando le persone hanno lo spazio per esprimersi."
      />
      <div className="content-width">
        <section className="people-grid" aria-label="Galleria della Factory">
          {artworks.map((artwork) => (
            <article className="person-card" key={artwork.title}>
              <div className="person-photo">
                <Image
                  src={artwork.image}
                  alt={artwork.title}
                  fill
                  sizes="(min-width: 1100px) 33vw, (min-width: 520px) 50vw, 100vw"
                />
              </div>
              <div className="person-copy">
                <span className="eyebrow">{artwork.type}</span>
                <h2>{artwork.title}</h2>
                <p>{artwork.description}</p>
                <div className="tags">
                  {artwork.techniques.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
        <section className="association-cta">
          <div>
            <span className="eyebrow">La galleria cresce con te</span>
            <h2>
              Hai un’idea?
              <br />
              Diamole spazio.
            </h2>
            <p>
              Artisti, progetti e contributi dal territorio: raccontaci cosa
              vorresti costruire insieme.
            </p>
          </div>
          <button
            className="clay-button light"
            aria-expanded={showProposalForm}
            aria-controls="proposal-form"
            onClick={() => setShowProposalForm((value) => !value)}
          >
            Proponi un progetto <ArrowUpRight size={18} />
          </button>
        </section>
        {showProposalForm && (
          <form
            id="proposal-form"
            className="editorial-form proposal-form"
            onSubmit={handleProposalSubmit}
          >
            <h2>Raccontaci la tua idea.</h2>
            <p>
              Il modulo prepara un’email da inviare con la tua applicazione di
              posta.
            </p>
            <label htmlFor="proposal-email">La tua email</label>
            <input
              id="proposal-email"
              type="email"
              required
              autoComplete="email"
              value={proposalEmail}
              onChange={(event) => setProposalEmail(event.target.value)}
              placeholder="nome@esempio.it"
            />
            <label htmlFor="proposal-subject">Oggetto</label>
            <input
              id="proposal-subject"
              required
              value={proposalSubject}
              onChange={(event) => setProposalSubject(event.target.value)}
              placeholder="Il nome del tuo progetto"
            />
            <label htmlFor="proposal-body">La tua proposta</label>
            <textarea
              id="proposal-body"
              required
              rows={6}
              value={proposalBody}
              onChange={(event) => setProposalBody(event.target.value)}
              placeholder="Da quale idea partiamo?"
            />
            <button
              type="submit"
              disabled={proposalStatus === "opening"}
              className="clay-button"
            >
              {proposalStatus === "opening"
                ? "Apro la mail…"
                : "Prepara l’email"}{" "}
              <ArrowUpRight size={17} />
            </button>
            {proposalStatus !== "idle" && (
              <p role="status">
                {proposalStatus === "opening" ? (
                  "Sto aprendo la tua applicazione di posta."
                ) : (
                  <>
                    Email preparata. Se l’applicazione non si è aperta,{" "}
                    <a href={proposalHref}>
                      apri l’email qui <ArrowUpRight size={15} />
                    </a>
                    .
                  </>
                )}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
