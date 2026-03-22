'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar as CalendarIcon, Trash2, Loader2, AlertTriangle } from 'lucide-react';

export default function CalendarWidget({ isAdmin }: { isAdmin: boolean }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State per nuova scadenza
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const today = startOfDay(new Date());

  useEffect(() => {
    fetchActivities();
  }, []);

  async function fetchActivities() {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .not('deadline', 'is', null)
      .order('deadline', { ascending: true });
    setActivities(data || []);
    setLoading(false);
  }

  async function addDeadline(e: React.FormEvent) {
    e.preventDefault();
    setIsAdding(true);
    const { error } = await supabase
      .from('activities')
      .insert([{ 
        title: title.toUpperCase(), 
        deadline: date,
        status: 'pending'
      }]);
    
    if (!error) {
      setTitle(''); setDate(''); fetchActivities();
    }
    setIsAdding(false);
  }

  async function deleteDeadline(id: string) {
    if (!confirm("TERMINARE_SCADENZA? L'azione è irreversibile.")) return;
    await supabase.from('activities').delete().eq('id', id);
    fetchActivities();
  }

  return (
    <div className="glass-panel p-8 md:p-12 border-white/5 h-full">
      {/* HEADER ORIGINALE STILE UTTF */}
      <header className="mb-10 border-b-4 border-orange-600 pb-4 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">
            UTTF_<span className="text-orange-600">DEADLINES</span>
          </h2>
          <p className="text-zinc-500 font-mono text-[9px] mt-2 uppercase tracking-[0.3em]">Scheduler // Timeline_Control</p>
        </div>
        <CalendarIcon className="text-zinc-800" size={32} strokeWidth={1.5} />
      </header>

      {/* FORM AGGIUNTA (Solo Admin) */}
      {isAdmin && (
        <form onSubmit={addDeadline} className="mb-12 p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
          <input 
            type="text" placeholder="SCADENZA_OPERATIVA" value={title}
            onChange={(e) => setTitle(e.target.value)} required
            className="w-full bg-black/40 border border-white/10 p-3 rounded-lg font-mono text-[10px] uppercase outline-none focus:border-orange-600"
          />
          <div className="flex gap-2">
            <input 
              type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              className="flex-1 bg-black/40 border border-white/10 p-3 rounded-lg font-mono text-[10px] uppercase outline-none text-zinc-400"
            />
            <button type="submit" disabled={isAdding} className="btn-urban px-6 text-[10px] justify-center italic font-black">
              {isAdding ? <Loader2 className="animate-spin" size={16} /> : 'INJECT'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-12">
        {/* SCADENZE IMMINENTI */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-orange-600 mb-6 flex items-center">
            <span className="w-2 h-2 bg-orange-600 mr-3 animate-ping rounded-full"></span>
            Critical_Upcoming
          </h3>
          <div className="space-y-3 text-left">
            {activities?.filter(a => isAfter(new Date(a.deadline!), today)).map((activity) => (
              <div key={activity.id} className="p-4 border-l-4 border-orange-600 bg-white/5 hover:bg-white/10 transition-all flex justify-between items-center group">
                <div>
                  <p className="text-[9px] font-mono text-orange-600/70 uppercase mb-1">
                    {format(new Date(activity.deadline!), "eeee d MMMM", { locale: it })}
                  </p>
                  <h4 className="text-md font-black uppercase italic tracking-tight text-white">{activity.title}</h4>
                </div>
                {isAdmin && (
                  <button onClick={() => deleteDeadline(activity.id)} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 transition-all">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* STORICO */}
        <section className="opacity-30">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-600 mb-6">
            Past_Activities
          </h3>
          <div className="space-y-2 text-left">
             {activities?.filter(a => isBefore(new Date(a.deadline!), today)).map((activity) => (
              <div key={activity.id} className="p-3 border-l-4 border-zinc-900 bg-zinc-950 flex justify-between items-center">
                <div>
                  <p className="text-[8px] font-mono uppercase text-zinc-600">
                     {format(new Date(activity.deadline!), "d MMM yyyy", { locale: it })}
                  </p>
                  <h4 className="text-xs font-bold uppercase line-through text-zinc-500">{activity.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}