'use client'
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ArrowLeft, Menu, Share2, X } from 'lucide-react'; 
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Stato per controllare l'apertura della navbar su mobile (fuori dalla dashboard)
  const [isOpen, setIsOpen] = useState(false);

  // Verifichiamo se l'utente si trova in una rotta della dashboard o in /login
  const isDashboard = pathname?.startsWith('/dashboard');
  const isStaffLogin = pathname === '/login';

  // Definiamo i pulsanti standard (escluso il tasto back che gestiamo a parte)
  const allNavItems = [
    { href: '/', icon: <Home size={25} strokeWidth={2} />, label: 'HOME' },
    { href: 'https://linktr.ee/underthetower', icon: <Share2 size={25} strokeWidth={2} />, label: 'SOCIALS', external: true },
  ];

  // La logica per dashboard e login rimane intatta:
  const showAsDashboard = isDashboard || isStaffLogin;
  const navItems = showAsDashboard
    ? allNavItems.filter(item => item.href === '/') 
    : allNavItems;

  // La navbar è "collassata" a bottone se siamo sul sito pubblico e l'utente non l'ha ancora aperta
  const isCollapsed = !showAsDashboard && !isOpen;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none">
      <motion.nav 
        layout
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`pointer-events-auto rounded-full flex items-center justify-center transition-colors duration-300 ${
          isCollapsed 
            ? 'bg-[#FF914D]' 
            : 'glass-panel p-[9px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl bg-black/80'
        }`}
      >
        <AnimatePresence mode="popLayout">
          {isCollapsed ? (
            /* BOTTONE HAMBURGER (Stato Collassato) */
            <motion.button
              key="hamburger"
              layout
              onClick={() => setIsOpen(true)}
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="w-14 h-14 flex items-center justify-center text-white rounded-full"
              aria-label="Apri menu"
            >
              <Menu size={25} strokeWidth={2.5} />
            </motion.button>
          ) : (
            /* NAVBAR ESTESA (Glassmorphism e Bottoni) */
            <motion.div 
              key="expanded-nav"
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5"
            >
              {/* TASTO BACK: Sempre presente come prima opzione a sinistra */}
              <button 
                onClick={() => router.back()}
                className="relative flex min-w-[67px] items-center justify-center rounded-full p-4 text-zinc-500 transition-all hover:text-white"
                aria-label="Torna indietro"
              >
                <span className="relative z-10 transition-all duration-300 hover:scale-110">
                  <ArrowLeft size={25} strokeWidth={2} />
                </span>
              </button>

              {/* ALTRI TASTI NAVIGAZIONE */}
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const isDashboardHomeButton = showAsDashboard && item.href === '/';

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    aria-label={item.label}
                    className={`relative flex min-w-[67px] items-center justify-center rounded-full p-4 transition-all ${
                      isDashboardHomeButton ? 'bg-[#FF914D] text-white shadow-[0_0_20px_rgba(255,145,77,0.35)]' : ''
                    }`}
                  >
                    {/* IL PALLINO ARANCIONE (Appare solo se la rotta è attiva) */}
                    {isActive && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute inset-0 bg-[#FF914D] rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    
                    {/* L'ICONA */}
                    <span className={`relative z-10 transition-all duration-300 ${
                      isDashboardHomeButton
                        ? 'text-white scale-110'
                        : isActive
                          ? 'text-white scale-110'
                          : 'text-zinc-500 hover:text-white'
                    }`}>
                      {item.icon}
                    </span>
                  </Link>
                );
              })}

              {/* TASTO CLOSE (X) - Aggiunto a destra per permettere all'utente di richiudere la navbar */}
              {!showAsDashboard && (
                <button 
                  onClick={() => setIsOpen(false)}
                  className="relative flex min-w-[67px] items-center justify-center rounded-full p-4 text-[#FF914D] transition-all hover:bg-white/10"
                  aria-label="Chiudi menu"
                >
                  <span className="relative z-10 transition-all duration-300 hover:scale-110">
                    <X size={25} strokeWidth={2.5} />
                  </span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}
