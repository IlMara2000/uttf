'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Planner', path: '/planner' },
    { name: 'Vault', path: '/storage' },
    { name: 'Team', path: '/team' },
  ]

  return (
    <nav className="bg-black border-b-2 border-zinc-900 px-8 py-4 sticky top-0 z-[100] flex justify-between items-center">
      <Link href="/" className="group">
        <span className="text-2xl font-black italic tracking-tighter group-hover:text-orange-500 transition-colors">
          UTTF<span className="text-orange-500">_</span>
        </span>
      </Link>

      <div className="flex gap-8">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path}
            className={`text-[10px] font-black uppercase tracking-widest transition-all ${
              pathname === item.path 
                ? 'text-orange-500 border-b-2 border-orange-500 pb-1' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-[8px] font-mono text-zinc-600 uppercase font-bold tracking-tighter">Server_Status: OK</span>
      </div>
    </nav>
  )
}