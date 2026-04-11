'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, X, Save, Loader2, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccountSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  
  // Nuovi stati per la gestione della password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Carica i dati dell'utente quando apre il modal
  useEffect(() => {
    if (isOpen) {
      loadUserData();
      // Resettiamo i campi password ad ogni apertura del modal
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  async function loadUserData() {
    setFetching(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      setEmail(session.user.email || '');
      
      // Pesca lo username dalla tabella profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();
        
      if (data) {
        setUsername(data.username || '');
      } else if (error && error.code !== 'PGRST116') { // Ignora l'errore "nessuna riga trovata" nel caso in cui il profilo non esista ancora
          console.error("Errore recupero profilo:", error);
      }
    }
    setFetching(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    
    // Controllo validità password (solo se si sta tentando di cambiarla)
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        return alert("ERRORE: Le password non coincidono.");
      }
      if (newPassword.length < 6) {
        return alert("ERRORE: La nuova password deve avere almeno 6 caratteri.");
      }
    }

    setLoading(true);

    try {
      // 1. Aggiorna lo username nella tabella pubblica profiles
      // Utilizziamo upsert nel caso il record non esista ancora (es. utente appena registrato)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: userId, username: username }, { onConflict: 'id' });
        
      if (profileError) throw profileError;

      // Oggetto per contenere gli aggiornamenti dell'Auth
      const authUpdates: { email?: string; password?: string } = {};

      // 2. Aggiungiamo l'email all'aggiornamento se è stata modificata (in teoria Supabase gestisce già se non cambia, ma è più pulito così)
      authUpdates.email = email;

      // 3. Aggiungiamo la password all'aggiornamento SOLO se è stata inserita nei campi
      if (newPassword) {
        authUpdates.password = newPassword;
      }

      // 4. Eseguiamo l'aggiornamento Auth unico per email e/o password
      const { error: authError } = await supabase.auth.updateUser(authUpdates);
      
      if (authError) throw authError;

      // Gestione dei messaggi di successo in base a cosa è stato aggiornato
      let successMessage = "DATI_AGGIORNATI con successo.";
      if (newPassword) {
        successMessage += "\n🔑 Password modificata.";
      }
      // NOTA BENE: Supabase per motivi di sicurezza, quando si cambia email, manda una mail di conferma al VECCHIO e al NUOVO indirizzo. 
      // L'aggiornamento reale dell'email avviene solo dopo aver cliccato il link in entrambe le mail (comportamento standard).
      successMessage += "\n📧 Se hai modificato la mail, controlla la tua posta per confermare la modifica.";
      
      alert(successMessage);
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
              className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
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
                  {/* SEZIONE ANAGRAFICA */}
                  <div className="space-y-4">
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
                  </div>

                  <hr className="border-white/5 my-4" />

                  {/* SEZIONE PASSWORD */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <KeyRound size={14} className="text-[#FF914D]" />
                      <h3 className="text-xs font-bold uppercase italic text-white tracking-widest">
                        MODIFICA PASSWORD
                      </h3>
                    </div>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-3 leading-relaxed">
                      Lascia i campi vuoti se non vuoi modificare la password attuale.
                    </p>

                    <div>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="NUOVA PASSWORD (MIN 6 CARATTERI)"
                        className="w-full bg-zinc-900 border border-white/5 p-3 rounded-lg font-mono text-xs text-white outline-none focus:border-[#FF914D]/40 transition-colors placeholder:text-zinc-600"
                      />
                    </div>

                    <div>
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="CONFERMA NUOVA PASSWORD"
                        className="w-full bg-zinc-900 border border-white/5 p-3 rounded-lg font-mono text-xs text-white outline-none focus:border-[#FF914D]/40 transition-colors placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full mt-6 py-3 bg-[#FF914D] text-black font-black uppercase italic text-xs rounded-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
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