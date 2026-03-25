'use client'

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, ArrowLeft, Users, Music, Mic2, Palette, ChevronDown } from 'lucide-react';
import Link from 'next/link';

const labImages = [
  "/labs/foto1.jpeg",
  "/labs/foto2.jpeg",
  "/labs/foto3.jpeg",
  "/labs/foto4.jpeg",
];

const labCategories = [
  {
    title: "RAP_F*CKTORY",
    icon: <Mic2 size={24} />,
    description: "Sessioni di scrittura creativa e tecnica del flow. Un laboratorio dove il rap diventa strumento di espressione e narrazione del quotidiano.",
    tags: ["WRITING", "FLOW", "LIVE"]
  },
  {
    title: "BEAT_MAKING",
    icon: <Music size={24} />,
    description: "Dalla creazione del sample alla struttura del beat. I ragazzi imparano a produrre le proprie basi utilizzando software professionali.",
    tags: ["PRODUCTION", "DAW", "SOUND"]
  },
  {
    title: "URBAN_ARTS",
    icon: <Palette size={24} />,
    description: "Non solo musica. Esploriamo il mondo dei graffiti, della grafica e della fotografia per dare un'identità visiva ai progetti della Factory.",
    tags: ["GRAFFITI", "GRAPHIC", "PHOTO"]
  },
  {
    title: "COMMUNITY_HUB",
    icon: <Users size={24} />,
    description: "Incontri aperti, dibattiti e momenti di aggregazione. Il laboratorio fisico dove le idee circolano e nascono nuove collaborazioni.",
    tags: ["MEETING", "ROZZANO", "CO-WORKING"]
  }
];

export default function LabsPage() {
  const subscribeRef = useRef<HTMLDivElement>(null);

  const scrollToSubscribe = () => {
    subscribeRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center overflow-x-hidden pb-40 selection:bg-[#FF914D]/30">
      
      {/* HEADER */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-16 flex flex-col items-center gap-12">
        <div className="w-full flex justify-start">
          
        {/* TASTO BACK CON TESTO ARANCIONE */}
          <Link href="/" className="nav-tag flex items-center gap-2 !text-[#FF914D] border-[#FF914D]/20">
            <ArrowLeft size={14} className="text-[#FF914D]" /> BACK
          </Link>
        </div>
        
        <div className="text-center flex flex-col items-center">
          {/* PALLINO ARANCIONE SOPRA LA SCRITTA */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[#FF914D] blur-xl opacity-20 rounded-full animate-pulse"></div>
            <div className="relative p-4 bg-[#FF914D]/10 border border-[#FF914D]/20 rounded-full text-[#FF914D]">
              <FlaskConical size={32} strokeWidth={2.5} />
            </div>
          </div>
          
          {/* TITOLO RIMPICCIOLITO */}
          <h1 className="hero-title text-[10vw] md:text-6xl leading-none italic uppercase font-black tracking-tighter">
            UTTF_<span className="text-[#FF914D]">LABS<br /></span>
          </h1>
          <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em] mt-4">
            Attività per il Sociale
          </p>
        </div>
      </header>

      <main className="w-full max-w-7xl px-6 flex flex-col gap-16">
        
        {/* CAROUSEL */}
        <section className="w-full overflow-hidden relative py-10">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10"></div>
          
          <motion.div 
            className="flex gap-4"
            animate={{ x: [0, -1200] }} 
            transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          >
            {[...labImages, ...labImages, ...labImages].map((img, idx) => (
              <div key={idx} className="min-w-[300px] md:min-w-[500px] aspect-video rounded-[2rem] overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl">
                <img 
                  src={img} 
                  alt="Lab Session" 
                  className="w-full h-full object-cover grayscale-[40%] hover:grayscale-0 transition-all duration-700 hover:scale-105" 
                  onError={(e) => { e.currentTarget.src = "https://placehold.co/600x400/0a0a0a/FF914D?text=CARICARE_FOTO"; }}
                />
              </div>
            ))}
          </motion.div>
        </section>

        {/* LAB DESCRIPTIONS BOXES */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {labCategories.map((lab, index) => (
            <motion.div
              key={lab.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 0.98 }}
              whileTap={{ scale: 0.95 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={scrollToSubscribe}
              className="glass-panel p-8 md:p-10 border-white/5 hover:border-[#FF914D]/40 transition-all group relative overflow-hidden cursor-pointer bg-zinc-900/20"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity text-[#FF914D]">
                {lab.icon}
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/5 rounded-xl text-[#FF914D] group-hover:bg-[#FF914D] group-hover:text-black transition-colors">
                  {lab.icon}
                </div>
                <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter">
                  {lab.title}
                </h3>
              </div>

              <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-8 uppercase font-medium">
                {lab.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {lab.tags.map(tag => (
                  <span key={tag} className="text-[9px] font-mono border border-white/10 px-3 py-1 rounded-full text-zinc-500 uppercase">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[#FF914D] text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-all">
                Voglio iscrivermi! <ChevronDown size={14} className="group-hover:translate-y-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </section>
          
        {/* CALL TO ACTION */}
        <section ref={subscribeRef} className="flex justify-center scroll-mt-20">
          <div className="glass-panel p-8 md:p-12 border-[#FF914D]/10 bg-[#FF914D]/5 flex flex-col items-center text-center rounded-[2.5rem] max-w-2xl w-full">
            <h2 className="text-2xl md:text-4xl font-black italic uppercase mb-3 tracking-tighter text-white">
              Vuoi partecipare anche tu?
            </h2>
            <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em] mb-8">
              I nostri laboratori sono aperti a tutti i ragazzi del territorio. Contattaci per scoprire come unirti alla UTTFactory.
            </p>
            <a 
              href="https://forms.gle/gbkbEvaavFaHFkkG9" 
              target="_blank" 
              rel="noopener noreferrer"
              className="nav-tag px-10 py-4 bg-[#FF914D] text-black border-none font-black uppercase tracking-widest text-xs rounded-full hover:scale-110 hover:shadow-[0_0_20px_rgba(255,145,77,0.4)] transition-all inline-block"
            >
              ISCRIVITI
            </a>
          </div>
        </section>

      </main>

      <footer className="py-24 text-center opacity-20">
        <p className="text-[9px] font-mono uppercase tracking-[1em] text-zinc-600 italic">
          UTTF_LAB_ARCHIVE_2026 // ROZZANO
        </p>
      </footer>
    </div>
  );
}