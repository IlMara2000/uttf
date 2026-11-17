import { NextResponse } from 'next/server';
import {
  DriveError,
  driveErrorResponse,
  fetchAgent,
  requireDriveStaff,
  signDriveMedia,
} from '@/lib/drive-server';
import type {
  DriveAgentStatus,
  DriveAsset,
  DriveBackupStatus,
  DriveFolderSummary,
  DriveIndexPayload,
  DriveKind,
  DriveTag,
} from '@/lib/drive-model';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const MAX_ASSETS = 500;

type AssetRow = {
  remote_id: string;
  name: string;
  folder_path: string;
  rel_path: string;
  mime: string;
  kind: DriveKind;
  size_bytes: number | string;
  sha256: string;
  duplicate_of: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | string | null;
  has_thumb: boolean;
  captured_at: string;
  drive_asset_tags?: { drive_tags?: DriveTag | DriveTag[] | null }[] | null;
};

type FolderRow = {
  path: string;
  name: string;
  asset_count: number | string | null;
  total_bytes: number | string | null;
};

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

async function agentStatus(): Promise<DriveAgentStatus> {
  const offline: DriveAgentStatus = {
    reachable: false,
    root: null,
    files: null,
    bytes: null,
    freeBytes: null,
    totalBytes: null,
    backup: backupOffline,
    error: "Agente del drive non raggiungibile: i file restano sul disco, ma anteprime e originali non sono disponibili.",
  };

  let response: Response;
  try {
    response = await fetchAgent('/api/health', {}, 3000);
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
async function agentFolders(): Promise<string[]> {
  try {
    const response = await fetchAgent('/api/folders', {}, 3000);
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

function tagsOf(row: AssetRow): DriveTag[] {
  return (row.drive_asset_tags ?? [])
    .flatMap((link) => {
      const tag = link?.drive_tags;
      return Array.isArray(tag) ? tag : tag ? [tag] : [];
    })
    .filter((tag): tag is DriveTag => Boolean(tag?.id && tag?.name));
}

export async function GET(request: Request) {
  try {
    const { client } = await requireDriveStaff(request);

    const [assetsResult, sizesResult, foldersResult, tagsResult, agent, diskFolders] = await Promise.all([
      client
        .from('drive_assets')
        .select(
          'remote_id, name, folder_path, rel_path, mime, kind, size_bytes, sha256, duplicate_of, width, height, duration_seconds, has_thumb, captured_at, updated_at, drive_asset_tags(drive_tags(id, name, color))',
        )
        .order('captured_at', { ascending: false })
        .limit(MAX_ASSETS),
      client.from('drive_assets').select('size_bytes'),
      client
        .from('drive_folder_overview')
        .select('path, name, asset_count, total_bytes')
        .order('path'),
      client.from('drive_tags').select('id, name, color').order('name'),
      agentStatus(),
      agentFolders(),
    ]);

    if (assetsResult.error) throw new DriveError('Lettura dei file indicizzati non riuscita. Hai applicato la migrazione SQL?', 500);
    if (foldersResult.error) throw new DriveError('Lettura delle cartelle non riuscita. Hai applicato la migrazione SQL?', 500);
    if (tagsResult.error) throw new DriveError('Lettura dei tag non riuscita. Hai applicato la migrazione SQL?', 500);
    if (sizesResult.error) throw new DriveError('Totale dello spazio indicizzato non disponibile.', 500);

    const rows = (assetsResult.data ?? []) as AssetRow[];
    const sizeRows = (sizesResult.data ?? []) as { size_bytes: number | string }[];

    const assets: DriveAsset[] = rows.map((row) => {
      const id = row.remote_id;
      return {
        id,
        name: row.name,
        folderPath: row.folder_path ?? '',
        relPath: row.rel_path,
        mime: row.mime,
        kind: row.kind,
        sizeBytes: Number(row.size_bytes) || 0,
        sha256: row.sha256,
        duplicateOf: row.duplicate_of,
        width: row.width,
        height: row.height,
        durationSeconds: numberOrNull(row.duration_seconds),
        hasThumb: Boolean(row.has_thumb),
        capturedAt: row.captured_at,
        tags: tagsOf(row),
        thumbUrl: row.has_thumb
          ? `/api/drive/thumb/${id}?s=${encodeURIComponent(signDriveMedia(id, 'thumb'))}`
          : null,
        fileUrl: `/api/drive/file/${id}?s=${encodeURIComponent(signDriveMedia(id, 'file'))}`,
      };
    });

    const folders: DriveFolderSummary[] = ((foldersResult.data ?? []) as FolderRow[]).map((row) => ({
      path: row.path,
      name: row.name,
      assetCount: Number(row.asset_count) || 0,
      totalBytes: Number(row.total_bytes) || 0,
    }));

    // Le cartelle vuote esistono solo sul disco: senza questo l'utente non le vedrebbe.
    const knownFolders = new Set(folders.map((folder) => folder.path));
    for (const folderPath of diskFolders) {
      if (knownFolders.has(folderPath)) continue;
      folders.push({
        path: folderPath,
        name: folderPath.split('/').pop() ?? folderPath,
        assetCount: 0,
        totalBytes: 0,
      });
      knownFolders.add(folderPath);
    }
    folders.sort((a, b) => a.path.localeCompare(b.path));

    const syncedAt = rows.reduce<string | null>((latest, row) => {
      const value = (row as AssetRow & { updated_at?: string }).updated_at;
      return value && (!latest || value > latest) ? value : latest;
    }, null);

    const payload: DriveIndexPayload = {
      folders,
      assets,
      tags: (tagsResult.data ?? []) as DriveTag[],
      totals: {
        assets: sizeRows.length,
        bytes: sizeRows.reduce((sum, row) => sum + (Number(row.size_bytes) || 0), 0),
        shown: assets.length,
      },
      agent,
      syncedAt,
    };

    return NextResponse.json(payload, { headers });
  } catch (error) {
    return driveErrorResponse(error, 'DRIVE_INDEX_ERROR');
  }
}
