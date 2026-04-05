'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, ChevronLeft, Loader2, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function OutputsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    const { data } = await supabase.from('publications').select('*').order('created_at', { ascending: false });
    if (data) setPosts(data);
    setLoading(false);
  }

  async function handleDelete(id: string, url: string) {
    if (!confirm("CONFIRM_DELETION?")) return;
    const path = url.split('/').pop();
    if (path) await supabase.storage.from('factory-assets').remove([`publications/${path}`]);
    await supabase.from('publications').delete().eq('id', id);
    fetchPosts();
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-[#FF914D]">FETCHING_DATABASE...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* BACK BUTTON & TITLE */}
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back</span>
          </button>
          
          <h1 className="text-[10px] font-black uppercase italic text-[#FF914D] tracking-[0.4em] flex items-center gap-2">
            <Layers size={14} /> Output_Archive
          </h1>
        </div>

        {/* GRID OUTPUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <AnimatePresence>
            {posts.map((post) => (
              <motion.div 
                key={post.id} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900/40 border border-white/5 rounded-3xl p-4 hover:border-[#FF914D]/30 transition-all group"
              >
                <div className="aspect-video rounded-2xl overflow-hidden mb-4 border border-white/5">
                  <img src={post.image_url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black uppercase truncate text-zinc-300">{post.title}</span>
                  <button 
                    onClick={() => handleDelete(post.id, post.image_url)} 
                    className="p-2 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {posts.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
            <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">No_Outputs_Found</p>
          </div>
        )}
      </div>
    </div>
  );
}