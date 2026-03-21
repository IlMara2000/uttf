'use client'

import { motion } from 'framer-motion';
import { FlaskConical, Radio, Activity, ArrowLeft, Cpu } from 'lucide-react';
import Link from 'next/link';

export default function LabsPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center overflow-x-hidden pb-40">
      
      {/* HEADER FIXATO: Layout Verticale */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-16 flex flex-col items-center gap-8">
        <div className="w-full flex justify-start">
          <Link href="/" className="nav-tag flex items-center gap-2">
            <ArrowLeft size={14} /> BACK
          </Link>
        </div>

        <div className="text-center flex flex-col items-center w-full">
          <div className="p-3 bg-orange-600/10 border border-orange-600/20 rounded-2xl text-orange-600 mb-6 neon-blink">
            <FlaskConical size={24} />
          </div>
          <h1 className="hero-title text-[12vw] md:text-7xl leading-none tracking-tighter">
            UTTF_LABS
          </h1>
          <p className="text-zinc-600 font-mono text-[8px] uppercase tracking-[0.3em] mt-4">
            Experimental_Zone // Unit_03
          </p>
        </div>
      </header>

      <main className="w-full max-w-7xl px-6 flex flex-col gap-12 md:gap-20">
        
        {/* LIVE STATUS CARD */}
        <section className="glass-panel p-1 border-orange-600/20 bg-orange-600/5">
          <div className="bg-black/40 rounded-[2.4rem] p-8 md:p-16 flex flex-col items-center text-center">
            <div className="relative mb-8">
              <div className="w-16 h-16 rounded-full border border-orange-600 flex items-center justify-center animate-pulse">
                <Radio className="text-orange-600" size={24} />
              </div>
              <div className="absolute -top-2 -right-6 bg-orange-600 text-black font-black text-[8px] px-2 py-0.5 rounded tracking-tighter">LIVE</div>
            </div>
            
            <h2 className="text-[9vw] md:text-6xl font-black uppercase italic mb-6 tracking-tighter leading-none" style={{ fontFamily: 'var(--font-display)' }}>
              SESSION_01:<br />OPEN_MIC_STREAM
            </h2>
            <p className="text-zinc-500 uppercase tracking-widest text-[10px] md:text-sm max-w-md mb-8">
              TESTING_NEW_CORE_SYSTEMS // ROZZANO_UNIT
            </p>
            <button className="btn-urban">START_MONITORING</button>
          </div>
        </section>

        {/* SYSTEM STATS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
          <div className="glass-panel p-8 border-white/5">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-zinc-700">
                <Cpu size={14} /> <span className="text-[9px] font-mono tracking-widest">UNIT_01</span>
              </div>
              <Activity size={14} className="text-orange-600" />
            </div>
            <h4 className="text-xl font-black italic uppercase mb-4 tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>LYRIC_ENGINE</h4>
            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: '65%' }} 
                transition={{ duration: 2, ease: "easeOut" }}
                className="h-full bg-orange-600" 
              />
            </div>
          </div>

          <div className="glass-panel p-8 border-white/5 opacity-50">
            <div className="flex justify-between items-center mb-6 text-zinc-800 font-mono text-[9px]">
              <span>UNIT_02</span>
              <span>IDLE</span>
            </div>
            <h4 className="text-xl font-black italic uppercase mb-4 tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>BEAT_RENDER</h4>
            <div className="w-full h-1 bg-zinc-900 rounded-full" />
          </div>
        </section>
      </main>

      <footer className="py-24 text-center opacity-10">
        <p className="text-[10px] font-mono uppercase tracking-[1em] text-zinc-800">UTTF_SYSTEM_V.2.0 // LAB_MODE</p>
      </footer>
    </div>
  );
}
