import Image from "next/image";
import LabCards from "@/components/LabCards";
import { loadLabs } from "@/lib/labs-server";
import { ArrowUpRight } from "lucide-react";
import PublicPageIntro from "@/components/PublicPageIntro";

export default async function LabsPage() {
  const { labs, ready } = await loadLabs();
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
      />
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
        <LabCards initialLabs={labs} ready={ready} />
        <section id="iscrizioni" className="association-cta">
          <div>
            <span className="eyebrow">Cominciamo da qui</span>
            <h2>
              La curiosità basta
              <br />
              per fare il primo passo.
            </h2>
            <p>
              Scegli una delle attività attive e apri il suo modulo di iscrizione. Per altre informazioni, scrivici.
            </p>
          </div>
          <a
            href="mailto:ass.uttf@gmail.com"
            className="clay-button light"
          >
            Chiedi informazioni <ArrowUpRight size={19} />
          </a>
        </section>
      </div>
    </main>
  );
}
