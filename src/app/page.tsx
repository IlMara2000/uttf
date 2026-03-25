'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Loader2, ArrowRight, X, Play, Maximize2 } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  useEffect(() => {
    async function fetchPublications() {
      const { data, error } = await supabase
        .from('publications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      if (!error && data) setPublications(data);
      setLoading(false);
    }
    fetchPublications();
  }, []);

  // Helper per capire se è un video
  const isVideo = (url: string) => {
    return url?.match(/\.(mp4|webm|ogg|mov)$/i);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center overflow-x-hidden pb-40 selection:bg-[#FF914D] selection:text-black">
      
      {/* HEADER & HERO (Invariati per mantenere lo stile UTTF) */}
      <header className="pt-24 pb-12 flex flex-col items-center gap-6">
        <img src="/icons/favicon.svg" alt="UTTF" className="w-20 h-20 transition-transform hover:rotate-12 duration-500" />
        <Link href="/login" className="opacity-60 hover:opacity-100 transition-opacity flex items-center gap-3 border border-white/10 px-6 py-2 rounded-full font-mono text-[9px] tracking-[0.3em] uppercase italic">
          <div className="w-1 h-1 rounded-full bg-[#FF914D] animate-pulse"></div>
          STAFF_ONLY
        </Link>
      </header>

      <section className="px-6 py-12 w-full max-w-7xl flex flex-col items-center">
        <h1 className="text-[14vw] md:text-[8vw] leading-[0.9] text-center mb-16 font-black uppercase italic tracking-tighter">
          Under The<br />Tower<br />
          <span className="text-[#FF914D]">Factory</span>
        </h1>
      </section>

      {/* FEED SECTION - STILE INSTAGRAM-MODERN */}
      <section className="w-full px-4 md:px-6 py-20 border-t border-white/5 bg-[#050505]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center mb-16 text-center">
             <span className="text-[#FF914D] font-mono text-[9px] tracking-[0.5em] uppercase mb-2">Internal_Database</span>
             <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">LATEST_OUTPUTS</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="aspect-[4/5] bg-white/5 animate-pulse rounded-3xl" />)
            ) : (
              publications.map((post) => (
                <motion.div 
                  key={post.id} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  onClick={() => setSelectedPost(post)}
                  className="group cursor-pointer flex flex-col bg-zinc-900/20 border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-[#FF914D]/40 transition-all duration-500"
                >
                  {/* Post Header (Stile IG) */}
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF914D] to-orange-200 p-[1.5px]">
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                        <span className="text-[8px] font-black italic">UT</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 italic">{post.title}</span>
                  </div>

                  {/* Media Content */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-black border-y border-white/5">
                    {isVideo(post.image_url) ? (
                      <div className="relative w-full h-full">
                        <video src={post.image_url} className="w-full h-full object-cover opacity-80" muted />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="text-white/40 group-hover:text-[#FF914D] group-hover:scale-125 transition-all" fill="currentColor" size={40} />
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={post.image_url} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-in-out" 
                        alt="" 
                      />
                    )}
                    {/* Overlay al passaggio del mouse */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                       <span className="text-[9px] font-mono text-[#FF914D] flex items-center gap-2">
                         <Maximize2 size={12} /> VIEW_OUTPUT
                       </span>
                    </div>
                  </div>

                  {/* Caption curata */}
                  <div className="p-6">
                    <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-2 font-medium italic">
                      {post.description || "FACTORY_LOG_ENTRY_ALPHA"}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[8px] font-mono text-zinc-600 uppercase tracking-tighter">
                      <span>{new Date(post.created_at).toLocaleDateString('it-IT')}</span>
                      <Layers size={12} />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* MODAL / LIGHTBOX (Stile Reels/Pop-up non invasivo) */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 backdrop-blur-xl bg-black/90"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-5xl w-full bg-zinc-950 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setSelectedPost(null)} className="absolute top-6 right-6 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-[#FF914D] transition-colors">
                <X size={20} />
              </button>

              {/* Media Detail */}
              <div className="w-full md:w-2/3 bg-black flex items-center justify-center border-r border-white/5">
                {isVideo(selectedPost.image_url) ? (
                  <video src={selectedPost.image_url} controls autoPlay className="max-h-[80vh] w-full" />
                ) : (
                  <img src={selectedPost.image_url} className="w-full h-full object-contain" alt="" />
                )}
              </div>

              {/* Text Detail */}
              <div className="w-full md:w-1/3 p-8 flex flex-col justify-between bg-zinc-950">
                <div>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-full bg-[#FF914D] flex items-center justify-center text-black font-black italic">UT</div>
                    <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">{selectedPost.title}</h3>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                      {selectedPost.description || "Nessuna descrizione tecnica disponibile per questa unità."}
                    </p>
                  </div>
                </div>
                <div className="pt-8 mt-8 border-t border-white/5">
                   <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase">
                     <span>ENTRY_DATE:</span>
                     <span className="text-white">{new Date(selectedPost.created_at).toLocaleDateString('it-IT')}</span>
                   </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="py-24 text-center opacity-30">
        <p className="text-[9px] font-mono uppercase tracking-[1em] text-zinc-600">UTTF_SYSTEM_V.2.1</p>
      </footer>
    </div>
  );
}