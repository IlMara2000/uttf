'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Zap, Layers, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPublications() {
      // Recupera gli ultimi 6 post caricati dallo Staff
      const { data, error } = await supabase
        .from('publications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      if (!error && data) {
        setPublications(data);
      }
      setLoading(false);
    }
    fetchPublications();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center overflow-x-hidden pb-40 bg-black">
      
      {/* HEADER CENTRALE */}
      <header className="pt-24 pb-12 flex flex-col items-center gap-10">
        <img src="/icons/favicon.svg" alt="UTTF" className="w-20 h-20 md:w-24 md:h-24" />
        <span className="nav-tag uppercase tracking-[0.3em]">W.I.P.</span>
      </header>

      {/* HERO SECTION */}
      <section className="px-6 py-12 w-full max-w-7xl flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-full flex flex-col items-center"
        >
          <h1 className="hero-title text-[14vw] md:text-[8vw] leading-[0.9] text-center mb-16">
            Under The<br />
            Tower<br />
            <span className="text-orange-600" style={{ WebkitTextFillColor: 'var(--uttf-orange)' }}>Factory</span>
          </h1>

          <p className="text-zinc-500 text-lg md:text-2xl text-center uppercase tracking-tight leading-relaxed max-w-2xl font-medium mt-10">
            Associazione culturale dedicata alla creatività urbana. Un incubatore d'arte, musica e cultura nato dal cemento.
          </p>

          {/* FOCUS BOXES */}
          <div className="mt-24 w-full max-w-3xl flex flex-col gap-6 md:gap-10">
            <div className="glass-panel p-10 md:p-16 flex flex-col items-center text-center border-white/5">
              <span className="text-[9px] tracking-[0.8em] text-orange-600 mb-4 font-mono uppercase">CREATIVE_COLLECTIVE</span>
              <h3 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                Under The Tower
              </h3>
            </div>

            <div className="glass-panel p-10 md:p-16 flex flex-col items-center text-center border-white/5">
              <span className="text-[12px] tracking-[0.8em] text-orange-600 mb-4 font-mono uppercase">Lab_Unit</span>
              <h3 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                RAPF*CKTORY
              </h3>
            </div>
          </div>

          {/* BOTTONE STAFF */}
          <div className="mt-24">
            <Link href="/login" className="btn-urban shadow-[0_20px_50px_rgba(234,88,12,0.2)]">
              ACCESSO STAFF
            </Link>
          </div>
        </motion.div>
      </section>

      {/* LIVE OUTPUT SECTION - DINAMICA */}
      <section className="w-full px-6 py-32 mt-20 border-t border-white/5 bg-zinc-950/20">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="flex flex-col items-center mb-20 text-center">
             <span className="text-orange-600 font-mono text-[10px] tracking-[0.6em] uppercase mb-4">Real_Time_Stream</span>
             <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
               Live_<span className="text-orange-600">Output</span>
             </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-80 glass-panel animate-pulse flex items-center justify-center border-white/5">
                  <Loader2 className="animate-spin text-zinc-800" size={32} />
                </div>
              ))
            ) : publications.length > 0 ? (
              publications.map((post) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  key={post.id} 
                  className="glass-panel group overflow-hidden flex flex-col border-white/5 hover:border-orange-600/30 transition-all duration-500"
                >
                  {/* Immagine con Aspect Ratio fisso */}
                  <div className="relative h-64 w-full overflow-hidden">
                    <img 
                      src={post.image_url} 
                      alt={post.title} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-in-out"
                    />
                    <div className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-lg border border-white/10">
                      <Zap className="text-orange-600" size={14} />
                    </div>
                  </div>

                  {/* Testo */}
                  <div className="p-8">
                    <h4 className="text-xl font-black uppercase italic mb-3 text-white tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
                      {post.title}
                    </h4>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest leading-relaxed line-clamp-2 font-mono mb-6">
                      {post.content || "FACTORY_LOG_ENTRY_ALPHA"}
                    </p>
                    <div className="flex justify-between items-center pt-4 border-t border-white/5 font-mono text-[9px] text-zinc-700">
                      <span>{new Date(post.created_at).toLocaleDateString('it-IT')}</span>
                      <Layers size={12} />
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center opacity-30">
                <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.5em]">No_Output_Detected_In_System</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-24 text-center opacity-20">
        <p className="text-[9px] font-mono uppercase tracking-[1em] text-zinc-600">
          UTTF_SYSTEM_V.2.0 // Rozzano // Milan
        </p>
      </footer>
    </div>
  );
}