'use client'

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Trash2,
  ChevronLeft,
  Loader2,
  Layers,
  Search,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function OutputsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    const { data } = await supabase
      .from('publications')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPosts(data);
    setLoading(false);
  }

  async function handleDelete(id: string, url: string) {
    if (!confirm('CONFIRM_DELETION?')) return;

    setDeletingId(id);
    try {
      const path = url.split('/').pop();
      if (path) {
        await supabase.storage.from('factory-assets').remove([`publications/${path}`]);
      }
      await supabase.from('publications').delete().eq('id', id);
      await fetchPosts();
    } finally {
      setDeletingId(null);
    }
  }

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return posts;

    return posts.filter((post) =>
      [post.title, post.description || '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [posts, search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center font-mono text-[#FF914D]">
        FETCHING_DATABASE...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
            >
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back</span>
            </button>

            <div>
              <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
                Output <span className="text-[#FF914D]">Archive</span>
              </h1>
              <p className="text-sm text-zinc-500 mt-3 max-w-2xl">
                Archivio operativo dei post caricati: controllo rapido, ricerca e cancellazione diretta.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchPosts}
              className="px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2"
            >
              <RefreshCw size={14} />
              Aggiorna
            </button>
            <button
              onClick={() => router.push('/storage')}
              className="px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2"
            >
              <HardDrive size={14} />
              Foto & Planimetrie
            </button>
          </div>
        </div>

        <section className="grid xl:grid-cols-[1.15fr_0.85fr] gap-4">
          <div className="rounded-[2rem] border border-white/5 bg-zinc-900/20 p-6">
            <div className="flex items-center gap-2 text-[#FF914D] mb-4">
              <Layers size={16} />
              <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Output Index</span>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca per titolo o descrizione"
                className="w-full bg-black/35 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white outline-none focus:border-[#FF914D]/40"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-[2rem] border border-white/5 bg-zinc-900/20 p-5">
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Totale</p>
              <p className="text-3xl font-black italic mt-2">{posts.length}</p>
            </div>
            <div className="rounded-[2rem] border border-white/5 bg-zinc-900/20 p-5">
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Filtrati</p>
              <p className="text-3xl font-black italic mt-2">{filteredPosts.length}</p>
            </div>
            <div className="rounded-[2rem] border border-white/5 bg-zinc-900/20 p-5">
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Ultimo</p>
              <p className="text-lg font-black italic mt-3">
                {posts[0]?.created_at
                  ? new Date(posts[0].created_at).toLocaleDateString('it-IT')
                  : '--'}
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900/40 border border-white/5 rounded-3xl p-4 hover:border-[#FF914D]/30 transition-all group"
              >
                <div className="aspect-video rounded-2xl overflow-hidden mb-4 border border-white/5">
                  <img
                    src={post.image_url}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                  />
                </div>
                <div className="space-y-3 px-1">
                  <span className="text-[10px] font-black uppercase block truncate text-zinc-300">
                    {post.title}
                  </span>
                  <p className="text-[11px] text-zinc-500 line-clamp-2">
                    {post.description || 'Nessuna descrizione registrata.'}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-[10px] font-mono text-zinc-600">
                      {new Date(post.created_at).toLocaleDateString('it-IT')}
                    </span>
                    <button
                      onClick={() => handleDelete(post.id, post.image_url)}
                      disabled={deletingId === post.id}
                      className="p-2 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-40"
                    >
                      {deletingId === post.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
            <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">
              No_Outputs_Found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
