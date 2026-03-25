'use client'
import { motion } from 'framer-motion';
import { MapPin, X, Target } from 'lucide-react';

interface MapSectionProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MapSection({ isOpen, onClose }: MapSectionProps) {
  if (!isOpen) return null;

  // URL Embed di Google Maps centrato su Rozzano
  const mapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d11211.77747353915!2d9.1388555!3d45.3813841!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4786e0887498305f%3A0x400e17961d2d3a0!2s20089%20Rozzano%20MI!5e0!3m2!1sit!2sit!4v1710000000000!5m2!1sit!2sit";

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
        
        {/* Header con stile militare/urban */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#FF914D] rounded-xl flex items-center justify-center text-black rotate-3 shadow-[0_0_15px_rgba(255,145,77,0.4)]">
              <Target size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
                Rozzano <span className="text-[#FF914D]">Sector</span>
              </h2>
              <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-[0.3em]">Lat: 45.3814° N | Lon: 9.1389° E</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/5 rounded-full text-zinc-500 hover:text-[#FF914D] transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Container Mappa con Filtri CSS Estremi */}
        <div className="flex-1 relative bg-zinc-900 overflow-hidden">
          <iframe 
            src={mapUrl}
            className="w-full h-full border-none grayscale invert contrast-[1.4] brightness-[0.7] opacity-70"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
          
          {/* Griglia tattica sovrapposta (Overlay) */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          
          {/* Bordi sfumati interni */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"></div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black border-t border-white/5 flex justify-between items-center px-8">
           <span className="text-[8px] font-mono text-[#FF914D] uppercase animate-pulse italic">Scanning_Area_In_Progress...</span>
           <span className="text-[8px] font-mono text-zinc-700 uppercase">UTTF_GEOMAP_v2.0</span>
        </div>
      </motion.div>
    </motion.div>
  );
}