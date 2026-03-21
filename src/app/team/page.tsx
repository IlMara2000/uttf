'use client'

import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Terminal, Palette, Database, Share2 } from 'lucide-react';

const team = [
  {
    name: "Il Mara",
    role: "Core Developer & Founder",
    skills: ["Next.js", "Supabase", "AI Integration"],
    icon: <Terminal className="text-uttf-orange" />,
    motto: "Building the digital underground."
  },
  {
    name: "Socio 1", // Cambia con il nome reale
    role: "Visual Designer",
    skills: ["Branding", "Motion Design", "UI/UX"],
    icon: <Palette className="text-uttf-orange" />,
    motto: "Aesthetics over everything."
  },
  {
    name: "Socio 2", // Cambia con il nome reale
    role: "Operations Manager",
    skills: ["Workflow", "Business BI", "Strategy"],
    icon: <ShieldCheck className="text-uttf-orange" />,
    motto: "Efficiency is our weapon."
  }
];

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-20 selection:bg-uttf-orange/30">
      
      {/* Header */}
      <header className="max-w-4xl mb-24">
        <motion.span 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-uttf-orange font-mono text-[10px] uppercase tracking-[0.5em] mb-4 block"
        >
          Factory_Assets // Human_Capital
        </motion.span>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none mb-8"
        >
          The <span className="text-uttf-orange">Core</span> Team
        </motion.h1>
        <p className="text-zinc-500 text-lg max-w-xl uppercase font-medium leading-tight">
          Siamo una task force creativa specializzata nel trasformare visioni in asset digitali. Nessun compromesso, solo produzione.
        </p>
      </header>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {team.map((member, index) => (
          <motion.div
            key={member.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -10 }}
            className="glass-card p-10 rounded-[3rem] border-t border-white/10 group relative overflow-hidden"
          >
            {/* Background Effect */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-uttf-orange/5 rounded-full blur-3xl group-hover:bg-uttf-orange/20 transition-all"></div>

            <div className="flex justify-between items-start mb-12">
              <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5">
                {member.icon}
              </div>
              <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">
                LVL_01_ADMIN
              </span>
            </div>

            <h3 className="text-4xl font-black uppercase italic mb-2 tracking-tighter group-hover:text-uttf-orange transition-colors">
              {member.name}
            </h3>
            <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-8 border-b border-white/5 pb-4">
              {member.role}
            </p>

            <div className="space-y-4 mb-10">
              <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Operational_Skills</p>
              <div className="flex flex-wrap gap-2">
                {member.skills.map(skill => (
                  <span key={skill} className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[9px] font-black uppercase tracking-tight text-zinc-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <p className="italic text-zinc-500 text-sm border-l-2 border-uttf-orange pl-4">
              "{member.motto}"
            </p>
          </motion.div>
        ))}
      </div>

      {/* Join the Factory Section */}
      <footer className="mt-32 border-t border-white/5 pt-20 text-center">
        <h2 className="text-2xl font-black uppercase italic mb-8">Vuoi entrare nella <span className="text-uttf-orange">Factory</span>?</h2>
        <button className="glass-button px-10 py-4 rounded-full font-black uppercase tracking-[0.2em] hover:scale-105 transition-all">
          Sottometti Candidatura
        </button>
      </footer>
    </div>
  );
}