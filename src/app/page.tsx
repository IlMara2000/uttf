'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Loader2, 
  ArrowRight, 
  X, 
  Play, 
  Maximize2, 
  Map as MapIcon 
} from 'lucide-react';
import Link from 'next/link';
// Importiamo il componente della mappa
import MapSection from '@/components/MapSection';

export default function HomePage() {
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  
  // Stato per gestire l'apertura della mappa di Rozzano
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Configurazione Supabase per i media
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

  // Helper per distinguere Video da Immagini
  const isVideo = (url: string) => {
    return url?.match(/\.(mp4|webm|ogg|mov)$/i);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center overflow-x-hidden pb-40">
      
      {/* HEADER */}
      <header className="pt-24 pb-12 flex flex-col items-center gap-6">
        <img 
          src="/icons/favicon.svg" 
          alt="UTTF" 
          className="w-25 h-25 md:w-30 md:h-30 transition-transform hover:scale-110 duration-500" 
          onError={(e) => (e.currentTarget.src = '/favicon.ico')}
        />
        <Link href="/login" className="btn-urban opacity-80 hover:opacity-100 transition-opacity animate-pulse flex items-center gap-3 border border-[#FF914D]/20 px-6 py-3 rounded-full font-mono text-[10px] tracking-[0.3em] uppercase italic font-bold">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF914D]"></div>
          ACCESSO STAFF
        </Link>
      </header>

      {/* HERO SECTION */}
      <section className="px-6 py-12 w-full max-w-7xl flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-full flex flex-col items-center"
        >
          <h1 className="hero-title text-[14vw] md:text-[8vw] leading-[0.9] text-center mb-16 font-black uppercase italic tracking-tighter">
            Under The<br />
            Tower<br />
            <span style={{ color: '#FF914D' }}>Factory</span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-2xl text-center uppercase tracking-tight leading-relaxed max-w-2xl font-medium mt-10 opacity-80">
            Associazione culturale dedicata alla creatività urbana. Un incubatore d'arte, musica e cultura nato dalla strada per la comunità.
          </p>

          <div className="mt-24 w-full max-w-3xl flex flex-col gap-6 md:gap-10">

            {/* BOX MAPPA INTERATTIVA ROZZANO */}
            <div onClick={() => setIsMapOpen(true)} className="cursor-pointer group">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="glass-panel p-10 md:p-16 flex flex-col items-center text-center border border-white/5 bg-white/5 rounded-3xl group-hover:border-[#FF914D]/30 transition-all duration-500 relative overflow-hidden"
              >
                <span className="text-[9px] tracking-[0.8em] text-[#FF914D] mb-4 font-mono uppercase">MAPPA INTERATTIVA DI:</span>
                <h3 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter leading-none">
                  ROZZANO
                </h3>
                <ArrowRight className="absolute right-8 bottom-8 text-white/10 group-hover:text-[#FF914D] group-hover:translate-x-2 transition-all" size={20} />
              </motion.div>
            </div>

            {/* BOX CREATIVE COLLECTIVE */}
            <Link href="/feed" className="group">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="glass-panel p-10 md:p-16 flex flex-col items-center text-center border border-white/5 bg-white/5 rounded-3xl group-hover:border-[#FF914D]/30 transition-all duration-500 relative overflow-hidden"
              >
                <span className="text-[9px] tracking-[0.8em] text-[#FF914D] mb-4 font-mono uppercase">Creative_Collective</span>
                <h3 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter leading-none">
                  Under The Tower
                </h3>
                <ArrowRight className="absolute right-8 bottom-8 text-white/10 group-hover:text-[#FF914D] group-hover:translate-x-2 transition-all" size={20} />
              </motion.div>
            </Link>

            {/* BOX LAB UNIT */}
            <Link href="/labs" className="group">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="glass-panel p-10 md:p-16 flex flex-col items-center text-center border border-white/5 bg-white/5 rounded-3xl group-hover:border-[#FF914D]/30 transition-all duration-500 relative overflow-hidden"
              >
                <span className="text-[12px] tracking-[0.8em] text-[#FF914D] mb-4 font-mono uppercase">Lab_Unit</span>
                <h3 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter leading-none">
                  RAPF*CKTORY
                </h3>
                <ArrowRight className="absolute right-8 bottom-8 text-white/10 group-hover:text-[#FF914D] group-hover:translate-x-2 transition-all" size={20} />
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* LIVE OUTPUT SECTION - NEWS FEED */}
      <section className="w-full px-6 py-32 mt-20 border-t border-white/5 bg-transparent">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="flex flex-col items-center mb-20 text-center">
             <span className="text-[#FF914D] font-mono text-[10px] tracking-[0.6em] uppercase mb-4">QUA SOTTO GLI ULTIMI AGGIORNAMENTI</span>
             <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter">
               UTTF_<span className="text-[#FF914D]">NEWS</span>
             </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-80 glass-panel animate-pulse flex items-center justify-center border border-white/5 bg-white/5 rounded-3xl">
                  <Loader2 className="animate-spin text-zinc-800" size={32} />
                </div>
              ))
            ) : publications.length > 0 ? (
              publications.map((post) => {
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
                    onClick={() => setSelectedPost({...post, image_url: imageUrl})}
                    className="glass-panel group overflow-hidden flex flex-col border border-white/5 bg-[#0a0a0a] rounded-[2rem] hover:border-[#FF914D]/30 transition-all duration-500 cursor-pointer"
                  >
                    <div className="p-5 flex items-center gap-3 border-b border-white/5">
                      <div className="w-6 h-6 rounded-full bg-[#FF914D] flex items-center justify-center text-black text-[8px] font-black italic">UT</div>
                      <span className="text-[10px] font-bold uppercase tracking-widest italic">{post.title}</span>
                    </div>

                    <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
                      {isVideo(imageUrl) ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <video src={imageUrl} className="w-full h-full object-cover opacity-60" muted />
                          <Play className="absolute text-white/50 group-hover:text-[#FF914D] transition-colors" size={40} fill="currentColor" />
                        </div>
                      ) : (
                        <img 
                          src={imageUrl} 
                          alt={post.title} 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-in-out"
                        />
                      )}
                    </div>

                    <div className="p-6">
                      <p className="text-zinc-500 text-[11px] uppercase tracking-wide leading-relaxed font-mono line-clamp-2">
                        {post.description || "FACTORY_LOG_ENTRY_ALPHA"}
                      </p>
                      <div className="flex justify-between items-center pt-4 mt-4 border-t border-white/5 font-mono text-[8px] text-zinc-700">
                        <span>{new Date(post.created_at).toLocaleDateString('it-IT')}</span>
                        <Maximize2 size={12} className="group-hover:text-[#FF914D] transition-colors" />
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

      {/* MODAL PER DETTAGLIO POST */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 backdrop-blur-md bg-black/80"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-4xl w-full bg-zinc-950 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setSelectedPost(null)} className="absolute top-5 right-5 z-10 p-2 bg-black/50 text-white rounded-full hover:text-[#FF914D] transition-all">
                <X size={24} />
              </button>

              <div className="w-full md:w-3/5 bg-black flex items-center justify-center">
                {isVideo(selectedPost.image_url) ? (
                  <video src={selectedPost.image_url} controls autoPlay className="w-full max-h-[80vh]" />
                ) : (
                  <img src={selectedPost.image_url} className="w-full h-full object-contain" alt="" />
                )}
              </div>

              <div className="w-full md:w-2/5 p-8 flex flex-col bg-zinc-950">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#FF914D] flex items-center justify-center text-black font-black italic text-xs">UT</div>
                  <h3 className="text-lg font-black italic uppercase tracking-tighter">{selectedPost.title}</h3>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-zinc-400 text-sm leading-relaxed font-mono uppercase tracking-tight">
                    {selectedPost.description || "Nessuna specifica tecnica registrata."}
                  </p>
                </div>
                <div className="pt-6 mt-6 border-t border-white/5 text-[9px] font-mono text-zinc-600 uppercase">
                  Log_Date: {new Date(selectedPost.created_at).toLocaleString('it-IT')}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMPONENTE MODALE MAPPA DI ROZZANO */}
      <AnimatePresence>
        {isMapOpen && (
          <MapSection isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
        )}
      </AnimatePresence>

      <footer className="py-24 text-center opacity-30">
        <p className="text-[9px] font-mono uppercase tracking-[1em] text-zinc-600">UTTF_SYSTEM_V.2.0</p>
      </footer>
    </div>
  );
}