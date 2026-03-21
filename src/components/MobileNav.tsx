'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, HardDrive, Users, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MobileNav() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/', icon: <Home size={20} />, label: 'Home' },
    { href: '/planner', icon: <LayoutDashboard size={20} />, label: 'Tasks' },
    { href: '/storage', icon: <HardDrive size={20} />, label: 'Vault' },
    { href: '/team', icon: <Users size={20} />, label: 'Team' },
  ];

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center px-6 md:hidden">
      <motion.nav 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="glass-card flex items-center gap-1 p-2 rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl bg-black/50"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`relative p-4 rounded-full transition-all touch-target ${
                isActive ? 'text-black' : 'text-zinc-500'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-uttf-orange rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{item.icon}</span>
            </Link>
          );
        })}
      </motion.nav>
    </div>
  );
}