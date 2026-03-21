'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'

export default function NewActivityForm() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [profiles, setProfiles] = useState<Pick<Profile, 'id' | 'full_name'>[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function getProfiles() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name')
      if (data) setProfiles(data)
    }
    getProfiles()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('activities')
      .insert([
        { 
          title, 
          description, 
          status: 'draft', 
          deadline: deadline || null,
          assigned_to: assignedTo ? parseInt(assignedTo) : null,
          is_public: false
        }
      ])

    if (!error) {
      setTitle(''); setDescription(''); setDeadline(''); setAssignedTo('');
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-zinc-950 border-2 border-orange-500 shadow-[4px_4px_0px_0px_rgba(249,115,22,1)] relative z-20">
      <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">
        _NEW <span className="text-orange-500 font-mono">_TASK</span>
      </h3>
      
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 font-mono tracking-widest">Titolo_Attività</label>
        <Input 
          required
          placeholder="Esempio: Recording Session" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-black border-zinc-800 text-white rounded-none focus:border-orange-500 uppercase font-bold"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 font-mono">Deadline</label>
          <Input 
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="bg-black border-zinc-800 text-white rounded-none focus:border-orange-500 appearance-none"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 font-mono">Assegna_A</label>
          <select 
            value={assignedTo} 
            onChange={e => setAssignedTo(e.target.value)}
            className="w-full h-10 bg-black border-2 border-zinc-800 text-white text-[10px] px-2 font-black uppercase focus:border-orange-500 outline-none appearance-none cursor-pointer"
          >
            <option value="">-- SELEZIONA --</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id.toString()}>{p.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 font-mono">Dettagli_Operativi</label>
        <Textarea 
          placeholder="Descrizione tecnica del task..." 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-black border-zinc-800 text-white rounded-none focus:border-orange-500 min-h-[80px]"
        />
      </div>

      <Button 
        type="submit" 
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-white text-black font-black uppercase rounded-none transition-all py-6"
      >
        {loading ? 'SYSTEM_SYNC...' : 'ESEGUI_ORDINE'}
      </Button>
    </form>
  )
}