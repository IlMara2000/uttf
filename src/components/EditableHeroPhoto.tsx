'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { optimizeUpload } from '@/lib/optimize-upload';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

const defaultPhoto = '/labs/foto1.jpeg';
export default function EditableHeroPhoto() {
  const [photo, setPhoto] = useState(defaultPhoto);
  const [version, setVersion] = useState(0);
  const [account, setAccount] = useState(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const uploadCache = useRef<{ file: File; url: string } | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    async function load() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
      const { supabase } = await import('@/lib/supabase');
      if (!alive) return;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!alive) return;
        const allowed = !!session?.user && !session.user.is_anonymous;
        setAccount(allowed);
        if (!allowed) setOpen(false);
      });
      unsubscribe = () => subscription.unsubscribe();
      const { data, error } = await supabase.from('home_photo').select('url, version').eq('id', 1).single();
      if (alive && !error && data) { setPhoto(data.url); setVersion(data.version); setReady(true); }
    }
    void load().catch(() => { if (alive) setReady(false); });
    return () => { alive = false; unsubscribe?.(); };
  }, []);

  function selectFile(selected?: File) {
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 10 * 1024 * 1024) {
      setMessage('Scegli una foto JPG, PNG o WebP fino a 10 MB.'); return;
    }
    setFile(selected); setPreview(URL.createObjectURL(selected)); setMessage('');
  }
  async function save() {
    if (!file || busy) return;
    setBusy(true); setMessage('');
    try {
      const { supabase } = await import('@/lib/supabase');
      let url = uploadCache.current?.file === file ? uploadCache.current.url : '';
      if (!url) {
        const optimized = await optimizeUpload(file);
        const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[optimized.type];
        const path = `home/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from('site-photos').upload(path, optimized, { contentType: optimized.type });
        if (error) throw error;
        url = supabase.storage.from('site-photos').getPublicUrl(path).data.publicUrl;
        uploadCache.current = { file, url };
      }
      const { data, error } = await supabase.from('home_photo').update({ url, version: version + 1 }).eq('id', 1).eq('version', version).select('url, version').maybeSingle();
      if (error) throw error;
      if (!data) { setMessage('La foto è stata aggiornata da un altro account oppure la sessione è scaduta. Ricarica la pagina prima di riprovare.'); return; }
      setPhoto(data.url); setVersion(data.version); setOpen(false); setFile(null); setPreview(''); uploadCache.current = null;
    } catch { setMessage('Impossibile salvare la foto. Riprova: la foto precedente resta visibile.'); }
    finally { setBusy(false); }
  }
  return <>
    <Image src={photo} alt="Il gruppo Under The Tower Factory" fill preload sizes="(min-width: 900px) 48vw, 100vw" unoptimized={photo.startsWith('https://')} />
    {account && <button className="hero-photo-edit" type="button" onClick={() => { setMessage(''); setOpen(true); }}><Pencil size={14} /> Modifica foto</button>}
    <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); if (!value) { setFile(null); setPreview(''); } } }}>
      <DialogContent className="lab-editor" showCloseButton={!busy}>
        <DialogTitle>Modifica foto della home</DialogTitle>
        <DialogDescription>Scegli una nuova foto: dopo il salvataggio sarà visibile a tutti.</DialogDescription>
        {!ready ? <p role="alert">Impossibile caricare i dati della foto. Ricarica la pagina per riprovare.</p> : <>
          <Image className="hero-photo-preview" src={preview || photo} alt="Anteprima della foto principale" width={800} height={600} unoptimized />
          <label>Nuova foto<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => selectFile(event.target.files?.[0])} /></label>
          <p>JPG, PNG o WebP, massimo 10 MB.</p>
          {message && <p role="alert">{message}</p>}
          <div className="lab-editor-actions"><button type="button" disabled={busy} onClick={() => { setOpen(false); setFile(null); setPreview(''); }}>Annulla</button><button type="button" disabled={!file || busy} onClick={() => void save()}>{busy ? 'Salvataggio…' : 'Salva foto'}</button></div>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
