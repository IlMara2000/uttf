'use client'

import { motion } from 'framer-motion';
import { Radio, Activity, ArrowLeft, Terminal, Cast, Users, Zap, Share2 } from 'lucide-react';
import Link from 'next/link';

export default function StreamPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center overflow-x-hidden pb-40 selection:bg-[#FF914D]/30">
      
      {/* HEADER */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-16 flex flex-col items-center gap-12">
        <div className="w-full flex justify-start">
          <Link href="/feed" className="nav-tag flex items-center gap-2 group border-white/10 hover:border-[#FF914D]/50 transition-all">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
            <span className="font-mono tracking-widest text-[10px]">RETURN_TO_FEED</span>
          </Link>
        </div>

        <div className="text-center flex flex-col items-center w-full">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="p-3 bg-[#FF914D]/10 border border-[#FF914D]/20 rounded-2xl text-[#FF914D] mb-6"
          >
            <Radio size={28} className="animate-pulse" />
          </motion.div>
          
          <h1 className="hero-title text-[12vw] md:text-7xl leading-none italic uppercase font-black tracking-tighter">
            LIVE_<span className="text-[#FF914D]">STREAM</span>
          </h1>
          <div className="flex items-center gap-4 mt-6">
            <span className="h-[1px] w-12 bg-zinc-800"></span>
            <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em]">
              Broadcast_Unit // Rozzano_Main_Frame
            </p>
            <span className="h-[1px] w-12 bg-zinc-800"></span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl px-6 flex flex-col gap-8">
        
        {/* MAIN BROADCAST WINDOW */}
        <section className="relative">
          <div className="absolute -inset-1 bg-[#FF914D]/10 blur-2xl rounded-[2rem] opacity-30"></div>
          <div className="glass-panel relative aspect-video w-full rounded-[2rem] border-white/10 overflow-hidden bg-zinc-900/40 backdrop-blur-3xl group">
            
            {/* Qui andrà l'iframe di YouTube/Twitch o il tag Video */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
              <div className="relative">
                <Cast size={80} className="text-zinc-800 group-hover:text-[#FF914D]/20 transition-all duration-1000" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 border-2 border-[#FF914D]/30 rounded-full scale-150 blur-xl"
                />
              </div>
              <p className="mt-8 font-mono text-[10px] text-zinc-500 tracking-[0.5em] animate-pulse">SEARCHING_FOR_SIGNAL...</p>
            </div>

            {/* Live Indicators Overlay */}
            <div className="absolute top-6 left-6 flex gap-3">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-tighter">Status: Offline</span>
              </div>
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                <Users size={12} className="text-zinc-500" />
                <span className="font-mono text-[9px] text-zinc-400">0_VIEWERS</span>
              </div>
            </div>

            <div className="absolute bottom-6 right-6">
              <button className="p-3 bg-white/5 hover:bg-[#FF914D]/20 border border-white/10 rounded-full transition-all group">
                <Share2 size={16} className="group-hover:text-[#FF914D]" />
              </button>
            </div>
          </div>
        </section>

        {/* DATA GRID */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* TERMINAL LOG */}
          <div className="md:col-span-2 glass-panel p-6 border-white/5 bg-zinc-900/20 rounded-[1.5rem]">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
              <Terminal size={14} className="text-[#FF914D]" />
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">System_Output</h3>
            </div>
            <div className="space-y-2 font-mono text-[11px] text-zinc-500 overflow-hidden h-32">
              <p className="text-[#FF914D]/50 leading-none">{`[${new Date().toLocaleTimeString()}] > UTTF_LINK_ESTABLISHED`}</p>
              <p>{`> ENCRYPTING_DATA_STREAM...`}</p>
              <p>{`> ALLOCATING_BANDWIDTH_TO_UNIT_03`}</p>
              <p className="text-white/40">{`> WAITING_FOR_OPERATOR_COMMAND...`}</p>
              <motion.span 
                animate={{ opacity: [0, 1] }} 
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-2 h-4 bg-[#FF914D] align-middle ml-1"
              />
            </div>
          </div>

          {/* REAL TIME STATS */}
          <div className="flex flex-col gap-6">
            <div className="glass-panel p-6 border-white/5 bg-[#FF914D]/5 rounded-[1.5rem] flex flex-col items-center justify-center text-center">
              <Zap size={20} className="text-[#FF914D] mb-2" />
              <span className="text-3xl font-black italic italic">0.0<span className="text-xs text-zinc-600 ml-1 font-mono">ms</span></span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Latency</span>
            </div>
            <div className="glass-panel p-6 border-white/5 bg-zinc-900/20 rounded-[1.5rem] flex flex-col items-center justify-center text-center">
              <Activity size={20} className="text-zinc-600 mb-2" />
              <span className="text-2xl font-black italic">LOW_RES</span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Signal_Quality</span>
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <section className="flex flex-wrap justify-center gap-4 mt-8">
            <button className="nav-tag px-8 py-4 border-[#FF914D]/20 text-zinc-400 hover:text-[#FF914D] hover:border-[#FF914D] transition-all font-mono text-[10px] tracking-[0.2em] uppercase">
                Reset_Encoder
            </button>
            <button className="nav-tag px-8 py-4 border-white/10 text-white hover:bg-white hover:text-black transition-all font-mono text-[10px] tracking-[0.2em] uppercase">
                Download_Session_Log
            </button>
        </section>

      </main>

      <footer className="py-24 text-center opacity-20">
        <p className="text-[9px] font-mono uppercase tracking-[1em] text-zinc-600 italic">
          UTTF_BROADCAST_ENCRYPTED_SESSION
        </p>
      </footer>
    </div>
  );
}