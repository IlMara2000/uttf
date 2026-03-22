'use client'

import { motion } from 'framer-motion';
import { Rss, Instagram, Heart, MessageCircle, Send, Bookmark, ArrowLeft } from 'lucide-react';
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
          <div className="glass-panel p-8 md:p-12 border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#FF914D] opacity-50" />
            <h3 className="text-2xl md:text-5xl font-black uppercase italic mb-6 tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
              URBAN GIANTS 2026
            </h3>
            <p className="text-zinc-500 text-sm md:text-lg uppercase tracking-widest font-mono">
              [SYSTEM_LOG]: A breve tornerà il fantastico evento annuale! Stay tuned.
            </p>
          </div>
        </section>

        {/* INSTAGRAM SECTION */}
        <section>
          <div className="flex flex-col items-center mb-12">
            <h2 className="text-2xl md:text-4xl font-black uppercase italic mb-2 text-center" style={{ fontFamily: 'var(--font-display)' }}>
              INSTA_<span className="text-[#FF914D]">FEED</span>
            </h2>
            <p className="text-[10px] font-mono tracking-[0.4em] text-zinc-600 uppercase">@underthetowerfactory</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {instagramPosts.map((ig, index) => (
              <motion.div
                key={ig.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <a 
                  href={ig.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="glass-panel block border-white/5 hover:border-[#FF914D]/30 transition-all duration-500 overflow-hidden group"
                >
                  {/* Instagram Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[1.5px]">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center p-0.5">
                          <img src="/icons/favicon.svg" alt="avatar" className="w-full h-full" />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold tracking-tight text-zinc-200">uttf_factory</span>
                    </div>
                    <Instagram size={14} className="text-zinc-600 group-hover:text-[#FF914D] transition-colors" />
                  </div>

                  {/* Image Container */}
                  <div className={`relative w-full overflow-hidden ${ig.ratio === 'portrait' ? 'aspect-[4/5]' : 'aspect-square'}`}>
                    <img 
                      src={ig.img} 
                      alt="IG Post" 
                      className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
                    />
                    
                    {/* Overlay al passaggio del mouse */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2 text-white font-bold">
                           <Heart size={20} fill="white" /> <span>Like</span>
                        </div>
                    </div>
                  </div>

                  {/* Instagram Actions */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <Heart size={20} className="hover:text-red-500 cursor-pointer transition-colors" />
                        <MessageCircle size={20} className="hover:text-blue-400 cursor-pointer transition-colors" />
                        <Send size={20} className="hover:text-green-400 cursor-pointer transition-colors" />
                      </div>
                      <Bookmark size={20} className="hover:text-yellow-400 cursor-pointer transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-zinc-300">
                        <span className="font-bold mr-2">uttf_factory</span>
                        Visuals from the latest factory session. ⚡️
                      </p>
                      <p className="text-[9px] uppercase font-mono text-zinc-600 mt-2">View all comments</p>
                    </div>
                  </div>
                </a>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}