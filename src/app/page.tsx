'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Zap, Layers, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // CONFIGURAZIONE SUPABASE
  const PROJECT_ID = 'oieqtrfeoyfabyjirrqa'; 
  const BUCKET_NAME = 'publications'; 

  useEffect(() => {
    async function fetchPublications() {
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
    <div className="min-h-screen flex flex-col items-center overflow-x-hidden pb-40">
      
      {/* HEADER */}
      <header className="pt-24 pb-12 flex flex-col items-center gap-10">
        <img 
          src="/icons/favicon.svg" 
          alt="UTTF" 
          className="w-25 h-25 md:w-30 md:h-30 transition-transform hover:scale-110 duration-500" 
          onError={(e) => (e.currentTarget.src = '/favicon.ico')}
        />
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
            <span style={{ color: '#FF914D' }}>Factory</span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-2xl text-center uppercase tracking-tight leading-relaxed max-w-2xl font-medium mt-10 opacity-80">
            Associazione culturale dedicata alla creatività urbana. Un incubatore d'arte, musica e cultura nato dal cemento.
          </p>

          <div className="mt-24 w-full max-w-3xl flex flex-col gap-6 md:gap-10">
            <Link href="/feed" className="group">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="glass-panel p-10 md:p-16 flex flex-col items-center text-center border-white/5 group-hover:border-[#FF914D]/30 transition-all duration-500 relative overflow-hidden"
              >
                <span className="text-[9px] tracking-[0.8em] text-[#FF914D] mb-4 font-mono uppercase">Creative_Collective</span>
                <h3 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                  Under The Tower
                </h3>
                <ArrowRight className="absolute right-8 bottom-8 text-white/10 group-hover:text-[#FF914D] group-hover:translate-x-2 transition-all" size={20} />
              </motion.div>
            </Link>

            <Link href="/labs" className="group">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="glass-panel p-10 md:p-16 flex flex-col items-center text-center border-white/5 group-hover:border-[#FF914D]/30 transition-all duration-500 relative overflow-hidden"
              >
                <span className="text-[12px] tracking-[0.8em] text-[#FF914D] mb-4 font-mono uppercase">Lab_Unit</span>
                <h3 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                  RAPF*CKTORY
                </h3>
                <ArrowRight className="absolute right-8 bottom-8 text-white/10 group-hover:text-[#FF914D] group-hover:translate-x-2 transition-all" size={20} />
              </motion.div>
            </Link>
          </div>

          <div className="mt-24">
            <Link href="/login" className="btn-urban shadow-[0_20px_50px_rgba(255,145,77,0.15)]">
              ACCESSO STAFF
            </Link>
          </div>
        </motion.div>
      </section>

      {/* LIVE OUTPUT SECTION */}
      <section className="w-full px-6 py-32 mt-20 border-t border-white/5 bg-transparent">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="flex flex-col items-center mb-20 text-center">
             <span className="text-[#FF914D] font-mono text-[10px] tracking-[0.6em] uppercase mb-4">Real_Time_Stream</span>
             <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
               Live_<span className="text-[#FF914D]">Output</span>
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
              publications.map((post) => {
                // FIX: Uso corretto della variabile PROJECT_ID nella stringa
                let imageUrl = post.image_url;
                if (imageUrl && !imageUrl.startsWith('http')) {
                  imageUrl = `https://${PROJECT_ID}.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${imageUrl}`;
                }

                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    key={post.id} 
                    className="glass-panel group overflow-hidden flex flex-col border-white/5 hover:border-[#FF914D]/30 transition-all duration-500"
                  >
                    <div className="relative h-64 w-full overflow-hidden bg-zinc-900">
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={post.title} 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-in-out"
                          onError={(e) => {
                            e.currentTarget.src = "https://placehold.co/600x400/0a0a0a/FF914D?text=FILE_NOT_FOUND";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-800 font-mono text-[10px]">NO_IMAGE</div>
                      )}
                    </div>

                    <div className="p-8">
                      <h4 className="text-xl font-black uppercase italic mb-3 text-white tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
                        {post.title}
                      </h4>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-widest leading-relaxed font-mono mb-6 line-clamp-2">
                        {post.content || "FACTORY_LOG_ENTRY_ALPHA"}
                      </p>
                      <div className="flex justify-between items-center pt-4 border-t border-white/5 font-mono text-[9px] text-zinc-700">
                        <span>{new Date(post.created_at).toLocaleDateString('it-IT')}</span>
                        <Layers size={12} />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-full py-20 text-center opacity-30">
                <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.5em]">No_Output_Detected</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="py-24 text-center opacity-30">
        <p className="text-[9px] font-mono uppercase tracking-[1em] text-zinc-600">UTTF_SYSTEM_V.2.0</p>
      </footer>
    </div>
  );
}