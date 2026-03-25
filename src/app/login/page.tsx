'use client'
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Uso replace per evitare loop nella history del browser
      router.replace('/dashboard');
    } catch (err: any) {
      alert("ACCESSO_NEGATO: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
            UTTF_<span className="text-[#FF914D]">AUTH</span>
          </h1>
          <p className="text-zinc-500 font-mono text-[10px] mt-2 tracking-widest uppercase">Restricted_Access_Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" placeholder="EMAIL_ADDRESS" 
            className="w-full bg-zinc-900 border border-white/5 p-4 rounded-xl font-mono text-[10px] outline-none focus:border-[#FF914D]/40 text-white"
            value={email} onChange={(e) => setEmail(e.target.value)} required 
          />
          <input 
            type="password" placeholder="SECURITY_KEY" 
            className="w-full bg-zinc-900 border border-white/5 p-4 rounded-xl font-mono text-[10px] outline-none focus:border-[#FF914D]/40 text-white"
            value={password} onChange={(e) => setPassword(e.target.value)} required 
          />
          <button 
            type="submit" disabled={loading}
            className="w-full py-4 bg-[#FF914D] text-black font-black uppercase italic text-xs hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <><Shield size={16} />ACCEDI</>}
          </button>
        </form>
      </div>
    </div>
  );
}