'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Send, LogOut, Image as ImageIcon, 
  Layers, Loader2, ChevronRight, Sparkles, FileText 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Planner from '@/components/Planner';
import CalendarWidget from '@/components/CalendarWidget';
import NotesManager from '@/components/NotesManager'; 

export default function Dashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.replace('/login');
          return;
        }
        setUserEmail(user.email ?? null);
      } catch (err) {
        console.error("DASHBOARD_INIT_ERROR:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

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
        description: description,
        image_url: publicUrl 
      }]);
      if (dbErr) throw dbErr;
      setTitle(''); setDescription(''); setFile(null); setPreviewUrl(null);
      alert("PUSH_SUCCESSFUL");
    } catch (err: any) {
      alert("ERROR: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono">
      <Loader2 className="animate-spin text-[#FF914D] mb-4" size={32} />
      <span className="text-[#FF914D] animate-pulse uppercase tracking-[0.4em] text-[10px]">Core_Syncing...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      <header className="h-20 border-b border-white/5 bg-black flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex flex-col">
          <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">UTTF_<span className="text-[#FF914D]">HUB</span></h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest truncate max-w-[150px]">{userEmail}</span>
          </div>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="p-2 text-white hover:text-[#FF914D] transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          
          {/* 1. SEZIONE PLANNER & CALENDARIO (In alto) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <Planner isAdmin={true} />
            </div>
            <div className="lg:col-span-5">
              <CalendarWidget isAdmin={true} />
            </div>
          </div>

          <hr className="border-white/5" />

          {/* 2. SEZIONE TESTI & APPUNTI (Al centro) */}
          <div className="max-w-3xl mx-auto w-full space-y-4">
            <button 
              onClick={() => setShowNotes(!showNotes)}
              className="w-full group p-6 bg-zinc-900/20 border border-white/5 rounded-3xl flex items-center justify-between hover:bg-white/[0.02] transition-all hover:border-[#FF914D]/30 shadow-lg shadow-black/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-[#FF914D]/50 transition-all">
                  <FileText size={20} className="text-zinc-500 group-hover:text-[#FF914D]" />
                </div>
                <div className="text-left">
                  <h3 className="text-[10px] font-black uppercase italic tracking-widest text-white">Testi_&_Appunti</h3>
                  <p className="text-[8px] font-mono text-zinc-600 uppercase mt-1">Gestisci rime, note e allegati</p>
                </div>
              </div>
              <div className={`transition-transform duration-300 ${showNotes ? 'rotate-90' : ''}`}>
                <ChevronRight size={18} className="text-zinc-800 group-hover:text-[#FF914D]" />
              </div>
            </button>

            {showNotes && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <NotesManager />
              </div>
            )}
          </div>

          <hr className="border-white/5" />

          {/* 3. SEZIONE OUTPUT & PUBBLICAZIONE (In basso) */}
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {/* Pulsante Published Outputs */}
            <button onClick={() => router.push('/dashboard/outputs')} className="w-full group p-6 bg-zinc-900/20 border border-white/5 rounded-3xl flex items-center justify-between hover:bg-white/[0.02] transition-all hover:border-[#FF914D]/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-[#FF914D]/50 transition-colors">
                  <Layers size={20} className="text-zinc-500 group-hover:text-[#FF914D]" />
                </div>
                <div className="text-left">
                  <h3 className="text-[10px] font-black uppercase italic tracking-widest">Published_Outputs</h3>
                  <p className="text-[8px] font-mono text-zinc-600 uppercase mt-1">Manage_and_Delete_Assets</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-800 group-hover:text-[#FF914D] group-hover:translate-x-1 transition-all" />
            </button>

            {/* Box New Output Unit */}
            <div className="glass-panel p-6 border-white/5 bg-zinc-900/20 rounded-3xl">
              <h2 className="text-[10px] font-black uppercase italic mb-6 text-[#FF914D] flex items-center gap-2">
                <Send size={14} /> New_Output_Unit
              </h2>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <input type="text" placeholder="UNIT_TITLE" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-[10px] uppercase text-white outline-none focus:border-[#FF914D]/40" />
                <div className="relative group">
                  <textarea placeholder="DESCRIPTION_DRAFT..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-black/40 border border-white/5 p-4 pr-12 rounded-xl font-mono text-[10px] min-h-[100px] text-white outline-none resize-none focus:border-[#FF914D]/40" />
                  <button type="button" onClick={handleAiEnhance} disabled={isAiProcessing || !description} className="absolute right-3 bottom-3 p-2 bg-zinc-800 hover:bg-[#FF914D] text-white rounded-lg transition-all disabled:opacity-30">
                    {isAiProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  </button>
                </div>
                <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.02] relative overflow-hidden group transition-all">
                  {previewUrl ? <img src={previewUrl} className="h-full w-full object-cover opacity-60" /> : <ImageIcon size={28} className="text-zinc-700 group-hover:text-zinc-400" />}
                  <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f){ setFile(f); setPreviewUrl(URL.createObjectURL(f)); }}} />
                </label>
                <button type="submit" disabled={uploading} className="w-full py-4 bg-white text-black text-[10px] font-black uppercase italic hover:bg-[#FF914D] transition-all disabled:opacity-50">
                  {uploading ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'PUSH_TO_FACTORY'}
                </button>
              </form>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
