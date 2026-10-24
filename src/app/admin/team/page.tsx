'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserPlus, Trash2, Fingerprint } from 'lucide-react'
import { motion } from 'framer-motion'
import ManagementBottomLogo from '@/components/ManagementBottomLogo'

type TeamProfile = {
  id: string;
  email: string;
  role: string;
}

export default function AdminTeamPage() {
  const [profiles, setProfiles] = useState<TeamProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('') // AGGIUNTO EMAIL
  const [role, setRole] = useState('staff')

  const fetchTeam = useCallback(async () => {
    const { data, error } = await supabase.from('authorized_users').select('id, email, role').order('email')
    if (error) alert('Lettura autorizzazioni non disponibile.')
    if (data) setProfiles(data as TeamProfile[])
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTeam()
  }, [fetchTeam])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.from('authorized_users')
      .insert([{ email: email.toLowerCase().trim(), role }]);
    if (error) {
      alert('Autorizzazione non salvata. Verifica i permessi amministratore e che la persona non sia già presente.');
    } else {
      setEmail(''); setRole('staff');
      void fetchTeam();
      alert("Accesso autorizzato. L'account Auth deve essere creato separatamente.");
    }
    setLoading(false)
  }

  const deleteMember = async (id: string) => {
    if (!confirm('Revocare l’accesso di questa persona?')) return;
    const { data: { user } } = await supabase.auth.getUser();
    const member = profiles.find(item => item.id === id);
    if (member?.email.toLowerCase() === user?.email?.toLowerCase()) {
      alert('Non puoi revocare il tuo stesso accesso da questa schermata.');
      return;
    }
    const { data, error } = await supabase.from('authorized_users').delete().eq('id', id).select('id');
    if (error || !data?.length) alert('Revoca non riuscita.');
    else void fetchTeam();
  }

  return (
    <div className="p-6 md:p-12 bg-transparent min-h-screen text-white font-sans selection:bg-orange-500">
      <header className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-orange-500 mb-4">
            <Fingerprint size={18} />
            <span className="font-mono text-[9px] uppercase tracking-[0.5em]">Under The Tower / Staff</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">Gestione <span className="text-orange-500">team</span></h1>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel p-8 bg-zinc-900/20 border-white/5 sticky top-24">
            <h2 className="text-xs font-black uppercase italic text-orange-500 mb-8 tracking-[0.3em] flex items-center gap-2">
              <UserPlus size={14} /> Aggiungi una persona
            </h2>
            <form onSubmit={handleAddMember} className="space-y-5">
              <input required type="email" placeholder="Email di accesso" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/40 border-b border-zinc-800 p-3 outline-none focus:border-orange-500 text-xs font-mono" />
              <select aria-label="Ruolo di accesso" value={role} onChange={e => setRole(e.target.value)} className="w-full bg-black/40 border-b border-zinc-800 p-3"><option value="staff">Staff</option><option value="admin">Amministratore</option></select>
              <button disabled={loading} className="w-full bg-white text-black font-black uppercase italic text-[10px] py-4 hover:bg-orange-500 transition-all">
                {loading ? 'Salvataggio…' : 'Autorizza accesso'}
              </button>
            </form>
          </motion.div>
        </div>

        <div className="lg:col-span-8">
          <div className="space-y-4">
            {profiles.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-6 glass-panel border-white/5 bg-zinc-950/40 group">
                <div>
                  <h3 className="text-2xl font-black uppercase italic leading-none mb-1">{member.email}</h3>
                  <span className="text-[9px] text-orange-500 font-black uppercase tracking-widest bg-orange-500/10 px-2 py-0.5">{member.role}</span>
                </div>
                <button aria-label={`Rimuovi ${member.email}`} onClick={() => deleteMember(member.id)} className="p-3 text-zinc-800 hover:text-red-500 transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ManagementBottomLogo className="mt-16" />
    </div>
  )
}
