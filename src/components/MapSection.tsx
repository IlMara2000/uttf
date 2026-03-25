'use client'
import { motion } from 'framer-motion';
import { MapPin, X, Maximize2, Navigation } from 'lucide-react';

interface MapSectionProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MapSection({ isOpen, onClose }: MapSectionProps) {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[150] p-4 md:p-10 flex items-center justify-center bg-black/90 backdrop-blur-xl"
    >
      <div className="relative w-full h-full max-w-7xl bg-zinc-950 rounded-[2.5rem] border border-[#FF914D]/20 overflow-hidden shadow-[0_0_50px_rgba(255,145,77,0.1)] flex flex-col">
        
        {/* Header Mappa */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#FF914D] rounded-full flex items-center justify-center text-black shadow-[0_0_15px_rgba(255,145,77,0.4)]">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Rozzano_Tactical_Map</h2>
              <p className="text-[8px] font-mono text-[#FF914D] uppercase tracking-[0.3em]">UTTF_GEOLOCATION_SYSTEM_V1</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/5 rounded-full text-zinc-500 hover:text-[#FF914D] transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Container Mappa con Filtro Dark */}
        <div className="flex-1 relative bg-zinc-900">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m12!1m3!1d2804.123!2d9.15!3d45.38!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4786c47879435a51%3A0x6436663f760e1d1!2sRozzano%20MI!5e0!3m2!1sit!2sit!4v1711380000000!5m2!1sit!2sit"
            className="w-full h-full border-none grayscale invert contrast-[1.2] opacity-80"
            allowFullScreen
            loading="lazy"
          ></iframe>
          
          {/* Overlay decorativo per lo stile */}
          <div className="absolute inset-0 pointer-events-none border-[20px] border-zinc-950/20"></div>
        </div>

        {/* Footer Mappa */}
        <div className="p-4 bg-black/40 border-t border-white/5 flex justify-center">
           <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.5em]">Warning: entering_urban_creative_zone</span>
        </div>
      </div>
    </motion.div>
  );
}