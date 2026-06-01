import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, FlaskConical } from 'lucide-react';
import { getLabCategory, labCategories } from '../lab-data';

type LabDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return labCategories.map((lab) => ({ slug: lab.slug }));
}

export async function generateMetadata({ params }: LabDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const lab = getLabCategory(slug);

  if (!lab) {
    return {
      title: 'Laboratorio non trovato | UTTF',
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
    <div className="min-h-screen bg-transparent text-white flex flex-col items-center overflow-x-hidden pb-40 selection:bg-[#FF914D]/30">
      <header className="w-full max-w-5xl px-6 pt-12 pb-12">
        <Link href="/labs" className="nav-tag inline-flex items-center gap-2 !text-[#FF914D] border-[#FF914D]/20">
          <ArrowLeft size={14} className="text-[#FF914D]" />
          INDIETRO AI LABS
        </Link>
      </header>

      <main className="w-full max-w-5xl px-6">
        <section className="glass-panel overflow-hidden rounded-[3rem] border-[#FF914D]/15 bg-black/45 p-8 md:p-12">
          <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.45em] text-[#FF914D]">
                Dettaglio laboratorio
              </p>
              <h1 className="text-5xl font-black italic uppercase leading-none tracking-tighter md:text-7xl">
                {lab.title}
              </h1>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FF914D]/30 bg-[#FF914D]/10 text-[#FF914D]">
              <FlaskConical size={30} strokeWidth={2.5} />
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-white/10 bg-black/30 p-6">
              <h2 className="mb-4 text-xl font-black uppercase italic tracking-tight text-white">
                Panoramica
              </h2>
              <p className="text-sm font-medium uppercase leading-relaxed tracking-tight text-zinc-300">
                {lab.description}
              </p>
              <p className="mt-5 text-sm font-medium uppercase leading-relaxed tracking-tight text-zinc-400">
                {lab.detailIntro}
              </p>
            </div>

            <aside className="rounded-[2rem] border border-[#FF914D]/15 bg-[#FF914D]/5 p-6">
              <p className="mb-4 font-mono text-[9px] font-bold uppercase tracking-[0.35em] text-[#FF914D]">
                Focus
              </p>
              <div className="mb-8 flex flex-wrap gap-2">
                {lab.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-[9px] uppercase text-zinc-300">
                    #{tag}
                  </span>
                ))}
              </div>

              <a
                href="https://forms.gle/gbkbEvaavFaHFkkG9"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FF914D] px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-white"
              >
                Voglio iscrivermi
                <ExternalLink size={14} />
              </a>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
