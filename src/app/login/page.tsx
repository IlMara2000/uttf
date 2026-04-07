'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Impostiamo loading a true di default per nascondere il form mentre controlliamo la sessione
  const [loading, setLoading] = useState(true); 
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  
  const router = useRouter();

  // 1. CONTROLLO SESSIONE: Se sei già loggato, vai dritto alla dashboard
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // L'utente aveva già fatto l'accesso in passato
        router.replace('/dashboard');
      } else {
        // Nessun accesso precedente, mostriamo il form
        setLoading(false);
        setIsCheckingSession(false);
      }
    };

    checkExistingSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 2. VERIFICA ACCOUNT: Supabase controlla in automatico se l'account esiste nel suo database Auth
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Accesso consentito
      router.replace('/dashboard');
    } catch (err: any) {
      // Se l'account non esiste o la password è errata, finisce qui
      alert("ACCESSO_NEGATO: Verifica le credenziali inserite.");
      setLoading(false);
    }
  };

  // Schermata di caricamento iniziale mentre verifica se sei già loggato
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 gap-4">
        <Loader2 className="animate-spin text-[#FF914D]" size={40} />
        <p className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase animate-pulse">
          VERIFICA_AUTORIZZAZIONI_IN_CORSO...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
            UTTF_<span className="text-[#FF914D]">AUTH</span>
          </h1>
          <p className="text-zinc-500 font-mono text-[10px] mt-2 tracking-widest uppercase">
            ACCESSO_RISERVATO_STAFF
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" 
            placeholder="EMAIL_ADDRESS" 
            className="w-full bg-zinc-900 border border-white/5 p-4 rounded-xl font-mono text-[10px] outline-none focus:border-[#FF914D]/40 text-white"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="SECURITY_KEY" 
            className="w-full bg-zinc-900 border border-white/5 p-4 rounded-xl font-mono text-[10px] outline-none focus:border-[#FF914D]/40 text-white"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-[#FF914D] text-black font-black uppercase italic text-xs hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <><Shield size={16} />ACCEDI</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
