import { NextResponse } from 'next/server';
import { DriveError, driveErrorResponse, fetchAgent, requireDriveStaff } from '@/lib/drive-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const MAX_FOLDER_LENGTH = 200;

/** Crea una cartella sul disco del drive tramite l'agente locale. */
export async function POST(request: Request) {
  try {
    await requireDriveStaff(request);

    const payload = (await request.json().catch(() => null)) as { folder?: unknown } | null;
    const folder = typeof payload?.folder === 'string' ? payload.folder.trim() : '';
    if (!folder) throw new DriveError('Nome della cartella mancante.', 400);
    if (folder.length > MAX_FOLDER_LENGTH) throw new DriveError('Nome della cartella troppo lungo.', 400);

    let response: Response;
    try {
      response = await fetchAgent(`/api/folders?folder=${encodeURIComponent(folder)}`, { method: 'POST' }, 5000);
    } catch {
      throw new DriveError(
        "L'agente del drive non risponde: la cartella va creata sullo stesso Mac del disco.",
        503,
      );
    }

    const body = (await response.json().catch(() => null)) as
      | { folder?: unknown; error?: unknown }
      | null;
    if (!response.ok) {
      throw new DriveError(
        typeof body?.error === 'string' ? body.error : 'Cartella non creata.',
        502,
      );
    }

    return NextResponse.json(
      { folder: typeof body?.folder === 'string' ? body.folder : folder },
      { status: 201, headers },
    );
  } catch (error) {
    return driveErrorResponse(error, 'DRIVE_FOLDER_ERROR');
  }
}

/** Rinomina una cartella (e i suoi contenuti) sul disco del drive. */
export async function PATCH(request: Request) {
  try {
    await requireDriveStaff(request);

    const payload = (await request.json().catch(() => null)) as { from?: unknown; to?: unknown } | null;
    const from = typeof payload?.from === 'string' ? payload.from.trim() : '';
    const to = typeof payload?.to === 'string' ? payload.to.trim() : '';
    if (!from) throw new DriveError('Cartella di origine mancante.', 400);
    if (!to) throw new DriveError('Nuovo nome mancante.', 400);
    if (from.length > MAX_FOLDER_LENGTH || to.length > MAX_FOLDER_LENGTH)
      throw new DriveError('Nome della cartella troppo lungo.', 400);

    let response: Response;
    try {
      response = await fetchAgent(
        `/api/folders?folder=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { method: 'PATCH' },
        5000,
      );
    } catch {
      throw new DriveError(
        "L'agente del drive non risponde: la cartella va rinominata sullo stesso Mac del disco.",
        503,
      );
    }

    const body = (await response.json().catch(() => null)) as
      | { folder?: unknown; error?: unknown }
      | null;
    if (!response.ok) {
      throw new DriveError(
        typeof body?.error === 'string' ? body.error : 'Cartella non rinominata.',
        502,
      );
    }

    return NextResponse.json(
      { folder: typeof body?.folder === 'string' ? body.folder : to },
      { status: 200, headers },
    );
  } catch (error) {
    return driveErrorResponse(error, 'DRIVE_FOLDER_ERROR');
  }
}

/** Cancella una cartella (e il suo contenuto) sul disco del drive. */
export async function DELETE(request: Request) {
  try {
    await requireDriveStaff(request);

    const payload = (await request.json().catch(() => null)) as { folder?: unknown } | null;
    const folder = typeof payload?.folder === 'string' ? payload.folder.trim() : '';
    if (!folder) throw new DriveError('Cartella mancante.', 400);
    if (folder.length > MAX_FOLDER_LENGTH) throw new DriveError('Nome della cartella troppo lungo.', 400);

    let response: Response;
    try {
      response = await fetchAgent(`/api/folders?folder=${encodeURIComponent(folder)}`, { method: 'DELETE' }, 5000);
    } catch {
      throw new DriveError(
        "L'agente del drive non risponde: la cartella va cancellata sullo stesso Mac del disco.",
        503,
      );
    }

    const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
    if (!response.ok) {
      throw new DriveError(
        typeof body?.error === 'string' ? body.error : 'Cartella non cancellata.',
        502,
      );
    }

    return NextResponse.json({ folder }, { status: 200, headers });
  } catch (error) {
    return driveErrorResponse(error, 'DRIVE_FOLDER_ERROR');
  }
}