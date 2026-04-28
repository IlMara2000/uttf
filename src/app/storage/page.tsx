'use client'

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileIcon,
  ImageIcon,
  VideoIcon,
  DownloadCloud,
  Trash2,
  Shield,
  HardDrive,
  Search,
  Filter,
  ChevronLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StoragePage() {
  const router = useRouter();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'images' | 'videos' | 'docs'>('all');
  const [query, setQuery] = useState('');

  const BUCKET_NAME = 'factory-assets';

  useEffect(() => {
    fetchFiles();
  }, []);

  async function fetchFiles() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_storage')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (err: any) {
      console.error('Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteFile(fileId: number, fileUrl: string) {
    if (!confirm("CONFIRM_DELETION: Rimuovere l'asset dal Vault permanentemente?")) return;

    try {
      const pathParts = fileUrl.split(`${BUCKET_NAME}/`);
      const filePath = pathParts[1];

      if (!filePath) {
        throw new Error("Impossibile determinare il path del file dall'URL.");
      }

      const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from('media_storage').delete().eq('id', fileId);
      if (dbError) throw dbError;

      setFiles((prev) => prev.filter((file) => file.id !== fileId));
      alert('ASSET_PURGED_SUCCESSFULLY');
    } catch (err: any) {
      alert('ERRORE_SISTEMA: ' + err.message);
    }
  }

  const getFileIcon = (type: string) => {
    if (type?.includes('image')) return <ImageIcon className="text-[#FF914D]" size={18} />;
    if (type?.includes('video')) return <VideoIcon className="text-blue-500" size={18} />;
    return <FileIcon className="text-zinc-500" size={18} />;
  };

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return files.filter((file) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'images' && file.file_type?.includes('image')) ||
        (filter === 'videos' && file.file_type?.includes('video')) ||
        (filter === 'docs' && !file.file_type?.includes('image') && !file.file_type?.includes('video'));

      const matchesQuery =
        !normalizedQuery || (file.file_name || '').toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [files, filter, query]);

  const imagesCount = files.filter((file) => file.file_type?.includes('image')).length;
  const videosCount = files.filter((file) => file.file_type?.includes('video')).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center font-mono text-[#FF914D] gap-4">
        <div className="w-12 h-12 border-2 border-[#FF914D] border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] uppercase tracking-[0.5em] animate-pulse">
          Decrypting_Vault_Data...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white p-6 md:p-12 pb-32">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col gap-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group w-fit"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back</span>
          </button>

          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[#FF914D]">
                <HardDrive size={16} />
                <span className="font-mono text-[9px] uppercase tracking-[0.4em]">
                  Asset_Repository_V2.0
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">
                Foto <span className="text-[#FF914D]">&</span> Vault
              </h1>
              <p className="text-sm text-zinc-500 max-w-2xl">
                Archivio centralizzato per foto, planimetrie, video e allegati di lavoro.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 w-full xl:w-auto">
              <div className="glass-panel px-6 py-5 rounded-2xl bg-zinc-950/50 border-white/5">
                <p className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest mb-1">Totale</p>
                <p className="text-3xl font-black text-white leading-none">{files.length}</p>
              </div>
              <div className="glass-panel px-6 py-5 rounded-2xl bg-zinc-950/50 border-white/5">
                <p className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest mb-1">Immagini</p>
                <p className="text-3xl font-black text-white leading-none">{imagesCount}</p>
              </div>
              <div className="glass-panel px-6 py-5 rounded-2xl bg-zinc-950/50 border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest mb-1">Video</p>
                  <p className="text-3xl font-black text-white leading-none">{videosCount}</p>
                </div>
                <Shield size={24} className="text-emerald-500 opacity-50" />
              </div>
            </div>
          </div>
        </header>

        <section className="grid xl:grid-cols-[1.1fr_0.9fr] gap-4">
          <div className="rounded-[2rem] border border-white/5 bg-zinc-900/20 p-6">
            <div className="flex items-center gap-2 text-[#FF914D] mb-4">
              <Filter size={16} />
              <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Media Filter</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                ['all', 'All Assets'],
                ['images', 'Images'],
                ['videos', 'Videos'],
                ['docs', 'Docs'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilter(value as 'all' | 'images' | 'videos' | 'docs')}
                  className={`text-[9px] font-black uppercase px-4 py-2 rounded-full border transition-all ${
                    filter === value
                      ? 'bg-[#FF914D] text-black border-[#FF914D]'
                      : 'border-white/10 text-zinc-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-zinc-900/20 p-6">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca per nome file"
                className="w-full bg-black/35 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white outline-none focus:border-[#FF914D]/40"
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredFiles.map((file) => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="glass-panel group rounded-3xl overflow-hidden border-white/5 bg-zinc-900/20 hover:border-[#FF914D]/40 transition-all flex flex-col"
              >
                <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden border-b border-white/5">
                  {file.file_type?.includes('image') ? (
                    <img
                      src={file.file_url}
                      className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                      alt="Asset"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
                      <VideoIcon size={40} className="text-zinc-500" />
                      <span className="text-[8px] font-mono">VIDEO_STREAM</span>
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/60 backdrop-blur-sm">
                    <a
                      href={file.file_url}
                      target="_blank"
                      download
                      className="p-3 bg-white text-black rounded-full hover:bg-[#FF914D] transition-colors"
                    >
                      <DownloadCloud size={18} />
                    </a>
                    <button
                      onClick={() => deleteFile(file.id, file.file_url)}
                      className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white/5 rounded-xl">{getFileIcon(file.file_type)}</div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase text-white truncate italic pr-2">
                        {file.file_name || 'UNNAMED_ASSET'}
                      </p>
                      <p className="text-[8px] text-zinc-600 font-mono uppercase tracking-tighter">
                        Registered: {new Date(file.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[7px] font-mono text-zinc-800 uppercase tracking-widest">
                      Hash_ID: {file.id}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[7px] font-mono text-emerald-500/50 uppercase">Secured</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredFiles.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-40 text-center border border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]"
          >
            <p className="text-zinc-800 font-black uppercase tracking-[1em] italic text-xs">
              Archive_Empty_Or_Filtered
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
