import type { Metadata } from "next";
import Link from "next/link";
import RegistrationForm from "@/components/RegistrationForm";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import PublicPageIntro from "@/components/PublicPageIntro";
import { loadLabs } from "@/lib/labs-server";

type LabDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: LabDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { labs } = await loadLabs();
  const lab = labs.find(lab => lab.slug === slug);

  if (!lab) {
    return {
      title: "Laboratorio non trovato | UTTF",
    };
  }

  return {
    title: `${lab.title} | UTTF Labs`,
    description: lab.description,
    alternates: {
      canonical: `/labs/${lab.slug}`,
    },
  };
}

export default async function LabDetailPage({ params }: LabDetailPageProps) {
  const { slug } = await params;
  const { labs, ready } = await loadLabs();
  const lab = labs.find(lab => lab.slug === slug);

  if (!lab) {
    notFound();
  }

  return (
    <main className="public-page">
      <PublicPageIntro
        number="LAB"
        eyebrow="Laboratori e iniziative"
        title={lab.title}
        description={lab.description}
      >
        <Link href="/labs" className="text-link">
          Tutti i laboratori <ArrowUpRight size={17} />
        </Link>
      </PublicPageIntro>
      <div className="content-width lab-detail">
        <div>
          <h2>Spazio alla tua creatività.</h2>
          <p>{lab.detailIntro}</p>
          <p>
            Per conoscere i prossimi appuntamenti e le modalità di
            partecipazione, compila il modulo o scrivi all’associazione.
          </p>
          <a href="mailto:ass.uttf@gmail.com" className="text-link">
            Chiedici informazioni <ArrowUpRight size={17} />
          </a>
        </div>
        <aside>
          <span className="eyebrow">Cosa esploriamo insieme</span>
          <div className="tags">
            {lab.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <a
            href="#iscrizione"
            className="clay-button light"
          >
            Mi interessa <ArrowUpRight size={17} />
          </a>
        </aside>
      </div>
      <div className="content-width" id="iscrizione"><RegistrationForm lab={lab} ready={ready}/></div>
    </main>
  );
}
