'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserPlus, ShieldAlert, Trash2, Zap, Fingerprint, Mail } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminTeamPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('') // AGGIUNTO EMAIL
  const [role, setRole] = useState('')
  const [skills, setSkills] = useState('')

  const fetchTeam = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    if (data) setProfiles(data)
  }

  useEffect(() => { fetchTeam() }, [])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const skillsArray = skills.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== '')

    // 1. Inseriamo nel database dei profili
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{ 
        full_name: fullName.toUpperCase(), 
        email: email.toLowerCase().trim(), // Salviamo l'email per il check
        role: role.toUpperCase(), 
        skills: skillsArray,
        updated_at: new Date()
      }])

    // 2. Inseriamo nella tabella di autorizzazione (quella che controlla il login)
    const { error: authError } = await supabase
      .from('authorized_users')
      .insert([{ email: email.toLowerCase().trim() }])

    if (!profileError && !authError) {
      setFullName(''); setEmail(''); setRole(''); setSkills('');
      fetchTeam()
      alert("UNIT_AUTHORIZED: L'utente ora può registrarsi/accedere.");
    } else {
      alert('DATABASE_ERROR: Controlla che le tabelle authorized_users e profiles esistano.');
    }
    setLoading(false)
  }

  const deleteMember = async (id: string, userEmail: string) => {
    if (!confirm('TERMINATE_CONTRACT?')) return
    await supabase.from('profiles').delete().eq('id', id)
    await supabase.from('authorized_users').delete().eq('email', userEmail)
    fetchTeam()
  }

  return (
    <div className="p-6 md:p-12 bg-[#050505] min-h-screen text-white font-sans selection:bg-orange-500">
      <header className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-orange-500 mb-4">
            <Fingerprint size={18} />
            <span className="font-mono text-[9px] uppercase tracking-[0.5em]">Auth_Management_System</span>
          </div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter">SQUAD <span className="text-orange-500">CONTROL</span></h1>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel p-8 bg-zinc-900/20 border-white/5 sticky top-24">
            <h2 className="text-xs font-black uppercase italic text-orange-500 mb-8 tracking-[0.3em] flex items-center gap-2">
              <UserPlus size={14} /> _AUTHORIZE_NEW_ACCESS
            </h2>
            <form onSubmit={handleAddMember} className="space-y-5">
              <input required placeholder="FULL NAME" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-black/40 border-b border-zinc-800 p-3 outline-none focus:border-orange-500 text-xs uppercase font-bold" />
              <input required type="email" placeholder="EMAIL (FOR LOGIN)" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/40 border-b border-zinc-800 p-3 outline-none focus:border-orange-500 text-xs font-mono" />
              <input required placeholder="UNIT ROLE" value={role} onChange={e => setRole(e.target.value)} className="w-full bg-black/40 border-b border-zinc-800 p-3 outline-none focus:border-orange-500 text-xs uppercase font-bold" />
              <input placeholder="SKILLS (COMMAS)" value={skills} onChange={e => setSkills(e.target.value)} className="w-full bg-black/40 border-b border-zinc-800 p-3 outline-none focus:border-orange-500 text-[10px] font-mono" />
              <button disabled={loading} className="w-full bg-white text-black font-black uppercase italic text-[10px] py-4 hover:bg-orange-500 transition-all">
                {loading ? 'SYNCING...' : 'AUTHORIZE_UNIT'}
              </button>
            </form>
          </motion.div>
        </div>

        <div className="lg:col-span-8">
          <div className="space-y-4">
            {profiles.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-6 glass-panel border-white/5 bg-zinc-950/40 group">
                <div>
                  <h3 className="text-2xl font-black uppercase italic leading-none mb-1">{member.full_name}</h3>
                  <p className="text-[9px] font-mono text-zinc-500 mb-2">{member.email}</p>
                  <span className="text-[9px] text-orange-500 font-black uppercase tracking-widest bg-orange-500/10 px-2 py-0.5">{member.role}</span>
                </div>
                <button onClick={() => deleteMember(member.id, member.email)} className="p-3 text-zinc-800 hover:text-red-500 transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}