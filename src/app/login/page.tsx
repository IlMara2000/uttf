'use client'

import { useState, useEffect } from 'react';
import { clearRefreshBlock, supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

const SESSION_CHECK_TIMEOUT_MS = 3000;

function getSafeNextPath() {
  const requestedPath = new URLSearchParams(window.location.search).get('next');

  if (requestedPath?.startsWith('/') && !requestedPath.startsWith('//') && !/[\s\u0000-\u001f\\]/u.test(requestedPath)) {
    return requestedPath;
  }

  return '/dashboard';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Il form non è ancora a schermo durante il controllo: `loading` serve solo al submit.
  const [loading, setLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  
  const router = useRouter();

  // 1. CONTROLLO SESSIONE: Se sei già loggato, vai dritto alla dashboard
  useEffect(() => {
    // Il lock di gotrue a volte non si rilascia (AbortError "Lock broken by
    // another request") e getSession() non torna: senza un tetto il form non
    // comparirebbe mai e non si potrebbe fare login. Passati 3s si mostra
    // comunque; se una sessione valida arriva dopo, il redirect scatta lo stesso.
    const timer = setTimeout(() => setIsCheckingSession(false), SESSION_CHECK_TIMEOUT_MS);

    const settle = (session: unknown) => {
      clearTimeout(timer);
      if (session) router.replace(getSafeNextPath());
      else setIsCheckingSession(false);
    };

    supabase.auth.getSession().then(({ data }) => settle(data.session), () => settle(null));

    return () => clearTimeout(timer);
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 2. VERIFICA ACCOUNT: Supabase controlla in automatico se l'account esiste nel suo database Auth
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Accesso consentito: la sessione nuova non deve ereditare il cooldown
      // di un refresh fallito prima del login.
      clearRefreshBlock();
      router.replace(getSafeNextPath());
    } catch (error) {
      // Il login condivide il budget di richieste dei refresh: a limite esaurito
      // anche la password giusta viene rifiutata, e "credenziali errate"
      // manderebbe fuori strada.
      const rateLimited = (error as { status?: number } | null)?.status === 429;
      alert(
        rateLimited
          ? "Troppi tentativi di accesso ravvicinati. Aspetta qualche minuto e riprova."
          : "Accesso non riuscito. Verifica email e password.",
      );
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
