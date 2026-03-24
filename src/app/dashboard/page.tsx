'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Send, LogOut, Image as ImageIcon, 
  Layers, Trash2, Loader2, Users, Edit3, X 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Planner from '@/components/Planner';
import CalendarWidget from '@/components/CalendarWidget';

export default function Dashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const MASTER_ADMIN = 'ass.uttf@gmail.com';

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserEmail(user.email ?? null);
      fetchMyPosts();
      if (user.email === MASTER_ADMIN) fetchStaff();
      setLoading(false);
    }
    init();
  }, [router]);

  async function fetchStaff() {
    const { data } = await supabase.from('authorized_users').select('*').order('created_at', { ascending: false });
    setStaffList(data || []);
  }

  async function fetchMyPosts() {
    const { data } = await supabase.from('publications').select('*').order('created_at', { ascending: false });
    setMyPosts(data || []);
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return;
    setUploading(true);
    const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
    await supabase.storage.from('factory-assets').upload(`publications/${fileName}`, file);
    const { data: { publicUrl } } = supabase.storage.from('factory-assets').getPublicUrl(`publications/${fileName}`);
    await supabase.from('publications').insert([{ title: title.toUpperCase(), content: description, image_url: publicUrl }]);
    setTitle(''); setDescription(''); setFile(null); setPreviewUrl(null);
    fetchMyPosts();
    setUploading(false);
  }

  async function handleDeletePost(id: string, imageUrl: string) {
    if (!confirm("DELETE_OUTPUT?")) return;
    const fileName = imageUrl.split('/').pop();
    if (fileName) await supabase.storage.from('factory-assets').remove([`publications/${fileName}`]);
    await supabase.from('publications').delete().eq('id', id);
    fetchMyPosts();
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-[#FF914D] animate-pulse">CONNECTING_SYSTEM...</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      
      {/* HEADER PROFESSIONAL */}
      <header className="h-16 border-b border-white/5 bg-zinc-950 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black italic tracking-tighter uppercase">UTTF_<span className="text-[#FF914D]">CORE</span></h1>
          <div className="h-4 w-[1px] bg-white/10 mx-2" />
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{userEmail}</span>
        </div>
        <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="p-2 text-zinc-500 hover:text-red-500 transition-all">
          <LogOut size={18} />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* MAIN BOARD */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#050505]">
          
          {/* SEZIONE ALTA: STAFF & UPLOAD */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* QUICK PUSH */}
             <div className="glass-panel p-6 border-white/5">
                <h2 className="text-[10px] font-black uppercase italic mb-6 text-[#FF914D] tracking-widest flex items-center gap-2">
                  <Send size={14} /> New_Output_Unit
                </h2>
                <form onSubmit={handleCreatePost} className="space-y-3">
                  <input type="text" placeholder="TITLE" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-white/5 border border-white/5 p-3 rounded font-mono text-[10px] uppercase outline-none focus:border-[#FF914D]/30" />
                  <label className="flex flex-col items-center justify-center h-24 border border-dashed border-white/10 rounded cursor-pointer hover:bg-white/5 transition-all">
                    {previewUrl ? <img src={previewUrl} className="h-full w-full object-cover opacity-30" /> : <ImageIcon size={16} className="text-zinc-700" />}
                    <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f){ setFile(f); setPreviewUrl(URL.createObjectURL(f)); }}} />
                  </label>
                  <button type="submit" disabled={uploading} className="w-full py-3 bg-white text-black text-[9px] font-black uppercase italic tracking-widest">
                    {uploading ? 'UPLOADING...' : 'PUSH_TO_SYSTEM'}
                  </button>
                </form>
             </div>

             {/* STAFF LIST (IF ADMIN) */}
             {userEmail === MASTER_ADMIN && (
               <div className="glass-panel p-6 border-white/5 overflow-hidden flex flex-col">
                  <h2 className="text-[10px] font-black uppercase italic mb-6 text-white tracking-widest flex items-center gap-2">
                    <Users size={14} /> Team_Directory
                  </h2>
                  <div className="space-y-2 overflow-y-auto max-h-40 pr-2 custom-scrollbar">
                    {staffList.map(s => (
                      <div key={s.id} className="p-2 bg-white/5 border border-white/5 rounded flex justify-between items-center">
                        <span className="text-[9px] font-mono text-zinc-400">{s.email}</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                      </div>
                    ))}
                  </div>
               </div>
             )}
          </div>

          {/* MONDAY TABLE (PLANNER) */}
          <Planner isAdmin={userEmail === MASTER_ADMIN} />

          {/* CALENDAR */}
          <CalendarWidget isAdmin={userEmail === MASTER_ADMIN} />
        </main>

        {/* RIGHT SIDEBAR (LOGS) */}
        <aside className="w-72 border-l border-white/5 bg-zinc-950 hidden xl:flex flex-col p-6">
           <h2 className="text-[10px] font-black uppercase italic mb-8 text-zinc-500 tracking-[0.3em] flex items-center gap-2">
             <Layers size={14} /> Live_Logs
           </h2>
           <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {myPosts.map(post => (
                <div key={post.id} className="group relative bg-white/[0.02] p-2 rounded-lg border border-white/5">
                  <img src={post.image_url} className="w-full h-20 object-cover rounded opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                  <div className="mt-2">
                    <p className="text-[9px] font-black uppercase italic truncate">{post.title}</p>
                    <button onClick={() => handleDeletePost(post.id, post.image_url)} className="absolute top-4 right-4 p-1 bg-black text-red-500 opacity-0 group-hover:opacity-100 rounded">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
           </div>
        </aside>
      </div>
    </div>
  );
}