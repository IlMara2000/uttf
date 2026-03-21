'use client'

import { motion } from 'framer-motion';
import { Rss, Instagram, Layers, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Dati Esempio per il Post Interno (quello che volevi tu)
const internalPosts = [
  {
    id: 1,
    tag: 'FACTORY_REPORT',
    title: 'RAPF*CKTORY // Drop Unit 01 Live',
    date: '21 MAR 2026',
    description: 'Il primo nucleo creativo è attivo. I sistemi di analisi lirica e produzione ritmica sono online. Accesso limitato alle unità autorizzate per la fase di test Beta.',
    author: 'SYSTEM_CORE',
    image: '/images/post_placeholder_1.jpg' // Aggiungi un'immagine se vuoi, o lascialo vuoto
  },
];

// Segnaposto per i Post di Instagram (Griglia)
const instagramPlaceholders = [
  { id: 'ig1', ratio: 'square' },
  { id: 'ig2', ratio: 'square' },
  { id: 'ig3', ratio: 'portrait' },
  { id: 'ig4', ratio: 'square' },
  { id: 'ig5', ratio: 'square' },
  { id: 'ig6', ratio: 'portrait' },
];

export default function FeedPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-20 flex flex-col items-center">
      
      {/* HEADER PULITO */}
      <header className="pt-16 pb-20 w-full max-w-7xl flex items-center justify-between">
        <Link href="/" className="nav-tag flex items-center gap-2">
          <ArrowLeft size={14} /> BACK
        </Link>
        <div className="text-center flex flex-col items-center">
          <div className="p-4 bg-uttf-orange/10 border border-uttf-orange/20 rounded-2xl text-uttf-orange mb-8">
            <Rss size={32} />
          </div>
          <h1 className="hero-title text-5xl">UTTF_FEED</h1>
          <p className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.3em] mt-2">Creative_Sync // Factory_Outputs</p>
        </div>
        <span className="text-zinc-900 font-mono text-xl">/02</span>
      </header>

      <main className="w-full max-w-7xl flex flex-col gap-32">

        {/* --- SEZIONE 1: POST INTERNI (REVIEW) --- */}
        <section className="flex flex-col items-center">
          <h2 className="text-3xl font-black uppercase italic mb-16 text-white tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
            Factory_<span style={{ color: 'var(--uttf-orange)' }}>Direct</span>
          </h2>
          
          <div className="w-full">
            {internalPosts.map((post) => (
              <motion.div 
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-12 w-full flex flex-col md:flex-row gap-12 border-uttf-orange/10 hover:border-uttf-orange/20 transition-colors"
              >
                {/* Parte Testuale */}
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
                    <span className="text-[11px] tracking-[0.6em] text-orange-600 font-mono uppercase">{post.tag}</span>
                    <span className="text-zinc-700 font-mono text-xs">{post.date}</span>
                  </div>
                  
                  <h3 className="text-4xl font-black uppercase italic mb-8 text-white tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
                    {post.title}
                  </h3>
                  
                  <p className="text-zinc-500 text-base uppercase tracking-wider leading-relaxed mb-12 flex-1 font-medium">
                    {post.description}
                  </p>
                  
                  <div className="w-full pt-8 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-zinc-700">
                    <span>AUTH://{post.author}</span>
                    <Layers size={14} />
                  </div>
                </div>

                {/* Eventuale Immagine Post Interno (opzionale) */}
                {post.image && (
                  <div className="w-full md:w-96 h-80 bg-zinc-950 rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover opacity-50" />
                    {/* Altrimenti un placeholder */}
                    {/* <div className="text-[10px] text-zinc-800 font-mono uppercase tracking-[0.5em]">DIRECT_IMAGE</div> */}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>


        {/* --- SEZIONE 2: SOCIAL SYNC (INSTAGRAM WIP) --- */}
        <section className="flex flex-col items-center">
          <div className="flex items-center gap-4 mb-16 pb-4 border-b border-white/5">
            <Instagram className="text-zinc-700" size={24} />
            <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
              Social_<span className="text-zinc-700">Sync</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-5xl">
            {instagramPlaceholders.map((ig) => (
              <motion.div 
                key={ig.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 0.98 }}
                className={`glass-panel p-2 flex items-center justify-center border-white/5 hover:border-zinc-800 transition-colors ${ig.ratio === 'portrait' ? 'aspect-[4/5]' : 'aspect-square'}`}
              >
                <div className="w-full h-full bg-zinc-950 rounded-2xl flex flex-col items-center justify-center text-center gap-2 p-4">
                  <Instagram className="text-zinc-800" size={18} strokeWidth={1} />
                  <p className="text-zinc-800 font-mono text-[8px] uppercase tracking-[0.5em]">IG_POST_WIP</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

      </main>

      <footer className="py-24 text-center opacity-10">
        <p className="text-[10px] font-mono uppercase tracking-[1em] text-zinc-800">UTTF_SYSTEM_V.2.0 // Rozzano // Milan</p>
      </footer>
    </div>
  );
}
