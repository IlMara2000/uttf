'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

export default function AdminTeamPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')
  const [skills, setSkills] = useState('')
  const router = useRouter()

  const fetchTeam = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    if (data) setProfiles(data)
  }

  useEffect(() => {
    fetchTeam()
  }, [])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s !== '')

    const { error } = await supabase
      .from('profiles')
      .insert([{ full_name: fullName, role, skills: skillsArray }])

    if (!error) {
      setFullName(''); setRole(''); setSkills('');
      fetchTeam()
      router.refresh()
    } else {
      alert('ERROR: ' + error.message)
    }
    setLoading(false)
  }

  const deleteMember = async (id: number) => {
    if (!confirm('CONFIRM_DELETION?')) return
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (!error) fetchTeam()
  }

  return (
    <div className="p-8 bg-black min-h-screen text-white font-sans">
      <header className="mb-12 border-b-2 border-orange-500 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            ADMIN <span className="text-orange-500 text-2xl font-mono">_SQUAD_CONTROL</span>
          </h1>
          <p className="text-[10px] text-zinc-600 font-mono mt-2 tracking-[0.4em]">HUMAN_RESOURCES_MANAGEMENT // v1.0</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Form di aggiunta */}
        <div className="lg:col-span-1">
          <form onSubmit={handleAddMember} className="space-y-4 p-6 border-2 border-zinc-900 bg-zinc-950 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)]">
            <h2 className="text-lg font-black uppercase italic text-orange-500 mb-4 tracking-widest">_RECRUIT_NEW_MEMBER</h2>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-600 uppercase font-mono tracking-widest">Full_Name</label>
              <Input 
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="bg-black border-zinc-800 rounded-none focus:border-orange-500 uppercase font-bold"
                placeholder="NOME COGNOME"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-600 uppercase font-mono tracking-widest">Unit_Role</label>
              <Input 
                required
                value={role}
                onChange={e => setRole(e.target.value)}
                className="bg-black border-zinc-800 rounded-none focus:border-orange-500 uppercase font-bold"
                placeholder="ES: PRODUCER / EDITOR"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-600 uppercase font-mono tracking-widest">Skills (separate da virgola)</label>
              <Input 
                value={skills}
                onChange={e => setSkills(e.target.value)}
                className="bg-black border-zinc-800 rounded-none focus:border-orange-500 uppercase font-bold text-xs"
                placeholder="VIDEO, AUDIO, GRAFICA..."
              />
            </div>

            <Button disabled={loading} className="w-full bg-orange-500 hover:bg-white text-black font-black uppercase rounded-none py-6 transition-all">
              {loading ? 'SYNCING_DATABASE...' : 'REGISTRA_SOCIO'}
            </Button>
          </form>
        </div>

        {/* Lista soci esistenti */}
        <div className="lg:col-span-2">
          <div className="grid gap-4">
            {profiles.map((member) => (
              <div key={member.id} className="flex justify-between items-center p-4 border border-zinc-900 bg-zinc-950/50 hover:border-zinc-700 transition-all group">
                <div>
                  <h3 className="text-xl font-black uppercase italic leading-none">{member.full_name}</h3>
                  <p className="text-[10px] text-orange-500 font-mono uppercase tracking-widest mt-1">{member.role}</p>
                </div>
                
                <div className="flex gap-4 items-center">
                  <div className="hidden md:flex gap-1">
                    {member.skills?.slice(0, 3).map(s => (
                      <span key={s} className="text-[8px] bg-zinc-900 text-zinc-500 px-2 py-0.5 uppercase">{s}</span>
                    ))}
                  </div>
                  <button 
                    onClick={() => deleteMember(member.id)}
                    className="text-zinc-800 hover:text-red-500 transition-colors uppercase text-[10px] font-black"
                  >
                    [TERMINATE]
                  </button>
                </div>
              </div>
            ))}

            {profiles.length === 0 && (
              <p className="text-zinc-800 font-black uppercase tracking-widest text-center py-20 border-2 border-dashed border-zinc-900">
                NO_UNITS_LOGGED_IN_SYSTEM
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}