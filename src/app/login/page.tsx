'use client'

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { ShieldAlert, KeyRound, ArrowLeft, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const cleanEmail = email.toLowerCase().trim();
    console.log("--- START_AUTH_PROTOCOL ---");
    console.log("Target:", cleanEmail);

    // Timeout di sicurezza: se dopo 10 secondi gira ancora, sblocca tutto
    const authTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("NETWORK_TIMEOUT: Il server non risponde. Controlla la connessione o lo Shield di Brave.");
      }
    }, 10000);

    try {
      // 1. Controllo Whitelist
      console.log("Checking authorized_users table...");
      const { data: whitelist, error: checkError } = await supabase
        .from('authorized_users')
        .select('email')
        .eq('email', cleanEmail)
        .single();

      if (checkError) {
        console.error("Whitelist Error:", checkError);
        setError('ACCESS_DENIED: Identità non autorizzata o errore database.');
        setLoading(false);
        clearTimeout(authTimeout);
        return;
      }

      console.log("Whitelist OK. Sending Magic Link...");

      // 2. Invio Magic Link
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: 'https://uttf.vercel.app/dashboard',
        },
      });

      if (authError) {
        console.error("Supabase Auth Error:", authError);
        setError(`AUTH_ERROR: ${authError.message}`);
      } else {
        console.log("Success! Link sent.");
        setMessage('CHECK_INBOX: Link inviato. Controlla la tua email.');
        setEmail('');
      }
    } catch (err: any) {
      console.error("Crash Fatale:", err);
      setError('SYSTEM_FAULT: Errore critico nel modulo di login.');
    } finally {
      setLoading(false);
      clearTimeout(authTimeout);
      console.log("--- END_AUTH_PROTOCOL ---");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
      <header className="absolute top-10 left-10">
        <Link href="/" className="nav-tag flex items-center gap-2 group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> HOME
        </Link>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-10 md:p-16 w-full max-w-md border-white/5 text-center"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="p-5 bg-orange-600/10 border border-orange-600/20 rounded-2xl text-orange-600 mb-6 shadow-[0_0_20px_rgba(234,88,12,0.1)]">
            <KeyRound size={32} />
          </div>
          <h1 className="hero-title text-5xl mb-3 italic">Staff <br />Login </h1>
          <p className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.3em]">Authorized_Personnel_Only</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-3 justify-center">
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        {message && (
          <div className="bg-orange-600/10 border border-orange-600/20 text-orange-500 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-3 justify-center">
            <Mail size={16} /> {message}
          </div>
        )}

        <form onSubmit={handleMagicLink} className="space-y-4">
          <input 
            type="email"
            placeholder="ENTER_EMAIL"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm font-mono text-white placeholder:text-zinc-800 focus:outline-none focus:border-orange-600/50 transition-all text-center uppercase tracking-widest"
          />

          <button 
            type="submit"
            disabled={loading}
            className="btn-urban w-full justify-center py-5 shadow-xl shadow-orange-600/5 disabled:opacity-30"
          >
            {loading ? <Loader2 className="animate-spin text-orange-600" size={20} /> : 'Request_Access'}
          </button>
        </form>

        <p className="mt-12 text-[8px] text-zinc-800 font-mono uppercase tracking-[0.5em] opacity-50">
          UTTF_CORE_V3 // SECURE_HANDSHAKE
        </p>
      </motion.div>
    </div>
  );
}