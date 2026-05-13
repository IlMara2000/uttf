'use client'
import { motion } from 'framer-motion';
import { MapPin, Navigation, X } from 'lucide-react';

interface MapSectionProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MapSection({ isOpen, onClose }: MapSectionProps) {
  if (!isOpen) return null;

  const address = 'Via dei Biancospini, 4, 20089 Rozzano MI';
  const directionsUrl =
    'https://www.google.com/maps/dir/?api=1&destination=Via%20dei%20Biancospini%2C%204%2C%2020089%20Rozzano%20MI';

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
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#FF914D] rounded-xl flex items-center justify-center text-black rotate-3 shadow-[0_0_15px_rgba(255,145,77,0.4)]">
              <MapPin size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
                UTTF_<span className="text-[#FF914D]">MAP</span>
              </h2>
              <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
                COORDINATE_SEDE_UTTF: 45&deg;23&apos;08.0&quot;N 9&deg;09&apos;02.9&quot;E
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/5 rounded-full text-zinc-500 hover:text-[#FF914D] transition-all"
            aria-label="Chiudi mappa"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 relative overflow-hidden bg-black">
          <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(to_right,#FF914D_1px,transparent_1px),linear-gradient(to_bottom,#FF914D_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,145,77,0.16),transparent_55%)]" />
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,1)]" />

          <div className="relative z-10 flex h-full items-center justify-center p-6">
            <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 text-center shadow-[0_0_50px_rgba(0,0,0,0.45)] md:p-10">
              <span className="text-[9px] font-mono uppercase tracking-[0.5em] text-[#FF914D]">
                LOCATION_DATA
              </span>
              <h3 className="mt-5 text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
                Vieni a trovarci
              </h3>
              <p className="mx-auto mt-4 max-w-lg text-sm md:text-base text-zinc-400">
                {address}
              </p>

              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-xl bg-[#FF914D] px-8 py-4 text-sm font-black uppercase tracking-wide text-black transition-all hover:-translate-y-0.5 hover:bg-white"
              >
                <Navigation size={20} />
                Avvia indicazioni stradali
              </a>
            </div>
          </div>
        </div>

        <div className="p-4 bg-black border-t border-white/5 flex justify-between items-center px-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#FF914D] animate-pulse" />
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
