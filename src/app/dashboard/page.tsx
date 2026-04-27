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
import type { Review } from '@/types/database';

export default function Dashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'menu' | 'publish' | 'notes' | 'planner' | 'newsletter' | 'reviews'>('menu');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

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
    if (activeView === 'reviews') fetchReviews();
  }, [activeView]);

  async function fetchSubscribers() {
    const { data } = await supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });
    if (data) setSubscribers(data);
  }

  async function fetchReviews() {
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (data) setReviews(data);
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

  async function handleDeleteReview(id: number) {
    if (!confirm('ELIMINARE_REVIEW?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) {
      alert(`ERRORE_CANCELLAZIONE_REVIEW: ${error.message}`);
      return;
    }
    setReviews((current) => current.filter((review) => review.id !== id));
  }

  async function handleAiEnhance() {
    if (!description) return;
    setIsAiProcessing(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            { role: "system", content: "Sei un assistente tecnico per UTTF. Trasforma i testi in descrizioni professionali, sintetiche e cyber-industrial." },
            { role: "user", content: `Ottimizza questa descrizione: ${description}` }
          ]
        })
      });
      const data = await response.json();
      if (data.choices?.[0]?.message?.content) setDescription(data.choices[0].message.content);
    } catch (err) {
      alert("AI_OFFLINE");
    } finally {
      setIsAiProcessing(false);
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return alert("MISSING_DATA");
    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('factory-assets').upload(`publications/${fileName}`, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('factory-assets').getPublicUrl(`publications/${fileName}`);
      const { error: dbErr } = await supabase.from('publications').insert([{
        title: title.toUpperCase(),
        description,
        image_url: publicUrl
      }]);
      if (dbErr) throw dbErr;
      setTitle('');
      setDescription('');
      setFile(null);
      setPreviewUrl(null);
      alert("PUSH_SUCCESSFUL");
    } catch (err: any) {
      alert("ERROR: " + err.message);
    } finally {
      setUploading(false);
    }
  }

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
              <button onClick={() => setActiveView('publish')} className="w-full group p-8 bg-zinc-900/20 backdrop-blur-md border border-white/5 rounded-3xl flex items-center justify-between hover:border-[#FF914D]/30 transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5"><Layers size={24} className="text-zinc-500 group-hover:text-[#FF914D] transition-colors" /></div>
                  <div className="text-left"><h3 className="text-sm font-black uppercase italic tracking-widest">GESTIONE POST</h3><p className="text-[10px] font-mono text-zinc-600 uppercase mt-1.5">Pubblica e gestisci i contenuti</p></div>
                </div>
                <ChevronRight size={20} className="text-zinc-700" />
              </button>

              <button onClick={() => setActiveView('notes')} className="w-full group p-8 bg-zinc-900/20 backdrop-blur-md border border-white/5 rounded-3xl flex items-center justify-between hover:border-[#FF914D]/30 transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5"><FileText size={24} className="text-zinc-500 group-hover:text-[#FF914D] transition-colors" /></div>
                  <div className="text-left"><h3 className="text-sm font-black uppercase italic tracking-widest">NOTE & APPUNTI</h3><p className="text-[10px] font-mono text-zinc-600 uppercase mt-1.5">Gestisci rime, note e allegati</p></div>
                </div>
                <ChevronRight size={20} className="text-zinc-700" />
              </button>

              <button onClick={() => setActiveView('newsletter')} className="w-full group p-8 bg-zinc-900/20 backdrop-blur-md border border-white/5 rounded-3xl flex items-center justify-between hover:border-[#FF914D]/30 transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5"><Users size={24} className="text-zinc-500 group-hover:text-[#FF914D] transition-colors" /></div>
                  <div className="text-left"><h3 className="text-sm font-black uppercase italic tracking-widest">ISCRITTI NEWSLETTER</h3><p className="text-[10px] font-mono text-zinc-600 uppercase mt-1.5">Database contatti</p></div>
                </div>
                <ChevronRight size={20} className="text-zinc-700" />
              </button>

              <button onClick={() => setActiveView('reviews')} className="w-full group p-8 bg-zinc-900/20 backdrop-blur-md border border-white/5 rounded-3xl flex items-center justify-between hover:border-[#FF914D]/30 transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5"><FileText size={24} className="text-zinc-500 group-hover:text-[#FF914D] transition-colors" /></div>
                  <div className="text-left"><h3 className="text-sm font-black uppercase italic tracking-widest">RECENSIONI PUBBLICHE</h3><p className="text-[10px] font-mono text-zinc-600 uppercase mt-1.5">Controlla ed elimina le review</p></div>
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

                      {/* IL LOGO SOTTO I BOTTONI */}
          <div className="flex justify-center mb-16 md:mb-20 px-4">
            <motion.img 
              src="/icons/homelogo.png" 
              alt="UTTF Home Logo" 
              className="w-full max-w-[300px] sm:max-w-[400px] md:max-w-[600px] aspect-square object-contain rounded-full" 
              animate={{
                scale: [1, 1.02, 1],
                opacity: [0.85, 1, 0.85],
                boxShadow: [
                  "0 0 0px 0px rgba(255, 145, 77, 0)",
                  "0 0 60px 20px rgba(255, 145, 77, 0.15)",
                  "0 0 0px 0px rgba(255, 145, 77, 0)"
                ]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>

          </div>
        ) : (
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            <button onClick={() => setActiveView('menu')} className="self-start flex items-center gap-2 px-4 py-2.5 bg-black/40 backdrop-blur-md border border-white/5 rounded-xl text-[10px] uppercase font-mono tracking-widest"><ArrowLeft size={14} /> Torna Indietro</button>
            {activeView === 'publish' && (
              <div className="max-w-3xl mx-auto w-full space-y-6">
                <button onClick={() => router.push('/dashboard/outputs')} className="w-full group p-6 bg-zinc-900/20 border border-white/5 rounded-3xl flex items-center justify-between hover:bg-white/[0.02] transition-all hover:border-[#FF914D]/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-[#FF914D]/50 transition-colors">
                      <Layers size={20} className="text-zinc-500 group-hover:text-[#FF914D]" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-[10px] font-black uppercase italic tracking-widest">POST PUBBLICATI</h3>
                      <p className="text-[8px] font-mono text-zinc-600 uppercase mt-1">Visualizza e cancella i post sul sito</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-zinc-800 group-hover:text-[#FF914D] group-hover:translate-x-1 transition-all" />
                </button>

                <div className="glass-panel p-6 border-white/5 bg-zinc-900/20 rounded-3xl">
                  <h2 className="text-[10px] font-black uppercase italic mb-6 text-[#FF914D] flex items-center gap-2">
                    <Send size={14} /> CREA POST DA PUBBLICARE
                  </h2>
                  <form onSubmit={handleCreatePost} className="space-y-4">
                    <input type="text" placeholder="TITOLO" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-[10px] uppercase text-white outline-none focus:border-[#FF914D]/40" />
                    <div className="relative group">
                      <textarea placeholder="DESCRIZIONE..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-black/40 border border-white/5 p-4 pr-12 rounded-xl font-mono text-[10px] min-h-[100px] text-white outline-none resize-none focus:border-[#FF914D]/40" />
                      <button type="button" onClick={handleAiEnhance} disabled={isAiProcessing || !description} className="absolute right-3 bottom-3 p-2 bg-zinc-800 hover:bg-[#FF914D] text-white rounded-lg transition-all disabled:opacity-30">
                        {isAiProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      </button>
                    </div>
                    <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.02] relative overflow-hidden group transition-all">
                      {previewUrl ? <img src={previewUrl} className="h-full w-full object-cover opacity-60" /> : <ImageIcon size={28} className="text-zinc-700 group-hover:text-zinc-400" />}
                      <input type="file" className="hidden" onChange={(e) => { const selectedFile = e.target.files?.[0]; if (selectedFile) { setFile(selectedFile); setPreviewUrl(URL.createObjectURL(selectedFile)); } }} />
                    </label>
                    <button type="submit" disabled={uploading} className="w-full py-4 bg-white text-black text-[10px] font-black uppercase italic hover:bg-[#FF914D] transition-all disabled:opacity-50">
                      {uploading ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'PUSH_TO_FACTORY'}
                    </button>
                  </form>
                </div>
              </div>
            )}

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
            {activeView === 'reviews' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-zinc-900/20 backdrop-blur-md p-6 rounded-3xl border border-white/5">
                  <h2 className="text-sm font-black uppercase italic text-[#FF914D]">DATABASE RECENSIONI</h2>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">{reviews.length} review</span>
                </div>
                <div className="grid gap-3">
                  {reviews.length > 0 ? reviews.map((review) => (
                    <div key={review.id} className="p-4 bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold uppercase">{review.author_name}</span>
                        <span className="text-xs font-mono text-[#FF914D]">{review.rating * 2}/10</span>
                        <p className="text-sm text-zinc-300 leading-relaxed">{review.comment}</p>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">{new Date(review.created_at).toLocaleDateString('it-IT')}</span>
                      </div>
                      <button onClick={() => handleDeleteReview(review.id)} className="self-start px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black uppercase text-red-400 hover:bg-red-500/20 transition-all">
                        Elimina
                      </button>
                    </div>
                  )) : (
                    <div className="p-4 bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl">
                      <span className="text-xs font-mono text-zinc-500 uppercase">Nessuna recensione presente.</span>
                    </div>
                  )}
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
