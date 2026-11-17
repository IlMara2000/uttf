import { NextResponse } from 'next/server';
import { driveErrorResponse, fetchAgentIndex, requireDriveStaff } from '@/lib/drive-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const UPSERT_CHUNK = 200;

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function folderRowsFor(assets: { folderPath: string }[]) {
  const paths = new Set<string>();
  for (const asset of assets) {
    if (!asset.folderPath) continue;
    paths.add(asset.folderPath);
    const segments = asset.folderPath.split('/');
    for (let depth = 1; depth < segments.length; depth += 1) {
      paths.add(segments.slice(0, depth).join('/'));
    }
  }
  return Array.from(paths).map((path) => ({
    path,
    name: path.split('/').pop() || path,
  }));
}

export async function POST(request: Request) {
  try {
    const { client } = await requireDriveStaff(request);
    const { root, assets } = await fetchAgentIndex();
    const now = new Date().toISOString();

    const folders = folderRowsFor(assets);
    for (const group of chunk(folders, UPSERT_CHUNK)) {
      const { error } = await client
        .from('drive_folders')
        .upsert(group.map((folder) => ({ ...folder, synced_at: now })), { onConflict: 'path' });
      if (error) throw error;
    }

    // Cartelle che non hanno più file (cancellate o svuotate) escono dall'indice.
    const keepFolders = new Set(folders.map((folder) => folder.path));
    const { data: existingFolders, error: existingFoldersError } = await client
      .from('drive_folders')
      .select('path');
    if (existingFoldersError) throw existingFoldersError;
    const staleFolders = (existingFolders ?? [])
      .map((row: { path: string }) => row.path)
      .filter((path) => !keepFolders.has(path));
    for (const group of chunk(staleFolders, UPSERT_CHUNK)) {
      const { error } = await client.from('drive_folders').delete().in('path', group);
      if (error) throw error;
    }

    const rows = assets.map((asset) => ({
      remote_id: asset.remoteId,
      folder_path: asset.folderPath,
      name: asset.name,
      rel_path: asset.relPath,
      mime: asset.mime,
      kind: asset.kind,
      size_bytes: asset.sizeBytes,
      sha256: asset.sha256,
      duplicate_of: asset.duplicateOf,
      width: asset.width,
      height: asset.height,
      duration_seconds: asset.durationSeconds,
      has_thumb: asset.hasThumb,
      captured_at: asset.capturedAt,
      updated_at: now,
    }));

    for (const group of chunk(rows, UPSERT_CHUNK)) {
      const { error } = await client.from('drive_assets').upsert(group, { onConflict: 'remote_id' });
      if (error) throw error;
    }

    // Il disco e' la fonte di verita': quello che non c'e' piu' esce dall'indice.
    // PostgREST tronca a 1000 righe per default: si scorre a pagine per non
    // lasciare orfani oltre il limite.
    const existing: { remote_id: string }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error: existingError } = await client
        .from('drive_assets')
        .select('remote_id')
        .range(from, from + 999);
      if (existingError) throw existingError;
      if (!data || data.length === 0) break;
      existing.push(...(data as { remote_id: string }[]));
      if (data.length < 1000) break;
    }

    const keep = new Set(rows.map((row) => row.remote_id));
    const stale = existing.map((row) => row.remote_id).filter((id) => !keep.has(id));

    for (const group of chunk(stale, UPSERT_CHUNK)) {
      const { error } = await client.from('drive_assets').delete().in('remote_id', group);
      if (error) throw error;
    }

    return NextResponse.json(
      {
        root,
        synced: rows.length,
        removed: stale.length,
        folders: folders.length,
        syncedAt: now,
      },
      { headers },
    );
  } catch (error) {
    return driveErrorResponse(error, 'DRIVE_SYNC_ERROR');
  }
}
