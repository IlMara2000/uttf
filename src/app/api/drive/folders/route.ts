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
