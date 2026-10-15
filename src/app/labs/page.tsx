import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import PublicPageIntro from "@/components/PublicPageIntro";
import { labCategories } from "./lab-data";

export default function LabsPage() {
  return (
    <main className="public-page">
      <PublicPageIntro
        number="01"
        eyebrow="I laboratori"
        title={
          <>
            Sbaglia pure.
            <br />
            Poi <span>riprova.</span>
          </>
        }
        description="La cultura urbana diventa un’occasione per esprimersi, imparare e incontrare altre persone. Nei laboratori della Factory si cresce mettendosi in gioco, insieme."
      >
        <a href="#iscrizioni" className="text-link">
          Come partecipare <ArrowUpRight size={17} />
        </a>
      </PublicPageIntro>
      <div className="content-width">
        <section
          className="photo-ribbon"
          aria-label="Momenti dai laboratori Under The Tower"
        >
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Image
                src={`/labs/foto${i}.jpeg`}
                alt={`Persone e attività della Factory, foto ${i}`}
                fill
                sizes="(min-width: 800px) 25vw, 50vw"
              />
            </div>
          ))}
        </section>
        <section className="lab-list" aria-label="Laboratori e iniziative">
          {labCategories.map((lab, index) => {
            return (
              <article className="lab-card" key={lab.slug}>
                <div className="activity-top">
                  <span className="card-index">ATTIVITÀ 0{index + 1}</span>
                </div>
                <h2>{lab.title}</h2>
                <p>{lab.description}</p>
                <div className="tags">
                  {lab.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="lab-actions">
                  <Link
                    className="clay-button light"
                    href={`/labs/${lab.slug}`}
                  >
                    Scopri di più <ArrowUpRight size={17} />
                  </Link>
                  <a href="#iscrizioni" className="text-link">
                    Voglio partecipare <ArrowUpRight size={16} />
                  </a>
                </div>
              </article>
            );
          })}
        </section>
        <section id="iscrizioni" className="association-cta">
          <div>
            <span className="eyebrow">Cominciamo da qui</span>
            <h2>
              La curiosità basta
              <br />
              per fare il primo passo.
            </h2>
            <p>
              I nostri laboratori sono aperti a tutti. Compila il modulo per
              manifestare il tuo interesse: ti rispondiamo con le informazioni
              sulle attività disponibili.
            </p>
          </div>
          <a
            href="https://forms.gle/gbkbEvaavFaHFkkG9"
            target="_blank"
            rel="noopener noreferrer"
            className="clay-button light"
          >
            Chiedi informazioni <ArrowUpRight size={19} />
          </a>
        </section>
      </div>
    </main>
  );
}
