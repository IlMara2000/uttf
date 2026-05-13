'use client'

import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Brush,
  ExternalLink,
  ImageIcon,
  MapPin,
  Palette,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

const artworks = [
  {
    title: 'Muro Vivo',
    type: 'Urban Canvas',
    icon: <Palette size={20} />,
    image: '/instagram/post1.jpeg',
    description: 'Opera nata dal territorio, tra segni rapidi, materia urbana e identita locale. Un frammento visivo della factory lasciato respirare a pochi passi da casa.',
    techniques: ['Street Art', 'Mixed Media', 'Local Roots'],
    tags: ['KM0', 'URBAN', 'COMMUNITY']
  },
  {
    title: 'Factory Signs',
    type: 'Visual Archive',
    icon: <ImageIcon size={20} />,
    image: '/instagram/post2.jpeg',
    description: 'Tracce, dettagli e simboli raccolti dentro il flusso creativo UTTF. Ogni immagine conserva il rumore buono delle idee nate sul posto.',
    techniques: ['Photography', 'Archive', 'Composition'],
    tags: ['ARCHIVE', 'DETAILS', 'UTTF']
  },
  {
    title: 'Linea Locale',
    type: 'Handmade Piece',
    icon: <Brush size={20} />,
    image: '/instagram/post3.jpeg',
    description: 'Un lavoro costruito con mani vicine, materiali accessibili e visione diretta. Arte a km0 significa partire da quello che abbiamo intorno.',
    techniques: ['Handmade', 'Texture', 'Color Study'],
    tags: ['HANDMADE', 'LOCAL', 'RAW']
  },
  {
    title: 'Sotto La Torre',
    type: 'Community Work',
    icon: <MapPin size={20} />,
    image: '/instagram/post4.jpeg',
    description: 'Un pezzo che tiene insieme luogo, persone e memoria. La galleria diventa mappa emotiva di quello che succede sotto la torre.',
    techniques: ['Community Art', 'Storytelling', 'Visual Map'],
    tags: ['PLACE', 'PEOPLE', 'MEMORY']
  },
  {
    title: 'Lab Session 01',
    type: 'Creative Process',
    icon: <Sparkles size={20} />,
    image: '/labs/foto1.jpeg',
    description: 'Scatto dal processo creativo: prove, tentativi, strumenti e intuizioni. Qui la galleria mostra anche quello che arriva prima del risultato.',
    techniques: ['Process', 'Workshop', 'Experiment'],
    tags: ['LAB', 'PROCESS', 'SESSION']
  },
  {
    title: 'Lab Session 02',
    type: 'Local Experiment',
    icon: <Brush size={20} />,
    image: '/labs/foto2.jpeg',
    description: 'Esperimento visivo nato in laboratorio, con energia diretta e spirito artigianale. Nessuna distanza: solo idee lavorate vicino alla community.',
    techniques: ['Experiment', 'Craft', 'Culture'],
    tags: ['LOCAL', 'CRAFT', 'CULTURE']
  },
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col items-center overflow-x-hidden pb-40">
      <header className="w-full max-w-7xl px-6 pt-12 pb-16 flex flex-col items-start gap-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link href="/" className="nav-tag flex items-center gap-2 group border-white/10 hover:border-[#FF914D]/50 transition-all">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono tracking-widest text-[10px]">BACK</span>
          </Link>
        </motion.div>

        <div className="flex flex-col gap-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none"
          >
            GALLERIA <span className="text-[#FF914D]">KM0</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 text-sm md:text-lg max-w-xl uppercase font-mono tracking-tight leading-tight"
          >
            Arte locale, processi creativi e frammenti visuali nati dentro Under The Tower Factory.
          </motion.p>
        </div>
      </header>

      <main className="w-full max-w-7xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {artworks.map((artwork, index) => (
            <motion.div
              key={artwork.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-panel group border-white/5 hover:border-[#FF914D]/30 transition-all duration-500 overflow-hidden flex flex-col rounded-[2rem]"
            >
              <div className="relative h-64 w-full overflow-hidden bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element -- Local gallery assets use existing public folders and need the same inline fallback as team cards. */}
                <img
                  src={artwork.image}
                  alt={artwork.title}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  onError={(e) => {
                    e.currentTarget.src = 'https://placehold.co/600x800/0a0a0a/FF914D?text=KM0_ART';
                  }}
                />
                <div className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[#FF914D]">
                  {artwork.icon}
                </div>
                <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/60 to-transparent">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter">
                    {artwork.title}
                  </h3>
                  <p className="text-[#FF914D] font-mono text-[10px] tracking-[0.3em] uppercase">
                    {artwork.type}
                  </p>
                </div>
              </div>

              <div className="p-8 flex-grow flex flex-col justify-between bg-zinc-950/50">
                <div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed mb-8 uppercase tracking-tight font-medium">
                    {artwork.description}
                  </p>

                  <div className="space-y-4 mb-8">
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Art_Process</p>
                    <div className="flex flex-wrap gap-2">
                      {artwork.techniques.map((technique) => (
                        <span key={technique} className="px-3 py-1 bg-white/5 border border-white/5 rounded text-[9px] font-black uppercase text-zinc-300">
                          {technique}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-6 border-t border-white/5">
                  {artwork.tags.map((tag) => (
                    <span key={tag} className="text-[8px] font-mono text-[#FF914D]/70 uppercase tracking-tighter">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="mt-32 w-full max-w-3xl px-6 text-center">
        <div className="glass-panel p-12 border-white/5 rounded-[3rem] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF914D]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <h2 className="text-2xl font-black uppercase italic mb-6 tracking-tighter">
            Vuoi proporre un <span className="text-[#FF914D]">pezzo</span>?
          </h2>
          <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-8">
            La galleria cresce con artisti, idee e contributi del territorio.
          </p>

          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSerjf1xGTrj08wmLSJhbrqwDV2Czc5Kd6OatIyvdlSwJsRNrw/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-tag inline-flex items-center gap-2 px-10 py-4 border-[#FF914D]/20 text-[#FF914D] hover:bg-[#FF914D] hover:text-black transition-all font-black uppercase tracking-widest text-xs cursor-pointer group/btn"
          >
            PROPONI IL TUO LAVORO
            <ExternalLink size={14} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
          </a>
        </div>

        <p className="mt-20 text-[9px] font-mono uppercase tracking-[1em] text-zinc-600 italic">
          UTTF_KM0_GALLERY_2026
        </p>
      </footer>
    </div>
  );
}
