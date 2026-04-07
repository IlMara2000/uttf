'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, X, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccountSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Carica i dati dell'utente quando apre il modal
  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  async function loadUserData() {
    setFetching(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      setEmail(session.user.email || '');
      
      // Pesca lo username dalla tabella profiles
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();
        
      if (data) {
        setUsername(data.username || '');
      }
    }
    setFetching(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Aggiorna lo username nella tabella pubblica profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', userId);
        
      if (profileError) throw profileError;

      // 2. Aggiorna l'email nell'Auth di Supabase
      const { error: authError } = await supabase.auth.updateUser({ email });
      if (authError) throw authError;

      alert("DATI_AGGIORNATI: Se hai cambiato la mail, controlla la posta per confermare.");
      setIsOpen(false);
      
      // Aggiorna la pagina o i componenti in ascolto (come il Planner)
      window.dispatchEvent(new Event('refreshCalendar'));
      
    } catch (err: any) {
      console.error("Errore salvataggio:", err);
      alert("ERRORE: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* TASTO INGRANAGGIO */}
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-zinc-500 hover:text-[#FF914D] hover:bg-white/5 rounded-lg transition-all"
        title="Impostazioni Account"
      >
        <Settings size={20} />
      </button>

      {/* MODAL IMPOSTAZIONI */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-6">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
                  ACCOUNT_<span className="text-[#FF914D]">SETTINGS</span>
                </h2>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
                  Modifica parametri operatore
                </p>
              </div>

              {fetching ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-[#FF914D]" size={32} />
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1 block">Username</label>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Inserisci Username"
                      className="w-full bg-zinc-900 border border-white/5 p-3 rounded-lg font-mono text-xs text-white outline-none focus:border-[#FF914D]/40 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1 block">Indirizzo Email</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@dominio.com"
                      required
                      className="w-full bg-zinc-900 border border-white/5 p-3 rounded-lg font-mono text-xs text-white outline-none focus:border-[#FF914D]/40 transition-colors"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full mt-4 py-3 bg-[#FF914D] text-black font-black uppercase italic text-xs rounded-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> SALVA DATI</>}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
