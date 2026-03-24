'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  UserPlus, Send, LogOut, Image as ImageIcon, 
  Layers, Trash2, Loader2, Calendar as CalendarIcon, 
  ClipboardList, Users, Edit3, X, Save, Plus, HardDrive
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Planner from '@/components/Planner';
import CalendarWidget from '@/components/CalendarWidget';

export default function Dashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // STATO STAFF & GRUPPI
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

  // --- LOGICA STAFF ---
  const addGroup = () => {
    if(!newGroupName) return;
    setGroups([...groups, { name: newGroupName.toUpperCase(), members: [] }]);
    setNewGroupName('');
  };

  const deleteStaff = async (id: string) => {
    if(!confirm("REVOCARE L'ACCESSO?")) return;
    await supabase.from('authorized_users').delete().eq('id', id);
    fetchStaff();
  };

  async function handleUpdateAccount(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('authorized_users').update({ email: editingAccount.email }).eq('id', editingAccount.id);
    if (!error) { alert("OPERATOR_UPDATED"); setEditingAccount(null); fetchStaff(); }
  }

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('authorized_users').insert([{ email: newEmail.toLowerCase().trim(), role: 'staff' }]);
    if (error) alert('Errore: Già presente'); 
    else { alert('STAFF_AUTHORIZED'); setNewEmail(''); fetchStaff(); }
  }

  // --- LOGICA POST ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) { setFile(selectedFile); setPreviewUrl(URL.createObjectURL(selectedFile)); }
  };

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return alert("Dati mancanti.");
    setUploading(true);
    try {
      const aiResponse = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      const aiData = await aiResponse.json();
      const finalContent = aiData.post || description;

      const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `publications/${fileName}`;
      await supabase.storage.from('factory-assets').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('factory-assets').getPublicUrl(filePath);

      await supabase.from('publications').insert([{ 
        title: title.toUpperCase(), content: finalContent, image_url: publicUrl, created_at: new Date() 
      }]);

      alert("UNIT_PUBLISHED");
      setTitle(''); setDescription(''); setFile(null); setPreviewUrl(null);
      fetchMyPosts();
    } catch (err: any) { alert(err.message); } finally { setUploading(false); }
  }

  async function handleDeletePost(id: string, imageUrl: string) {
    if (!confirm("ELIMINARE OUTPUT?")) return;
    try {
      const fileName = imageUrl.split('/').pop();
      if (fileName) await supabase.storage.from('factory-assets').remove([`publications/${fileName}`]);
      await supabase.from('publications').delete().eq('id', id);
      fetchMyPosts();
    } catch (err: any) { alert(err.message); }
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-[#FF914D] animate-pulse text-[10px] uppercase italic">Connecting_To_Command_Center...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-10 pb-40">
      
      {/* MODAL EDIT */}
      <AnimatePresence>
        {editingAccount && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 w-full max-w-sm border-[#FF914D]/40">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black italic uppercase">Edit_Operator</h3>
                <button onClick={() => setEditingAccount(null)}><X size={20}/></button>
              </div>
              <form onSubmit={handleUpdateAccount} className="space-y-4">
                <input type="email" value={editingAccount.email} onChange={(e) => setEditingAccount({...editingAccount, email: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-xs outline-none focus:border-[#FF914D]" />
                <button type="submit" className="w-full py-4 bg-[#FF914D] text-black rounded-xl font-black uppercase text-[10px]">Update_Access</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER - MOBILE OPTIMIZED */}
      <header className="flex flex-col items-center text-center md:items-start md:text-left mb-16 gap-6">
        <div>
          <h1 className="text-5xl md:text-7xl uppercase italic font-black tracking-tighter leading-none">STAFF_<span className="text-[#FF914D]">HUB</span></h1>
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 mt-4 text-zinc-600 font-mono text-[9px] tracking-[0.2em] uppercase">
            <span>Operator: <span className="text-[#FF914D]">{userEmail}</span></span>
            <span className="hidden md:block">//</span>
            <span>Role: <span className="text-white">{userEmail === MASTER_ADMIN ? 'MASTER' : 'STAFF'}</span></span>
          </div>
        </div>
        <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="w-full md:w-auto px-8 py-3 border border-red-500/30 text-red-500 uppercase font-black italic text-[10px] hover:bg-red-500 hover:text-white transition-all rounded-full">Logout_Session</button>
      </header>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
        
        <div className="space-y-6 md:space-y-10">
          {/* STAFF MANAGEMENT */}
          {userEmail === MASTER_ADMIN && (
            <div className="glass-panel p-6 md:p-8 border-[#FF914D]/20">
              <div className="flex items-center gap-4 mb-6 text-[#FF914D] font-black italic uppercase">
                <Users size={20} /> <h2 className="text-lg">Staff_Directory</h2>
              </div>
              <form onSubmit={inviteUser} className="flex flex-col sm:flex-row gap-2 mb-6">
                <input type="email" required placeholder="EMAIL_ADDRESS" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl font-mono text-[10px] outline-none focus:border-[#FF914D]" />
                <button type="submit" className="bg-[#FF914D] text-black px-6 py-3 rounded-xl font-black uppercase italic text-[10px]">Add</button>
              </form>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {staffList.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="font-mono text-[10px] uppercase truncate mr-4">{staff.email}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingAccount(staff)} className="p-2 text-zinc-500"><Edit3 size={14}/></button>
                      <button onClick={() => deleteStaff(staff.id)} className="p-2 text-zinc-500 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NEW OUTPUT UNIT */}
          <div className="glass-panel p-6 md:p-8">
            <div className="flex items-center gap-4 mb-8 text-white font-black italic uppercase">
              <Send size={18} className="text-[#FF914D]" /> <h2 className="text-lg">Push_Output</h2>
            </div>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <input type="text" required placeholder="UNIT_TITLE" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-xs uppercase outline-none focus:border-[#FF914D]" />
              <textarea placeholder="DESCRIPTION" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-xs uppercase outline-none h-24 resize-none" />
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-[#FF914D]/30 bg-zinc-950/50 relative overflow-hidden transition-all">
                {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover opacity-40" /> : <div className="text-zinc-600 flex flex-col items-center gap-2"><ImageIcon size={20} /><span className="text-[8px] uppercase font-mono">Select_Media</span></div>}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              <button type="submit" disabled={uploading} className="w-full py-4 bg-white text-black rounded-xl italic font-black uppercase text-[10px] tracking-widest hover:bg-[#FF914D] transition-all">
                {uploading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Publish_To_System'}
              </button>
            </form>
          </div>
        </div>

        {/* LOGS E ARCHIVIO */}
        <div className="glass-panel p-6 md:p-8 overflow-hidden flex flex-col h-full">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <div className="flex items-center gap-4 text-white font-black italic uppercase">
              <Layers size={18} className="text-[#FF914D]" /> <h2 className="text-lg">Active_Logs</h2>
            </div>
            <span className="font-mono text-[8px] text-zinc-600 uppercase">Count: {myPosts.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 overflow-y-auto custom-scrollbar pr-2">
            {myPosts.map((post) => (
              <div key={post.id} className="bg-white/5 border border-white/5 p-3 rounded-2xl flex items-center gap-4 group">
                <img src={post.image_url} className="w-10 h-10 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase truncate italic">{post.title}</p>
                  <p className="text-[8px] font-mono text-zinc-600">{new Date(post.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleDeletePost(post.id, post.image_url)} className="p-2 text-zinc-700 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
        
        {/* WIDGETS FULL WIDTH SU MOBILE */}
        <div className="lg:col-span-2 space-y-6">
          <Planner isAdmin={userEmail === MASTER_ADMIN} />
          <CalendarWidget isAdmin={userEmail === MASTER_ADMIN} />
        </div>

      </div>
    </div>
  );
}
