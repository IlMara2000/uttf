'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  UserPlus, Send, LogOut, Image as ImageIcon, 
  CheckCircle, Loader2, Layers, Trash2 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Planner from '@/components/Planner';
import CalendarWidget from '@/components/CalendarWidget';

export default function Dashboard() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [newEmail, setNewEmail] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [myPosts, setMyPosts] = useState<any[]>([]);

  useEffect(() => {
    async function initDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data } = await supabase.from('authorized_users').select('role').eq('email', user.email).single();
      setUserRole(data?.role || 'staff');
      fetchMyPosts();
      setLoading(false);
    }
    initDashboard();
  }, [router]);

  async function fetchMyPosts() {
    const { data } = await supabase.from('publications').select('*').order('created_at', { ascending: false });
    setMyPosts(data || []);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return alert("Dati mancanti.");
    setUploading(true);
    try {
      const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `publications/${fileName}`;
      await supabase.storage.from('factory-assets').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('factory-assets').getPublicUrl(filePath);
      await supabase.from('publications').insert([{ 
        title: title.toUpperCase(), content: description, image_url: publicUrl, created_at: new Date() 
      }]);
      alert("UNIT_PUBLISHED");
      setTitle(''); setFile(null); setPreviewUrl(null);
      fetchMyPosts();
    } catch (err: any) { alert(err.message); } finally { setUploading(false); }
  }

  async function handleDeletePost(id: string, imageUrl: string) {
    if (!confirm("ELIMINARE?")) return;
    const fileName = imageUrl.split('/').pop();
    await supabase.storage.from('factory-assets').remove([`publications/${fileName}`]);
    await supabase.from('publications').delete().eq('id', id);
    fetchMyPosts();
  }

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('authorized_users').insert([{ email: newEmail.toLowerCase().trim(), role: 'staff' }]);
    if (error) alert('Errore'); else { alert('UTENTE AGGIUNTO'); setNewEmail(''); }
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-orange-600 animate-pulse text-xs uppercase">Connecting_To_Command_Center...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-20 pb-40">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-20">
        <div>
          <h1 className="hero-title text-4xl md:text-5xl uppercase italic font-black">Command_Center</h1>
          <p className="text-zinc-600 font-mono text-[10px] tracking-[0.4em] uppercase mt-2">
            Status: <span className="text-orange-600">{userRole === 'admin' ? 'ROOT_ACCESS' : 'STAFF_ACCESS'}</span>
          </p>
        </div>
        <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="nav-tag border-red-500/30 text-red-500 uppercase font-bold italic">Logout</button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* COLONNA 1: OPERAZIONI */}
        <div className="space-y-12 text-left">
          <div className="glass-panel p-8 md:p-12">
            <div className="flex items-center gap-4 mb-10 text-white font-black italic uppercase">
              <Send size={20} className="text-orange-600" /> <h2>Create_Output</h2>
            </div>
            <form onSubmit={handleCreatePost} className="space-y-6 text-left">
              <input type="text" required placeholder="TITOLO" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-xs uppercase outline-none focus:border-orange-600" />
              <textarea placeholder="DESCRIZIONE" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-xs uppercase outline-none h-20 resize-none" />
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/5 rounded-2xl cursor-pointer hover:border-orange-600/30 bg-zinc-950/50 relative overflow-hidden group transition-all">
                {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover opacity-40" /> : <div className="text-zinc-600 flex flex-col items-center gap-2"><ImageIcon size={24} /><span className="font-mono text-[8px] uppercase tracking-widest">Select_Media</span></div>}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              <button type="submit" disabled={uploading} className="btn-urban w-full py-5 justify-center italic font-black uppercase tracking-widest">
                {uploading ? <Loader2 className="animate-spin" size={20} /> : 'Push_To_System'}
              </button>
            </form>
          </div>

          {/* GESTIONE POST PUBBLICATI */}
          <div className="glass-panel p-8 md:p-12">
            <div className="flex items-center gap-4 mb-8 text-white font-black italic uppercase leading-none">
              <Layers size={20} className="text-orange-600" /> <h2>Live_Logs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPosts.map((post) => (
                <div key={post.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3 group transition-all">
                  <img src={post.image_url} className="w-10 h-10 object-cover rounded-lg" />
                  <div className="flex-1 truncate text-left">
                    <p className="text-[9px] font-bold uppercase truncate">{post.title}</p>
                    <p className="text-[7px] font-mono text-zinc-600">{new Date(post.created_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => handleDeletePost(post.id, post.image_url)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLONNA 2: PLANNER & CALENDAR */}
        <div className="space-y-12">
          {userRole === 'admin' && (
            <div className="glass-panel p-8 border-orange-600/20">
              <div className="flex items-center gap-4 mb-6 text-orange-600 font-black italic uppercase">
                <UserPlus size={20} /> <h2>Staff_Whitelist</h2>
              </div>
              <form onSubmit={inviteUser} className="flex gap-2">
                <input type="email" required placeholder="NEW_EMAIL" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="flex-1 bg-white/5 border border-white/10 p-3 rounded-lg font-mono text-xs outline-none focus:border-orange-600" />
                <button type="submit" className="bg-white text-black px-4 rounded-lg font-black uppercase italic text-[10px] hover:bg-orange-600 transition-all hover:text-white">Grant</button>
              </form>
            </div>
          )}
          <Planner isAdmin={userRole === 'admin'} />
          <CalendarWidget isAdmin={userRole === 'admin'} />
        </div>
      </div>
    </div>
  );
}