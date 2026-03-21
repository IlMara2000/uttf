'use client'

import { motion } from 'framer-motion';
import { ShieldAlert, Lock, EyeOff, Scale } from 'lucide-react';

const articles = [
  {
    code: "ART_01",
    title: "PROPRIETÀ_INTELLETTUALE",
    content: "Ogni asset generato, compilato o archiviato all'interno dei server UTTF (Under The True Factory) appartiene esclusivamente al Core Team. La riproduzione non autorizzata comporta l'espulsione immediata dai sistemi."
  },
  {
    code: "ART_02",
    title: "PROTOCOLLO_DI_RISERVATEZZA",
    content: "L'accesso al Vault e al Planner è riservato al personale autorizzato. La condivisione di credenziali o di link diretti a risorse interne è considerata una violazione critica della sicurezza."
  },
  {
    code: "ART_03",
    title: "OPERAZIONI_DI_PRODUZIONE",
    content: "La Factory opera come entità creativa indipendente. Ogni task assegnato nel Planner deve seguire gli standard qualitativi UTTF prima di essere segnato come COMPLETO."
  }
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-24 selection:bg-uttf-orange/30">
      
      <header className="mb-20">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 text-uttf-orange mb-6"
        >
          <Scale size={18} />
          <span className="font-mono text-[10px] uppercase tracking-[0.5em]">Legal_Framework_V.1</span>
        </motion.div>
        <h1 className="text-responsive-h2 font-black italic uppercase tracking-tighter mb-6">
          Termini di <span className="text-uttf-orange">Produzione</span>
        </h1>
        <p className="text-zinc-500 max-w-2xl uppercase text-[11px] font-bold leading-relaxed tracking-wider">
          Accedendo ai sistemi UTTF, accetti i seguenti protocolli operativi. Non ci sono clausole scritte in piccolo, solo logica di fabbrica.
        </p>
      </header>

      <div className="space-y-12 max-w-4xl">
        {articles.map((art, index) => (
          <motion.div 
            key={art.code}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-uttf-orange font-mono text-xs font-black">{art.code}</span>
              <div className="h-[1px] w-12 bg-zinc-800 group-hover:w-24 transition-all duration-500"></div>
              <h3 className="text-xl font-black uppercase italic tracking-tight">{art.title}</h3>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed pl-16 border-l border-zinc-900 ml-2 py-2">
              {art.content}
            </p>
          </motion.div>
        ))}
      </div>

      <footer className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between gap-8 items-center">
        <div className="flex gap-6">
          <ShieldAlert className="text-zinc-800" size={32} />
          <Lock className="text-zinc-800" size={32} />
          <EyeOff className="text-zinc-800" size={32} />
        </div>
        <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.3em]">
          UTTF_CORE_SYSTEMS // ALL_RIGHTS_RESERVED_2024
        </p>
      </footer>
    </div>
  );
}