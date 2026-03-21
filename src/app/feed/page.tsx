'use client'

import { motion } from 'framer-motion';
import { Rss, Instagram, Layers, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const internalPosts = [
  {
    id: 1,
    tag: 'FACTORY_REPORT',
    title: 'RAPF*CKTORY // UNIT_01_LIVE',
    date: '21 MAR 2026',
    description: 'Il primo nucleo creativo è attivo. I sistemi di produzione ritmica sono online. Accesso limitato alle unità autorizzate.',
    author: 'SYSTEM_CORE',
  },
];

const instagramPlaceholders = [
  { id: 'ig1', ratio: 'square' },
  { id: 'ig2', ratio: 'square' },
  { id: 'ig3', ratio: 'portrait' },
  { id: 'ig4', ratio: 'square' },
];

export default function FeedPage() {
  const igLink = "https://www.instagram.com/under_the_tower_factory?igsh=MW4zNzUwdGplOG5iYw==";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center overflow-x-hidden pb-40">
      
      {/* HEADER FIXATO: Layout Verticale Identico a Labs */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-16 flex flex-col items-center gap-8 relative">
        
        {/* Riga Superiore: BACK a sinistra, /02 a destra */}
        <div className="w-full flex justify-between items-center z-10">
          <Link href="/" className="nav-tag flex items-center gap-2">
            <ArrowLeft size={14} /> BACK
          </Link>
          <span className="text-zinc-900 font-mono text-lg tracking-widest">/02</span>
        </div>

        {/* Blocco Centrale: Icona e Titolo centrati */}
        <div className="text-center flex flex-col items-center w-full mt-4">
          <div className="p-3 bg-orange-600/10 border border-orange-600/20 rounded-2xl text-orange-600 mb-6 neon-blink">
            <Rss size={24} />
          </div>
          <h1 className="hero-title text-[12vw] md:text-7xl leading-none tracking-tighter">
            UTTF_FEED
          </h1>
          <p className="text-zinc-600 font-mono text-[8px] uppercase tracking-[0.3em] mt-4">
            Factory_Sync // Unit_02
          </p>
        </div>
      </header>

      <main className="w-full max-w-7xl px-6 flex flex-col gap-24">
        
        {/* SEZIONE POST INTERNO */}
        <section>
          <h2 className="text-2xl md:text-4xl font-black uppercase italic mb-10 text-center tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
            Factory_<span className="text-orange-600">Direct</span>
          </h2>
          {internalPosts.map((post) => (
            <motion.div 
              key={post.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-8 md:p-12 border-white/5"
            >
              <div className="flex justify-between items-center mb-6 text-[10px] font-mono">
                <span className="text-orange-600 tracking-widest">{post.tag}</span>
                <span className="text-zinc-700">{post.date}</span>
              </div>
              <h3 className="text-2xl md:text-5xl font-black uppercase italic mb-6 leading-tight tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
                {post.title}
              </h3>
              <p className="text-zinc-500 text-sm md:text-lg uppercase tracking-wide mb-8 font-medium">
                {post.description}
              </p>
              <div className="pt-6 border-t border-white/5 flex justify-between text-[9px] font-mono text-zinc-800">
                <span>AUTH://{post.author}</span>
                <Layers size={14} />
              </div>
            </motion.div>
          ))}
        </section>

        {/* SEZIONE INSTAGRAM LINKATA */}
        <section>
          <div className="flex flex-col items-center mb-12">
            <a href={igLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
              <Instagram className="text-zinc-700 group-hover:text-orange-600 transition-colors" size={20} />
              <h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
                Social_<span className="text-zinc-700 group-hover:text-orange-600 transition-colors">Sync</span>
              </h2>
            </a>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {instagramPlaceholders.map((ig) => (
              <a 
                key={ig.id} 
                href={igLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`glass-panel p-1 border-white/5 hover:border-orange-600/30 transition-all ${ig.ratio === 'portrait' ? 'aspect-[4/5]' : 'aspect-square'}`}
              >
                <div className="w-full h-full bg-zinc-950/50 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <Instagram size={16} className="text-zinc-800" />
                  <span className="text-[7px] font-mono text-zinc-800 tracking-widest">VIEW_IG</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-24 text-center opacity-10">
        <p className="text-[10px] font-mono uppercase tracking-[1em] text-zinc-800">UTTF_SYSTEM_V.2.0 // Rozzano</p>
      </footer>
    </div>
  );
}
