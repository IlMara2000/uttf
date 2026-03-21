'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Rss, FlaskConical } from 'lucide-react'; 
import { motion } from 'framer-motion';

export default function MobileNav() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/', icon: <Home size={22} strokeWidth={2} />, label: 'HOME' },
    { href: '/feed', icon: <Rss size={22} strokeWidth={2} />, label: 'POST' },
    { href: '/labs', icon: <FlaskConical size={22} strokeWidth={2} />, label: 'LIVE' },
  ];

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center px-6 md:hidden pointer-events-none">
      <motion.nav 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="pointer-events-auto glass-panel flex items-center gap-1 p-2 rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl bg-black/80"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className="relative p-4 rounded-full transition-all flex flex-col items-center justify-center min-w-[64px]"
            >
              {/* IL PALLINO ARANCIONE */}
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-orange-600 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              {/* L'ICONA BIANCA (Sia attiva che inattiva) */}
              <span className={`relative z-10 transition-all duration-300 ${
                isActive 
                  ? 'text-white scale-110' // Bianca e leggermente più grande nel pallino
                  : 'text-zinc-500 hover:text-white' // Grigia quando fuori, bianca al passaggio
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
