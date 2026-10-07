import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import PublicPageIntro from "@/components/PublicPageIntro";
import { getLabCategory, labCategories } from "../lab-data";

type LabDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return labCategories.map((lab) => ({ slug: lab.slug }));
}

export async function generateMetadata({
  params,
}: LabDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const lab = getLabCategory(slug);

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
  const lab = getLabCategory(slug);

  if (!lab) {
    notFound();
  }

  return (
    <main className="public-page">
      <PublicPageIntro
        number="LAB"
        eyebrow="Il percorso"
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
            href="https://forms.gle/gbkbEvaavFaHFkkG9"
            target="_blank"
            rel="noopener noreferrer"
            className="clay-button light"
          >
            Voglio partecipare <ArrowUpRight size={17} />
          </a>
        </aside>
      </div>
    </main>
  );
}
