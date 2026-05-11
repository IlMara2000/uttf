'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { 
  Plus, Search, Trash2, FileText, ChevronLeft, 
  Paperclip, Loader2, Save 
} from 'lucide-react';
import { format } from 'date-fns';

type NoteRecord = {
  id?: string;
  title: string;
  content?: string | null;
  attachments?: string[];
  updated_at?: string;
};

export default function NotesManager() {
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [activeNote, setActiveNote] = useState<NoteRecord | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchNotes(); }, []);

  async function fetchNotes() {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) console.error("Error fetching:", error);
    else setNotes((data || []) as NoteRecord[]);
    setLoading(false);
  }

  async function handleSave() {
    if (!activeNote || !activeNote.title) return alert("Inserisci almeno un titolo");
    
    setIsSaving(true);
    try {
      // Controllo sessione ferreo
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("Utente non autenticato o sessione scaduta.");
      }
      
      // Prepariamo i dati
      const noteToSave = {
        title: activeNote.title,
        content: activeNote.content || '',
        attachments: activeNote.attachments || [],
        user_id: user.id, // Passaggio esatto dell'UUID per l'RLS
        updated_at: new Date().toISOString()
      };

      let result;

      if (activeNote.id) {
        // UPDATE
        result = await supabase
          .from('notes')
          .update(noteToSave)
          .eq('id', activeNote.id)
          .select();
      } else {
        // INSERT
        result = await supabase
          .from('notes')
          .insert([noteToSave])
          .select();
      }

      if (result.error) throw result.error;

      if (result.data) {
        setActiveNote(result.data[0] as NoteRecord);
        await fetchNotes();
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Errore nel salvataggio: " + getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Vuoi eliminare questa nota definitivamente?")) return;
    
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (!error) {
      if (activeNote?.id === id) setActiveNote(null);
      fetchNotes();
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeNote) return;
    setIsUploading(true);
    
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('factory-assets')
        .upload(`notes/${fileName}`, file);
      
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage
        .from('factory-assets')
        .getPublicUrl(`notes/${fileName}`);

      const updatedAttachments = [...(activeNote.attachments || []), publicUrl];
      
      const updatedNote = { ...activeNote, attachments: updatedAttachments };
      setActiveNote(updatedNote);
      
      if (activeNote.id) {
        await supabase
          .from('notes')
          .update({ attachments: updatedAttachments })
          .eq('id', activeNote.id);
      }
    } catch (err) {
      alert("Errore upload: " + getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[70vh] max-h-[880px] min-h-[320px] min-w-0 max-w-full overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/25 text-white shadow-sm backdrop-blur-md">
      
      {/* SIDEBAR LISTA */}
      <div className={`flex w-full min-w-0 flex-col border-r border-zinc-800/80 md:w-80 ${activeNote ? 'hidden md:flex' : 'flex'}`}>
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-lg font-semibold tracking-tight">Note</h2>
            <button
              type="button"
              onClick={() => setActiveNote({ title: '', content: '', attachments: [] })}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/50 text-[#FF914D] transition-colors hover:bg-[#FF914D]/10"
              aria-label="Nuova nota"
            >
              <Plus size={18} />
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
          {loading ? (
            <div className="p-4 text-center"><Loader2 className="animate-spin inline text-zinc-600" /></div>
          ) : filteredNotes.map(note => (
            <button
              type="button"
              key={note.id}
              onClick={() => setActiveNote(note)}
              className={`w-full border-b border-zinc-800/60 p-4 text-left transition-colors ${activeNote?.id === note.id ? 'bg-[#FF914D]/10' : 'hover:bg-zinc-900/40'}`}
            >
              <h3 className="text-[11px] font-black uppercase truncate">{note.title}</h3>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[8px] font-mono text-zinc-600">
                  {note.updated_at ? format(new Date(note.updated_at), 'dd/MM/yy') : '--/--/--'}
                </span>
                <p className="text-[9px] text-zinc-500 truncate ml-2 flex-1">{note.content}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* EDITOR */}
      <div className={`flex-1 flex flex-col bg-black/20 ${!activeNote ? 'hidden md:flex' : 'flex'}`}>
        {activeNote ? (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 p-4">
              <button
                type="button"
                onClick={() => {
                  setActiveNote(null);
                }}
                className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg border border-zinc-700/80 bg-zinc-900/50 px-3 text-xs font-semibold text-[#FF914D] md:hidden"
              >
                <ChevronLeft size={16} /> Elenco
              </button>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/50 text-zinc-400 transition-colors hover:text-white">
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                  <input type="file" className="hidden" onChange={uploadFile} />
                </label>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/50 text-[#FF914D] transition-colors hover:bg-[#FF914D]/10 disabled:opacity-50"
                  aria-label="Salva"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => activeNote.id && handleDelete(activeNote.id)}
                  disabled={!activeNote.id}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-30"
                  aria-label="Elimina nota"
                >
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
                placeholder="Inizia a scrivere..." value={activeNote.content || ''}
                onChange={e => setActiveNote({...activeNote, content: e.target.value})}
                className="w-full bg-transparent flex-1 resize-none outline-none font-mono text-sm leading-relaxed placeholder:text-zinc-900 min-h-[200px]"
              />
              
              {/* ALLEGATI */}
              {(activeNote.attachments?.length ?? 0) > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-white/5">
                  {activeNote.attachments?.map((url: string, i: number) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Note attachments are user-uploaded URLs that should render without image optimizer constraints. */}
                      <img src={url} className="w-full h-32 object-cover opacity-80" alt="Allegato nota" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <a href={url} target="_blank" rel="noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                          <FileText size={18} />
                        </a>
                      </div>
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
