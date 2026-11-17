'use client';

/* eslint-disable @next/next/no-img-element -- Le anteprime arrivano dall'agente locale, non dal loader di Next. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Folder,
  FolderPlus,
  HardDrive,
  ImageOff,
  Loader2,
  RefreshCw,
  Search,
  Tag,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getStaffRole } from '@/lib/staff-access';
import {
  formatDriveBytes,
  type DriveAsset,
  type DriveBackupStatus,
  type DriveIndexPayload,
  type DriveStatusPayload,
} from '@/lib/drive-model';

const BTN =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50';
const BTN_PRIMARY = `${BTN} bg-[#ff914d] text-zinc-950 hover:opacity-95`;
const BTN_SECONDARY = `${BTN} border border-zinc-700/80 bg-zinc-950/50 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/50`;

function assetMeta(asset: DriveAsset) {
  const parts = [asset.folderPath || 'radice', formatDriveBytes(asset.sizeBytes)];
  if (asset.width && asset.height) parts.push(`${asset.width}×${asset.height}`);
  if (asset.durationSeconds) parts.push(`${Math.round(asset.durationSeconds)}s`);
  return parts.join(' · ');
}

/** URL firmato per caricare direttamente al tunnel: null = si passa dal proxy Next. */
async function requestDirectUploadUrl(token: string, name: string, folder: string) {
  try {
    const response = await fetch('/api/drive/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, folder }),
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { url?: unknown };
    return typeof payload.url === 'string' ? payload.url : null;
  } catch {
    return null;
  }
}

/** Disco staccato prima dell'errore: un errore vecchio non deve sembrare un guasto attuale. */
function backupView(backup: DriveBackupStatus) {
  if (!backup.configured) {
    return {
      tone: 'border-zinc-800 bg-zinc-900/25 text-zinc-300',
      dot: 'bg-zinc-500',
      label: 'non configurata',
      detail: 'Nessun disco di copia impostato per l’agente.',
    };
  }
  if (!backup.mounted) {
    return {
      tone: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
      dot: 'bg-amber-400',
      label: 'disco non collegato',
      detail: `${backup.volume ?? 'Il disco di copia'} non è montato: la copia riparte da sola quando lo colleghi.`,
    };
  }
  if (backup.lastError) {
    return {
      tone: 'border-red-500/30 bg-red-500/10 text-red-300',
      dot: 'bg-red-400',
      label: 'copie ferme',
      detail: 'L’ultima copia è fallita: il dettaglio è qui sotto.',
    };
  }
  return {
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    dot: 'bg-emerald-400',
    label: 'disco collegato',
    detail: `Copia attiva su ${backup.volume ?? 'disco di copia'}.`,
  };
}

export default function DrivePage() {
  const [access, setAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFolder, setUploadFolder] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [busyAsset, setBusyAsset] = useState<string | null>(null);
  const [data, setData] = useState<DriveIndexPayload | null>(null);
  // File nell'indice al momento dell'ultimo caricamento completo: serve a capire
  // quanti ne sono comparsi dopo, senza contare il tetto dei 500 caricati.
  const [baselineAssets, setBaselineAssets] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('');

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Accedi all’Area Staff per aprire il drive.');

    const response = await fetch(path, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      let message = 'Operazione non riuscita.';
      try {
        message = (await response.json()).error || message;
      } catch {
        /* risposta non JSON: resta il messaggio generico */
      }
      throw new Error(message);
    }

    return response;
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError('');
      }
      try {
        if (silent) {
          // Solo numeri e stato: gli asset restano quelli in pagina, quindi le
          // anteprime non ricevono URL firmati nuovi e il browser non le riscarica.
          const status = (await (await request('/api/drive/status')).json()) as DriveStatusPayload;
          setData((previous) =>
            previous
              ? {
                  ...previous,
                  agent: status.agent,
                  folders: status.folders,
                  syncedAt: status.syncedAt,
                  totals: status.totals,
                }
              : previous,
          );
          return;
        }

        const payload = (await (await request('/api/drive')).json()) as DriveIndexPayload;
        setData(payload);
        setBaselineAssets(payload.totals.assets);
      } catch (loadError) {
        // Un aggiornamento silenzioso non cancella dati o errori visibili: ci pensa
        // il prossimo Aggiorna a mostrare cosa non va.
        if (silent) return;
        setData(null);
        setBaselineAssets(null);
        setError(
          loadError instanceof Error ? loadError.message : 'Indice del drive non disponibile.',
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [request],
  );

  useEffect(() => {
    let alive = true;
    let generation = 0;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = ++generation;
      setAccess(false);
      if (!session) {
        setLoading(false);
        setError('Accedi all’Area Staff per consultare il drive.');
        return;
      }
      setTimeout(() => {
        void getStaffRole(supabase, session.user)
          .then((role) => {
            if (!alive || current !== generation) return;
            if (!role) {
              setError('Accesso riservato allo staff autorizzato.');
              setLoading(false);
              return;
            }
            setAccess(true);
          })
          .catch(() => {
            if (!alive) return;
            setLoading(false);
            setError('Impossibile verificare l’accesso.');
          });
      }, 0);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!access) return;
    const timer = setTimeout(() => void load(), 150);
    return () => clearTimeout(timer);
  }, [access, load]);

  // Spazio e file cambiano anche senza di noi: si rileggono senza svuotare la griglia.
  // Senza indice in pagina non c'è nulla da aggiornare in modo silenzioso.
  const hasData = data !== null;
  useEffect(() => {
    if (!access || !hasData) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, 60_000);
    return () => clearInterval(timer);
  }, [access, hasData, load]);

  async function syncIndex() {
    setSyncing(true);
    setError('');
    try {
      await request('/api/drive/sync', { method: 'POST' });
      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Sincronizzazione non riuscita.');
    } finally {
      setSyncing(false);
    }
  }

  async function uploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError('Accedi all’Area Staff per caricare file.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      for (const [index, file] of files.entries()) {
        setUploadStatus(`Carico ${index + 1}/${files.length} · ${file.name}`);
        const directUrl = await requestDirectUploadUrl(
          session.access_token,
          file.name,
          uploadFolder,
        );

        await new Promise<void>((resolve, reject) => {
          const params = new URLSearchParams({ name: file.name });
          if (uploadFolder) params.set('folder', uploadFolder);

          const xhr = new XMLHttpRequest();
          // Diretto al tunnel: il limite di 4,5 MB delle funzioni Vercel non vale.
          xhr.open('POST', directUrl ?? `/api/drive/upload?${params.toString()}`);
          if (!directUrl) xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
          xhr.setRequestHeader('Content-Type', 'application/octet-stream');
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadStatus(`Carico ${index + 1}/${files.length} · ${file.name} · ${percent}%`);
          };
          xhr.onload = () => {
            if (xhr.status === 201 || xhr.status === 200) return resolve();
            let message = `HTTP ${xhr.status}`;
            try {
              message = JSON.parse(xhr.responseText).error || message;
            } catch {
              /* risposta non JSON: resta lo stato HTTP */
            }
            reject(new Error(`${file.name}: ${message}`));
          };
          xhr.onerror = () => reject(new Error(`${file.name}: errore di rete`));
          xhr.send(file);
        });
      }

      setUploadStatus('Aggiorno l’indice…');
      await request('/api/drive/sync', { method: 'POST' });
      await load();
      setUploadStatus(`✓ ${files.length} file caricati in ${uploadFolder || 'radice'}`);
    } catch (uploadError) {
      setUploadStatus('');
      setError(uploadError instanceof Error ? uploadError.message : 'Caricamento non riuscito.');
    } finally {
      setUploading(false);
    }
  }

  async function createFolder() {
    const suggested = folder ? `${folder}/` : '';
    const value = window.prompt(
      'Nome della nuova cartella (puoi usare un percorso, es. Foto/2026)',
      suggested,
    );
    if (!value?.trim()) return;

    setCreating(true);
    setError('');
    try {
      await request('/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: value.trim() }),
      });
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Cartella non creata.');
    } finally {
      setCreating(false);
    }
  }

  async function changeTag(asset: DriveAsset, action: 'add' | 'remove', tagName?: string) {
    const value = action === 'add' ? window.prompt(`Nuovo tag per "${asset.name}"`) : tagName;
    if (!value) return;

    setBusyAsset(asset.id);
    setError('');
    try {
      await request('/api/drive/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: asset.id, tag: value, action }),
      });
      await load();
    } catch (tagError) {
      setError(tagError instanceof Error ? tagError.message : 'Tag non aggiornato.');
    } finally {
      setBusyAsset(null);
    }
  }

  const folders = useMemo(() => data?.folders ?? [], [data]);
  const assets = useMemo(() => data?.assets ?? [], [data]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assets.filter((asset) => {
      const inFolder =
        !folder || asset.folderPath === folder || asset.folderPath.startsWith(`${folder}/`);
      const hit =
        !term ||
        [asset.name, asset.relPath, ...asset.tags.map((tag) => tag.name)]
          .join(' ')
          .toLowerCase()
          .includes(term);
      return inFolder && hit;
    });
  }, [assets, folder, search]);

  // Se l'agente non risponde lo stato della copia sarebbe un falso "non configurata".
  const backup = data?.agent.reachable ? backupView(data.agent.backup) : null;

  // Il refresh silenzioso aggiorna solo i numeri: se sono comparsi file nuovi la
  // griglia è vecchia, e lo diciamo invece di ricaricare le anteprime da soli.
  const pendingAssets =
    data && baselineAssets !== null ? Math.max(0, data.totals.assets - baselineAssets) : 0;

  return (
    <main className="min-h-screen bg-zinc-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
        >
          <ChevronLeft size={18} /> Gestionale
        </Link>

        <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-[#ff914d]">Area Staff / Media</p>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold">
              <HardDrive size={26} className="shrink-0 text-[#ff914d]" /> Drive foto e video
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
              I file restano sul disco Hiksemi: qui c’è l’indice con hash e tag, le anteprime le
              genera l’agente locale. Nessun byte caricato su Supabase.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={uploadFolder}
              onChange={(event) => setUploadFolder(event.target.value)}
              disabled={uploading || !access}
              aria-label="Cartella di destinazione del caricamento"
              className="h-10 rounded-lg border border-zinc-700/80 bg-zinc-950/50 px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-[#ff914d]/45 disabled:opacity-50"
            >
              <option value="">radice</option>
              {folders.map((item) => (
                <option key={item.path} value={item.path}>
                  {item.path}
                </option>
              ))}
            </select>
            <label
              className={`${BTN_PRIMARY} ${
                uploading || !access ? 'pointer-events-none opacity-50' : 'cursor-pointer'
              }`}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Carica file
              <input
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  void uploadFiles(event.target.files);
                  event.target.value = '';
                }}
              />
            </label>
            <button type="button" onClick={() => void load()} disabled={loading} className={BTN_SECONDARY}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Aggiorna
            </button>
            <button
              type="button"
              onClick={() => void createFolder()}
              disabled={creating || !access}
              className={BTN_SECONDARY}
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <FolderPlus size={16} />}
              Nuova cartella
            </button>
            <button
              type="button"
              onClick={() => void syncIndex()}
              disabled={syncing || !access}
              className={BTN_PRIMARY}
            >
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <HardDrive size={16} />}
              Sincronizza indice
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        {uploadStatus && (
          <p role="status" className="mt-4 text-xs text-zinc-400">
            {uploadStatus}
          </p>
        )}

        {!access && !loading && (
          <p className="mt-6 text-sm text-zinc-400">
            <Link href="/login?next=%2Fdrive" className="underline">
              Accedi all’Area Staff
            </Link>{' '}
            per consultare il drive.
          </p>
        )}

        {access && data && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'File indicizzati', value: String(data.totals.assets) },
                { label: 'Spazio indicizzato', value: formatDriveBytes(data.totals.bytes) },
                { label: 'Cartelle', value: String(folders.length) },
                {
                  label: 'Liberi sul disco',
                  value: data.agent.freeBytes !== null ? formatDriveBytes(data.agent.freeBytes) : '--',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-zinc-800/80 bg-zinc-900/25 p-5"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {!data.agent.reachable && (
              <div className="mt-4 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p>{data.agent.error}</p>
                  {data.agent.local ? (
                    <p className="mt-1 text-xs text-amber-200/80">
                      L’agente ascolta solo in locale: controlla che Hiksemi sia collegato e il job
                      attivo (
                      <code className="font-mono">
                        launchctl kickstart -k gui/$(id -u)/com.uttf.drive-agent
                      </code>
                      ), poi premi Sincronizza indice.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-200/80">
                      Dal Mac il drive funziona già: per usarlo anche dal sito serve il tunnel
                      Cloudflare verso l’agente, con il suo indirizzo in{' '}
                      <code className="font-mono">DRIVE_AGENT_URL</code> e il service token di Access.
                    </p>
                  )}
                </div>
              </div>
            )}

            {backup && (
              <section className={`mt-4 rounded-2xl border px-5 py-4 ${backup.tone}`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span aria-hidden className={`h-2 w-2 rounded-full ${backup.dot}`} />
                  <p className="text-sm font-semibold">Copia di sicurezza: {backup.label}</p>
                  <p className="text-xs opacity-80">{backup.detail}</p>
                </div>
                <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider opacity-60">Ultima copia</dt>
                    <dd className="mt-1 tabular-nums">
                      {data.agent.backup.lastCopyAt
                        ? new Date(data.agent.backup.lastCopyAt).toLocaleString('it-IT')
                        : 'nessuna da quando l’agente è attivo'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider opacity-60">File in coda</dt>
                    <dd className="mt-1 tabular-nums">{data.agent.backup.pending}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider opacity-60">Ultimo errore</dt>
                    <dd className="mt-1 break-words">{data.agent.backup.lastError ?? 'nessuno'}</dd>
                  </div>
                </dl>
              </section>
            )}

            {pendingAssets > 0 && (
              <div
                role="status"
                className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ff914d]/30 bg-[#ff914d]/10 px-4 py-3 text-sm"
              >
                <p className="text-[#ffd7b8]">
                  {pendingAssets === 1 ? '1 nuovo file' : `${pendingAssets} nuovi file`} sul disco
                  dall’ultimo aggiornamento.
                </p>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className={BTN_SECONDARY}
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Ricarica indice
                </button>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cerca per nome, percorso o tag"
                  className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/50 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-[#ff914d]/45"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFolder('');
                    setUploadFolder('');
                  }}
                  className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors ${
                    folder === ''
                      ? 'bg-[#ff914d] text-zinc-950'
                      : 'border border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Folder size={14} /> Tutte
                </button>
                {folders.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      setFolder(item.path);
                      setUploadFolder(item.path);
                    }}
                    className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors ${
                      folder === item.path
                        ? 'bg-[#ff914d] text-zinc-950'
                        : 'border border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Folder size={14} /> {item.path}
                    <span className="tabular-nums opacity-60">{item.assetCount}</span>
                  </button>
                ))}
              </div>

              <p className="text-xs text-zinc-500">
                {visible.length} di {data.totals.assets} file
                {assets.length < data.totals.assets
                  ? ` · mostrati i primi ${assets.length}`
                  : ''}
                {data.syncedAt
                  ? ` · aggiornato ${new Date(data.syncedAt).toLocaleString('it-IT')}`
                  : ''}
              </p>
            </div>

            {visible.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-sm text-zinc-400">
                {assets.length === 0 ? (
                  <>
                    <p className="font-semibold text-zinc-200">Nessun file nell’indice.</p>
                    <p className="mt-2">
                      Con Hiksemi collegato e l’agente attivo, premi{' '}
                      <span className="text-[#ff914d]">Sincronizza indice</span>: l’indice legge i
                      file già presenti sul disco senza ricaricarli.
                    </p>
                  </>
                ) : (
                  <p>Nessun file corrisponde a questa ricerca.</p>
                )}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((asset) => (
                  <article
                    key={asset.id}
                    className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/25 transition-colors hover:border-[#ff914d]/35"
                  >
                    <a
                      href={asset.directFileUrl ?? asset.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex aspect-[4/3] items-center justify-center bg-zinc-950/60"
                      title={`Apri ${asset.name}`}
                    >
                      {asset.thumbUrl ? (
                        <img
                          src={asset.thumbUrl}
                          alt={asset.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex flex-col items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                          <ImageOff size={22} /> {asset.kind}
                        </span>
                      )}
                    </a>

                    <div className="space-y-2 p-4">
                      <p className="truncate text-sm font-semibold text-zinc-100" title={asset.name}>
                        {asset.name}
                      </p>
                      <p className="truncate text-[11px] text-zinc-500">{assetMeta(asset)}</p>
                      <p className="font-mono text-[10px] text-zinc-600">
                        {asset.sha256.slice(0, 12)}
                        {asset.duplicateOf ? ' · duplicato' : ''}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {asset.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 rounded-full border border-[#ff914d]/30 bg-[#ff914d]/10 px-2 py-0.5 text-[10px] font-semibold text-[#ff914d]"
                          >
                            {tag.name}
                            <button
                              type="button"
                              aria-label={`Rimuovi tag ${tag.name}`}
                              disabled={busyAsset === asset.id}
                              onClick={() => void changeTag(asset, 'remove', tag.name)}
                              className="hover:text-white disabled:opacity-40"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                        <button
                          type="button"
                          disabled={busyAsset === asset.id}
                          onClick={() => void changeTag(asset, 'add')}
                          className="inline-flex items-center gap-1 rounded-full border border-zinc-700/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40"
                        >
                          {busyAsset === asset.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Tag size={10} />
                          )}
                          Tag
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {access && !data && loading && (
          <p role="status" className="mt-8 flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 size={16} className="animate-spin" /> Caricamento indice…
          </p>
        )}
      </div>
    </main>
  );
}
