'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAuth = async (type: 'login' | 'signup') => {
    setLoading(true)
    
    // 1. PRIMA DI TUTTO: Check se l'email è autorizzata dall'admin
    const { data: authorized } = await supabase
      .from('authorized_users')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (!authorized) {
      alert("ACCESSO NEGATO: Questa email non è stata autorizzata dall'amministratore.");
      setLoading(false)
      return
    }

    // 2. Procediamo con il login o la registrazione
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (error) {
      alert("ERRORE: " + error.message)
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md glass-panel p-10 border-white/5 bg-zinc-900/20">
        <div className="text-center mb-10">
          <ShieldCheck className="mx-auto text-orange-500 mb-4" size={40} />
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">SYSTEM_<span className="text-orange-500">ACCESS</span></h1>
          <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.3em] mt-2">Identify_Required_To_Proceed</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-[8px] font-mono text-zinc-500 uppercase ml-1">Terminal_Email</label>
            <input 
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 rounded text-sm text-white outline-none focus:border-orange-500 transition-all font-mono"
              placeholder="name@uttf.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-mono text-zinc-500 uppercase ml-1">Access_Key</label>
            <input 
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 rounded text-sm text-white outline-none focus:border-orange-500 transition-all font-mono"
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              onClick={() => handleAuth('login')} 
              disabled={loading}
              className="bg-white text-black py-4 font-black uppercase italic text-xs hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : 'LOGIN'}
            </button>
            <button 
              onClick={() => handleAuth('signup')} 
              disabled={loading}
              className="border border-white/10 text-white py-4 font-black uppercase italic text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              SIGN_UP
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}