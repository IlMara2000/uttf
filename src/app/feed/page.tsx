'use client'

import { motion } from 'framer-motion';
import { Rss, Instagram, Heart, MessageCircle, Send, Bookmark, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const instagramPosts = [
  { 
    id: 'ig1', 
    img: '/instagram/post2.jpeg', 
    url: 'https://www.instagram.com/p/DTJGIJLDFIq/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==', 
    ratio: 'portrait',
    caption: (
      <>
        <span className="font-bold mr-2">uttf_factory</span>
        RAP F*CKTORY nasce per chi il rap lo vive, anche quando non sa ancora da dove partire. 🎤<br/><br/>
        Non è un laboratorio. È uno spazio dove incontrarsi, scrivere, provare.<br/><br/>
        📍 Barrio’s Live – Milano<br/>
        🗓 12/01 | ⏰ 18–20 | 💸 Gratis<br/><br/>
        Passa, ascolta, fai due barre. 🔥<br/><br/>
        #RapMilano #HipHopMilano #BarriosLive #RapUnderground #RapItaliano
      </>
    )
  },
  { 
    id: 'ig2', 
    img: '/instagram/post1.jpeg', 
    url: 'https://www.instagram.com/reel/DSNFiv_jWYe/', 
    ratio: 'portrait',
    caption: (
      <>
        <span className="font-bold mr-2">uttf_factory</span>
        [FIELD_REPORT] 📍 Rozzano, Piazza Foglia.<br/><br/>
        Oggi la Factory è scesa in strada per la Festa delle Associazioni. Energia pura, connessioni urbane e la prova che la cultura nasce dal cemento della nostra città. 🏙️⚡️<br/><br/>
        #UTTF #Rozzano #UrbanCulture #StreetUnit #Community
      </>
    )
  },
  { 
    id: 'ig3', 
    img: '/instagram/post3.jpeg', 
    url: 'https://www.instagram.com/reel/DS2iuPKjLIc/', 
    ratio: 'portrait',
    caption: (
      <>
        <span className="font-bold mr-2">uttf_factory</span>
        🎄 WAAAASSUUUP PEOPLE 🎄<br/><br/>
        Ecco un breve recap della @rapfcktory Jam organizzata da noi al @barrioslive! Grazie a tutti i partecipanti per aver portato sul palco la loro musica.🎶<br/><br/>
        Menzione speciale per @bleach_wears e @dant.hor: due realtà fighissime!🎨🖌️<br/><br/>
        Ricordiamo che il 12 GENNAIO ricominceranno i laboratori! Training Rap su misura. DM per info. ✍🏻🎼
      </>
    )
  },
  { 
    id: 'ig4', 
    img: '/instagram/post4.jpeg', 
    url: 'https://www.instagram.com/reel/DLnEnkMsQpe/', 
    ratio: 'portrait',
    caption: (
      <>
        <span className="font-bold mr-2">uttf_factory</span>
        Official Video 🔥 NO LIMIT JAM 2025 🔥<br/><br/>
        Un evento organizzato da @comunebuccinasco in collaborazione con @werunthestreetsmilano e molti altri. 💪<br/><br/>
        Check full video on YouTube: https://youtu.be/pnL4b4Xhaxg 📺<br/><br/>
        #nolimitjam #buccinasco #werunthestreets #graffiti #musica #trap #milano
      </>
    )
  },
];

export default function FeedPage() {
  return (
    <div className="min-h-screen text-white flex flex-col items-center overflow-x-hidden pb-40">
      
      {/* HEADER */}
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
          <h1 className="hero-title text-[12vw] md:text-7xl leading-none italic uppercase">UTTF_DAY</h1>
        </div>
      </header>

      {/* UNICO CONTENITORE MAIN */}
      <main className="w-full max-w-7xl px-6 flex flex-col gap-32">
        
        {/* INSTAGRAM SECTION */}
        <section>
          <div className="flex flex-col items-center mb-12">
            <h2 className="text-2xl md:text-4xl font-black uppercase italic mb-4 text-center" style={{ fontFamily: 'var(--font-display)' }}>
              SYNC ON<span className="text-[#FF914D]">_INSTA</span>
            </h2>
            
            <div className="flex items-center gap-3">
              <Instagram size={20} className="text-zinc-600" />
              <p className="text-[18px] md:text-[20px] font-mono tracking-[0.4em] text-zinc-600 uppercase">
                @under_the_tower_factory
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {instagramPosts.map((ig, index) => (
              <motion.div
                key={ig.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <a 
                  href={ig.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="glass-panel block border-white/5 hover:border-[#FF914D]/30 transition-all duration-500 overflow-hidden group h-full"
                >
                  <div className="p-4 flex items-center justify-between border-b border-white/5">
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

                  <div className={`relative w-full overflow-hidden ${ig.ratio === 'portrait' ? 'aspect-[4/5]' : 'aspect-square'}`}>
                    <img 
                      src={ig.img} 
                      alt="IG Post" 
                      className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Heart size={24} className="text-white fill-white" />
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 text-zinc-400">
                        <Heart size={20} className="hover:text-red-500 cursor-pointer transition-colors" />
                        <MessageCircle size={20} className="hover:text-white cursor-pointer transition-colors" />
                        <Send size={20} className="hover:text-white cursor-pointer transition-colors" />
                      </div>
                      <Bookmark size={20} className="text-zinc-400 hover:text-yellow-400 cursor-pointer transition-colors" />
                    </div>
                    
                    <div className="text-[11px] leading-relaxed text-zinc-300 font-sans">
                      {ig.caption}
                    </div>
                  </div>
                </a>
              </motion.div>
            ))}
          </div>
        </section>

        {/* NEWS SECTION - ABOUT */}
        <section>
          <h2 className="text-2xl md:text-4xl font-black uppercase italic mb-10 text-center tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
            COS_<span className="text-[#FF914D]">È</span>
          </h2>
          <div className="glass-panel p-8 md:p-12 border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#FF914D] opacity-50" />
            <h3 className="text-2xl md:text-5xl font-black uppercase italic mb-6 text-center tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
              UNDER THE TOWER?
            </h3>
            <p className="text-zinc-500 text-sm md:text-lg uppercase text-center tracking-widest font-mono leading-relaxed max-w-4xl mx-auto">
              Under the Tower è un progetto creativo che nasce con l’obiettivo di unire persone, idee e passioni all’interno di un ecosistema dinamico e in continua evoluzione. Si sviluppa come una vera e propria community hub, dove ARTE, INTRATTENIMENTO, CONTENUTI e INGEGNO si incontrano per creare esperienze immersive e coinvolgenti.
              L’obiettivo è costruire una realtà solida e riconoscibile, capace di evolversi nel tempo, offrendo valore sia a livello UMANO che SOCIALE, trasformando una community in un vero movimento.
            </p>
          </div>
        </section>

            <Link href="/labs" className="group">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="glass-panel p-10 md:p-16 flex flex-col items-center text-center border-white/5 group-hover:border-[#FF914D]/30 transition-all duration-500 relative overflow-hidden"
              >
                <span className="text-[12px] tracking-[0.8em] text-[#FF914D] mb-4 font-mono uppercase">Lab_Unit</span>
                <h3 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                  RAPF*CKTORY
                </h3>
                <ArrowRight className="absolute right-8 bottom-8 text-white/10 group-hover:text-[#FF914D] group-hover:translate-x-2 transition-all" size={20} />
              </motion.div>
            </Link>
          </div>
      </main>

      <footer className="py-24 text-center opacity-30">
        <p className="text-[9px] font-mono uppercase tracking-[1em] text-zinc-600">UTTF_SYSTEM_V.3.0 // ROZZANO</p>
      </footer>
    </div>
  );
}
