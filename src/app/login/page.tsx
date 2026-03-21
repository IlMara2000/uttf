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

    // 1. Controlliamo se l'email è nella whitelist prima di mandare il link
    const { data, error: checkError } = await supabase
      .from('authorized_users')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (checkError || !data) {
      setError('ACCESS_DENIED: Email non registrata nei protocolli UTTF.');
      setLoading(false);
      return;
    }

    // 2. Se è in whitelist, mandiamo il Magic Link
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(`AUTH_ERROR: ${authError.message}`);
    } else {
      setMessage('CHECK_INBOX: Link di accesso inviato con successo.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
      <header className="absolute top-10 left-10">
        <Link href="/" className="nav-tag flex items-center gap-2">
          <ArrowLeft size={14} /> BACK_HOME
        </Link>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-12 md:p-16 w-full max-w-md border-white/5 text-center"
      >
        <div className="flex flex-col items-center mb-12">
          <div className="p-4 bg-orange-600/10 border border-orange-600/20 rounded-2xl text-orange-600 mb-8">
            <KeyRound size={32} />
          </div>
          <h1 className="hero-title text-4xl mb-2">Staff
            Login</h1>
          <p className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.3em]">Authorized_Personnel_Only</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-3 justify-center">
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        {message && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-3 justify-center">
            <Mail size={16} /> {message}
          </div>
        )}

        <form onSubmit={handleMagicLink} className="space-y-6">
          <div className="relative">
            <input 
              type="email"
              placeholder="ENTER_IDENTITY_EMAIL"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm font-mono text-white placeholder:text-zinc-700 focus:outline-none focus:border-orange-600/50 transition-all text-center uppercase"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="btn-urban w-full justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Request_Access'}
          </button>
        </form>

        <p className="mt-12 text-[8px] text-zinc-800 font-mono uppercase tracking-[0.4em]">
          UTTF_CORE_V3 // SECURE_HANDSHAKE
        </p>
      </motion.div>
    </div>
  );
}