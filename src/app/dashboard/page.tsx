'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Send, LogOut, Image as ImageIcon, Layers, Loader2, ChevronRight, Sparkles, FileText, ArrowLeft, CalendarDays, Users, Download
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Planner from '@/components/Planner';
import CalendarWidget from '@/components/CalendarWidget';
import NotesManager from '@/components/NotesManager'; 
import AccountSettings from '@/components/AccountSettings';

export default function Dashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'menu' | 'publish' | 'notes' | 'planner' | 'newsletter'>('menu');
  const [subscribers, setSubscribers] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserEmail(user.email ?? null);
      setLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (activeView === 'newsletter') fetchSubscribers();
  }, [activeView]);

  async function fetchSubscribers() {
    const { data } = await supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });
    if (data) setSubscribers(data);
  }

  const exportCSV = () => {
    const headers = ['Data', 'Nome', 'Email', 'Telefono'];
    const rows = subscribers.map(s => [new Date(s.created_at).toLocaleDateString(), s.name, s.email, s.phone]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'iscritti_newsletter.csv';
    link.click();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-mono text-[#FF914D]">SYNCING_CORE...</div>;

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col font-sans">
      <header className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex flex-col">
          <h1 className="text-xl font-black italic tracking-tighter uppercase">UTTF_<span className="text-[#FF914D]">HUB</span></h1>
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">{userEmail}</span>
        </div>
        <div className="flex items-center gap-2">
          <AccountSettings />
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="p-2 text-zinc-500 hover:text-[#FF914D] transition-colors"><LogOut size={20} /></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-10">
        {activeView === 'menu' ? (
          <div className="max-w-3xl mx-auto flex flex-col gap-8 mt-6">
            <CalendarWidget />
            <div className="flex flex-col gap-4">
              <button onClick={() => setActiveView('newsletter')} className="w-full group p-8 bg-zinc-900/20 backdrop-blur-md border border-white/5 rounded-3xl flex items-center justify-between hover:border-[#FF914D]/30 transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5"><Users size={24} className="text-zinc-500 group-hover:text-[#FF914D] transition-colors" /></div>
                  <div className="text-left"><h3 className="text-sm font-black uppercase italic tracking-widest">ISCRITTI NEWSLETTER</h3><p className="text-[10px] font-mono text-zinc-600 uppercase mt-1.5">Database contatti</p></div>
                </div>
                <ChevronRight size={20} className="text-zinc-700" />
              </button>
              
              <button onClick={() => setActiveView('planner')} className="w-full group p-8 bg-zinc-900/20 backdrop-blur-md border border-white/5 rounded-3xl flex items-center justify-between hover:border-[#FF914D]/30 transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5"><CalendarDays size={24} className="text-zinc-500 group-hover:text-[#FF914D] transition-colors" /></div>
                  <div className="text-left"><h3 className="text-sm font-black uppercase italic tracking-widest">PLANNER ATTIVITÀ</h3><p className="text-[10px] font-mono text-zinc-600 uppercase mt-1.5">Gestione Task</p></div>
                </div>
                <ChevronRight size={20} className="text-zinc-700" />
              </button>
              {/* Altri pulsanti... */}
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            <button onClick={() => setActiveView('menu')} className="self-start flex items-center gap-2 px-4 py-2.5 bg-black/40 backdrop-blur-md border border-white/5 rounded-xl text-[10px] uppercase font-mono tracking-widest"><ArrowLeft size={14} /> Torna Indietro</button>
            {activeView === 'newsletter' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-zinc-900/20 backdrop-blur-md p-6 rounded-3xl border border-white/5">
                  <h2 className="text-sm font-black uppercase italic text-[#FF914D]">DATABASE NEWSLETTER</h2>
                  <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-[#FF914D] text-black rounded-xl font-black text-[10px] uppercase"><Download size={14} /> ESPORTA CSV</button>
                </div>
                <div className="grid gap-3">
                  {subscribers.map((sub, i) => (
                    <div key={i} className="p-4 bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl flex justify-between items-center">
                      <div className="flex flex-col"><span className="text-sm font-bold uppercase">{sub.name}</span><span className="text-xs font-mono text-zinc-500">{sub.email}</span></div>
                      <span className="text-xs font-mono text-[#FF914D]">{sub.phone}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeView === 'planner' && <Planner />}
            {activeView === 'notes' && <NotesManager />}
          </div>
        )}
      </main>
    </div>
  );
}