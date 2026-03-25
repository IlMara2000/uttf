'use client'
import { motion } from 'framer-motion';
import { Target, X } from 'lucide-react';

interface MapSectionProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MapSection({ isOpen, onClose }: MapSectionProps) {
  if (!isOpen) return null;

  // URL con gestureHandling=greedy per permettere il movimento con un solo dito
  const mapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2802.48206105437!2d9.14821617674218!3d45.38550393802996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4786e3955e840703%3A0xcf953330dfde366f!2sVia%20dei%20Biancospini%2C%204%2C%2020089%20Rozzano%20MI!5e0!3m2!1sit!2sit!4v1710000000000!5m2!1sit!2sit&gestureHandling=greedy";

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] p-4 md:p-10 flex items-center justify-center bg-black/90 backdrop-blur-xl"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full h-full max-w-7xl bg-zinc-950 rounded-[2.5rem] border border-[#FF914D]/20 overflow-hidden shadow-[0_0_50px_rgba(255,145,77,0.1)] flex flex-col"
      >
        
        {/* Header Tattico */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#FF914D] rounded-xl flex items-center justify-center text-black rotate-3 shadow-[0_0_15px_rgba(255,145,77,0.4)]">
              <Target size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
                UTTF_<span className="text-[#FF914D]">MAP</span>
              </h2>
              <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
                COORDINATE_SEDE_UTTF: 45°23'08.0"N 9°09'02.9"E
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/5 rounded-full text-zinc-500 hover:text-[#FF914D] transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Container Mappa con Filtro Arancione Personalizzato */}
        <div className="flex-1 relative bg-black overflow-hidden">
          <style jsx>{`
            .uttf-map-filter {
              /* Grayscale per rimuovere i colori originali */
              /* Invert per invertire i toni (strade chiare su sfondo scuro) */
              /* Sepia + Hue-Rotate per mappare tutto sul colore #FF914D */
              filter: grayscale(100%) invert(100%) sepia(100%) saturate(500%) hue-rotate(340deg) brightness(0.9) contrast(1.2);
            }
          `}</style>
          
          <iframe 
            src={mapUrl}
            className="w-full h-full border-none uttf-map-filter opacity-90"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
          
          {/* Griglia Tecnica e Sfumature ai bordi */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(to_right,#FF914D_1px,transparent_1px),linear-gradient(to_bottom,#FF914D_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,1)]"></div>
        </div>

        {/* Status Bar */}
        <div className="p-4 bg-black border-t border-white/5 flex justify-between items-center px-8">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-[#FF914D] animate-pulse"></div>
             <span className="text-[8px] font-mono text-[#FF914D] uppercase italic tracking-widest">
               SEDE_OPERATIVA: Via dei Biancospini, 4, Rozzano (MI)
             </span>
           </div>
           <span className="text-[8px] font-mono text-zinc-700 uppercase">UTTF_NAV_CORE</span>
        </div>
      </motion.div>
    </motion.div>
  );
}