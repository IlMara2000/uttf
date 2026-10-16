'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ArrowLeft, Menu, Share2, X } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const isManagement = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin') || pathname === '/login';
  const expanded = isManagement || isOpen;

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <div className="pointer-events-none fixed bottom-4 left-0 right-0 z-[100] flex justify-center px-6">
      <nav aria-label="Navigazione rapida" className={`pointer-events-auto flex items-center justify-center rounded-full border shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-colors duration-200 ${expanded ? 'gap-1.5 border-white/10 bg-black/90 p-[9px] backdrop-blur-md' : 'border-[#FF914D] bg-[#FF914D]'}`}>
        {!expanded ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full text-white"
            aria-label="Apri menu"
            aria-expanded={false}
          >
            <Menu size={25} strokeWidth={2.5} />
          </button>
        ) : (
          <>
            <button type="button" onClick={goBack} className="flex h-14 w-14 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-white" aria-label="Torna indietro">
              <ArrowLeft size={25} strokeWidth={2} />
            </button>
            <Link href="/" onClick={() => setIsOpen(false)} aria-label="Home" aria-current={pathname === '/' ? 'page' : undefined} className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${isManagement || pathname === '/' ? 'bg-[#FF914D] text-white' : 'text-zinc-400 hover:text-white'}`}>
              <Home size={25} strokeWidth={2} />
            </Link>
            {!isManagement && (
              <>
                <Link href="/bio" aria-label="Link in bio" className="flex h-14 w-14 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-white">
                  <Share2 size={25} strokeWidth={2} />
                </Link>
                <button type="button" onClick={() => setIsOpen(false)} className="flex h-14 w-14 items-center justify-center rounded-full text-[#FF914D] transition-colors hover:bg-white/10" aria-label="Chiudi menu" aria-expanded={true}>
                  <X size={25} strokeWidth={2.5} />
                </button>
              </>
            )}
          </>
        )}
      </nav>
    </div>
  );
}
