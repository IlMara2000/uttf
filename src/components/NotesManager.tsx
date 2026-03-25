'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Search, Trash2, FileText, ChevronLeft, 
  Paperclip, Image as ImageIcon, Loader2, Save 
} from 'lucide-react';
import { format } from 'date-fns';

export default function NotesManager() {
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => { fetchNotes(); }, []);

  async function fetchNotes() {
    const { data } = await supabase.from('notes').select('*').order('updated_at', { ascending: false });
    setNotes(data || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!activeNote.title) return;
    const { data, error } = await supabase.from('notes').upsert({
      id: activeNote.id || undefined,
      title: activeNote.title,
      content: activeNote.content,
      attachments: activeNote.attachments || [],
      updated_at: new Date()
    }).select();
    
    if (!error) {
        setActiveNote(data[0]);
        fetchNotes();
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeNote) return;
    setIsUploading(true);
    
    const fileName = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('factory-assets').upload(`notes/${fileName}`, file);
    
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('factory-assets').getPublicUrl(`notes/${fileName}`);
      const updatedAttachments = [...(activeNote.attachments || []), publicUrl];
      setActiveNote({ ...activeNote, attachments: updatedAttachments });
    }
    setIsUploading(false);
  }

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="glass-panel border-white/5 bg-zinc-950/60 rounded-3xl overflow-hidden flex h-[600px]">
      
      {/* SIDEBAR LISTA (Stile iPhone) */}
      <div className={`w-full md:w-80 border-r border-white/5 flex flex-col ${activeNote ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black italic uppercase tracking-tighter">Testi</h2>
            <button onClick={() => setActiveNote({ title: '', content: '', attachments: [] })} className="text-[#FF914D] hover:bg-[#FF914D]/10 p-2 rounded-full transition-all">
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-zinc-600" size={14} />
            <input 
              type="text" placeholder="Cerca" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900/50 border-none rounded-xl py-2 pl-9 text-[10px] font-mono outline-none focus:ring-1 ring-[#FF914D]/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredNotes.map(note => (
            <button 
              key={note.id} 
              onClick={() => setActiveNote(note)}
              className={`w-full text-left p-4 border-b border-white/5 transition-all ${activeNote?.id === note.id ? 'bg-[#FF914D]/10' : 'hover:bg-white/[0.02]'}`}
            >
              <h3 className="text-[11px] font-black uppercase truncate">{note.title || 'Nuova Nota'}</h3>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[8px] font-mono text-zinc-600">{format(new Date(note.updated_at), 'dd/MM/yy')}</span>
                <p className="text-[9px] text-zinc-500 truncate ml-2 flex-1">{note.content?.substring(0, 30)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* EDITOR (Stile iPhone) */}
      <div className={`flex-1 flex flex-col bg-black/20 ${!activeNote ? 'hidden md:flex' : 'flex'}`}>
        {activeNote ? (
          <>
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <button onClick={() => { handleSave(); setActiveNote(null); }} className="md:hidden text-[#FF914D] flex items-center gap-1 text-[10px] font-black">
                <ChevronLeft size={16} /> NOTE
              </button>
              <div className="flex items-center gap-4 ml-auto">
                <label className="cursor-pointer text-zinc-500 hover:text-white transition-colors">
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                  <input type="file" className="hidden" onChange={uploadFile} />
                </label>
                <button onClick={handleSave} className="text-[#FF914D] hover:scale-110 transition-transform">
                  <Save size={18} />
                </button>
                <button onClick={() => { /* logic delete */ }} className="text-zinc-800 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
              <input 
                type="text" placeholder="TITOLO" value={activeNote.title} 
                onChange={e => setActiveNote({...activeNote, title: e.target.value})}
                className="w-full bg-transparent text-2xl font-black uppercase italic outline-none placeholder:text-zinc-800"
              />
              <textarea 
                placeholder="Inizia a scrivere..." value={activeNote.content}
                onChange={e => setActiveNote({...activeNote, content: e.target.value})}
                className="w-full bg-transparent flex-1 resize-none outline-none font-mono text-sm leading-relaxed placeholder:text-zinc-900 min-h-[200px]"
              />
              
              {/* ALLEGATI */}
              {activeNote.attachments?.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                  {activeNote.attachments.map((url: string, i: number) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-white/10">
                      <img src={url} className="w-full h-32 object-cover opacity-80" />
                      <a href={url} target="_blank" className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        <FileText size={20} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-800 uppercase font-black italic">
            <FileText size={48} className="mb-4 opacity-20" />
            Seleziona una nota
          </div>
        )}
      </div>
    </div>
  );
}
