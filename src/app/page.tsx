'use client'

import { useEffect, useState } from 'react';
import type { PointerEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence, Variants, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  Loader2, 
  ArrowRight, 
  X, 
  Play, 
  Maximize2 
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import MapSection from '@/components/MapSection';

type Publication = {
  id: string | number;
  created_at: string;
  title: string;
  description: string | null;
  image_url: string;
};

export default function HomePage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Publication | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const PROJECT_ID = 'oieqtrfeoyfabyjirrqa'; 
  const BUCKET_NAME = 'publications'; 

  const introPointerX = useMotionValue(0);
  const introPointerY = useMotionValue(0);
  const introTextX = useSpring(useTransform(introPointerX, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 22 });
  const introTextY = useSpring(useTransform(introPointerY, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 22 });
  const introRotateX = useSpring(useTransform(introPointerY, [-0.5, 0.5], [3, -3]), { stiffness: 130, damping: 24 });
  const introRotateY = useSpring(useTransform(introPointerX, [-0.5, 0.5], [-4, 4]), { stiffness: 130, damping: 24 });

  const logoPointerX = useMotionValue(0);
  const logoPointerY = useMotionValue(0);
  const logoRotateX = useSpring(useTransform(logoPointerY, [-0.5, 0.5], [11, -11]), { stiffness: 110, damping: 20 });
  const logoRotateY = useSpring(useTransform(logoPointerX, [-0.5, 0.5], [-15, 15]), { stiffness: 110, damping: 20 });
  const logoImageX = useSpring(useTransform(logoPointerX, [-0.5, 0.5], [-22, 22]), { stiffness: 120, damping: 20 });
  const logoImageY = useSpring(useTransform(logoPointerY, [-0.5, 0.5], [-16, 16]), { stiffness: 120, damping: 20 });

  useEffect(() => {
    async function fetchPublications() {
      const { data, error } = await supabase
        .from('publications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (!error && data) setPublications(data as Publication[]);
      setLoading(false);
    }
    fetchPublications();
  }, []);

  const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg|mov)$/i);

  const updatePointer = (
    event: PointerEvent<HTMLDivElement>,
    pointerX: typeof introPointerX,
    pointerY: typeof introPointerY
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  // Tipizzazione esplicita come Variants per risolvere l'errore di build
  const pulseGlow: Variants = {
    animate: {
      boxShadow: [
        "0 0 20px 0px rgba(255, 145, 77, 0.2)",
        "0 0 40px 10px rgba(255, 145, 77, 0.4)",
        "0 0 20px 0px rgba(255, 145, 77, 0.2)"
      ],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col items-center overflow-x-hidden pb-40">
      
      {/* HEADER */}
      <header className="pt-24 pb-12 flex flex-col items-center gap-6">
        <Image
          src="/icons/favicon.svg" 
          alt="UTTF" 
          width={120}
          height={120}
          priority
          className="w-25 h-25 md:w-30 md:h-30 transition-transform hover:scale-110 duration-500" 
          onError={(e) => (e.currentTarget.src = '/favicon.ico')}
        />
        <Link href="/login" className="btn-urban opacity-80 hover:opacity-100 transition-opacity animate-pulse flex items-center gap-3 border border-[#FF914D]/20 px-6 py-3 rounded-full font-mono text-[10px] tracking-[0.3em] uppercase italic font-bold">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF914D]"></div>
          ACCESSO STAFF
        </Link>
      </header>

      {/* MAIN CONTENT */}
      <main className="w-full max-w-7xl px-6 flex flex-col items-center">
        
        {/* HERO SECTION */}
        <section className="py-12 w-full flex flex-col items-center">
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

            {/* SEZIONE COS'È - GLASSMORPHISM RESTYLE */}
            <motion.div 
              className="relative w-full max-w-5xl mb-16 overflow-hidden rounded-[2rem] border border-[#FF914D]/35 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.16),transparent_25%),radial-gradient(circle_at_50%_50%,rgba(255,145,77,0.18),rgba(18,18,26,0.78)_58%,rgba(0,0,0,0.78))] p-10 shadow-[0_38px_110px_rgba(0,0,0,0.72),0_0_90px_rgba(255,145,77,0.22),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_0_70px_rgba(255,145,77,0.13)] backdrop-blur-2xl md:p-14"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              variants={pulseGlow}
              animate="animate"
              onPointerMove={(event) => updatePointer(event, introPointerX, introPointerY)}
              onPointerLeave={() => {
                introPointerX.set(0);
                introPointerY.set(0);
              }}
              style={{
                rotateX: introRotateX,
                rotateY: introRotateY,
                transformPerspective: 1100,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Grain Texture Overlay */}
              <div className="absolute inset-0 bg-[url('/images/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none" />
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
              <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-[#FF914D]/20 blur-3xl" />
              <div className="pointer-events-none absolute inset-4 rounded-[1.55rem] border border-white/10 shadow-[inset_0_0_45px_rgba(255,255,255,0.05)]" />
              
              <motion.div
                className="relative z-10 mx-auto max-w-4xl"
                style={{
                  x: introTextX,
                  y: introTextY,
                  transformStyle: 'preserve-3d',
                  translateZ: 44,
                }}
              >
                <h3 className="text-2xl md:text-4xl font-black uppercase italic mb-8 text-center tracking-tighter text-[#FF914D]">
                  COS&apos;È UNDER THE TOWER?
                </h3>
                <p className="text-white text-sm md:text-lg uppercase text-center tracking-[0.15em] font-sans font-medium leading-relaxed max-w-3xl mx-auto opacity-90">
                  UN PROGETTO CREATIVO CHE NASCE CON L&apos;OBIETTIVO DI UNIRE PERSONE, IDEE E PASSIONI ALL&apos;INTERNO DI UN ECOSISTEMA DINAMICO. UN COMMUNITY HUB DOVE ARTE, INTRATTENIMENTO E INGEGNO SI INCONTRANO PER CREARE ESPERIENZE IMMERSIVE E COINVOLGENTI.
                </p>
              </motion.div>
            </motion.div>

            {/* GRID DELLE 4 BOX */}
            <div className="w-full max-w-3xl flex flex-col gap-6 md:gap-8">
              <Link href="/team" className="group">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-panel p-8 md:p-12 flex flex-col items-center text-center border border-white/5 bg-white/5 rounded-3xl group-hover:border-[#FF914D]/30 transition-all duration-500 relative overflow-hidden">
                  <span className="text-[9px] tracking-[0.8em] text-[#FF914D] mb-4 font-mono uppercase">IDENTITY_CORE:</span>
                  <h3 className="text-2xl md:text-4xl font-black italic uppercase text-white tracking-tighter leading-none">CONOSCI IL NOSTRO TEAM!</h3>
                  <ArrowRight className="absolute right-8 bottom-8 text-white/10 group-hover:text-[#FF914D] group-hover:translate-x-2 transition-all" size={20} />
                </motion.div>
              </Link>

              <Link href="/galleria" className="group">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-panel p-8 md:p-12 flex flex-col items-center text-center border border-white/5 bg-white/5 rounded-3xl group-hover:border-[#FF914D]/30 transition-all duration-500 relative overflow-hidden">
                  <span className="text-[9px] tracking-[0.8em] text-[#FF914D] mb-4 font-mono uppercase">KM0_ART_ARCHIVE:</span>
                  <h3 className="text-2xl md:text-4xl font-black italic uppercase text-white tracking-tighter leading-none">ARTE A KM 0</h3>
                  <ArrowRight className="absolute right-8 bottom-8 text-white/10 group-hover:text-[#FF914D] group-hover:translate-x-2 transition-all" size={20} />
                </motion.div>
              </Link>

              <div onClick={() => setIsMapOpen(true)} className="cursor-pointer group">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-panel p-8 md:p-12 flex flex-col items-center text-center border border-white/5 bg-white/5 rounded-3xl group-hover:border-[#FF914D]/30 transition-all duration-500 relative overflow-hidden">
                  <span className="text-[9px] tracking-[0.8em] text-[#FF914D] mb-4 font-mono uppercase">LOCATION_DATA:</span>
                  <h3 className="text-2xl md:text-4xl font-black italic uppercase text-white tracking-tighter leading-none">VIENI A TROVARCI</h3>
                  <ArrowRight className="absolute right-8 bottom-8 text-white/10 group-hover:text-[#FF914D] group-hover:translate-x-2 transition-all" size={20} />
                </motion.div>
              </div>

              <Link href="/feed" className="group">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-panel p-8 md:p-12 flex flex-col items-center text-center border border-white/5 bg-white/5 rounded-3xl group-hover:border-[#FF914D]/30 transition-all duration-500 relative overflow-hidden">
                  <span className="text-[9px] tracking-[0.8em] text-[#FF914D] mb-4 font-mono uppercase">Creative_Collective</span>
                  <h3 className="text-2xl md:text-4xl font-black italic uppercase text-white tracking-tighter leading-none">Under The Tower</h3>
                  <ArrowRight className="absolute right-8 bottom-8 text-white/10 group-hover:text-[#FF914D] group-hover:translate-x-2 transition-all" size={20} />
                </motion.div>
              </Link>

              <Link href="/labs" className="group">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-panel p-8 md:p-12 flex flex-col items-center text-center border border-white/5 bg-white/5 rounded-3xl group-hover:border-[#FF914D]/30 transition-all duration-500 relative overflow-hidden">
                  <span className="text-[9px] tracking-[0.8em] text-[#FF914D] mb-4 font-mono uppercase">Lab_Unit</span>
                  <h3 className="text-2xl md:text-4xl font-black italic uppercase text-white tracking-tighter leading-none">RAPF*CKTORY</h3>
                  <ArrowRight className="absolute right-8 bottom-8 text-white/10 group-hover:text-[#FF914D] group-hover:translate-x-2 transition-all" size={20} />
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </section>
        
          {/* NUCLEO 3D SOPRA LA SEZIONE NEWS */}
          <div className="relative flex w-full justify-center overflow-hidden px-4 pb-6 pt-2 mb-16 md:mb-20">
            <div
              className="relative h-[360px] w-full max-w-[620px] md:h-[520px]"
              onPointerMove={(event) => updatePointer(event, logoPointerX, logoPointerY)}
              onPointerLeave={() => {
                logoPointerX.set(0);
                logoPointerY.set(0);
              }}
            >
              {[0, 1, 2, 3].map((ring) => (
                <motion.div
                  key={ring}
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: `${260 + ring * 82}px`,
                    height: `${260 + ring * 82}px`,
                    marginLeft: `${-(260 + ring * 82) / 2}px`,
                    marginTop: `${-(260 + ring * 82) / 2}px`,
                  }}
                  animate={{ rotate: ring % 2 === 0 ? 360 : -360 }}
                  transition={{
                    duration: 18 + ring * 6,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  <div
                    className="h-full w-full rounded-full border"
                    style={{
                      borderColor: ring === 1 ? 'rgba(255,145,77,0.52)' : 'rgba(255,145,77,0.24)',
                      transform: `rotateX(${62 + ring * 4}deg) rotateZ(${ring * 18}deg)`,
                      boxShadow: ring === 1
                        ? '0 0 58px rgba(255,145,77,0.26), inset 0 0 38px rgba(255,145,77,0.22)'
                        : '0 0 40px rgba(255,145,77,0.12), inset 0 0 28px rgba(255,145,77,0.1)',
                    }}
                  />
                </motion.div>
              ))}

              <motion.div
                className="absolute left-1/2 top-1/2 grid aspect-square w-[260px] place-items-center rounded-full border border-[#FF914D]/35 bg-[radial-gradient(circle_at_37%_30%,rgba(255,255,255,0.32),transparent_16%),radial-gradient(circle_at_63%_72%,rgba(255,145,77,0.28),transparent_26%),radial-gradient(circle_at_center,rgba(255,145,77,0.28),rgba(61,31,19,0.9)_55%,rgba(0,0,0,0.88))] shadow-[0_50px_100px_rgba(0,0,0,0.72),0_0_130px_rgba(255,145,77,0.28),inset_0_0_92px_rgba(255,145,77,0.18),inset_22px_18px_42px_rgba(255,255,255,0.08),inset_-30px_-34px_58px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:w-[340px] md:w-[430px]"
                style={{
                  x: '-50%',
                  y: '-50%',
                  rotateX: logoRotateX,
                  rotateY: logoRotateY,
                  transformPerspective: 1200,
                  transformStyle: 'preserve-3d',
                }}
                animate={{
                  scale: [1, 1.025, 1],
                  boxShadow: [
                    '0 50px 100px rgba(0,0,0,0.72),0 0 95px rgba(255,145,77,0.2),inset 0 0 78px rgba(255,145,77,0.14)',
                    '0 62px 128px rgba(0,0,0,0.78),0 0 150px rgba(255,145,77,0.36),inset 0 0 105px rgba(255,145,77,0.24)',
                    '0 50px 100px rgba(0,0,0,0.72),0 0 95px rgba(255,145,77,0.2),inset 0 0 78px rgba(255,145,77,0.14)',
                  ],
                }}
                transition={{
                  duration: 5.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <div className="absolute inset-[-18%] rounded-full border border-[#FF914D]/24 [transform:rotateX(72deg)_translateZ(20px)]" />
                <div className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_34%,rgba(0,0,0,0.36)_76%)]" />
                <div className="absolute left-[18%] top-[15%] h-[30%] w-[28%] rounded-full bg-white/16 blur-xl" />
                <div className="absolute inset-8 rounded-full bg-black/14 shadow-[inset_0_0_52px_rgba(255,145,77,0.22)]" />
                <motion.img
                  src="/icons/homelogo.png"
                  alt="UTTF Home Logo"
                  className="relative z-10 w-[87%] object-contain drop-shadow-[0_26px_34px_rgba(0,0,0,0.88)]"
                  style={{
                    x: logoImageX,
                    y: logoImageY,
                    translateZ: 72,
                    transformStyle: 'preserve-3d',
                  }}
                  animate={{
                    opacity: [0.88, 1, 0.88],
                    filter: [
                      'drop-shadow(0 18px 26px rgba(0,0,0,0.82)) drop-shadow(0 0 8px rgba(255,255,255,0.12))',
                      'drop-shadow(0 22px 34px rgba(0,0,0,0.86)) drop-shadow(0 0 18px rgba(255,255,255,0.28))',
                      'drop-shadow(0 18px 26px rgba(0,0,0,0.82)) drop-shadow(0 0 8px rgba(255,255,255,0.12))',
                    ],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
            </div>
          </div>

        {/* NEWS FEED SECTION */}
        <section className="w-full py-32 mt-10 border-t border-white/5 bg-transparent">
          
          <div className="flex flex-col items-center mb-20 text-center">
             <span className="text-[#FF914D] font-mono text-[10px] tracking-[0.6em] uppercase mb-4">QUA SOTTO GLI ULTIMI AGGIORNAMENTI</span>
             <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter">UTTF_<span className="text-[#FF914D]">NEWS</span></h2>
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
                        // eslint-disable-next-line @next/next/no-img-element -- Post media can come from Supabase paths outside the static image allowlist.
                        <img src={imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" />
                      )}
                    </div>
                    <div className="p-6">
                      <p className="text-zinc-500 text-[11px] uppercase tracking-wide leading-relaxed font-mono line-clamp-2">{post.description || "FACTORY_LOG_ENTRY_ALPHA"}</p>
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
        </section>
      </main>

      {/* MODALS */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 backdrop-blur-md bg-black/80" onClick={() => setSelectedPost(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative max-w-4xl w-full bg-zinc-950 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col md:flex-row max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedPost(null)} className="absolute top-5 right-5 z-10 p-2 bg-black/50 text-white rounded-full hover:text-[#FF914D] transition-all"><X size={24} /></button>
              <div className="w-full md:w-3/5 bg-black flex items-center justify-center">
                {isVideo(selectedPost.image_url) ? (
                  <video src={selectedPost.image_url} controls autoPlay className="w-full max-h-[80vh]" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- Modal preview preserves exact Supabase media URL and sizing.
                  <img src={selectedPost.image_url} className="w-full h-full object-contain" alt="" />
                )}
              </div>
              <div className="w-full md:w-2/5 p-8 flex flex-col bg-zinc-950">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#FF914D] flex items-center justify-center text-black font-black italic text-xs">UT</div>
                  <h3 className="text-lg font-black italic uppercase tracking-tighter">{selectedPost.title}</h3>
                </div>
                <p className="text-zinc-400 text-sm font-mono uppercase leading-relaxed">{selectedPost.description || "Nessuna specifica tecnica registrata."}</p>
                <div className="pt-6 mt-6 border-t border-white/5 text-[9px] font-mono text-zinc-600 uppercase">Log_Date: {new Date(selectedPost.created_at).toLocaleString('it-IT')}</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMapOpen && <MapSection isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />}
      </AnimatePresence>

      <footer className="py-24 text-center opacity-30">
        <p className="text-[9px] font-mono uppercase tracking-[1em] text-zinc-600">UTTF_SYSTEM_V.2.0</p>
      </footer>
    </div>
  );
}
