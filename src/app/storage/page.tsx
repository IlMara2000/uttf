'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { FileIcon, ImageIcon, VideoIcon, DownloadCloud, Trash2, Shield, HardDrive } from 'lucide-react';

export default function StoragePage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchFiles() {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_storage')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setFiles(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchFiles(); }, []);

  async function deleteFile(id: number, path: string) {
    if (!confirm("Confirm_Deletion: Rimuovere l'asset dal Vault?")) return;
    
    // Rimuovi dal bucket fisico
    const { error: storageError } = await supabase.storage.from('factory_assets').remove([path]);
    
    if (!storageError) {
      // Rimuovi dal database
      await supabase.from('media_storage').delete().eq('id', id);
      fetchFiles();
    }
  }

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="text-uttf-orange" />;
    if (type.includes('video')) return <VideoIcon className="text-blue-400" />;
    return <FileIcon className="text-zinc-500" />;
  };

  if (loading) return <div className="p-20 text-center font-mono text-uttf-orange animate-pulse italic">DECRYPTING_VAULT_ASSETS...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-16">
      
      {/* Header Storage */}
      <header className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-uttf-orange mb-4">
            <HardDrive size={20} />
            <span className="font-mono text-[10px] uppercase tracking-[0.5em]">Central_Archive_V.1</span>
          </div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter italic">The <span className="text-uttf-orange">Vault</span></h1>
          <p className="text-zinc-600 font-medium text-xs uppercase tracking-widest">Tutti gli asset prodotti dalla factory in un unico posto sicuro.</p>
        </div>
        
        <div className="glass-card px-8 py-4 rounded-3xl flex items-center gap-6">
          <div className="text-right border-r border-white/10 pr-6">
            <p className="text-[8px] text-zinc-500 uppercase font-bold">Total_Assets</p>
            <p className="text-2xl font-black text-white">{files.length}</p>
          </div>
          <Shield size={24} className="text-green-500" />
        </div>
      </header>

      {/* Grid Assets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatePresence>
          {files.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card group rounded-[2rem] overflow-hidden border-white/5 hover:border-uttf-orange/40 transition-all flex flex-col"
            >
              {/* Preview Area */}
              <div className="h-48 bg-zinc-950 relative flex items-center justify-center overflow-hidden border-b border-white/5">
                {file.file_type?.includes('image') ? (
                  <img 
                    src={supabase.storage.from('factory_assets').getPublicUrl(file.file_path).data.publicUrl} 
                    className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-opacity duration-500" 
                    alt="Preview"
                  />
                ) : (
                  <div className="scale-[2] opacity-20">{getFileIcon(file.file_type || '')}</div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
                
                {/* Overlay Buttons */}
                <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                  <a 
                    href={supabase.storage.from('factory_assets').getPublicUrl(file.file_path).data.publicUrl} 
                    target="_blank" 
                    className="p-3 bg-white text-black rounded-full hover:bg-uttf-orange transition-colors"
                  >
                    <DownloadCloud size={20} />
                  </a>
                  <button 
                    onClick={() => deleteFile(file.id, file.file_path)}
                    className="p-3 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors border border-red-500/50"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Info Area */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-zinc-900 rounded-lg">
                    {getFileIcon(file.file_type || '')}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-white truncate italic tracking-tight">
                      {file.file_path.split('/').pop()}
                    </p>
                    <p className="text-[8px] text-zinc-600 font-mono uppercase">
                      {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-[8px] font-mono text-zinc-700 uppercase">
                  <span>Task_Link: #{file.activity_id || 'Global'}</span>
                  <span className="text-green-500/50">Stored_Securely</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {files.length === 0 && (
        <div className="py-40 text-center glass-card rounded-[3rem] border-dashed">
          <p className="text-zinc-800 font-black uppercase tracking-[1em] italic">Archive_Empty</p>
        </div>
      )}
    </div>
  );
}