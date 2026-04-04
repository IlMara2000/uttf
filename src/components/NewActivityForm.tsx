'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

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
    if (!title) return
    
    setLoading(true)

    try {
      const { error } = await supabase
        .from('activities')
        .insert([
          { 
            title: title.toUpperCase(), // Forza maiuscolo stile UTTF
            description, 
            status: 'draft', 
            deadline: deadline || null,
            // Gli ID profilo sono UUID, quindi passiamo direttamente la stringa
            assigned_to: assignedTo || null, 
            is_public: false
          }
        ])

      if (error) throw error

      // Reset form
      setTitle('')
      setDescription('')
      setDeadline('')
      setAssignedTo('')
      
      // Notifica al Calendario di fare un nuovo fetch unificato
      window.dispatchEvent(new Event('refreshCalendar'))
      
      router.refresh()
      alert("ATTIVITÀ_INSERITA_CORRETTAMENTE")
    } catch (err: any) {
      alert("ERRORE_SISTEMA: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-zinc-950 border-2 border-[#FF914D] shadow-[4px_4px_0px_0px_#FF914D] relative z-20 font-sans">
      <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">
        _NEW <span className="text-[#FF914D] font-mono">_ACTIVITY</span>
      </h3>
      
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 font-mono tracking-widest">Titolo_Attività</label>
        <Input 
          required
          placeholder="Esempio: RECORDING_SESSION" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-black border-zinc-800 text-white rounded-none focus:border-[#FF914D] focus:ring-0 uppercase font-bold text-xs h-12"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 font-mono tracking-widest">Deadline</label>
          <Input 
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="bg-black border-zinc-800 text-white rounded-none focus:border-[#FF914D] focus:ring-0 appearance-none text-xs h-12"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 font-mono tracking-widest">Assegna_A</label>
          <div className="relative">
            <select 
              value={assignedTo} 
              onChange={e => setAssignedTo(e.target.value)}
              className="w-full h-12 bg-black border border-zinc-800 text-white text-[10px] px-3 font-black uppercase focus:border-[#FF914D] outline-none appearance-none cursor-pointer hover:bg-zinc-900 transition-colors"
            >
              <option value="">-- SELEZIONA --</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#FF914D] text-[8px]">▼</div>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 font-mono tracking-widest">Dettagli_Operativi</label>
        <Textarea 
          placeholder="Descrizione tecnica del task..." 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-black border-zinc-800 text-white rounded-none focus:border-[#FF914D] focus:ring-0 min-h-[100px] text-xs resize-none"
        />
      </div>

      <Button 
        type="submit" 
        disabled={loading}
        className="w-full bg-[#FF914D] hover:bg-white text-black font-black uppercase rounded-none transition-all py-8 text-sm group"
      >
        {loading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <span className="flex items-center gap-2">
            ESEGUI_ORDINE <span className="opacity-0 group-hover:opacity-100 transition-opacity">>></span>
          </span>
        )}
      </Button>
    </form>
  )
}
