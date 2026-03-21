'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Smartphone, Globe, Sparkles, LogOut } from 'lucide-react';
import NewActivityForm from '@/components/NewActivityForm';
import FileUpload from '@/components/FileUpload';

export default function PlannerPage() {
  // 1. STATI (Le variabili che l'errore non trovava)
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. FUNZIONE CARICAMENTO DATI
  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('activities')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Errore fetch:", error);
    } else {
      setActivities(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // 3. FUNZIONE CAMBIO STATO (updateStatus)
  async function updateStatus(id: number, currentStatus: string) {
    const nextStatus = currentStatus === 'done' ? 'in_progress' : 'done';
    const { error } = await supabase
      .from('activities')
      .update({ status: nextStatus })
      .eq('id', id);
    
    if (!error) fetchData();
  }

  // 4. FUNZIONE VISIBILITÀ PUBBLICA (togglePublic)
  async function togglePublic(id: number, currentState: boolean) {
    const { error } = await supabase
      .from('activities')
      .update({ is_public: !currentState })
      .eq('id', id);
    
    if (!error) fetchData();
  }

  // 5. FUNZIONE GENERAZIONE AI
  async function generateAIPost(title: string, description: string) {
    try {
      const res = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      alert("BOZZA SOCIAL GENERATA:\n\n" + data.post);
    } catch (err) {
      alert("Errore AI: controlla la tua chiave Groq su Vercel.");
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-uttf-orange font-black italic animate-pulse tracking-widest text-2xl uppercase">
        Syncing_Factory_Systems...
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-12 min-h-screen bg-black text-white font-sans selection:bg-uttf-orange/30">
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-16 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
            UTTF <span className="text-uttf-orange">_PLANNER</span>
          </h1>
          <p className="text-[9px] font-mono text-zinc-600 mt-2 uppercase tracking-[0.4em]">Operations_Command_Center</p>
        </div>
        
        <button 
          onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
          className="glass-button p-3 rounded-full text-zinc-400 hover:text-red-500 transition-colors"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* COLONNA SINISTRA: FORM */}
        <aside className="lg:col-span-1">
          <div className="sticky top-12 space-y-8">
            <NewActivityForm />
            <div className="glass-card p-6 rounded-3xl border-uttf-orange/10">
              <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">Factory_Intel</h4>
              <p className="text-xs text-zinc-400 leading-relaxed uppercase">
                I task segnati come <span className="text-uttf-orange font-bold">"Sito: On"</span> verranno trasmessi automaticamente sul feed pubblico della landing page.
              </p>
            </div>
          </div>
        </aside>

        {/* COLONNA DESTRA: LISTA TASK */}
        <main className="lg:col-span-2 space-y-6">
          <AnimatePresence mode='popLayout'>
            {activities.map((activity) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={activity.id} 
                className={`glass-card p-8 rounded-[2.5rem] transition-all relative overflow-hidden border-t-2 ${
                  activity.status === 'done' 
                  ? 'border-green-500/40 bg-green-500/5 opacity-70' 
                  : 'border-uttf-orange/30 shadow-2xl'
                }`}
              >
                {/* ICONA STATO ANGOLO */}
                {activity.status === 'done' && (
                  <div className="absolute top-6 right-8 text-green-500">
                    <CheckCircle2 size={24} strokeWidth={3} />
                  </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-zinc-600 tracking-[0.3em] uppercase italic">
                      Entry_Log_#{activity.id}
                    </span>
                    <h3 className={`text-3xl font-black uppercase italic tracking-tighter transition-all leading-none ${
                      activity.status === 'done' ? 'text-zinc-600 line-through' : 'text-white'
                    }`}>
                      {activity.title}
                    </h3>
                  </div>
                  
                  <div className="flex gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => updateStatus(activity.id, activity.status)}
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all active:scale-95 ${
                        activity.status === 'done' 
                        ? 'bg-green-500 text-black' 
                        : 'bg-white text-black hover:bg-uttf-orange transition-colors'
                      }`}
                    >
                      {activity.status === 'done' ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                      {activity.status === 'done' ? 'Fatto' : 'Chiudi'}
                    </button>

                    <button 
                      onClick={() => generateAIPost(activity.title, activity.description)}
                      className="p-2 rounded-full glass-button text-uttf-orange"
                      title="Genera Post AI"
                    >
                      <Sparkles size={16} />
                    </button>

                    <button 
                      onClick={() => togglePublic(activity.id, activity.is_public)}
                      className={`p-2 rounded-full transition-all border ${
                        activity.is_public 
                        ? 'bg-uttf-orange border-uttf-orange text-black' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {activity.is_public ? <Globe size={16} /> : <Smartphone size={16} />}
                    </button>
                  </div>
                </div>

                <p className={`text-sm mb-10 font-medium transition-colors ${
                  activity.status === 'done' ? 'text-zinc-700' : 'text-zinc-400 leading-relaxed uppercase tracking-tight'
                }`}>
                  {activity.description || "Nessun dettaglio operativo fornito per questo log."}
                </p>

                <div className="flex justify-between items-center pt-6 border-t border-white/5 bg-white/[0.01] -mx-8 px-8 rounded-b-[2.5rem]">
                  <div className="flex flex-col">
                    <span className="text-[7px] text-zinc-600 font-bold uppercase tracking-[0.4em] mb-1">Operative_Lead</span>
                    <span className="text-[11px] font-black uppercase text-zinc-300 tracking-wider">
                      {activity.profiles?.full_name || 'FACTORY_ASSET'}
                    </span>
                  </div>
                  
                  <FileUpload activityId={activity.id} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {activities.length === 0 && (
            <div className="h-64 glass-card rounded-[2.5rem] border-dashed border-zinc-800 flex flex-col items-center justify-center space-y-4">
              <p className="text-zinc-700 font-mono text-[10px] uppercase tracking-[0.5em]">Awaiting_Mission_Data...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}