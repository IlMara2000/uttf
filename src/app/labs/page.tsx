'use client'

import { motion } from 'framer-motion';
import { FlaskConical, Radio, Activity, ArrowLeft, Mic2, Cpu } from 'lucide-react';
import Link from 'next/link';

// Dati Esempio per il Lab Status (Attività attuali)
const activeExperiments = [
  {
    id: 1,
    unit: 'UNIT_01',
    name: 'LYRIC_ANALYSIS_BETA',
    status: 'PROCESSING',
    load: '64%',
    color: 'text-orange-600'
  },
  {
    id: 2,
    unit: 'UNIT_04',
    name: 'BEAT_CONSTRUCTION',
    status: 'IDLE',
    load: '00%',
    color: 'text-zinc-700'
  }
];

export default function LabsPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-20 flex flex-col items-center">
      
      {/* HEADER */}
      <header className="pt-16 pb-20 w-full max-w-7xl flex items-center justify-between">
        <Link href="/" className="nav-tag flex items-center gap-2">
          <ArrowLeft size={14} /> BACK
        </Link>
        <div className="text-center flex flex-col items-center">
          <div className="p-4 bg-orange-600/10 border border-orange-600/20 rounded-2xl text-orange-600 mb-8 neon-blink">
            <FlaskConical size={32} />
          </div>
          <h1 className="hero-title text-5xl">UTTF_LABS</h1>
          <p className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.3em] mt-2">Experimental_Zone // Live_Status</p>
        </div>
        <span className="text-zinc-900 font-mono text-xl">/03</span>
      </header>

      <main className="w-full max-w-7xl flex flex-col gap-24">

        {/* --- SEZIONE 1: LIVE BROADCAST (L'evento principale) --- */}
        <section className="w-full">
          <div className="glass-panel p-1 border-orange-600/20 bg-orange-600/5 overflow-hidden">
             <div className="bg-black/80 rounded-[2.4rem] p-10 md:p-16 flex flex-col md:flex-row items-center gap-12">
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-full border-2 border-orange-600 flex items-center justify-center animate-pulse">
                    <Radio className="text-orange-600" size={40} />
                  </div>
                  <span className="absolute -top-2 -right-2 bg-orange-600 text-black font-black text-[10px] px-2 py-1 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping" /> LIVE
                  </span>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-4xl font-black uppercase italic mb-4 tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
                    SESSION_01: OPEN_MIC_STREAM
                  </h2>
                  <p className="text-zinc-500 uppercase tracking-widest text-sm font-medium mb-8">
                    Stiamo testando i nuovi setup di registrazione. Connettiti per ascoltare il flusso grezzo della Factory.
                  </p>
                  <button className="btn-urban text-[10px] px-8">
                    LISTEN_STREAM_01
                  </button>
                </div>
             </div>
          </div>
        </section>

        {/* --- SEZIONE 2: LAB CORE STATUS (Griglia tecnica) --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {activeExperiments.map((exp) => (
            <div key={exp.id} className="glass-panel p-10 flex flex-col gap-8 border-white/5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Cpu size={16} className="text-zinc-700" />
                  <span className="text-[10px] font-mono text-zinc-500 tracking-[0.4em]">{exp.unit}</span>
                </div>
                <Activity size={16} className={exp.color} />
              </div>

              <div>
                <h4 className="text-2xl font-black italic uppercase mb-2" style={{ fontFamily: 'var(--font-display)' }}>{exp.name}</h4>
                <div className="w-full h-1 bg-zinc-900 rounded-full mt-4 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: exp.load }}
                    className={`h-full ${exp.status === 'PROCESSING' ? 'bg-orange-600' : 'bg-zinc-800'}`}
                  />
                </div>
              </div>

              <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-zinc-600">
                <span>Status: {exp.status}</span>
                <span>System_Load: {exp.load}</span>
              </div>
            </div>
          ))}

          {/* BOX AGGIUNTIVO PER IL FUTURO */}
          <div className="glass-panel p-10 flex flex-col items-center justify-center border-dashed border-white/10 opacity-40">
            <Mic2 size={24} className="mb-4 text-zinc-700" />
            <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Waiting_For_New_Input</span>
          </div>
        </section>

      </main>

      <footer className="py-24 text-center opacity-10">
        <p className="text-[10px] font-mono uppercase tracking-[1em] text-zinc-800">UTTF_SYSTEM_V.2.0 // LAB_MODE // Rozzano</p>
      </footer>
    </div>
  );
}
