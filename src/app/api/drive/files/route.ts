import { NextResponse } from 'next/server';
import { DriveError, driveErrorResponse, fetchAgent, requireDriveStaff } from '@/lib/drive-server';
import { isDriveId } from '@/lib/drive-model';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const MAX_SELECTION = 200;
const MAX_FOLDER_LENGTH = 200;
const MAX_NAME_LENGTH = 180;

function selectedIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const ids = [...new Set(value.filter((id): id is string => isDriveId(id)))];
  if (ids.length > MAX_SELECTION) {
    throw new DriveError(`Puoi agire su ${MAX_SELECTION} file alla volta.`, 400);
  }
  return ids;
}

/** Azioni multiple dal drive: sposta in una cartella, cestina, rinomina un file. */
export async function POST(request: Request) {
  try {
    await requireDriveStaff(request);

    const payload = (await request.json().catch(() => null)) as
      | { action?: unknown; ids?: unknown; folder?: unknown; name?: unknown }
      | null;
    const action = payload?.action;
    if (action !== 'move' && action !== 'delete' && action !== 'rename') {
      throw new DriveError('Azione non riconosciuta.', 400);
    }
    const ids = selectedIds(payload?.ids);
    if (ids.length === 0) throw new DriveError('Nessun file selezionato.', 400);

    if (action === 'rename') {
      if (ids.length !== 1) throw new DriveError('Rinomina un file alla volta.', 400);
      const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
      if (!name) throw new DriveError('Nuovo nome mancante.', 400);
      if (name.length > MAX_NAME_LENGTH) throw new DriveError('Nome troppo lungo.', 400);

      let response: Response;
      try {
        response = await fetchAgent(
          `/api/files/${encodeURIComponent(ids[0])}?name=${encodeURIComponent(name)}`,
          { method: 'PATCH' },
          8000,
        );
      } catch {
        throw new DriveError(
          "L'agente del drive non risponde: il file va rinominato sullo stesso Mac del disco.",
          503,
        );
      }

      const body = (await response.json().catch(() => null)) as
        | { name?: unknown; error?: unknown }
        | null;
      if (!response.ok) {
        throw new DriveError(
          typeof body?.error === 'string' ? body.error : 'Rinomina non riuscita.',
          response.status === 409 ? 409 : 502,
        );
      }
      return NextResponse.json(
        { name: typeof body?.name === 'string' ? body.name : name },
        { status: 200, headers },
      );
    }

    const folder = typeof payload?.folder === 'string' ? payload.folder.trim() : '';
    if (folder.length > MAX_FOLDER_LENGTH) throw new DriveError('Nome della cartella troppo lungo.', 400);

    let response: Response;
    try {
      response = await fetchAgent(
        action === 'move' ? '/api/files/move' : '/api/files/delete',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action === 'move' ? { ids, folder } : { ids }),
        },
        30_000,
      );
    } catch {
      throw new DriveError(
        action === 'move'
          ? "L'agente del drive non risponde: lo spostamento va fatto sullo stesso Mac del disco."
          : "L'agente del drive non risponde: la cancellazione va fatta sullo stesso Mac del disco.",
        503,
      );
    }

    const body = (await response.json().catch(() => null)) as
      | { moved?: unknown; deleted?: unknown; error?: unknown }
      | null;
    if (!response.ok) {
      throw new DriveError(
        typeof body?.error === 'string' ? body.error : 'Operazione non riuscita.',
        502,
      );
    }

    const count = Number(action === 'move' ? body?.moved : body?.deleted);
    return NextResponse.json(
      action === 'move'
        ? { moved: Number.isFinite(count) ? count : ids.length, folder }
        : { deleted: Number.isFinite(count) ? count : ids.length },
      { status: 200, headers },
    );
  } catch (error) {
    return driveErrorResponse(error, 'DRIVE_FILES_ERROR');
  }
}
