'use client'

import { motion } from 'framer-motion';
import { FlaskConical, Radio, Activity, ArrowLeft, Cpu, Terminal } from 'lucide-react';
import Link from 'next/link';

export default function LabsPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center overflow-x-hidden pb-40 selection:bg-[#FF914D]/30">
      
      {/* HEADER: Navigazione e Titolo */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-16 flex flex-col items-center gap-12">
        <div className="w-full flex justify-start">
          <Link href="/" className="nav-tag flex items-center gap-2 group border-white/10 hover:border-[#FF914D]/50 transition-all">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
            <span className="font-mono tracking-widest text-[10px]">BACK</span>
          </Link>
        </div>

        <div className="text-center flex flex-col items-center w-full">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-[#FF914D]/10 border border-[#FF914D]/20 rounded-2xl text-[#FF914D] mb-8 shadow-[0_0_20px_rgba(255,145,77,0.1)]"
          >
            <FlaskConical size={32} className="animate-pulse" />
          </motion.div>
          
          <h1 className="hero-title text-[15vw] md:text-8xl leading-none tracking-tighter italic uppercase font-black">
            UTTF_<span className="text-[#FF914D]">LABS</span>
          </h1>
          <p className="text-zinc-500 font-mono text-[10px] md:text-xs uppercase tracking-[0.5em] mt-6 bg-white/5 px-4 py-1 rounded-full border border-white/5">
            Experimental_Zone // Unit_03
          </p>
        </div>
      </header>

      <main className="w-full max-w-4xl px-6 flex flex-col gap-8">
        
        {/* LIVE STATUS CARD - Il pezzo forte */}
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#FF914D]/20 to-transparent rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="glass-panel relative p-1 border-white/10 bg-zinc-900/20 backdrop-blur-xl rounded-[3rem] overflow-hidden">
            <div className="bg-black/40 rounded-[2.8rem] p-10 md:p-20 flex flex-col items-center text-center border border-white/5">
              
              <div className="relative mb-12">
                <div className="w-20 h-20 rounded-full border-2 border-[#FF914D]/30 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-2 border-[#FF914D] animate-ping opacity-20"></div>
                  <Radio className="text-[#FF914D]" size={32} />
                </div>
                <motion.div 
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute -top-2 -right-8 bg-[#FF914D] text-black font-black text-[10px] px-3 py-1 rounded-full tracking-tighter"
                >
                  LIVE
                </motion.div>
              </div>
              
              <h2 className="text-[10vw] md:text-7xl font-black uppercase italic mb-6 tracking-tighter leading-[0.85] text-white">
                SESSION_01:<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500">OPEN_MIC_STREAM</span>
              </h2>
              
              <div className="flex items-center gap-3 mb-12 text-zinc-500 font-mono text-[10px] tracking-widest">
                <span className="w-2 h-2 rounded-full bg-[#FF914D] animate-pulse"></span>
                TESTING_NEW_CORE_SYSTEMS // ROZZANO_UNIT
              </div>

              <button className="nav-tag px-12 py-5 border-[#FF914D]/30 text-[#FF914D] hover:bg-[#FF914D] hover:text-black transition-all font-black uppercase tracking-[0.2em] text-sm rounded-full shadow-[0_0_30px_rgba(255,145,77,0.1)]">
                START_MONITORING
              </button>
            </div>
          </div>
        </section>

        {/* SYSTEM STATS - Grid di monitoraggio */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          {/* STAT 1 */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-panel p-8 border-white/5 bg-zinc-900/10 rounded-[2rem]"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2 text-zinc-600">
                <Terminal size={14} /> 
                <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400">UNIT_01_CORE</span>
              </div>
              <Activity size={16} className="text-[#FF914D] animate-pulse" />
            </div>
            <h4 className="text-2xl font-black italic uppercase mb-6 tracking-tighter">LYRIC_ENGINE</h4>
            <div className="space-y-2">
              <div className="flex justify-between font-mono text-[8px] text-zinc-500 uppercase">
                <span>Processing_Power</span>
                <span>88%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: '88%' }} 
                  transition={{ duration: 2.5, ease: "circOut" }}
                  className="h-full bg-gradient-to-r from-[#FF914D] to-[#ffb385]" 
                />
              </div>
            </div>
          </motion.div>

          {/* STAT 2 - Stato Idle */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-panel p-8 border-white/5 bg-zinc-900/5 opacity-60 rounded-[2rem]"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2 text-zinc-700">
                <Cpu size={14} /> 
                <span className="text-[9px] font-mono tracking-widest uppercase">UNIT_02_RENDER</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-600 uppercase">IDLE_MODE</span>
            </div>
            <h4 className="text-2xl font-black italic uppercase mb-6 tracking-tighter text-zinc-600">BEAT_RENDER</h4>
            <div className="w-full h-1.5 bg-zinc-900 rounded-full border border-white/5" />
          </motion.div>
        </section>
      </main>

      {/* FOOTER DI SISTEMA */}
      <footer className="py-24 text-center">
        <div className="inline-block px-6 py-2 border border-white/5 rounded-full bg-white/5">
          <p className="text-[9px] font-mono uppercase tracking-[0.8em] text-zinc-700 italic">
            UTTF_SYSTEM_V.2.0 // LAB_MODE_ACTIVE
          </p>
        </div>
      </footer>
    </div>
  );
}
