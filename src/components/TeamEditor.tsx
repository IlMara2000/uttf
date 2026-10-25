'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type FormEvent, type PointerEvent, type ReactNode } from 'react';
import { ArrowUpRight, Pencil, Plus } from 'lucide-react';
import PublicPageIntro from '@/components/PublicPageIntro';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { type TeamMember, type TeamIntro } from '@/app/team/team-data';
import { isSafeBioUrl } from '@/lib/bio-links';
import { optimizeUpload } from '@/lib/optimize-upload';

function TiltCard({ children }: { children: ReactNode }) {
  const card = useRef<HTMLElement>(null);
  function reset() {
    card.current?.classList.remove('is-tilting');
    card.current?.style.setProperty('--tilt-rx', '0deg');
    card.current?.style.setProperty('--tilt-ry', '0deg');
  }
  function track(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    card.current?.classList.add('is-tilting');
    card.current?.style.setProperty('--tilt-ry', `${((x - 0.5) * 6).toFixed(2)}deg`);
    card.current?.style.setProperty('--tilt-rx', `${((0.5 - y) * 6).toFixed(2)}deg`);
  }
  return <div className="team-card-shell t-tilt" onPointerMove={track} onPointerLeave={reset} onPointerCancel={reset} onBlur={reset}>
    <article className="team-card t-tilt-card" ref={card}>{children}</article>
  </div>;
}

export default function TeamEditor({ initialMembers, initialIntro, ready, kind = 'team' }: {
  initialMembers: TeamMember[]; initialIntro: TeamIntro; ready: boolean; kind?: 'team' | 'gallery';
}) {
  const gallery = kind === 'gallery';
  const memberTable = gallery ? 'gallery_artworks' : 'team_members';
  const introTable = gallery ? 'gallery_intro' : 'team_intro';
  const photoBucket = gallery ? 'gallery-photos' : 'team-photos';
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archivedMembers, setArchivedMembers] = useState<TeamMember[]>([]);
  const [archiveError, setArchiveError] = useState('');
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [members, setMembers] = useState(initialMembers);
  const [intro, setIntro] = useState(initialIntro);
  const [account, setAccount] = useState(false);
  const [editing, setEditing] = useState<{ member: TeamMember; isNew: boolean } | null>(null);
  const [introDraft, setIntroDraft] = useState<TeamIntro | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    async function init() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
      const { supabase } = await import('@/lib/supabase');
      if (!alive) return;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!alive) return;
        const allowed = !!session?.user && !session.user.is_anonymous;
        setAccount(allowed);
        if (!allowed) { setEditing(null); setIntroDraft(null); setArchiveOpen(false); setRemoving(null); }
      });
      unsubscribe = () => subscription.unsubscribe();
    }
    void init();
    return () => { alive = false; unsubscribe?.(); };
  }, []);

  async function saveMember(draft: TeamMember, file: File | null) {
    if (!editing) return;
    setBusy(true); setError('');
    try {
      const { supabase } = await import('@/lib/supabase');
      let image = draft.image;
      if (file) {
        const optimized = await optimizeUpload(file);
        const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[optimized.type];
        const path = `${draft.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(photoBucket).upload(path, optimized, { contentType: optimized.type });
        if (uploadError) throw uploadError;
        image = supabase.storage.from(photoBucket).getPublicUrl(path).data.publicUrl;
      }
      const { id, sort_order, version, ...fields } = draft;
      void sort_order;
      const values = {
        ...fields, image, name: fields.name.trim(), role: fields.role.trim(),
        description: fields.description.trim(),
        skills: [...new Set(fields.skills.map(value => value.trim()).filter(Boolean))],
        tags: [...new Set(fields.tags.map(value => value.trim()).filter(Boolean))],
        link_url: fields.link_url.trim(), link_label: fields.link_label.trim(),
      };
      const result = editing.isNew
        ? await supabase.from(memberTable).insert({ ...values, id }).select().single()
        : await supabase.from(memberTable).update({ ...values, version: version + 1 }).eq('id', id).eq('version', version).select().maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) { setError('Questa scheda è stata modificata da un altro account oppure la sessione è scaduta. Ricarica la pagina prima di riprovare.'); return; }
      const saved = result.data as TeamMember;
      setMembers(current => editing.isNew ? [...current, saved] : current.map(member => member.id === id ? saved : member));
      setNotice(editing.isNew ? gallery ? `“${saved.name}” è in vetrina.` : `${saved.name} è stato aggiunto al team.` : `La scheda di ${saved.name} è stata aggiornata.`);
      setEditing(null);
    } catch { setError('Salvataggio non riuscito. I dati restano nel modulo: puoi riprovare.'); }
    finally { setBusy(false); }
  }

  async function saveIntro(event: FormEvent) {
    event.preventDefault();
    if (!introDraft || busy) return;
    setBusy(true); setError('');
    try {
      const { supabase } = await import('@/lib/supabase');
      const { id, version, ...fields } = introDraft;
      const { data, error: saveError } = await supabase.from(introTable).update({ ...fields, version: version + 1 }).eq('id', id).eq('version', version).select().maybeSingle();
      if (saveError) throw saveError;
      if (!data) { setError('Il testo è cambiato in un’altra sessione. Ricarica la pagina prima di riprovare.'); return; }
      setIntro(data as TeamIntro); setIntroDraft(null); setNotice('Introduzione aggiornata.');
    } catch { setError('Impossibile salvare. Riprova tra poco.'); }
    finally { setBusy(false); }
  }

  async function loadArchive() {
    setArchiveOpen(true); setArchiveError(''); setBusy(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.from(memberTable).select('*').eq('archived', true).order('sort_order');
      if (error) throw error;
      setArchivedMembers(data as TeamMember[]);
    } catch { setArchiveError('Impossibile caricare le opere rimosse. Riprova.'); }
    finally { setBusy(false); }
  }
  async function archiveMember(member: TeamMember, archived: boolean) {
    setBusy(true); setArchiveError('');
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.from(memberTable).update({ archived, version: member.version + 1 }).eq('id', member.id).eq('version', member.version).select().maybeSingle();
      if (error || !data) throw error || new Error('conflict');
      const saved = data as TeamMember;
      if (archived) {
        setMembers(current => current.filter(item => item.id !== member.id));
        setArchivedMembers(current => [...current, saved]);
      } else {
        setArchivedMembers(current => current.filter(item => item.id !== member.id));
        setMembers(current => [...current, saved].sort((a, b) => a.sort_order - b.sort_order));
      }
      setRemoving(null); setEditing(null);
      setNotice(archived ? `“${member.name}” è stata rimossa dalla vetrina. Puoi ripristinarla da Opere rimosse.` : `“${member.name}” è di nuovo in vetrina.`);
    } catch { setArchiveError('Operazione non riuscita: ricarica la pagina e verifica di essere ancora collegato.'); }
    finally { setBusy(false); }
  }

  function addMember() {
    setError('');
    setEditing({ isNew: true, member: {
      id: crypto.randomUUID(), name: '', role: '', description: '', skills: [], tags: [],
      image: '/team/placeholder.svg', photo_position: 50, ...(gallery ? { archived: false } : {}), link_url: '', link_label: '', version: 0, sort_order: 0,
    } });
  }

  return <>
    <PublicPageIntro number={gallery ? "03" : "02"} eyebrow={gallery ? "Arte a km 0" : "L’associazione"} title={<>{intro.title}<br />{intro.subtitle} <span>{intro.accent}</span></>} description={intro.description}>
      {account && <button type="button" className="text-link team-intro-edit" disabled={!ready} onClick={() => { setIntroDraft({ ...intro }); setError(''); }}><Pencil size={15} /> Modifica introduzione</button>}
    </PublicPageIntro>
    <div className={`content-width team-content${gallery ? " gallery-content" : ""}`}>
      <div role="status" className="team-notice">{notice}</div>
      {!ready && <p role="status" className="team-load-error">Impossibile caricare gli aggiornamenti. Ricarica la pagina per riprovare.</p>}
      {gallery && account && <div className="gallery-staff-tools"><button type="button" className="text-link" disabled={busy || !ready} onClick={() => archiveOpen ? setArchiveOpen(false) : void loadArchive()}>{archiveOpen ? 'Chiudi opere rimosse' : 'Opere rimosse'}</button></div>}
      {gallery && account && archiveOpen && <section className="gallery-archive" aria-label="Opere rimosse dalla vetrina">
        <h2>Opere rimosse</h2>
        {busy && <p role="status">Caricamento…</p>}
        {archiveError && <p role="alert">{archiveError}</p>}
        {!busy && !archiveError && !archivedMembers.length && <p>Nessuna opera rimossa.</p>}
        {archivedMembers.map(member => <div key={member.id}><span>{member.name}</span><button type="button" disabled={busy} onClick={() => void archiveMember(member, false)}>Rimetti in vetrina</button></div>)}
      </section>}
      {!members.length && <p>La vetrina è in aggiornamento. Le prossime opere arriveranno qui.</p>}
      <section className="team-grid" aria-label={gallery ? "Galleria della Factory" : "Il team Under The Tower Factory"}>
        {members.map((member, index) => <TiltCard key={member.id}>
          <div className="team-photo">
            {gallery ? <a href={member.image} target="_blank" rel="noopener noreferrer" aria-label={`Apri l’opera ${member.name}`}><Image src={member.image} alt={member.name} fill sizes="(min-width: 1100px) 33vw, (min-width: 640px) 50vw, 100vw" unoptimized={member.image.startsWith('https://')} /></a> : <Image src={member.image} alt={member.name} fill sizes="(min-width: 1100px) 33vw, (min-width: 640px) 50vw, 100vw" unoptimized={member.image.startsWith('https://')} style={{ objectPosition: `50% ${member.photo_position}%` }} />}
            <span className="team-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            {account && <button className="team-edit-button" type="button" disabled={!ready} onClick={() => { setError(''); setEditing({ member: { ...member }, isNew: false }); }}><Pencil size={14} /> Modifica<span className="sr-only"> {member.name}</span></button>}
          </div>
          <div className="team-card-copy">
            <h2>{member.name}</h2>
            <span className="team-role">{member.role}</span>
            <p>{member.description}</p>
            {member.skills.length > 0 && <div className="team-skills"><span>{gallery ? "TECNICHE / MATERIALI" : "COMPETENZE"}</span><ul>{member.skills.map(skill => <li key={skill}>{skill}</li>)}</ul></div>}
            {member.tags.length > 0 && <div className="team-tags">{member.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
            {member.link_url && <a href={member.link_url} className="text-link team-profile-link">{member.link_label || 'Scopri di più'}<ArrowUpRight size={17} /></a>}
          </div>
          <div className="team-card-edge" aria-hidden="true" />
        </TiltCard>)}
        {account && <button className="team-add-card" aria-label={gallery ? "Aggiungi opera alla galleria" : "Aggiungi persona al team"} type="button" disabled={!ready} onClick={addMember}>
          <span className="team-add-kicker">FACCIAMO SPAZIO</span><Plus size={64} strokeWidth={1} aria-hidden="true" />
          <span className="team-add-title">{gallery ? "Un nuovo pezzo." : "Una persona."}<br />Un’altra storia.</span>
          <span className="team-add-action">{gallery ? "Aggiungi alla galleria" : "Aggiungi al team"} <ArrowUpRight size={20} /></span>
        </button>}
      </section>
    </div>
    <Dialog open={!!editing} onOpenChange={open => { if (!open && !busy) setEditing(null); }}>
      <DialogContent className="lab-editor team-editor" showCloseButton={!busy}>
        <DialogTitle>{gallery ? (editing?.isNew ? 'Aggiungi un’opera' : 'Modifica opera') : (editing?.isNew ? 'Aggiungi una persona' : 'Modifica persona')}</DialogTitle>
        <DialogDescription>{gallery ? "Immagini, tecniche e storie dalla vetrina della Factory." : "Foto, parole e competenze: racconta chi fa parte della Factory."} Le modifiche salvate saranno pubbliche.</DialogDescription>
        {editing && <MemberForm gallery={gallery} requirePhoto={gallery && editing.isNew} key={editing.member.id} initial={editing.member} busy={busy} error={error} onSave={saveMember} onCancel={() => setEditing(null)} />}
        {gallery && editing && !editing.isNew && <button type="button" className="gallery-remove-button" disabled={busy} onClick={() => { setArchiveError(''); setRemoving(editing.member); }}>Rimuovi dalla vetrina</button>}
      </DialogContent>
    </Dialog>
    <Dialog open={!!removing} onOpenChange={open => { if (!open && !busy) setRemoving(null); }}>
      <DialogContent className="lab-editor" showCloseButton={!busy}><DialogTitle>Rimuovi dalla vetrina</DialogTitle><DialogDescription>“{removing?.name}” non sarà più visibile al pubblico. Potrai ripristinarla da Opere rimosse.</DialogDescription>{archiveError && <p role="alert">{archiveError}</p>}<div className="lab-editor-actions"><button type="button" disabled={busy} onClick={() => setRemoving(null)}>Annulla</button><button type="button" disabled={busy} onClick={() => removing && void archiveMember(removing, true)}>{busy ? 'Rimozione…' : 'Rimuovi opera'}</button></div></DialogContent>
    </Dialog>
    <Dialog open={!!introDraft} onOpenChange={open => { if (!open && !busy) setIntroDraft(null); }}>
      <DialogContent className="lab-editor team-editor" showCloseButton={!busy}>
        <DialogTitle>Modifica introduzione</DialogTitle><DialogDescription>Aggiorna il titolo e la presentazione della pagina.</DialogDescription>
        {introDraft && <form onSubmit={saveIntro}><fieldset disabled={busy}>
          {([['title', 'Prima riga del titolo'], ['subtitle', 'Seconda riga'], ['accent', 'Parola evidenziata']] as const).map(([key, label]) => <label key={key}>{label}<input required={key !== "subtitle" || !gallery} maxLength={80} value={introDraft[key]} onChange={event => setIntroDraft({ ...introDraft, [key]: event.target.value })} /></label>)}
          <label>Presentazione<textarea required maxLength={2000} value={introDraft.description} onChange={event => setIntroDraft({ ...introDraft, description: event.target.value })} /></label>
        </fieldset>{error && <p role="alert">{error}</p>}<div className="lab-editor-actions"><button type="button" disabled={busy} onClick={() => setIntroDraft(null)}>Annulla</button><button type="submit" disabled={busy}>{busy ? 'Salvataggio…' : 'Salva modifiche'}</button></div></form>}
      </DialogContent>
    </Dialog>
  </>;
}

function MemberForm({ initial, busy, error, onSave, onCancel, gallery, requirePhoto }: {
  initial: TeamMember; busy: boolean; error: string; gallery: boolean; requirePhoto: boolean;
  onSave: (member: TeamMember, file: File | null) => Promise<void>; onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [validation, setValidation] = useState('');
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function selectPhoto(selected?: File) {
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 10 * 1024 * 1024) {
      setValidation('Scegli una foto JPG, PNG o WebP fino a 10 MB.'); return;
    }
    setFile(selected); setPreview(URL.createObjectURL(selected)); setValidation('');
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (requirePhoto && !file) { setValidation('Scegli la foto dell’opera prima di salvarla.'); return; }
    if (!draft.name.trim() || !draft.role.trim() || !draft.description.trim()) { setValidation('Compila nome, sottotitolo e descrizione.'); return; }
    if (draft.link_url && !isSafeBioUrl(draft.link_url.trim())) { setValidation('Inserisci un link valido oppure lascia vuoto il campo.'); return; }
    if (draft.skills.length > 20 || draft.tags.length > 20) { setValidation('Inserisci al massimo 20 competenze e 20 tag.'); return; }
    setValidation(''); void onSave(draft, file);
  }
  return <form onSubmit={submit}>
    <fieldset disabled={busy}>
      <div className="team-editor-photo"><Image src={preview || draft.image} alt={gallery ? "Anteprima dell’opera" : "Anteprima del ritratto"} fill unoptimized style={{ objectPosition: `50% ${draft.photo_position}%` }} /></div>
      <label>Foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => selectPhoto(event.target.files?.[0])} /></label>
      <span className="team-field-hint">JPG, PNG o WebP, fino a 10 MB. La foto viene pubblicata solo al salvataggio.</span>
      {!gallery && <label>Inquadratura verticale<input type="range" min={0} max={100} value={draft.photo_position} onChange={event => setDraft({ ...draft, photo_position: Number(event.target.value) })} /></label>}
      <div className="team-editor-columns"><label>{gallery ? "Titolo dell’opera" : "Nome / titolo"}<input autoComplete="off" required maxLength={120} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label><label>{gallery ? "Autore / sottotitolo" : "Ruolo / sottotitolo"}<input required maxLength={160} value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value })} /></label></div>
      <label>Descrizione<textarea required maxLength={3000} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
      <label>{gallery ? "Tecniche e materiali (separati da virgola)" : "Competenze (separate da virgola)"}<input maxLength={500} value={draft.skills.join(',')} onChange={event => setDraft({ ...draft, skills: event.target.value.split(',') })} /></label>
      <label>Tag (separati da virgola)<input maxLength={500} value={draft.tags.join(',')} onChange={event => setDraft({ ...draft, tags: event.target.value.split(',') })} /></label>
      <div className="team-editor-columns"><label>{gallery ? "Link dell’opera (facoltativo)" : "Link personale (facoltativo)"}<input maxLength={2000} placeholder="https://…" value={draft.link_url} onChange={event => setDraft({ ...draft, link_url: event.target.value })} /></label><label>Testo del link<input maxLength={80} placeholder="Scopri di più" value={draft.link_label} onChange={event => setDraft({ ...draft, link_label: event.target.value })} /></label></div>
    </fieldset>
    {(validation || error) && <p role="alert">{validation || error}</p>}
    <div className="lab-editor-actions"><button type="button" disabled={busy} onClick={onCancel}>Annulla</button><button type="submit" disabled={busy}>{busy ? 'Salvataggio…' : gallery ? 'Salva opera' : 'Salva persona'}</button></div>
  </form>;
}
