import { NextResponse } from 'next/server';
import {
  DriveError,
  driveErrorResponse,
  drivePublicUrl,
  requireDriveStaff,
  signAgentFile,
  signDriveMedia,
} from '@/lib/drive-server';
import { readAgentStatus, readFolders, readIndexSummary } from '@/lib/drive-status';
import {
  driveNumberOrNull,
  type DriveAsset,
  type DriveIndexPayload,
  type DriveKind,
  type DriveTag,
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

    const [assetsResult, tagsResult, agent, folders, index] = await Promise.all([
      client
        .from('drive_assets')
        .select(
          'remote_id, name, folder_path, rel_path, mime, kind, size_bytes, sha256, duplicate_of, width, height, duration_seconds, has_thumb, captured_at, updated_at, drive_asset_tags(drive_tags(id, name, color))',
        )
        .order('captured_at', { ascending: false })
        .limit(MAX_ASSETS),
      client.from('drive_tags').select('id, name, color').order('name'),
      readAgentStatus(),
      readFolders(client),
      readIndexSummary(client),
    ]);

    if (assetsResult.error) {
      throw new DriveError(
        'Lettura dei file indicizzati non riuscita. Hai applicato la migrazione SQL?',
        500,
      );
    }
    if (tagsResult.error) {
      throw new DriveError('Lettura dei tag non riuscita. Hai applicato la migrazione SQL?', 500);
    }

    const publicUrl = drivePublicUrl();

    const assets: DriveAsset[] = ((assetsResult.data ?? []) as AssetRow[]).map((row) => {
      const id = row.remote_id;
      const signedFile = signAgentFile(id);
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
        durationSeconds: driveNumberOrNull(row.duration_seconds),
        hasThumb: Boolean(row.has_thumb),
        capturedAt: row.captured_at,
        tags: tagsOf(row),
        thumbUrl: row.has_thumb
          ? `/api/drive/thumb/${id}?s=${encodeURIComponent(signDriveMedia(id, 'thumb'))}`
          : null,
        fileUrl: `/api/drive/file/${id}?s=${encodeURIComponent(signDriveMedia(id, 'file'))}`,
        // Con il tunnel configurato il browser apre il file direttamente:
        // niente timeout della funzione Vercel sui video lunghi.
        directFileUrl: publicUrl && signedFile ? `${publicUrl}/file/${id}?${signedFile}` : null,
      };
    });

    const payload: DriveIndexPayload = {
      folders,
      assets,
      tags: (tagsResult.data ?? []) as DriveTag[],
      totals: index.totals,
      agent,
      syncedAt: index.syncedAt,
    };

    return NextResponse.json(payload, { headers });
  } catch (error) {
    return driveErrorResponse(error, 'DRIVE_INDEX_ERROR');
  }
}
