'use client'

import { motion } from 'framer-motion';
import { 
  User, 
  Camera, 
  Music, 
  Scissors, 
  Settings, 
  ArrowLeft, 
  ExternalLink 
} from 'lucide-react';
import Link from 'next/link';

const teamMembers = [
  {
    name: "Elle Piò",
    role: "Presidente & Founder",
    icon: <User size={20} />,
    image: "/team/elle-pio.jpeg",
    description: "Pelato per comodità… così il cervello prende meglio il segnale creativo. Fa rap da una vita e ha visto passare più mode lui che TikTok. Di giorno educa, di notte… educa comunque, ma a suon di rime",
    skills: ["Leadership", "Creative Direction", "Education"],
    tags: ["FOUNDER", "RAP ARTIST", "LVL_ADMIN"]
  },
  {
    name: "Drew",
    role: "Video Maker",
    icon: <Camera size={20} />,
    image: "/team/drew.jpg",
    description: "Così tranquillo che se lo perdi, probabilmente è ancora lì fermo dov’era. Poi però prende una camera e BOOM: videoclip che sembrano costare più della sua calma.",
    skills: ["Video Editing", "Directing", "Color Grading"],
    tags: ["FILMMAKER", "VISUALS", "RAP ARTIST"]
  },
  {
    name: "Sarso",
    role: "Educatore / Vocalist",
    icon: <Music size={20} />,
    image: "/team/sarso.jpeg",
    description: "Ex cuoco: ha lasciato la cucina perché le barre gli venivano meglio dei piatti. Ora serve freestyle di vita bollente nel sociale e non lascia mai niente al caso.",
    skills: ["Vocal Coaching", "Social Work", "Stage Presence"],
    tags: ["VOCALIST", "EDUCATOR", "ENERGY"]
  },
  {
    name: "Gioitz",
    role: "Produttore / DJ",
    icon: <Scissors size={20} />,
    image: "/team/gioitz.jpeg",
    description: "Sembra sempre in modalità “risparmio energetico”… finché non parte la musica. Parrucchiere di giorno, artista di notte: taglia capelli e beat con la stessa precisione.",
    skills: ["Music Production", "DJing", "Sound Design"],
    tags: ["PRODUCER", "MUSICIAN", "STYLE"]
  },
  {
    name: "Den",
    role: "Fonico / SMM",
    icon: <Settings size={20} />,
    image: "/team/den.jpeg",
    description: "Multi-ruolo per necessità o perché non sa dire di no. Grafico, fonico, social manager… insomma quello che nel gruppo fa tutto lui e poi si danna pure (giustamente).",
    skills: ["Audio Engineering", "Social Media", "Graphic Design"],
    tags: ["AUDIO TECH", "SMM", "PROBLEM SOLVER"]
  },
  {
    name: "Dant.Hor",
    role: "Comix_Fan_Artist",
    icon: <Scissors size={20} />,
    image: "/team/dante.jpeg",
    description: "Calma, dedizione e attenzione sono i 3 aggettivi che tutti usiamo per descriverlo, ma nessuno usa PRESENZA INVISIBILE! scompare e appare come per magia ma NON MANCA MAI quando c'è bisogno di LUI!",
    skills: ["Music Production", "DJing", "Sound Design"],
    tags: ["ARTIST", "COMIX_FAN"]
  },
];

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center overflow-x-hidden pb-40">
      
      {/* HEADER */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-16 flex flex-col items-start gap-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link href="/" className="nav-tag flex items-center gap-2 group border-white/10 hover:border-[#FF914D]/50 transition-all">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
            <span className="font-mono tracking-widest text-[10px]">BACK</span>
          </Link>
        </motion.div>

        <div className="flex flex-col gap-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none"
          >
            IL <span className="text-[#FF914D]">TEAM</span> OPERATIVO
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 text-sm md:text-lg max-w-xl uppercase font-mono tracking-tight leading-tight"
          >
            Task force creativa specializzata in cultura urbana e hip-hop.
          </motion.p>
        </div>
      </header>

      {/* TEAM GRID */}
      <main className="w-full max-w-7xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-panel group border-white/5 hover:border-[#FF914D]/30 transition-all duration-500 overflow-hidden flex flex-col rounded-[2rem]"
            >
              <div className="relative h-64 w-full overflow-hidden bg-zinc-900">
                <img 
                  src={member.image} 
                  alt={member.name}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  onError={(e) => {
                    e.currentTarget.src = "https://placehold.co/600x800/0a0a0a/FF914D?text=FACTORY_MEMBER";
                  }}
                />
                <div className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[#FF914D]">
                  {member.icon}
                </div>
                <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/60 to-transparent">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter">
                    {member.name}
                  </h3>
                  <p className="text-[#FF914D] font-mono text-[10px] tracking-[0.3em] uppercase">
                    {member.role}
                  </p>
                </div>
              </div>

              <div className="p-8 flex-grow flex flex-col justify-between bg-zinc-950/50">
                <div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed mb-8 uppercase tracking-tight font-medium">
                    {member.description}
                  </p>

                  <div className="space-y-4 mb-8">
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Operational_Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {member.skills.map(skill => (
                        <span key={skill} className="px-3 py-1 bg-white/5 border border-white/5 rounded text-[9px] font-black uppercase text-zinc-300">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-6 border-t border-white/5">
                  {member.tags.map(tag => (
                    <span key={tag} className="text-[8px] font-mono text-[#FF914D]/70 uppercase tracking-tighter">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* FOOTER / CALL TO ACTION */}
      <footer className="mt-32 w-full max-w-3xl px-6 text-center">
        <div className="glass-panel p-12 border-white/5 rounded-[3rem] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF914D]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <h2 className="text-2xl font-black uppercase italic mb-6 tracking-tighter">
            Vuoi entrare nella <span className="text-[#FF914D]">SQUADRA</span>?
          </h2>
          <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-8">
            Siamo sempre alla ricerca di nuove risorse creative.
          </p>
          
          <a 
            href="https://docs.google.com/forms/d/e/1FAIpQLSerjf1xGTrj08wmLSJhbrqwDV2Czc5Kd6OatIyvdlSwJsRNrw/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-tag inline-flex items-center gap-2 px-10 py-4 border-[#FF914D]/20 text-[#FF914D] hover:bg-[#FF914D] hover:text-black transition-all font-black uppercase tracking-widest text-xs cursor-pointer group/btn"
          >
            COMPILA IL FORM
            <ExternalLink size={14} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
          </a>
        </div>
        
        <p className="mt-20 text-[9px] font-mono uppercase tracking-[1em] text-zinc-600 italic">
          UTTF_STAFF_MANIFEST_2026
        </p>
      </footer>
    </div>
  );
}
