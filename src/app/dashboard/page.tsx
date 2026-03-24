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
    if (!file || !title) return alert("Inserisci titolo e immagine");
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `publications/${fileName}`;

      // 1. Upload su bucket 'factory-assets'
      const { error: uploadError } = await supabase.storage
        .from('factory-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Ottieni URL pubblico
      const { data: { publicUrl } } = supabase.storage
        .from('factory-assets')
        .getPublicUrl(filePath);

      // 3. Salva in 'publications' (per il feed)
      const { error: insertError } = await supabase
        .from('publications')
        .insert([{ 
          title: title.toUpperCase(), 
          content: description, 
          image_url: publicUrl,
          created_at: new Date()
        }]);

      if (insertError) throw insertError;

      // OPZIONALE: Salva anche in 'media_storage' per coerenza con l'altro componente
      await supabase.from('media_storage').insert([{
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type
      }]);

      setTitle(''); setDescription(''); setFile(null); setPreviewUrl(null);
      fetchMyPosts();
      alert("UNIT_PUBLISHED");

    } catch (err: any) {
      alert("UPLOAD_ERROR: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeletePost(id: string, imageUrl: string) {
    if (!confirm("DELETE_OUTPUT?")) return;
    try {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('factory-assets').remove([`publications/${fileName}`]);
      }
      await supabase.from('publications').delete().eq('id', id);
      fetchMyPosts();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-[#FF914D] animate-pulse uppercase">Connecting_To_Core...</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      
      <header className="h-16 border-b border-white/5 bg-zinc-950 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black italic tracking-tighter uppercase">UTTF_<span className="text-[#FF914D]">HUB</span></h1>
          <div className="h-4 w-[1px] bg-white/10 mx-2" />
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{userEmail}</span>
        </div>
        <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="p-2 text-zinc-500 hover:text-red-500 transition-all">
          <LogOut size={18} />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#050505]">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="glass-panel p-6 border-white/5 bg-zinc-900/20">
                <h2 className="text-[10px] font-black uppercase italic mb-6 text-[#FF914D] tracking-widest flex items-center gap-2">
                  <Send size={14} /> New_Output_Unit
                </h2>
                <form onSubmit={handleCreatePost} className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="TITLE" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="w-full bg-black/40 border border-white/5 p-3 rounded font-mono text-[10px] uppercase outline-none focus:border-[#FF914D]/30 text-white" 
                  />
                  <label className="flex flex-col items-center justify-center h-24 border border-dashed border-white/10 rounded cursor-pointer hover:bg-white/5 transition-all relative overflow-hidden">
                    {previewUrl ? (
                      <img src={previewUrl} className="h-full w-full object-cover opacity-50" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <ImageIcon size={16} className="text-zinc-700" />
                        <span className="text-[8px] font-mono text-zinc-600">SELECT_FILE</span>
                      </div>
                    )}
                    <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f){ setFile(f); setPreviewUrl(URL.createObjectURL(f)); }}} />
                  </label>
                  <button type="submit" disabled={uploading} className="w-full py-3 bg-white text-black text-[9px] font-black uppercase italic tracking-widest hover:bg-[#FF914D] transition-all disabled:opacity-50">
                    {uploading ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'PUSH_TO_SYSTEM'}
                  </button>
                </form>
             </div>

             {userEmail === MASTER_ADMIN && (
               <div className="glass-panel p-6 border-white/5 overflow-hidden flex flex-col bg-zinc-900/20">
                  <h2 className="text-[10px] font-black uppercase italic mb-6 text-white tracking-widest flex items-center gap-2">
                    <Users size={14} /> Team_Directory
                  </h2>
                  <div className="space-y-2 overflow-y-auto max-h-40 pr-2 custom-scrollbar">
                    {staffList.map(s => (
                      <div key={s.id} className="p-2 bg-white/5 border border-white/5 rounded flex justify-between items-center group">
                        <span className="text-[9px] font-mono text-zinc-400 group-hover:text-white transition-colors">{s.email}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                      </div>
                    ))}
                  </div>
               </div>
             )}
          </div>

          <Planner isAdmin={userEmail === MASTER_ADMIN} />
          <CalendarWidget isAdmin={userEmail === MASTER_ADMIN} />
        </main>

        <aside className="w-72 border-l border-white/5 bg-zinc-950 hidden xl:flex flex-col p-6">
           <h2 className="text-[10px] font-black uppercase italic mb-8 text-zinc-500 tracking-[0.3em] flex items-center gap-2">
             <Layers size={14} /> Live_Logs
           </h2>
           <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {myPosts.map(post => (
                <div key={post.id} className="group relative bg-zinc-900/40 p-2 rounded-lg border border-white/5 hover:border-[#FF914D]/30 transition-all">
                  <div className="aspect-video w-full overflow-hidden rounded bg-black mb-2">
                    <img 
                      src={post.image_url} 
                      className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" 
                    />
                  </div>
                  <div className="flex justify-between items-start">
                    <p className="text-[9px] font-black uppercase italic truncate text-zinc-400 group-hover:text-white">{post.title}</p>
                    <button onClick={() => handleDeletePost(post.id, post.image_url)} className="text-zinc-800 hover:text-red-500 transition-colors">
                      <Trash2 size={12} />
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