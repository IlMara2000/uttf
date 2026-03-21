'use client'

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
  return (
    // pb-40 assicura che il contenuto finale non venga coperto dalla Navbar mobile
    <div className="min-h-screen flex flex-col items-center overflow-x-hidden pb-40 bg-black">
      
      {/* HEADER CENTRALE */}
      <header className="pt-24 pb-12 flex flex-col items-center gap-10">
        <img src="/icons/favicon.svg" alt="UTTF" className="w-20 h-20 md:w-24 md:h-24" />
        <span className="nav-tag uppercase tracking-[0.3em]">Factory_Online</span>
      </header>

      {/* HERO SECTION */}
      <section className="px-6 py-12 w-full max-w-7xl flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-full flex flex-col items-center"
        >
          {/* Font fluido text-[14vw] per mobile, md:text-[8vw] per desktop */}
          <h1 className="hero-title text-[14vw] md:text-[8vw] leading-[0.9] text-center mb-16">
            Under The<br />
            Tower<br />
            <span className="text-orange-600" style={{ WebkitTextFillColor: 'var(--uttf-orange)' }}>Factory</span>
          </h1>

          {/* TESTO SECONDARIO - PIÙ LEGGERO PER IL MOBILE */}
          <p className="text-zinc-500 text-lg md:text-2xl text-center uppercase tracking-tight leading-relaxed max-w-2xl font-medium mt-10">
            Associazione culturale dedicata alla creatività urbana. Un incubatore d'arte, musica e cultura nato dal cemento.
          </p>

          {/* FOCUS BOXES - LAYOUT OTTIMIZZATO */}
          <div className="mt-24 w-full max-w-3xl flex flex-col gap-6 md:gap-10">
            <div className="glass-panel p-10 md:p-16 flex flex-col items-center text-center border-white/5">
              <span className="text-[12px] tracking-[0.8em] text-orange-600 mb-4 font-mono uppercase">Live_Unit</span>
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

      {/* FOOTER */}
      <footer className="py-24 text-center opacity-20">
        <p className="text-[9px] font-mono uppercase tracking-[1em] text-zinc-600">
          UTTF_SYSTEM_V.2.0 // Rozzano // Milan
        </p>
      </footer>
    </div>
  );
}
