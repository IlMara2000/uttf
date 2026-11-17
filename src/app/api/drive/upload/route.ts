import { NextResponse } from 'next/server';
import {
  DriveError,
  driveErrorResponse,
  fetchAgent,
  requireDriveStaff,
  signAgentUpload,
} from '@/lib/drive-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const MAX_NAME_LENGTH = 180;

/** Inoltra il file all'agente in streaming: niente body in memoria, i video
 * grossi passano senza essere caricati tutti nel processo di Next. */
export async function POST(request: Request) {
  try {
    await requireDriveStaff(request);

    const url = new URL(request.url);
    const name = (url.searchParams.get('name') || '').trim();
    const folder = (url.searchParams.get('folder') || '').trim();

    if (!name) throw new DriveError('Nome del file mancante.', 400);
    if (name.length > MAX_NAME_LENGTH) throw new DriveError('Nome del file troppo lungo.', 400);
    if (!request.body) throw new DriveError('Contenuto del file mancante.', 400);

    const params = new URLSearchParams({ name });
    if (folder) params.set('folder', folder);
    const signature = signAgentUpload(name, folder);

    const length = request.headers.get('content-length');
    const init = {
      method: 'POST',
      body: request.body,
      headers: {
        'Content-Type': 'application/octet-stream',
        ...(length ? { 'Content-Length': length } : {}),
      },
      // Node richiede "duplex" per inviare uno stream come corpo della richiesta.
      duplex: 'half',
    } as RequestInit;

    let response: Response;
    try {
      const query = signature ? `${params.toString()}&${signature}` : params.toString();
      response = await fetchAgent(`/api/files?${query}`, init, 0);
    } catch {
      throw new DriveError(
        "L'agente del drive non risponde: il caricamento va fatto dallo stesso Mac del disco.",
        503,
      );
    }

    const body = (await response.json().catch(() => null)) as
      | { asset?: unknown; duplicate?: unknown; error?: unknown }
      | null;
    if (!response.ok) {
      throw new DriveError(
        typeof body?.error === 'string' ? body.error : 'File non caricato.',
        502,
      );
    }

    return NextResponse.json(body, { status: 201, headers });
  } catch (error) {
    return driveErrorResponse(error, 'DRIVE_UPLOAD_ERROR');
  }
}
