'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Layers } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [publicTasks, setPublicTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPublicTasks() {
      const { data } = await supabase.from('activities').select('*').eq('is_public', true).limit(3);
      setPublicTasks(data || []);
      setLoading(false);
    }
    fetchPublicTasks();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center">
      
      {/* HEADER CENTRALE */}
      <header className="pt-24 pb-12 flex flex-col items-center gap-10">
        <img src="/icons/homelogo.png" alt="UTTF" className="w-16 h-16 md:w-20 md:h-20" />
        <span className="nav-tag">WORK IN PROGRESS</span>
      </header>

      {/* HERO SECTION */}
      <section className="px-6 py-20 w-full max-w-7xl flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-full flex flex-col items-center"
        >
          <h1 className="hero-title">
            Under The<br />
            Tower<br />
            <span style={{ color: 'var(--uttf-orange)', WebkitTextFillColor: 'var(--uttf-orange)' }}>Factory</span>
          </h1>

          {/* TESTO SECONDARIO INGRANDITO E SPAZIATO */}
          <p className="mt-24 text-zinc-500 text-xl md:text-2xl text-center uppercase tracking-tight leading-relaxed max-w-3xl font-medium">
            Associazione culturale dedicata alla creatività urbana. Un incubatore d'arte, musica e creatività nato dal cemento, elevato dall'ingegno.
          </p>

          {/* FOCUS BOX CENTRATO E RESPIRATO */}
          <div className="mt-32 w-full max-w-3xl">
            <div className="glass-panel p-16 flex flex-col items-center text-center">
              <span className="text-[15px] tracking-[0.8em] text-orange-600 mb-6 font-mono">LIVE_UNIT</span>
              <h3 className="text-4xl md:text-5xl font-black italic uppercase text-white mb-6 tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>Under The Tower Factory</h3>
              <p className="text-zinc-500 text-sm md:text-base uppercase tracking-[0.3em] font-medium leading-relaxed max-w-lg">RESTA SINTONIZZATO CON NOI E SEGUI I NOSTRI EVENTI</p>
            </div>
          </div>

          {/* FOCUS BOX CENTRATO E RESPIRATO */}
          <div className="mt-32 w-full max-w-3xl">
            <div className="glass-panel p-16 flex flex-col items-center text-center">
              <span className="text-[15px] tracking-[0.8em] text-orange-600 mb-6 font-mono">LAB_UNIT</span>
              <h3 className="text-4xl md:text-5xl font-black italic uppercase text-white mb-6 tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>RAPF*CKTORY</h3>
              <p className="text-zinc-500 text-sm md:text-base uppercase tracking-[0.3em] font-medium leading-relaxed max-w-lg">Cultura Hip Hop & Urban Creative Core</p>
            </div>
          </div>

          <div className="mt-24">
            <Link href="/login" className="btn-urban shadow-2xl">
              ACCESSO STAFF
            </Link>
          </div>
        </motion.div>
      </section>

      {/* OUTPUT GRID */}
      <section className="w-full px-6 py-40 bg-zinc-950/40 mt-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-24 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            Live_<span style={{ color: 'var(--uttf-orange)' }}>Output</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-96 glass-panel animate-pulse" />)
            ) : (
              publicTasks.map((task) => (
                <div key={task.id} className="glass-panel p-12 flex flex-col items-center text-center">
                  <div className="p-4 bg-orange-600/5 rounded-2xl mb-10 border border-orange-600/10 transition-colors group-hover:bg-orange-600/10">
                    <Zap className="text-orange-600" size={24} />
                  </div>
                  <h4 className="text-3xl font-black uppercase italic mb-6 text-white tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>{task.title}</h4>
                  <p className="text-zinc-500 text-sm uppercase tracking-widest leading-relaxed line-clamp-3 mb-10">{task.description}</p>
                  <div className="w-full pt-8 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-zinc-700">
                    <span>{task.status}</span>
                    <Layers size={14} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <footer className="py-24 text-center opacity-10">
        <p className="text-[10px] font-mono uppercase tracking-[1em] text-zinc-800">UTTF_SYSTEM_V.2.0 // Rozzano // Milan</p>
      </footer>
    </div>
  );
}