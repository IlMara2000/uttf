'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

function getSafeNextPath() {
  const requestedPath = new URLSearchParams(window.location.search).get('next');

  if (requestedPath?.startsWith('/') && !requestedPath.startsWith('//') && !requestedPath.includes('\\')) {
    return requestedPath;
  }

  return '/dashboard';
}

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
        router.replace(getSafeNextPath());
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
      router.replace(getSafeNextPath());
    } catch {
      // Se l'account non esiste o la password è errata, finisce qui
      alert("Accesso non riuscito. Verifica email e password.");
      setLoading(false);
    }
  };

  // Schermata di caricamento iniziale mentre verifica se sei già loggato
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 gap-4">
        <Loader2 className="animate-spin text-[#FF914D]" size={40} />
        <p className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase animate-pulse">
          Verifica della sessione…
        </p>
      </div>
    );
  }

  return (
    <main className="staff-login">
      <section className="staff-login-intro">
        <Link href="/" aria-label="Under The Tower Factory, torna al sito"><Image src="/icons/homelogo.png" alt="Under The Tower Factory" width={150} height={150} /></Link>
        <span className="staff-kicker">Under The Tower Factory / Staff</span>
        <h1>Dietro{" "}<br />le quinte.<br /><span>Dentro{" "}<br />la Factory.</span></h1>
        <p>Lo spazio di chi dà una mano a far succedere le cose.</p>
        <Link href="/" className="staff-back">Torna al sito</Link>
      </section>
      <section className="staff-login-panel" aria-labelledby="login-title">
        <span className="staff-kicker">Area riservata</span>
        <h2 id="login-title">Ci sei. Entra.</h2>
        <p>Accedi con il tuo account staff.</p>
        <form onSubmit={handleLogin}>
          <label htmlFor="staff-email">Email</label>
          <input id="staff-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="staff-password">Password</label>
          <input id="staff-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? <><Loader2 className="animate-spin" size={18} /> Accesso in corso…</> : 'Accedi'}</button>
        </form>
        <p className="staff-login-note">L’accesso è riservato agli account autorizzati della Factory.</p>
      </section>
    </main>
  );
}
