'use client'
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Rss, FlaskConical, ArrowLeft } from 'lucide-react'; 
import { motion } from 'framer-motion';

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Verifichiamo se l'utente si trova in una rotta della dashboard o in /login
  const isDashboard = pathname?.startsWith('/dashboard');
  const isStaffLogin = pathname === '/login';

  // Definiamo i pulsanti standard (escluso il tasto back che gestiamo a parte)
  const allNavItems = [
    { href: '/', icon: <Home size={22} strokeWidth={2} />, label: 'HOME' },
    { href: '/feed', icon: <Rss size={22} strokeWidth={2} />, label: 'POST' },
    { href: '/labs', icon: <FlaskConical size={22} strokeWidth={2} />, label: 'LIVE' },
  ];

  // Se siamo in dashboard o login, filtriamo e mostriamo SOLO la Home.
  // Altrimenti mostriamo tutto il set.
  const navItems = (isDashboard || isStaffLogin)
    ? allNavItems.filter(item => item.href === '/') 
    : allNavItems;

  return (
    {/* La classe md:hidden si attiva SOLO se NON siamo nella dashboard */}
    <div className={`fixed bottom-8 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none ${!isDashboard ? 'md:hidden' : ''}`}>
      <motion.nav 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="pointer-events-auto glass-panel flex items-center gap-1 p-2 rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl bg-black/80"
      >
        
        {/* TASTO BACK: Sempre presente come prima opzione a sinistra */}
        <button 
          onClick={() => router.back()}
          className="relative p-4 rounded-full transition-all flex flex-col items-center justify-center min-w-[64px] text-zinc-500 hover:text-white"
          aria-label="Torna indietro"
        >
          <span className="relative z-10 transition-all duration-300 hover:scale-110">
            <ArrowLeft size={22} strokeWidth={2} />
          </span>
        </button>

        {/* ALTRI TASTI NAVIGAZIONE */}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className="relative p-4 rounded-full transition-all flex flex-col items-center justify-center min-w-[64px]"
            >
              {/* IL PALLINO ARANCIONE (Appare solo se la rotta è attiva) */}
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-orange-600 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              {/* L'ICONA */}
              <span className={`relative z-10 transition-all duration-300 ${
                isActive 
                  ? 'text-white scale-110' 
                  : 'text-zinc-500 hover:text-white'
              }`}>
                {item.icon}
              </span>
            </Link>
          );
        })}
      </motion.nav>
    </div>
  );
}