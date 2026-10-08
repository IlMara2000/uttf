import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import PublicPageIntro from "@/components/PublicPageIntro";

const teamMembers = [
  {
    name: "Elle Piò",
    role: "Presidente & Founder",
    image: "/team/elle-pio.jpg",
    description:
      "Presidente e fondatore, porta avanti con tenacia una visione nata da bambino e trasformata in UTTF: un punto di riferimento che accoglie, orienta e fa crescere un gruppo di ragazzi attraverso arte, disciplina e comunità.",
    skills: ["Leadership", "Creative Direction", "Education"],
    tags: ["FOUNDER", "RAP ARTIST", "EDUCAZIONE"],
  },
  {
    name: "Drew",
    role: "Video Maker",
    image: "/team/drew.jpg",
    description:
      "Cresciuto professionalmente dentro UTTF, ha trasformato la passione per l'immagine in un mestiere. Oggi lavora come videomaker con artisti riconosciuti, portando tecnica, visione e affidabilità in ogni produzione.",
    skills: ["Video Editing", "Directing", "Color Grading"],
    tags: ["FILMMAKER", "VISUALS", "RAP ARTIST"],
  },
  {
    name: "Sarso",
    role: "Educatore / Vocalist",
    image: "/team/placeholder.svg",
    description:
      "Artista tenace, crede profondamente nel valore della propria arte. Nato oltre 15 anni fa con il beatbox, è diventato MC, presentatore live e giudice di contest hip-hop, con collaborazioni e featuring importanti nella scena.",
    skills: ["Vocal Coaching", "Social Work", "Stage Presence"],
    tags: ["VOCALIST", "EDUCATOR", "ENERGY"],
  },
  {
    name: "Gioitz",
    role: "Produttore / DJ",
    image: "/team/gioitz.jpg",
    description:
      "Studia musica da sempre, cercandone struttura, suono e dettagli. Diplomato come produttore musicale, unisce orecchio preciso e creatività naturale per costruire beat, atmosfere e identità sonore.",
    skills: ["Music Production", "DJing", "Sound Design"],
    tags: ["PRODUCER", "MUSICIAN", "STYLE"],
  },
  {
    name: "Geo",
    role: "Operatrice / Creative Support",
    image: "/team/geo.jpg",
    description:
      "Determinata e caparbia, si mette continuamente in gioco. Lavora nel mondo della moda e porta in UTTF visione estetica, presenza operativa e competenze da social media manager dell'associazione.",
    skills: ["Team Support", "Creative Coordination", "Operational Flow"],
    tags: ["OPERATOR", "CREATIVE SUPPORT", "TEAM FLOW"],
  },
  {
    name: "Den",
    role: "Fonico / SMM",
    image: "/team/den.jpg",
    description:
      "Diplomato in grafica e comunicazione, fotografo, fonico certificato e project manager. È il profilo trasversale che entra dove serve: tecnico, creativo, problem solver e sviluppatore web, creatore di questo sito.",
    skills: ["Audio Engineering", "Social Media", "Graphic Design"],
    tags: ["AUDIO TECH", "SMM", "PROBLEM SOLVER"],
  },
];

export default function TeamPage() {
  return (
    <main className="public-page">
      <PublicPageIntro
        number="02"
        eyebrow="L’associazione"
        title={
          <>
            Le persone.
            <br />
            La nostra <span>forza.</span>
          </>
        }
        description="Siamo artisti, educatori e persone che credono nel territorio. Condividiamo competenze e passioni per accompagnare i ragazzi in un percorso di crescita attraverso l’arte e la cultura hip-hop."
      />
      <div className="content-width">
        <section
          className="people-grid"
          aria-label="Il team Under The Tower Factory"
        >
          {teamMembers.map((member) => (
            <article className="person-card" key={member.name}>
              <div className="person-photo">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  sizes="(min-width: 1100px) 33vw, (min-width: 520px) 50vw, 100vw"
                />
              </div>
              <div className="person-copy">
                <h2>{member.name}</h2>
                <span className="eyebrow">{member.role}</span>
                <p>{member.description}</p>
                <div className="tags">
                  {member.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
        <section id="collabora" className="association-cta">
          <div>
            <span className="eyebrow">Facciamo comunità</span>
            <h2>
              C’è posto anche
              <br />
              per il tuo contributo.
            </h2>
            <p>
              Cerchiamo persone con voglia di mettersi in gioco e aiutare gli
              altri a crescere. Porta le tue competenze, il tuo tempo e le tue
              idee nell’associazione.
            </p>
          </div>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSerjf1xGTrj08wmLSJhbrqwDV2Czc5Kd6OatIyvdlSwJsRNrw/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="clay-button light"
          >
            Collabora con noi <ArrowUpRight size={18} />
          </a>
        </section>
      </div>
    </main>
  );
}
