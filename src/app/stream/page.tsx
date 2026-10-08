import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import VideoEmbed from "@/components/VideoEmbed";
import PublicPageIntro from "@/components/PublicPageIntro";

const stream = {
  title: "NO LIMIT JAM 2025",
  subtitle: "Archivio video UTTF",
  embedUrl: "https://www.youtube.com/embed/pnL4b4Xhaxg",
  watchUrl: "https://youtu.be/pnL4b4Xhaxg",
  status: "Archive online",
  viewers: "Replay",
  quality: "HD",
  latency: "0.0",
};

export default function StreamPage() {
  return (
    <main className="public-page">
      <PublicPageIntro
        number="05"
        eyebrow="Video e live"
        title={
          <>
            L’energia
            <br />
            resta <span>qui.</span>
          </>
        }
        description="Eventi, incontri e cultura hip-hop attraverso i video della Factory. Rivivi i momenti che abbiamo condiviso e segui i prossimi appuntamenti."
      />
      <div className="content-width">
        <section className="video-feature">
          <div className="video-feature-player">
            <VideoEmbed title={stream.title} embedUrl={stream.embedUrl} />
          </div>
          <div className="video-feature-caption">
            <div>
              <span className="eyebrow">Dall’archivio · Replay</span>
              <h2>{stream.title}</h2>
            </div>
            <a
              href={stream.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Guarda su YouTube <ArrowUpRight size={18} />
            </a>
          </div>
        </section>
        <section className="association-cta">
          <div>
            <span className="eyebrow">I prossimi incontri</span>
            <h2>Ci rivediamo sotto la torre.</h2>
            <p>
              Stiamo aggiornando il programma. Trovi le nuove date nel diario e
              sui nostri canali.
            </p>
          </div>
          <Link href="/feed" className="clay-button light">
            Segui gli aggiornamenti <ArrowUpRight size={18} />
          </Link>
        </section>
      </div>
    </main>
  );
}
