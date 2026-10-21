'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Pencil } from 'lucide-react';
import { type LabCategory } from '@/app/labs/lab-data';
import { isSafeBioUrl } from '@/lib/bio-links';
import { optimizeUpload } from '@/lib/optimize-upload';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function LabCards({ initialLabs, ready }: { initialLabs: LabCategory[]; ready: boolean }) {
  const [labs, setLabs] = useState(initialLabs);
  const [allowed, setAllowed] = useState(false);
  const [draft, setDraft] = useState<LabCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    async function init() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      const { supabase } = await import('@/lib/supabase');
      if (!alive) return;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!alive) return;
        const canEdit = !!session?.user && !session.user.is_anonymous;
        setAllowed(canEdit);
        if (!canEdit) setDraft(null);
      });
      unsubscribe = () => subscription.unsubscribe();
    }
    void init();
    return () => { alive = false; unsubscribe?.(); };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || busy) return;
    if (![draft.primaryUrl, draft.secondaryUrl].every(url => isSafeBioUrl(url))) {
      setMessage('Inserisci link validi: https://, http://, mailto:, tel: oppure un percorso / del sito.');
      return;
    }
    setBusy(true); setMessage('');
    try {
      const { supabase } = await import('@/lib/supabase');
      const { slug, version, ...fields } = draft;
      const { data, error } = await supabase.from('labs').update({ ...fields, title: fields.title.trim(), tags: [...new Set(fields.tags.map(tag => tag.trim()).filter(Boolean))], version: version + 1 }).eq('slug', slug).eq('version', version).select().maybeSingle();
      if (error) throw error;
      if (!data) { setMessage('Il laboratorio è stato modificato da un altro account oppure la sessione è scaduta. Ricarica la pagina prima di riprovare.'); return; }
      setLabs(items => items.map(item => item.slug === slug ? data as LabCategory : item));
      setDraft(null); setNotice('Laboratorio aggiornato.');
    } catch { setMessage('Salvataggio non riuscito. Le modifiche sono ancora nel modulo: riprova.'); }
    finally { setBusy(false); }
  }

  async function upload(files: FileList | null) {
    if (!files || !draft || busy) return;
    if (draft.photos.length + files.length > 8) { setMessage('Puoi allegare al massimo 8 foto per laboratorio.'); return; }
    const selected = Array.from(files);
    if (selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setMessage('Scegli foto JPG, PNG o WebP fino a 10 MB ciascuna.'); return;
    }
    setBusy(true); setMessage('');
    try {
      const { supabase } = await import('@/lib/supabase');
      for (const original of selected) {
        const file = await optimizeUpload(original);
        const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
        const path = `${draft.slug}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from('lab-photos').upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data } = supabase.storage.from('lab-photos').getPublicUrl(path);
        setDraft(current => current ? { ...current, photos: [...current.photos, data.publicUrl] } : current);
      }
    } catch { setMessage('Caricamento non riuscito. Le foto già caricate restano nel modulo; puoi riprovare con quelle mancanti.'); }
    finally { setBusy(false); }
  }

  const textFields = [ ['title', 'Titolo', 120], ['description', 'Descrizione', 2000], ['detailIntro', 'Testo della pagina del laboratorio', 4000], ['primaryLabel', 'Testo del primo link', 80], ['primaryUrl', 'Destinazione del primo link', 2000], ['secondaryLabel', 'Testo del secondo link', 80], ['secondaryUrl', 'Destinazione del secondo link', 2000] ] as const;
  return <>
    <p role="status">{notice}</p>
    {!ready && <p role="status">Impossibile caricare gli aggiornamenti dei laboratori. Ricarica la pagina per riprovare.</p>}
    <section className="lab-list" aria-label="Laboratori e iniziative">
      {labs.map(lab => <article className="lab-card" key={lab.slug}>
        <div className="lab-heading">
          <div className="lab-status-row">
            <span className="lab-status"><span className={`lab-status-dot ${lab.active ? 'is-active' : ''}`} aria-hidden="true" />{lab.active ? 'Attivo' : 'Non attivo'}</span>
            {allowed && <button type="button" className="text-link lab-edit" disabled={!ready} onClick={() => { setDraft({ ...lab, photos: [...lab.photos] }); setMessage(''); }}><Pencil size={14} /> Modifica<span className="sr-only"> {lab.title}</span></button>}
          </div>
          {lab.photos.length > 0 && <div className="lab-photos">{lab.photos.map((url, i) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Apri foto ${i + 1} di ${lab.title}`}><Image unoptimized width={800} height={600} src={url} alt={`${lab.title}, foto ${i + 1}`} loading="lazy" /></a>)}</div>}
        </div>
        <h2>{lab.title}</h2><p>{lab.description}</p>
        <div className="tags">{lab.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
        <div className="lab-actions"><a className="clay-button light" href={lab.primaryUrl}>{lab.primaryLabel}<ArrowUpRight size={17} /></a><a className="text-link" href={lab.secondaryUrl}>{lab.secondaryLabel}<ArrowUpRight size={16} /></a></div>
      </article>)}
    </section>
    <Dialog open={!!draft} onOpenChange={open => { if (!open && !busy) setDraft(null); }}>
      <DialogContent className="lab-editor" showCloseButton={!busy}>
        <DialogTitle>Modifica laboratorio</DialogTitle>
        <DialogDescription>Le modifiche salvate saranno visibili a tutti.</DialogDescription>
        {draft && <form onSubmit={save}>
          <fieldset disabled={busy}>
            <label>Stato<select value={draft.active ? 'active' : 'inactive'} onChange={e => setDraft({ ...draft, active: e.target.value === 'active' })}><option value="active">Attivo (verde)</option><option value="inactive">Non attivo (rosso)</option></select></label>
            {textFields.map(([key, label, max]) => <label key={key}>{label}{key === 'description' || key === 'detailIntro' ? <textarea required maxLength={max} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /> : <input required maxLength={max} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} />}</label>)}
            <label>Tag (separati da virgola)<input maxLength={500} value={draft.tags.join(',')} onChange={e => setDraft({ ...draft, tags: e.target.value.split(',') })} /></label>
            <label>Foto del laboratorio<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => { void upload(e.target.files); e.target.value = ''; }} /></label>
            <p>Fino a 8 foto JPG, PNG o WebP, massimo 10 MB ciascuna. Clicca Salva per pubblicarle.</p>
            <div className="lab-photo-previews">{draft.photos.map((url, i) => <div key={url}><Image unoptimized width={800} height={600} src={url} alt={`Foto allegata ${i + 1}`} /><button type="button" onClick={() => setDraft({ ...draft, photos: draft.photos.filter(photo => photo !== url) })}>Rimuovi foto {i + 1}</button></div>)}</div>
          </fieldset>
          {message && <p role="alert">{message}</p>}
          <div className="lab-editor-actions"><button type="button" disabled={busy} onClick={() => setDraft(null)}>Annulla</button><button type="submit" disabled={busy}>{busy ? 'Operazione in corso…' : 'Salva modifiche'}</button></div>
        </form>}
      </DialogContent>
    </Dialog>
  </>;
}
