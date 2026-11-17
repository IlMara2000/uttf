import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DriveError, fetchAgent } from '@/lib/drive-server';
import type { DriveAgentStatus, DriveBackupStatus, DriveFolderSummary } from '@/lib/drive-model';

/** Tutto lo stato del drive che non dipende dalle firme degli URL.
 * Sta qui perche' lo usano sia /api/drive sia /api/drive/status: la pagina puo'
 * aggiornare numeri e stato senza rigenerare le firme delle anteprime. */

const AGENT_TIMEOUT_MS = 3000;

type AgentMirror = {
  configured?: unknown;
  volume?: unknown;
  mounted?: unknown;
  pending?: unknown;
  lastCopyAt?: unknown;
  lastError?: unknown;
};

type AgentHealth = {
  files?: unknown;
  bytes?: unknown;
  root?: unknown;
  disk?: { free?: unknown; total?: unknown } | null;
  mirror?: AgentMirror | null;
};

type FolderRow = {
  path: string;
  name: string;
  asset_count: number | string | null;
  total_bytes: number | string | null;
};

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function textOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

const backupOffline: DriveBackupStatus = {
  configured: false,
  volume: null,
  mounted: false,
  pending: 0,
  lastCopyAt: null,
  lastError: null,
};

function backupStatus(health: AgentHealth | null): DriveBackupStatus {
  const mirror = health?.mirror;
  if (!mirror) return backupOffline;
  return {
    configured: mirror.configured === true,
    volume: textOrNull(mirror.volume),
    mounted: mirror.mounted === true,
    pending: numberOrNull(mirror.pending) ?? 0,
    lastCopyAt: textOrNull(mirror.lastCopyAt),
    lastError: textOrNull(mirror.lastError),
  };
}

export async function readAgentStatus(): Promise<DriveAgentStatus> {
  const offline: DriveAgentStatus = {
    reachable: false,
    root: null,
    files: null,
    bytes: null,
    freeBytes: null,
    totalBytes: null,
    backup: backupOffline,
    error:
      'Agente del drive non raggiungibile: i file restano sul disco, ma anteprime e originali non sono disponibili.',
  };

  let response: Response;
  try {
    response = await fetchAgent('/api/health', {}, AGENT_TIMEOUT_MS);
  } catch {
    return offline;
  }

  if (!response.ok) {
    return { ...offline, error: `L'agente ha risposto ${response.status}.` };
  }

  const health = (await response.json().catch(() => null)) as AgentHealth | null;
  if (!health) return offline;

  return {
    reachable: true,
    root: typeof health.root === 'string' ? health.root : null,
    files: numberOrNull(health.files),
    bytes: numberOrNull(health.bytes),
    freeBytes: numberOrNull(health.disk?.free),
    totalBytes: numberOrNull(health.disk?.total),
    backup: backupStatus(health),
    error: null,
  };
}

/** Cartelle reali sul disco (anche vuote): l'indice conosce solo quelle con file. */
export async function readDiskFolders(): Promise<string[]> {
  try {
    const response = await fetchAgent('/api/folders', {}, AGENT_TIMEOUT_MS);
    if (!response.ok) return [];
    const body = (await response.json().catch(() => null)) as { folders?: unknown } | null;
    if (!Array.isArray(body?.folders)) return [];
    return body.folders.filter(
      (folder): folder is string => typeof folder === 'string' && folder.length > 0,
    );
  } catch {
    return [];
  }
}

export async function readFolders(client: SupabaseClient): Promise<DriveFolderSummary[]> {
  const [foldersResult, diskFolders] = await Promise.all([
    client
      .from('drive_folder_overview')
      .select('path, name, asset_count, total_bytes')
      .order('path'),
    readDiskFolders(),
  ]);

  if (foldersResult.error) {
    throw new DriveError('Lettura delle cartelle non riuscita. Hai applicato la migrazione SQL?', 500);
  }

  const folders: DriveFolderSummary[] = ((foldersResult.data ?? []) as FolderRow[]).map((row) => ({
    path: row.path,
    name: row.name,
    assetCount: Number(row.asset_count) || 0,
    totalBytes: Number(row.total_bytes) || 0,
  }));

  // Le cartelle vuote esistono solo sul disco: senza questo l'utente non le vedrebbe.
  const known = new Set(folders.map((folder) => folder.path));
  for (const folderPath of diskFolders) {
    if (known.has(folderPath)) continue;
    folders.push({
      path: folderPath,
      name: folderPath.split('/').pop() ?? folderPath,
      assetCount: 0,
      totalBytes: 0,
    });
    known.add(folderPath);
  }
  folders.sort((a, b) => a.path.localeCompare(b.path));

  return folders;
}

export async function readTotals(client: SupabaseClient) {
  const { data, error } = await client.from('drive_assets').select('size_bytes');
  if (error) throw new DriveError('Totale dello spazio indicizzato non disponibile.', 500);

  const rows = (data ?? []) as { size_bytes: number | string }[];
  return {
    assets: rows.length,
    bytes: rows.reduce((sum, row) => sum + (Number(row.size_bytes) || 0), 0),
  };
}

export async function readSyncedAt(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client
    .from('drive_assets')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) {
    throw new DriveError('Lettura dello stato dell’indice non riuscita. Hai applicato la migrazione SQL?', 500);
  }

  const row = (data as { updated_at?: string }[] | null)?.[0];
  return row?.updated_at ?? null;
}
