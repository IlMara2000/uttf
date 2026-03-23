'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  UserPlus, Send, LogOut, Image as ImageIcon, 
  Layers, Trash2, Loader2, Calendar as CalendarIcon, 
  ClipboardList, Users, Edit3, X, Save, Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Planner from '@/components/Planner';
import CalendarWidget from '@/components/CalendarWidget';

export default function Dashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [staffList, setStaffList] = useState<any[]>([]);
  const [groups, setGroups] = useState<{name: string, members: string[]}[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [myPosts, setMyPosts] = useState<any[]>([]);

  const MASTER_ADMIN = 'ass.uttf@gmail.com';

  useEffect(() => {
    async function initDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserEmail(user.email ?? null);
      const { data } = await supabase.from('authorized_users').select('*').eq('email', user.email).single();
      setUserRole(data?.role || 'staff');
      fetchMyPosts();
      if (user.email === MASTER_ADMIN) fetchStaff();
      setLoading(false);
    }
    initDashboard();
  }, [router]);

  async function fetchStaff() {
    const { data } = await supabase.from('authorized_users').select('*').order('created_at', { ascending: false });
    setStaffList(data || []);
  }

  async function fetchMyPosts() {
    const { data } = await supabase.from('publications').select('*').order('created_at', { ascending: false });
    setMyPosts(data || []);
  }

  const addGroup = () => {
    if(!newGroupName) return;
    setGroups([...groups, { name: newGroupName.toUpperCase(), members: [] }]);
    setNewGroupName('');
  };

  const deleteStaff = async (id: string) => {
    if(!confirm("REVOCARE ACCESSO?")) return;
    await supabase.from('authorized_users').delete().eq('id', id);
    fetchStaff();
  };

  async function handleUpdateAccount(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('authorized_users').update({ email: editingAccount.email }).eq('id', editingAccount.id);
    if (!error) { setEditingAccount(null); fetchStaff(); }
  }

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('authorized_users').insert([{ email: newEmail.toLowerCase().trim(), role: 'staff' }]);
    if (!error) { setNewEmail(''); fetchStaff(); }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) { setFile(selectedFile); setPreviewUrl(URL.createObjectURL(selectedFile)); }
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
      setTitle(''); setFile(null); setPreviewUrl(null);
      fetchMyPosts();
    } catch (err: any) { console.error(err); } finally { setUploading(false); }
  }

  async function handleDeletePost(id: string, imageUrl: string) {
    if (!confirm("ELIMINARE?")) return;
    const fileName = imageUrl.split('/').pop();
    if (fileName) await supabase.storage.from('factory-assets').remove([`publications/${fileName}`]);
    await supabase.from('publications').delete().eq('id', id);
    fetchMyPosts();
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-orange-600 animate-pulse text-xs uppercase">Connecting_To_Command_Center...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 pb-40 relative overflow-x-hidden">
      
      <AnimatePresence>
        {editingAccount && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="glass-panel p-8 w-full max-w-md border-[#FF914D]/40">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black italic uppercase">Edit_Operator</h3>
                <button onClick={() => setEditingAccount(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
              </div>
              <form onSubmit={handleUpdateAccount} className="space-y-6">
                <input type="email" value={editingAccount.email} onChange={(e) => setEditingAccount({...editingAccount, email: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-xs outline-none focus:border-[#FF914D]" />
                <button type="submit" className="w-full py-4 bg-[#FF914D] text-black rounded-xl font-black uppercase text-[10px]">Update_Access</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
        <div>
          <h1 className="hero-title text-4xl md:text-5xl uppercase italic font-black tracking-tighter">Command_Center</h1>
          <p className="text-zinc-600 font-mono text-[9px] tracking-[0.4em] uppercase mt-2">
            Operator: <span className="text-orange-600">{userEmail}</span> // Role: <span className="text-white">{userEmail === MASTER_ADMIN ? 'MASTER_ROOT' : 'FIELD_STAFF'}</span>
          </p>
        </div>
        <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="nav-tag border-red-500/30 text-red-500 uppercase font-bold italic hover:bg-red-500 hover:text-white transition-all">Logout_Session</button>
      </header>

      {/* GRID LAYOUT OTTIMIZZATA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* TOP LEFT: STAFF */}
        <div className="space-y-8 h-full">
          {userEmail === MASTER_ADMIN ? (
            <div className="glass-panel p-8 border-[#FF914D]/20 h-full">
              <div className="flex items-center gap-4 mb-6 text-[#FF914D] font-black italic uppercase"><Users size={20} /> <h2>Staff_Directory</h2></div>
              <form onSubmit={inviteUser} className="flex gap-2 mb-6">
                <input type="email" required placeholder="EMAIL" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl font-mono text-[10px] outline-none" />
                <button type="submit" className="bg-[#FF914D] text-black px-5 rounded-xl font-black uppercase text-[10px]">Add</button>
              </form>
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                {staffList.map((staff) => (
                  <div key={staff.id} className="group flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="font-mono text-[10px] uppercase">{staff.email}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingAccount(staff)} className="text-zinc-500 hover:text-white"><Edit3 size={14}/></button>
                      <button onClick={() => deleteStaff(staff.id)} className="text-zinc-500 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-8 opacity-50 border-white/5 h-full flex items-center justify-center">
              <p className="font-mono text-[9px] text-zinc-600 uppercase tracking-[0.3em]">Restricted_Access</p>
            </div>
          )}
        </div>

        {/* TOP RIGHT: CREATE POST */}
        <div className="glass-panel p-8">
          <div className="flex items-center gap-4 mb-8 text-white font-black italic uppercase leading-none"><Send size={18} className="text-[#FF914D]" /> <h2>New_Output_Unit</h2></div>
          <form onSubmit={handleCreatePost} className="space-y-4">
            <input type="text" required placeholder="UNIT_TITLE" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-xs uppercase outline-none focus:border-[#FF914D]" />
            <textarea placeholder="CONTENT" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-xs uppercase outline-none h-24 resize-none" />
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/5 rounded-2xl cursor-pointer hover:border-[#FF914D]/30 bg-zinc-950/50 relative overflow-hidden transition-all">
              {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover opacity-40" /> : <ImageIcon size={20} className="text-zinc-600" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
            <button type="submit" disabled={uploading} className="w-full py-4 bg-white text-black rounded-xl italic font-black uppercase text-[10px] hover:bg-[#FF914D] transition-colors">
              {uploading ? 'UPLOADING...' : 'Push_To_System'}
            </button>
          </form>
        </div>

        {/* BOTTOM FULL WIDTH: CALENDAR (ESTESO) */}
        <div className="lg:col-span-2">
           <CalendarWidget isAdmin={userEmail === MASTER_ADMIN} />
        </div>

        {/* BOTTOM FULL WIDTH: TASK PLANNER (ESTESO) */}
        <div className="lg:col-span-2">
           <Planner isAdmin={userEmail === MASTER_ADMIN} />
        </div>

        {/* LOGS DI ARCHIVIO (IN FONDO) */}
        <div className="lg:col-span-2 glass-panel p-8">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
             <div className="flex items-center gap-4 text-white font-black italic uppercase leading-none"><Layers size={18} className="text-[#FF914D]" /> <h2>System_Archive_Logs</h2></div>
             <span className="font-mono text-[8px] text-zinc-500 uppercase">Count: {myPosts.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPosts.map((post) => (
              <div key={post.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4 group transition-all hover:border-[#FF914D]/30">
                <img src={post.image_url} className="w-12 h-12 object-cover rounded-xl" />
                <div className="flex-1 truncate text-left">
                  <p className="text-[10px] font-black uppercase truncate italic">{post.title}</p>
                  <p className="text-[8px] font-mono text-zinc-600 uppercase">{new Date(post.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleDeletePost(post.id, post.image_url)} className="p-2 text-zinc-700 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}