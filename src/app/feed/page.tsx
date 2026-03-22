'use client'

import { motion } from 'framer-motion';
import { Rss, Instagram, Layers, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const instagramPosts = [
  { id: 'ig1', img: '/instagram/post2.jpeg', url: 'https://www.instagram.com/p/DSmt3LJDIXP/', ratio: 'portrait' },
  { id: 'ig2', img: '/instagram/post1.jpeg', url: 'https://www.instagram.com/reel/DSNFiv_jWYe/', ratio: 'portrait' },
  { id: 'ig3', img: '/instagram/post3.jpeg', url: 'https://www.instagram.com/reel/DS2iuPKjLIc/', ratio: 'portrait' },
  { id: 'ig4', img: '/instagram/post4.jpeg', url: 'https://www.instagram.com/reel/DLnEnkMsQpe/', ratio: 'portrait' },
];

export default function FeedPage() {
  return (
    <div className="min-h-screen text-white flex flex-col items-center overflow-x-hidden pb-40">
      <header className="w-full max-w-7xl px-6 pt-12 pb-16 flex flex-col items-center gap-8">
        <div className="w-full flex justify-start">
          <Link href="/" className="nav-tag flex items-center gap-2">
            <ArrowLeft size={14} /> BACK
          </Link>
        </div>
        <div className="text-center flex flex-col items-center">
          <div className="p-3 bg-orange-600/10 border border-orange-600/20 rounded-2xl text-[#FF914D] mb-6">
            <Rss size={24} />
          </div>
          <h1 className="hero-title text-[12vw] md:text-7xl leading-none">UTTF_DAY</h1>
        </div>
      </header>

      <main className="w-full max-w-7xl px-6 flex flex-col gap-24">
        {/* NEWS SECTION */}
        <section>
          <h2 className="text-2xl md:text-4xl font-black uppercase italic mb-10 text-center tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
            UTTFactory_<span className="text-[#FF914D]">NEWS</span>
          </h2>
          <div className="glass-panel p-8 md:p-12 border-white/5">
            <h3 className="text-2xl md:text-5xl font-black uppercase italic mb-6 tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
              URBAN GIANTS 2026
            </h3>
            <p className="text-zinc-500 text-sm md:text-lg uppercase">A breve tornerà il fantastico evento annuale!</p>
          </div>
        </section>

        {/* INSTAGRAM SECTION */}
        <section>
          <h2 className="text-2xl md:text-4xl font-black uppercase italic mb-12 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            INSTA_<span className="text-[#FF914D]">SEGUITECI!</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {instagramPosts.map((ig) => (
              <a key={ig.id} href={ig.url} target="_blank" rel="noopener noreferrer" className="glass-panel p-1 border-white/5 hover:border-[#FF914D]/30 transition-all overflow-hidden group">
                <div className={`relative w-full h-full overflow-hidden rounded-2xl ${ig.ratio === 'portrait' ? 'aspect-[4/5]' : 'aspect-square'}`}>
                  <img src={ig.img} alt="IG Post" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}