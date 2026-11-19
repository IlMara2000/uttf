'use client';

/* eslint-disable @next/next/no-img-element -- Le anteprime arrivano dall'agente locale, non dal loader di Next. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  Folder,
  FolderPlus,
  HardDrive,
  ImageOff,
  LayoutGrid,
  List,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  Pencil,
  Search,
  Tag,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TOKEN_EXPIRY_MARGIN_MS } from '@/lib/auth-cookie';
import { getStaffRole } from '@/lib/staff-access';
import {
  formatDriveBytes,
  type DriveAsset,
  type DriveBackupStatus,
  type DriveIndexPayload,
  type DriveStatusPayload,
} from '@/lib/drive-model';

const TOOL =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-300 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-40';
const SIDE =
  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors';
const SIDE_ON = 'bg-[#ff914d]/20 font-semibold text-white';
const SIDE_OFF = 'text-zinc-300 hover:bg-white/5';

/** Cartella in stile Finder, nei colori del sito. */
function FolderIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 52" className={className} aria-hidden>
      <defs>
        <linearGradient id="uttf-folder-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9732f" />
          <stop offset="1" stopColor="#b85a1c" />
        </linearGradient>
        <linearGradient id="uttf-folder-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb27a" />
          <stop offset="1" stopColor="#ff914d" />
        </linearGradient>
      </defs>
      <path
        d="M4 8a5 5 0 0 1 5-5h14.5a5 5 0 0 1 3.8 1.7l2.4 2.8a3 3 0 0 0 2.3 1H55a5 5 0 0 1 5 5v31a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"
        fill="url(#uttf-folder-back)"
      />
      <rect x="4" y="16" width="56" height="33" rx="5" fill="url(#uttf-folder-front)" />
      <rect x="4" y="16" width="56" height="2" rx="1" fill="#fff" opacity=".28" />
    </svg>
  );
}

const BTN =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50';
const BTN_SECONDARY = `${BTN} border border-zinc-700/80 bg-zinc-950/50 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/50`;

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
  const [folderMenu, setFolderMenu] = useState<string | null>(null);
  const [folderBusy, setFolderBusy] = useState<string | null>(null);
  // Selezione multipla: si apre tenendo premuto su una scheda (o col pulsante
  // Seleziona) senza pre-selezionare nulla, poi si toccano i file da gestire.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [moveTargetOpen, setMoveTargetOpen] = useState(false);
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [view, setView] = useState<'icons' | 'list'>('icons');
  const [showAll, setShowAll] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failedPollsRef = useRef(0);
  const tokenRef = useRef<{ token: string; expiresAt: number } | null>(null);

  // Token in memoria, aggiornato da onAuthStateChange. Una getSession() per
  // chiamata acquisiva il lock di auth-js: caricamento, polling e azioni a
  // raffica finivano in fila, e una sessione in scadenza faceva partire il
  // refresh da ogni chiamata.
  const getAccessToken = useCallback(async () => {
    const cached = tokenRef.current;
    // Stesso margine di auth-js (TOKEN_EXPIRY_MARGIN_MS = 90 s): sotto quella
    // soglia si lascia rinnovare a getSession(), che attende il refresh una volta sola.
    if (cached && cached.expiresAt * 1000 - Date.now() > TOKEN_EXPIRY_MARGIN_MS) return cached.token;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      tokenRef.current = null;
      return null;
    }
    tokenRef.current = { token: session.access_token, expiresAt: session.expires_at ?? 0 };
    return session.access_token;
  }, []);

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await getAccessToken();
    if (!token) throw new Error('Accedi all’Area Staff per aprire il drive.');

    const response = await fetch(path, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
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
  }, [getAccessToken]);

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
          // Un solo controllo fallito non spegne l'agente in pagina: serve il secondo di fila.
          if (status.agent.reachable) failedPollsRef.current = 0;
          else failedPollsRef.current += 1;
          setData((previous) =>
            previous
              ? {
                  ...previous,
                  agent:
                    !status.agent.reachable && previous.agent.reachable && failedPollsRef.current < 2
                      ? previous.agent
                      : status.agent,
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
      tokenRef.current = session?.access_token
        ? { token: session.access_token, expiresAt: session.expires_at ?? 0 }
        : null;
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
    if (!folderMenu) return;
    const close = () => setFolderMenu(null);
    const handle = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-folder-menu]')) return;
      close();
    };
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, [folderMenu]);

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
    setUploadStatus('Analizzo la cartella dell’hardisk…');
    try {
      const result = (await (await request('/api/drive/sync', { method: 'POST' })).json()) as {
        synced?: number;
        removed?: number;
      };
      await load();
      const removed = result.removed ?? 0;
      setUploadStatus(
        `✓ Hardisk analizzato: ${result.synced ?? 0} file${
          removed > 0 ? `, ${removed} non più presenti tolti dall’elenco` : ', nessun file rimosso'
        }`,
      );
    } catch (syncError) {
      setUploadStatus('');
      setError(syncError instanceof Error ? syncError.message : 'Analisi dell’hardisk non riuscita.');
    } finally {
      setSyncing(false);
    }
  }

  async function uploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    const token = await getAccessToken();
    if (!token) {
      setError('Accedi all’Area Staff per caricare file.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      for (const [index, file] of files.entries()) {
        setUploadStatus(`Carico ${index + 1}/${files.length} · ${file.name}`);
        const directUrl = await requestDirectUploadUrl(token, file.name, uploadFolder);

        await new Promise<void>((resolve, reject) => {
          const params = new URLSearchParams({ name: file.name });
          if (uploadFolder) params.set('folder', uploadFolder);

          const xhr = new XMLHttpRequest();
          // Diretto al tunnel: il limite di 4,5 MB delle funzioni Vercel non vale.
          xhr.open('POST', directUrl ?? `/api/drive/upload?${params.toString()}`);
          if (!directUrl) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
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
      await request('/api/drive/sync', { method: 'POST' });
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Cartella non creata.');
    } finally {
      setCreating(false);
    }
  }

  async function renameFolder(folderPath: string) {
    const value = window.prompt('Nuovo nome della cartella', folderPath);
    if (!value?.trim() || value.trim() === folderPath) {
      setFolderMenu(null);
      return;
    }
    setFolderBusy(folderPath);
    setError('');
    try {
      await request('/api/drive/folders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: folderPath, to: value.trim() }),
      });
      await request('/api/drive/sync', { method: 'POST' });
      await load();
      if (folder === folderPath) setFolder(value.trim());
      if (uploadFolder === folderPath) setUploadFolder(value.trim());
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Rinomina non riuscita.');
    } finally {
      setFolderBusy(null);
      setFolderMenu(null);
    }
  }

  async function deleteFolder(folderPath: string) {
    if (
      !window.confirm(
        `Eliminare la cartella "${folderPath}"? I file non si cancellano: passano nella cartella superiore.`,
      )
    ) {
      setFolderMenu(null);
      return;
    }
    setFolderBusy(folderPath);
    setError('');
    try {
      await request('/api/drive/folders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: folderPath }),
      });
      await request('/api/drive/sync', { method: 'POST' });
      await load();
      if (folder === folderPath || folder.startsWith(`${folderPath}/`)) {
        // I file recuperati finiscono nella cartella superiore: ci portiamo lì,
        // non alla radice, così l'utente li ritrova subito.
        const parent = folderPath.includes('/')
          ? folderPath.slice(0, folderPath.lastIndexOf('/'))
          : '';
        setFolder(parent);
        setUploadFolder(parent);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Cancellazione non riuscita.');
    } finally {
      setFolderBusy(null);
      setFolderMenu(null);
    }
  }

  function startSelection() {
    setSelectionMode(true);
    setSelected([]);
    setMoveTargetOpen(false);
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelected([]);
    setMoveTargetOpen(false);
    setSelectionBusy(false);
  }

  function toggleSelected(id: string) {
    setSelected((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    );
  }

  function beginLongPress() {
    cancelLongPress();
    // Già in selezione: un tocco prolungato non deve azzerare i file già scelti.
    if (selectionMode) return;
    longPressRef.current = setTimeout(() => {
      longPressRef.current = null;
      // Solo la modalità: nessun file pre-selezionato.
      startSelection();
    }, 450);
  }

  function cancelLongPress() {
    if (!longPressRef.current) return;
    clearTimeout(longPressRef.current);
    longPressRef.current = null;
  }

  /** Chiamate comuni alle azioni sulla selezione: agente, indice, griglia. */
  async function runSelectionAction(body: Record<string, unknown>) {
    setSelectionBusy(true);
    setError('');
    try {
      await request('/api/drive/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await request('/api/drive/sync', { method: 'POST' });
      await load();
      exitSelection();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Operazione non riuscita.');
    } finally {
      setSelectionBusy(false);
    }
  }

  async function moveSelected(target: string) {
    if (selected.length === 0) return;
    await runSelectionAction({ action: 'move', ids: selected, folder: target });
  }

  async function createFolderFromSelection() {
    if (selected.length === 0) return;
    const suggested = folder ? `${folder}/` : '';
    const value = window.prompt(
      'Nome della nuova cartella che raccoglie i file selezionati',
      suggested,
    );
    if (!value?.trim()) return;
    const target = value.trim();

    setSelectionBusy(true);
    setError('');
    try {
      await request('/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: target }),
      });
      await request('/api/drive/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', ids: selected, folder: target }),
      });
      await request('/api/drive/sync', { method: 'POST' });
      await load();
      setFolder(target);
      setUploadFolder(target);
      exitSelection();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Cartella non creata.');
    } finally {
      setSelectionBusy(false);
    }
  }

  async function renameSelected() {
    const asset = (data?.assets ?? []).find((item) => item.id === selected[0]);
    if (!asset) return;
    const nextName = window.prompt('Nuovo nome del file', asset.name)?.trim() ?? '';
    // Annullato, vuoto o invariato: la selezione resta com'era e il pannello
    // resta aperto; a operazione riuscita ci pensa exitSelection.
    if (!nextName || nextName === asset.name) return;
    await runSelectionAction({ action: 'rename', ids: [asset.id], name: nextName });
  }

  async function deleteSelected() {
    if (selected.length === 0) return;
    const question =
      selected.length === 1
        ? 'Cestinare il file selezionato?'
        : `Cestinare i ${selected.length} file selezionati?`;
    if (!window.confirm(question)) return;
    await runSelectionAction({ action: 'delete', ids: selected });
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

  // Destinazioni possibili per lo spostamento: radice e ogni cartella reale,
  // meno quella dove stanno già tutti i file scelti. Con una selezione mista
  // ogni destinazione è legittima, radice compresa (nella vista "Tutte" la
  // vecchia regola toglieva proprio la radice).
  const moveTargets = useMemo(() => {
    const all = ['', ...folders.map((item) => item.path)];
    const from = new Set(
      assets.filter((asset) => selected.includes(asset.id)).map((asset) => asset.folderPath),
    );
    if (from.size !== 1) return all;
    const [only] = from;
    return all.filter((item) => item !== only);
  }, [assets, folders, selected]);

  // Se l'agente non risponde lo stato della copia sarebbe un falso "non configurata".
  const backup = data?.agent.reachable ? backupView(data.agent.backup) : null;

  // Sincronizzazione, caricamenti e nuove cartelle passano dall'agente: se questa
  // pagina non lo raggiunge (Vercel senza tunnel) si spengono.
  const canUseAgent = access && data !== null && (data.agent.reachable || data.agent.local);

  // Il refresh silenzioso aggiorna solo i numeri: se sono comparsi file nuovi la
  // griglia è vecchia, e lo diciamo invece di ricaricare le anteprime da soli.
  const pendingAssets =
    data && baselineAssets !== null ? Math.max(0, data.totals.assets - baselineAssets) : 0;

  const searching = search.trim().length > 0;

  const openFolder = useCallback((path: string) => {
    setFolderMenu(null);
    setShowAll(false);
    setFolder(path);
    setUploadFolder(path);
  }, []);

  // Sottocartelle dirette della cartella aperta, come nel Finder. Le intermedie
  // che non risultano nell'indice si ricavano dai percorsi dei discendenti.
  const childFolders = useMemo(() => {
    const prefix = folder ? `${folder}/` : '';
    const map = new Map<string, { path: string; name: string; count: number }>();
    for (const item of folders) {
      if (prefix && !item.path.startsWith(prefix)) continue;
      const rest = item.path.slice(prefix.length);
      if (!rest) continue;
      const name = rest.split('/')[0];
      const path = `${prefix}${name}`;
      const entry = map.get(path) ?? { path, name, count: 0 };
      entry.count = Math.max(entry.count, item.assetCount);
      map.set(path, entry);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'it', { numeric: true }));
  }, [folders, folder]);

  const breadcrumb = useMemo(() => {
    const parts = folder ? folder.split('/') : [];
    return parts.map((name, index) => ({ name, path: parts.slice(0, index + 1).join('/') }));
  }, [folder]);

  // Ricerca e "Tutti i file" guardano tutto l'indice (dentro la cartella aperta);
  // altrimenti si vedono solo i file direttamente contenuti, come nel Finder.
  const files = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (term) {
        const inside =
          !folder || asset.folderPath === folder || asset.folderPath.startsWith(`${folder}/`);
        if (!inside) return false;
        return [asset.name, asset.relPath, ...asset.tags.map((tag) => tag.name)]
          .join(' ')
          .toLowerCase()
          .includes(term);
      }
      if (showAll) return true;
      return asset.folderPath === folder;
    });
  }, [assets, folder, search, showAll]);

  const shownFolders = searching || showAll ? [] : childFolders;
  const title = showAll ? 'Tutti i file' : (breadcrumb[breadcrumb.length - 1]?.name ?? 'Drive');

  function openProps(asset: DriveAsset) {
    return {
      href: asset.directFileUrl ?? asset.fileUrl,
      target: '_blank',
      rel: 'noreferrer',
      draggable: false,
      onPointerDown: () => beginLongPress(),
      onPointerUp: cancelLongPress,
      onPointerLeave: cancelLongPress,
      onPointerCancel: cancelLongPress,
      onClick: (event: { preventDefault: () => void }) => {
        if (!selectionMode) return;
        event.preventDefault();
        toggleSelected(asset.id);
      },
      title: selectionMode ? `Seleziona ${asset.name}` : `Apri ${asset.name}`,
    };
  }

  function tagChips(asset: DriveAsset) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-1">
        {asset.tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full bg-[#ff914d]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#ff914d]"
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
          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200 disabled:opacity-40"
        >
          {busyAsset === asset.id ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Tag size={10} />
          )}
          Tag
        </button>
      </div>
    );
  }

  function thumbFallback(asset: DriveAsset, size: number) {
    return asset.kind === 'video' ? <Film size={size} /> : <ImageOff size={size} />;
  }

  function folderMenuPanel(path: string) {
    return (
      <div
        inert={folderMenu !== path}
        className={`absolute right-1 top-9 z-30 min-w-[150px] origin-top-right overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900/95 shadow-xl shadow-black/50 backdrop-blur transition-all duration-150 ${
          folderMenu === path ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={() => void renameFolder(path)}
          disabled={folderBusy === path}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          <Pencil size={13} /> Rinomina
        </button>
        <button
          type="button"
          onClick={() => void deleteFolder(path)}
          disabled={folderBusy === path}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        >
          <Trash2 size={13} /> Cancella
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
        >
          <ChevronLeft size={18} /> Gestionale
        </Link>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-widest text-[#ff914d]">Area Staff / Media</p>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold md:text-3xl">
            <HardDrive size={24} className="shrink-0 text-[#ff914d]" /> Drive foto e video
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            I file restano sul disco Hiksemi: qui c’è l’indice con hash e tag, le anteprime le
            genera l’agente locale. Nessun byte caricato su Supabase.
          </p>
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
                      ), poi premi Sincronizza Hardisk.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-200/80">
                      Di solito basta un minuto: il tunnel si riconnette da solo. Se resta così,
                      riavvia l’agente sul Mac. Intanto puoi consultare i file già indicizzati.
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
                  Aggiorna elenco
                </button>
              </div>
            )}

            {selectionMode && (
              <div className="mt-4 rounded-xl border border-[#ff914d]/30 bg-[#ff914d]/10 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#ffd7b8]">
                    {selected.length === 0
                      ? 'Tocca i file da gestire'
                      : `${selected.length} ${selected.length === 1 ? 'file selezionato' : 'file selezionati'}`}
                  </p>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void createFolderFromSelection()}
                      disabled={selected.length === 0 || selectionBusy || !canUseAgent}
                      className={`${BTN_SECONDARY} h-9 px-3 text-xs`}
                    >
                      {selectionBusy ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <FolderPlus size={14} />
                      )}
                      Crea cartella
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoveTargetOpen((open) => !open)}
                      disabled={selected.length === 0 || selectionBusy || !canUseAgent}
                      className={`${BTN_SECONDARY} h-9 px-3 text-xs`}
                    >
                      <Folder size={14} /> Sposta in…
                    </button>
                    <button
                      type="button"
                      onClick={() => void renameSelected()}
                      disabled={selected.length !== 1 || selectionBusy || !canUseAgent}
                      className={`${BTN_SECONDARY} h-9 px-3 text-xs`}
                    >
                      <Pencil size={14} /> Rinomina
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSelected()}
                      disabled={selected.length === 0 || selectionBusy || !canUseAgent}
                      className={`${BTN} h-9 border border-red-500/40 bg-red-500/10 px-3 text-xs text-red-300 hover:bg-red-500/20`}
                    >
                      {selectionBusy ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Elimina
                    </button>
                    <button
                      type="button"
                      onClick={exitSelection}
                      className={`${BTN_SECONDARY} h-9 px-3 text-xs`}
                    >
                      <X size={14} /> Annulla
                    </button>
                  </div>
                </div>

                {moveTargetOpen && (
                  <div className="mt-3 rounded-xl border border-zinc-700/80 bg-zinc-900/70 p-2">
                    <p className="px-2 pb-1 text-[10px] uppercase tracking-wider text-zinc-500">
                      Sposta i file selezionati in
                    </p>
                    <div className="flex max-h-48 flex-col overflow-y-auto">
                      {moveTargets.map((target) => (
                        <button
                          key={target || 'root'}
                          type="button"
                          disabled={selectionBusy}
                          onClick={() => void moveSelected(target)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-50"
                        >
                          <Folder size={14} className="text-[#ff914d]" />
                          {target || 'Radice del drive'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}


            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30 shadow-2xl shadow-black/40">
              {/* Barra degli strumenti, come la finestra del Finder */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-zinc-800/80 bg-zinc-900/70 px-3 py-2.5">
                <div className="mr-1 hidden items-center gap-1.5 sm:flex" aria-hidden>
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openFolder(folder.includes('/') ? folder.slice(0, folder.lastIndexOf('/')) : '')
                  }
                  disabled={!folder && !showAll}
                  className={TOOL}
                  aria-label="Cartella superiore"
                  title="Cartella superiore"
                >
                  <ChevronLeft size={18} />
                </button>
                <nav
                  aria-label="Percorso"
                  className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap text-sm"
                >
                  <button
                    type="button"
                    onClick={() => openFolder('')}
                    className={`rounded-md px-2 py-1 transition-colors hover:bg-white/10 ${
                      !folder && !showAll ? 'font-semibold text-white' : 'text-zinc-400'
                    }`}
                  >
                    {showAll ? 'Tutti i file' : 'Drive'}
                  </button>
                  {breadcrumb.map((part, index) => (
                    <span key={part.path} className="flex items-center gap-0.5">
                      <ChevronRight size={14} className="shrink-0 text-zinc-600" />
                      <button
                        type="button"
                        onClick={() => openFolder(part.path)}
                        className={`rounded-md px-2 py-1 transition-colors hover:bg-white/10 ${
                          index === breadcrumb.length - 1 ? 'font-semibold text-white' : 'text-zinc-400'
                        }`}
                      >
                        {part.name}
                      </button>
                    </span>
                  ))}
                </nav>

                <div className="flex items-center rounded-lg bg-zinc-800/70 p-0.5" role="group" aria-label="Vista">
                  <button
                    type="button"
                    onClick={() => setView('icons')}
                    aria-pressed={view === 'icons'}
                    title="Vista a icone"
                    className={`inline-flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
                      view === 'icons' ? 'bg-zinc-600/70 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    aria-pressed={view === 'list'}
                    title="Vista a elenco"
                    className={`inline-flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
                      view === 'list' ? 'bg-zinc-600/70 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <List size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-0.5">
                  <label
                    className={`${TOOL} ${
                      uploading || !canUseAgent ? 'pointer-events-none opacity-40' : 'cursor-pointer'
                    }`}
                    title={`Carica${uploadFolder ? ` in ${uploadFolder.split('/').pop()}` : ' file'}`}
                  >
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
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
                  <button
                    type="button"
                    onClick={() => void createFolder()}
                    disabled={creating || !canUseAgent}
                    className={TOOL}
                    title="Nuova cartella"
                    aria-label="Nuova cartella"
                  >
                    {creating ? <Loader2 size={16} className="animate-spin" /> : <FolderPlus size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => (selectionMode ? exitSelection() : startSelection())}
                    disabled={!canUseAgent || assets.length === 0}
                    className={`${TOOL} ${selectionMode ? 'bg-[#ff914d]/20 text-[#ff914d]' : ''}`}
                    title={selectionMode ? 'Annulla selezione' : 'Seleziona'}
                    aria-label={selectionMode ? 'Annulla selezione' : 'Seleziona'}
                  >
                    {selectionMode ? <X size={16} /> : <Check size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading}
                    className={TOOL}
                    title="Aggiorna"
                    aria-label="Aggiorna"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void syncIndex()}
                    disabled={syncing || !canUseAgent}
                    className={`${TOOL} w-auto gap-1.5 px-2.5 text-xs font-semibold text-[#ff914d]`}
                    title="Sincronizza Hardisk"
                  >
                    {syncing ? <Loader2 size={15} className="animate-spin" /> : <HardDrive size={15} />}
                    <span className="hidden md:inline">Sincronizza Hardisk</span>
                  </button>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cerca"
                    aria-label="Cerca per nome, percorso o tag"
                    className="h-8 w-full rounded-lg border border-zinc-700/60 bg-zinc-950/60 pl-8 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-[#ff914d]/50"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                {/* Barra laterale */}
                <aside className="hidden max-h-[70vh] overflow-y-auto border-r border-zinc-800/80 bg-zinc-950/40 p-3 md:block">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Preferiti
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      openFolder('');
                      setShowAll(true);
                    }}
                    className={`${SIDE} ${showAll ? SIDE_ON : SIDE_OFF}`}
                  >
                    <Clock size={15} className="shrink-0 text-[#ff914d]" />
                    <span className="min-w-0 flex-1 truncate">Tutti i file</span>
                    <span className="tabular-nums text-[11px] opacity-60">{data.totals.assets}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openFolder('')}
                    className={`${SIDE} ${!showAll && !folder ? SIDE_ON : SIDE_OFF}`}
                  >
                    <HardDrive size={15} className="shrink-0 text-[#ff914d]" />
                    <span className="min-w-0 flex-1 truncate">Drive</span>
                  </button>

                  <p className="px-2 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Cartelle
                  </p>
                  {folders.length === 0 && <p className="px-2 text-xs text-zinc-600">Nessuna cartella</p>}
                  {folders.map((item) => {
                    const depth = item.path.split('/').length - 1;
                    const active = !showAll && folder === item.path;
                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => openFolder(item.path)}
                        style={{ paddingLeft: 8 + depth * 14 }}
                        title={item.path}
                        className={`${SIDE} ${active ? SIDE_ON : SIDE_OFF}`}
                      >
                        <Folder size={15} className="shrink-0 fill-[#ff914d]/30 text-[#ff914d]" />
                        <span className="min-w-0 flex-1 truncate">{item.path.split('/').pop()}</span>
                        <span className="tabular-nums text-[11px] opacity-60">{item.assetCount}</span>
                      </button>
                    );
                  })}
                </aside>

                {/* Contenuto */}
                <section className="min-h-[420px] min-w-0 p-4 md:p-5" aria-label={title}>
                  {shownFolders.length === 0 && files.length === 0 ? (
                    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center text-sm text-zinc-400">
                      <FolderIcon className="h-20 w-20 opacity-40" />
                      {assets.length === 0 ? (
                        <>
                          <p className="font-semibold text-zinc-200">Nessun file nell’indice.</p>
                          <p className="max-w-md">
                            {canUseAgent ? (
                              <>
                                Con Hiksemi collegato e l’agente attivo, premi{' '}
                                <span className="text-[#ff914d]">Sincronizza Hardisk</span>: l’indice legge i
                                file già presenti sul disco senza ricaricarli.
                              </>
                            ) : (
                              <>
                                L’indice lo costruisce l’agente sul Mac del disco: sincronizzalo da
                                lì, oppure collega il tunnel Cloudflare per farlo anche da questo sito.
                              </>
                            )}
                          </p>
                        </>
                      ) : searching ? (
                        <p>Nessun file corrisponde a questa ricerca.</p>
                      ) : (
                        <p>Questa cartella è vuota.</p>
                      )}
                    </div>
                  ) : view === 'icons' ? (
                    <div className="space-y-6">
                      {shownFolders.length > 0 && (
                        <div>
                          {files.length > 0 && (
                            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                              Cartelle
                            </h2>
                          )}
                          <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {shownFolders.map((item) => (
                              <div
                                key={item.path}
                                data-folder-menu
                                className={`group relative rounded-xl transition-colors hover:bg-white/5 ${
                                  folderBusy === item.path ? 'opacity-50' : ''
                                }`}
                                onContextMenu={(event) => {
                                  event.preventDefault();
                                  setFolderMenu(item.path);
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => openFolder(item.path)}
                                  disabled={folderBusy === item.path}
                                  className="flex w-full flex-col items-center gap-1 p-3 text-center select-none"
                                  title={`Apri ${item.path}`}
                                >
                                  <FolderIcon className="h-20 w-20 drop-shadow-lg transition-transform duration-150 group-hover:scale-105" />
                                  <span className="line-clamp-2 w-full break-words text-xs font-medium text-zinc-100">
                                    {item.name}
                                  </span>
                                  <span className="text-[10px] tabular-nums text-zinc-500">
                                    {item.count} {item.count === 1 ? 'elemento' : 'elementi'}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setFolderMenu(folderMenu === item.path ? null : item.path);
                                  }}
                                  disabled={folderBusy === item.path}
                                  className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 opacity-100 transition-opacity hover:text-white md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                                  aria-label={`Gestisci cartella ${item.path}`}
                                >
                                  <MoreHorizontal size={14} />
                                </button>
                                {folderMenuPanel(item.path)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {files.length > 0 && (
                        <div>
                          {shownFolders.length > 0 && (
                            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                              File
                            </h2>
                          )}
                          <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {files.map((asset) => (
                              <article
                                key={asset.id}
                                className="group relative flex flex-col items-center gap-1 rounded-xl p-2 text-center transition-colors hover:bg-white/5"
                              >
                                {selectionMode && (
                                  <span
                                    aria-hidden
                                    className={`pointer-events-none absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border ${
                                      selected.includes(asset.id)
                                        ? 'border-[#ff914d] bg-[#ff914d] text-zinc-950'
                                        : 'border-white/40 bg-zinc-950/60 text-transparent'
                                    }`}
                                  >
                                    <Check size={14} />
                                  </span>
                                )}
                                <a
                                  {...openProps(asset)}
                                  className={`flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border border-zinc-700/60 bg-zinc-950/70 shadow-md shadow-black/30 ${
                                    selected.includes(asset.id) ? 'ring-2 ring-[#ff914d]' : ''
                                  }`}
                                >
                                  {asset.thumbUrl ? (
                                    <img
                                      src={asset.thumbUrl}
                                      alt={asset.name}
                                      loading="lazy"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-zinc-600">{thumbFallback(asset, 26)}</span>
                                  )}
                                </a>
                                <p
                                  className="mt-1 w-full truncate px-1 text-xs font-medium text-zinc-100"
                                  title={asset.name}
                                >
                                  {asset.name}
                                </p>
                                <p className="w-full truncate px-1 text-[10px] text-zinc-500">
                                  {(searching || showAll) && asset.folderPath
                                    ? `${asset.folderPath} · `
                                    : ''}
                                  {formatDriveBytes(asset.sizeBytes)}
                                  {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
                                  {asset.duplicateOf ? ' · duplicato' : ''}
                                </p>
                                {tagChips(asset)}
                              </article>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm">
                      <div className="hidden grid-cols-[minmax(0,1fr)_90px_80px_minmax(0,1fr)] gap-3 border-b border-zinc-800/80 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 md:grid">
                        <span>Nome</span>
                        <span>Dimensione</span>
                        <span>Tipo</span>
                        <span>Tag</span>
                      </div>
                      {shownFolders.map((item, index) => (
                        <div
                          key={item.path}
                          data-folder-menu
                          onContextMenu={(event) => {
                            event.preventDefault();
                            setFolderMenu(item.path);
                          }}
                          className={`group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/5 md:grid-cols-[minmax(0,1fr)_90px_80px_minmax(0,1fr)] ${
                            index % 2 ? 'bg-white/[0.02]' : ''
                          } ${folderBusy === item.path ? 'opacity-50' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={() => openFolder(item.path)}
                            disabled={folderBusy === item.path}
                            className="flex min-w-0 items-center gap-3 text-left"
                          >
                            <FolderIcon className="h-7 w-7 shrink-0" />
                            <span className="truncate font-medium text-zinc-100">{item.name}</span>
                          </button>
                          <span className="text-xs tabular-nums text-zinc-500">
                            {item.count} {item.count === 1 ? 'elemento' : 'elementi'}
                          </span>
                          <span className="hidden text-xs text-zinc-500 md:block">Cartella</span>
                          <span className="relative hidden justify-self-end md:block">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setFolderMenu(folderMenu === item.path ? null : item.path);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:text-white"
                              aria-label={`Gestisci cartella ${item.path}`}
                            >
                              <MoreHorizontal size={14} />
                            </button>
                          </span>
                          {folderMenuPanel(item.path)}
                        </div>
                      ))}
                      {files.map((asset, index) => (
                        <div
                          key={asset.id}
                          className={`relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/5 md:grid-cols-[minmax(0,1fr)_90px_80px_minmax(0,1fr)] ${
                            (index + shownFolders.length) % 2 ? 'bg-white/[0.02]' : ''
                          } ${selected.includes(asset.id) ? 'bg-[#ff914d]/15 ring-1 ring-[#ff914d]/60' : ''}`}
                        >
                          <a {...openProps(asset)} className="flex min-w-0 items-center gap-3">
                            <span className="flex h-7 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-950/70 text-zinc-600">
                              {asset.thumbUrl ? (
                                <img
                                  src={asset.thumbUrl}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                thumbFallback(asset, 14)
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-zinc-100" title={asset.name}>
                                {asset.name}
                              </span>
                              {(searching || showAll) && asset.folderPath && (
                                <span className="block truncate text-[10px] text-zinc-500">
                                  {asset.folderPath}
                                </span>
                              )}
                            </span>
                          </a>
                          <span className="text-xs tabular-nums text-zinc-500">
                            {formatDriveBytes(asset.sizeBytes)}
                          </span>
                          <span className="hidden text-xs capitalize text-zinc-500 md:block">
                            {asset.kind}
                            {asset.duplicateOf ? ' · dup.' : ''}
                          </span>
                          <span className="hidden md:block">{tagChips(asset)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Barra di stato */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-zinc-800/80 bg-zinc-900/70 px-4 py-2 text-[11px] text-zinc-500">
                <p className="tabular-nums">
                  {shownFolders.length + files.length}{' '}
                  {shownFolders.length + files.length === 1 ? 'elemento' : 'elementi'}
                  {selectionMode && selected.length > 0 ? ` · ${selected.length} selezionati` : ''}
                  {assets.length < data.totals.assets ? ` · mostrati i primi ${assets.length} file` : ''}
                </p>
                <p className="tabular-nums">
                  {data.totals.assets} file · {formatDriveBytes(data.totals.bytes)} · {folders.length}{' '}
                  cartelle ·{' '}
                  {data.agent.freeBytes !== null
                    ? `${formatDriveBytes(data.agent.freeBytes)} disponibili`
                    : 'spazio libero non disponibile'}
                  {data.syncedAt
                    ? ` · aggiornato ${new Date(data.syncedAt).toLocaleString('it-IT')}`
                    : ''}
                </p>
              </div>
            </div>
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
