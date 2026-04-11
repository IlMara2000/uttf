'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rss, Instagram, Heart, MessageCircle, Send, Bookmark, ArrowLeft, Mail, X, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase'; // <-- Import per salvare nel database

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
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  
  // Stati per la gestione grafica del caricamento e successo
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Gestione IBRIDA dell'invio (Database + FormSubmit)
  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // IMPORTANTE: NON mettiamo e.preventDefault() così il form nativo di HTML
    // spedisce tranquillamente l'email tramite FormSubmit e l'iframe nascosto!
    setIsSubmitting(true);
    
    // 1. ESTRAIAMO I DATI PER IL DATABASE
    const formData = new FormData(e.currentTarget);
    const name = formData.get('Nome') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('Telefono') as string;

    // 2. SALVIAMO I DATI SU SUPABASE (per vederli nella Dashboard)
    try {
      await supabase
        .from('newsletter_subscribers')
        .insert([{ name, email, phone }]);
    } catch (error) {
      console.error("Errore salvataggio su Supabase:", error);
    }
    
    // 3. ANIMAZIONE DI SUCCESSO E CHIUSURA MODALE
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Dopo 3 secondi di successo, chiudiamo la modale in automatico
      setTimeout(() => {
        setIsNewsletterOpen(false);
        setTimeout(() => setIsSuccess(false), 500); 
      }, 3000);
    }, 1200);
  };

  return (
    <div className="min-h-screen text-white flex flex-col items-center overflow-x-hidden pb-40 relative bg-black">
      
      {/* HEADER */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-16 flex flex-col items-center gap-8 relative z-10">
        <div className="w-full flex justify-start">
          <Link href="/" className="nav-tag flex items-center gap-2 !text-[#FF914D] border-[#FF914D]/20">
            <ArrowLeft size={14} className="text-[#FF914D]" /> BACK
          </Link>
        </div>
        
        <div className="text-center flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[#FF914D] blur-xl opacity-20 rounded-full animate-pulse"></div>
            <div className="relative p-4 bg-[#FF914D]/10 border border-[#FF914D]/20 rounded-full text-[#FF914D]">
              <Rss size={32} strokeWidth={2.5} />
            </div>
          </div>

          <h1 className="hero-title text-[10vw] md:text-6xl leading-none italic uppercase font-black tracking-tighter">
            UTTF_<span className="text-[#FF914D]">DAY<br /></span>
          </h1>
        </div>
      </header>

      {/* MAIN */}
      <main className="w-full max-w-7xl px-6 flex flex-col gap-32 relative z-10">
          
        {/* BOTTONI PRINCIPALI: STREAM E NEWSLETTER */}
        <section className="flex flex-col items-center gap-8 mb-16 w-full max-w-md mx-auto">
          
          <Link href="/stream" className="group relative w-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#FF914D] to-orange-900 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
            <button className="relative w-full px-8 py-4 bg-black border border-white/10 rounded-full flex items-center justify-center gap-4 hover:border-[#FF914D]/50 transition-all shadow-xl shadow-black/50">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF914D] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF914D]"></span>
              </span>
              <span className="font-mono text-[11px] font-bold tracking-[0.3em] uppercase text-white">Enter_Live_Stream</span>
              <ArrowLeft size={16} className="rotate-180 text-zinc-500 group-hover:text-[#FF914D] transition-colors" />
            </button>
          </Link>

          <div className="relative group w-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 via-[#FF914D] to-orange-600 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <button 
              onClick={() => setIsNewsletterOpen(true)}
              className="relative w-full px-8 py-4 bg-[#FF914D]/15 backdrop-blur-xl border-2 border-[#FF914D]/40 rounded-full flex items-center justify-center gap-4 transition-all duration-300 shadow-[0_0_30px_rgba(255,145,77,0.2)] hover:shadow-[0_0_40px_5px_rgba(255,145,77,0.4)] hover:border-[#FF914D]/70 hover:scale-[1.02]"
            >
              <Mail size={18} className="text-white" strokeWidth={2.5} />
              <span className="font-mono text-[11px] font-bold tracking-[0.3em] uppercase text-white">Attiva_Newsletter</span>
            </button>
          </div>
        </section>

        {/* INSTAGRAM SECTION */}
        <section>
          <div className="flex flex-col items-center mb-12">
            <h2 className="text-2xl md:text-4xl font-black uppercase italic mb-4 text-center">
              SYNC ON<span className="text-[#FF914D]">_INSTA</span>
            </h2>
            
            <div className="flex items-center gap-3">
              <Instagram size={20} className="text-zinc-600" />
              <p className="text-[12px] md:text-[12px] font-mono tracking-[0.4em] text-zinc-600 uppercase">
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
                  className="glass-panel block border-white/5 hover:border-[#FF914D]/30 transition-all duration-500 overflow-hidden group h-full bg-black/20"
                >
                  <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20">
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
      </main>

      <footer className="py-24 text-center opacity-30 relative z-10">
        <p className="text-[9px] font-mono uppercase tracking-[1em] text-zinc-600">UTTF_SYSTEM_V.3.0 // ROZZANO</p>
      </footer>

      {/* IFRAME NASCOSTO PER GESTIRE L'INVIO SILENZIOSO DELLA MAIL SENZA CAMBIARE PAGINA */}
      <iframe name="hidden_iframe" id="hidden_iframe" style={{ display: 'none' }}></iframe>

      {/* MODALE NEWSLETTER CON STATO DI SUCCESSO */}
      <AnimatePresence>
        {isNewsletterOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => !isSubmitting && setIsNewsletterOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
              className="relative w-full max-w-md bg-zinc-950/80 backdrop-blur-3xl border border-[#FF914D]/30 rounded-3xl shadow-[0_0_60px_-10px_rgba(255,145,77,0.3)] p-8 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {!isSuccess && (
                <button 
                  onClick={() => setIsNewsletterOpen(false)}
                  disabled={isSubmitting}
                  className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-[#FF914D] hover:bg-white/5 rounded-full transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              )}

              {/* STATO DI SUCCESSO */}
              {isSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center text-center py-10"
                >
                  <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} className="text-emerald-500" />
                  </div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-3">
                    BENVENUTO A_<span className="text-[#FF914D]">BORDO</span>
                  </h2>
                  <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest leading-relaxed">
                    Operazione confermata. Riceverai presto i nostri aggiornamenti.
                  </p>
                </motion.div>
              ) : (
                /* FORM DI ISCRIZIONE IBRIDO */
                <>
                  <div className="mb-8 mt-2">
                    <div className="w-12 h-12 bg-[#FF914D]/10 border border-[#FF914D]/20 rounded-2xl flex items-center justify-center mb-6">
                      <Mail className="text-[#FF914D]" size={24} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                      JOIN THE_<span className="text-[#FF914D]">FACTORY</span>
                    </h2>
                    <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest mt-3 leading-relaxed">
                      Iscriviti alla newsletter per non perderti live, drop ed eventi a Rozzano.
                    </p>
                  </div>

                  {/* IL TARGET PUNTA ALL'IFRAME INVISIBILE E L'ACTION A FORMSUBMIT */}
                  <form action="https://formsubmit.co/el/zadero" method="POST" target="hidden_iframe" onSubmit={handleNewsletterSubmit} className="space-y-5">
                    
                    <input type="hidden" name="_captcha" value="false" />
                    <input type="hidden" name="_subject" value="🔥 Nuova iscrizione alla Newsletter UTTF!" />
                    <input type="hidden" name="_template" value="box" />

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest pl-1 block">Il tuo nome</label>
                      <input 
                        type="text" 
                        name="Nome"
                        required
                        disabled={isSubmitting}
                        placeholder="NOME O NICKNAME"
                        className="w-full bg-black/50 border border-white/10 focus:border-[#FF914D]/60 p-4 rounded-xl font-mono text-[11px] uppercase text-white outline-none transition-colors placeholder:text-zinc-700 disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest pl-1 block">Indirizzo Email</label>
                      <input 
                        type="email" 
                        name="email"
                        required
                        disabled={isSubmitting}
                        placeholder="EMAIL@DOMINIO.COM"
                        className="w-full bg-black/50 border border-white/10 focus:border-[#FF914D]/60 p-4 rounded-xl font-mono text-[11px] uppercase text-white outline-none transition-colors placeholder:text-zinc-700 disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest pl-1 block">Numero di Cellulare</label>
                      <input 
                        type="tel" 
                        name="Telefono"
                        required
                        disabled={isSubmitting}
                        placeholder="+39 333 123 4567"
                        className="w-full bg-black/50 border border-white/10 focus:border-[#FF914D]/60 p-4 rounded-xl font-mono text-[11px] uppercase text-white outline-none transition-colors placeholder:text-zinc-700 disabled:opacity-50"
                      />
                    </div>

                    <div className="pt-3">
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-4 bg-[#FF914D] text-black font-black uppercase italic text-[11px] tracking-wider rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-3 shadow-lg shadow-[#FF914D]/10 disabled:opacity-50 disabled:hover:bg-[#FF914D]"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" /> INVIO IN CORSO...
                          </>
                        ) : (
                          <>
                            <Send size={16} /> CONFERMA ISCRIZIONE
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}