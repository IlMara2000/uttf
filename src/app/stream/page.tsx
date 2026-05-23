'use client'

import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Radio,
  Terminal,
  Users,
} from 'lucide-react';
import Link from 'next/link';

const stream = {
  title: 'NO LIMIT JAM 2025',
  subtitle: 'Archivio video UTTF',
  embedUrl: 'https://www.youtube.com/embed/pnL4b4Xhaxg',
  watchUrl: 'https://youtu.be/pnL4b4Xhaxg',
  status: 'Archive online',
  viewers: 'Replay',
  quality: 'HD',
  latency: '0.0',
};

export default function StreamPage() {
  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col items-center overflow-x-hidden pb-40 selection:bg-[#FF914D]/30">
      <header className="w-full max-w-7xl px-6 pt-12 pb-16 flex flex-col items-center gap-12">
        <div className="w-full flex justify-start">
          <Link href="/feed" className="nav-tag flex items-center gap-2 group border-white/10 hover:border-[#FF914D]/50 transition-all">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono tracking-widest text-[10px]">INDIETRO</span>
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
            <span className="h-[1px] w-12 bg-zinc-800" />
            <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em]">
              Archivio live e video dalla Factory
            </p>
            <span className="h-[1px] w-12 bg-zinc-800" />
          </div>
          <a
            href="https://linktr.ee/underthetower"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center justify-center gap-3 rounded-full bg-[#FF914D] px-8 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-black shadow-[0_0_40px_rgba(255,145,77,0.28)] transition-all hover:bg-white"
          >
            Tutti i nostri social
            <ExternalLink size={15} />
          </a>
        </div>
      </header>

      <main className="w-full max-w-7xl px-6 flex flex-col gap-8">
        <section className="grid grid-cols-1 gap-6">
          <div className="relative">
            <div className="absolute -inset-1 bg-[#FF914D]/10 blur-2xl rounded-[2rem] opacity-40" />
            <div className="glass-panel relative aspect-video w-full rounded-[2rem] border-white/10 overflow-hidden bg-black backdrop-blur-3xl">
              <iframe
                src={stream.embedUrl}
                title={stream.title}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />

              <div className="pointer-events-none absolute left-5 top-5 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-[#FF914D]/30">
                  <div className="w-2 h-2 rounded-full bg-[#FF914D] animate-pulse" />
                  <span className="font-mono text-[9px] text-[#FF914D] uppercase tracking-tighter">{stream.status}</span>
                </div>
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                  <Users size={12} className="text-zinc-300" />
                  <span className="font-mono text-[9px] text-zinc-300">{stream.viewers}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 glass-panel p-6 border-white/5 bg-zinc-900/20 rounded-[1.5rem]">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
              <Terminal size={14} className="text-[#FF914D]" />
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Note dalla regia</h3>
            </div>
            <div className="space-y-2 font-mono text-[11px] text-zinc-500 overflow-hidden">
              <p className="text-[#FF914D]/70 leading-none">Video collegato all&apos;archivio UTTF.</p>
              <p>Fonte video: YouTube.</p>
              <p>Player pronto per la visione.</p>
              <p className="text-white/40">La prossima live verra comunicata appena fissata.</p>
            </div>
          </div>

          <div className="glass-panel p-6 border-white/5 bg-[#FF914D]/5 rounded-[1.5rem]">
            <div className="flex items-center gap-3 mb-4">
              <CalendarDays size={18} className="text-[#FF914D]" />
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Live schedule</h3>
            </div>
            <p className="text-2xl font-black italic uppercase">Prossima data</p>
            <p className="mt-2 text-xs font-mono uppercase tracking-[0.2em] text-zinc-500">In aggiornamento dallo staff</p>
          </div>
        </section>

        <section className="flex flex-wrap justify-center gap-4 mt-8">
          <Link href="/feed" className="nav-tag px-8 py-4 border-[#FF914D]/20 text-zinc-400 hover:text-[#FF914D] hover:border-[#FF914D] transition-all font-mono text-[10px] tracking-[0.2em] uppercase">
            Torna al feed
          </Link>
          <a href={stream.watchUrl} target="_blank" rel="noopener noreferrer" className="nav-tag px-8 py-4 border-white/10 text-white hover:bg-white hover:text-black transition-all font-mono text-[10px] tracking-[0.2em] uppercase inline-flex items-center gap-2">
            Guarda su YouTube <ExternalLink size={13} />
          </a>
        </section>
      </main>

      <footer className="py-24 text-center opacity-20">
        <p className="text-[9px] font-mono uppercase tracking-[1em] text-zinc-600 italic">
          UTTF video archive / Rozzano
        </p>
      </footer>
    </div>
  );
}
