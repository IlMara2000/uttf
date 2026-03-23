'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { FileIcon, ImageIcon, VideoIcon, DownloadCloud, Trash2, Shield, HardDrive, AlertTriangle } from 'lucide-react';

export default function StoragePage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // NOTA: Assicurati che il nome del bucket sia IDENTICO a quello usato per l'upload
  const BUCKET_NAME = 'factory-assets'; 

  async function fetchFiles() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_storage')
        .select('*')
        .order('created_at', { descending: false });
      
      if (error) throw error;
      setFiles(data || []);
    } catch (err) {
      console.error("Errore fetch:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchFiles(); }, []);

  async function deleteFile(id: number, path: string) {
    if (!confirm("Confirm_Deletion: Rimuovere l'asset dal Vault?")) return;
    
    try {
      // 1. Rimuovi dal bucket fisico
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path]);
      
      if (storageError) {
        console.error("Storage Error:", storageError);
        alert("Errore rimozione file fisico: " + storageError.message);
        return;
      }

      // 2. Rimuovi dal database solo se il file fisico è andato
      const { error: dbError } = await supabase
        .from('media_storage')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // 3. Aggiorna UI
      setFiles(prev => prev.filter(f => f.id !== id));
      alert("ASSET_REMOVED_SUCCESSFULLY");

    } catch (err: any) {
      alert("Errore DB: " + err.message);
    }
  }

  const getFileIcon = (type: string) => {
    if (type?.includes('image')) return <ImageIcon className="text-[#FF914D]" />;
    if (type?.includes('video')) return <VideoIcon className="text-blue-400" />;
    return <FileIcon className="text-zinc-500" />;
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-[#FF914D] animate-pulse italic uppercase text-xs">Decrypting_Vault_Assets...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-16">
      
      {/* Header Storage */}
      <header className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-[#FF914D] mb-4">
            <HardDrive size={20} />
            <span className="font-mono text-[10px] uppercase tracking-[0.5em]">Central_Archive_V.1</span>
          </div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter">The <span className="text-[#FF914D]">Vault</span></h1>
          <p className="text-zinc-600 font-medium text-xs uppercase tracking-widest">Asset prodotti dalla factory in storage criptato.</p>
        </div>
        
        <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-3xl flex items-center gap-6 backdrop-blur-md">
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
          {files.map((file, index) => {
            // Genera la URL pubblica in tempo reale per sicurezza
            const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(file.file_path);

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 border border-white/5 group rounded-[2rem] overflow-hidden hover:border-[#FF914D]/40 transition-all flex flex-col"
              >
                {/* Preview Area */}
                <div className="h-48 bg-zinc-950 relative flex items-center justify-center overflow-hidden border-b border-white/5">
                  {file.file_type?.includes('image') ? (
                    <img 
                      src={publicUrl} 
                      className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-opacity duration-500" 
                      alt="Preview"
                    />
                  ) : (
                    <div className="scale-[2] opacity-20">{getFileIcon(file.file_type || '')}</div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60"></div>
                  
                  {/* Overlay Buttons */}
                  <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm">
                    <a 
                      href={publicUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-3 bg-white text-black rounded-full hover:bg-[#FF914D] transition-colors"
                    >
                      <DownloadCloud size={20} />
                    </a>
                    <button 
                      onClick={() => deleteFile(file.id, file.file_path)}
                      className="p-3 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Info Area */}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white/5 rounded-lg">
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
                    <span>ID: #{file.id}</span>
                    <span className="text-green-500/40 italic">Stored_Securely</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {files.length === 0 && (
        <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
          <p className="text-zinc-800 font-black uppercase tracking-[1em] italic">Archive_Empty</p>
        </div>
      )}
    </div>
  );
}
