import { NextResponse } from 'next/server';
import { readJson } from '@/lib/request-json';
import { DriveError, driveErrorResponse, requireDriveStaff } from '@/lib/drive-server';
import { driveTagSlug, isDriveId, type DriveTag } from '@/lib/drive-model';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

type TagPayload = { assetId?: unknown; tag?: unknown; action?: unknown };

async function assetTags(client: Awaited<ReturnType<typeof requireDriveStaff>>['client'], assetId: string) {
  const { data, error } = await client
    .from('drive_asset_tags')
    .select('tag_id, drive_tags(id, name, color)')
    .eq('asset_id', assetId);
  if (error) throw error;
  return ((data ?? []) as { drive_tags?: DriveTag | DriveTag[] | null }[]).flatMap((row) => {
    const tag = row.drive_tags;
    return Array.isArray(tag) ? tag : tag ? [tag] : [];
  });
}

export async function POST(request: Request) {
  try {
    const { client } = await requireDriveStaff(request);

    let payload: TagPayload;
    try {
      payload = (await readJson(request)) as TagPayload;
    } catch {
      throw new DriveError('Richiesta non valida.', 400);
    }

    const assetId = payload?.assetId;
    const action = payload?.action;
    const name = driveTagSlug(payload?.tag);

    if (!isDriveId(assetId)) throw new DriveError('File non valido.', 400);
    if (action !== 'add' && action !== 'remove') throw new DriveError('Azione non valida.', 400);
    if (!name) {
      throw new DriveError('Tag non valido: usa lettere, numeri, spazi, trattini (max 40).', 400);
    }

    const { data: asset, error: assetError } = await client
      .from('drive_assets')
      .select('remote_id')
      .eq('remote_id', assetId)
      .maybeSingle();
    if (assetError) throw assetError;
    if (!asset) throw new DriveError('File non presente nell\'indice.', 404);

    if (action === 'add') {
      const { data: tag, error: tagError } = await client
        .from('drive_tags')
        .upsert({ name }, { onConflict: 'name' })
        .select('id')
        .single();
      if (tagError) throw tagError;

      const { error: linkError } = await client
        .from('drive_asset_tags')
        .upsert({ asset_id: assetId, tag_id: (tag as { id: string }).id }, { onConflict: 'asset_id,tag_id' });
      if (linkError) throw linkError;
    } else {
      const { data: tag, error: tagError } = await client
        .from('drive_tags')
        .select('id')
        .eq('name', name)
        .maybeSingle();
      if (tagError) throw tagError;
      if (tag) {
        const { error: linkError } = await client
          .from('drive_asset_tags')
          .delete()
          .eq('asset_id', assetId)
          .eq('tag_id', (tag as { id: string }).id);
        if (linkError) throw linkError;
      }
    }

    return NextResponse.json({ assetId, tags: await assetTags(client, assetId) }, { headers });
  } catch (error) {
    return driveErrorResponse(error, 'DRIVE_TAG_ERROR');
  }
}
