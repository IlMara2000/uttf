'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// Usiamo le icone "filled" (punte) per un glifo solido
import { Home, Rss, FlaskConical } from 'lucide-react'; 
import { motion } from 'framer-motion';

export default function MobileNav() {
  const pathname = usePathname();
  
  // Definiamo i parametri per le icone: dimensione e 'fill' (colore riempimento)
  // Useremo 'fill="none"' e 'stroke="currentColor"' per le icone inattive bianche.
  // E configureremo lo stile attivo per mostrare un'icona piena arancione.
  const navItems = [
    { 
      href: '/', 
      // Icona HOME (filled, bianca)
      icon: <Home size={22} strokeWidth={1.5} />, 
      label: 'HOME' 
    },
    { 
      href: '/feed', 
      // Icona RSS (filled, bianca)
      icon: <Rss size={22} strokeWidth={1.5} />, 
      label: 'POST' 
    },
    { 
      href: '/labs', 
      // Icona LABORATORIO (filled, bianca)
      icon: <FlaskConical size={22} strokeWidth={1.5} />, 
      label: 'LIVE' 
    },
  ];

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center px-6 md:hidden">
      <motion.nav 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="glass-panel flex items-center gap-1 p-2 rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl bg-black/50"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              // Aggiunto flex-col per supportare glifi pieni e center alignment
              className={`relative p-4 rounded-full transition-all touch-target flex flex-col items-center ${
                isActive ? 'text-black' : 'text-zinc-500' // 'text-zinc-500' sarà sovrascritto dalla logica dell'icona
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-orange-600 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              {/* --- LOGICA ICONA AGGIORNATA --- */}
              <span className={`relative z-10 transition-colors duration-300 ${
                isActive 
                  ? 'text-uttf-orange fill-uttf-orange' // ATTIVA: Arancione e PIENA
                  : 'text-white'                  // INATTIVA: Bianca e SOLO CONTORNO (stroke)
              }`}>
                {/* Il componente icona stesso */}
                {item.icon}
              </span>

            </Link>
          );
        })}
      </motion.nav>
    </div>
  );
}
