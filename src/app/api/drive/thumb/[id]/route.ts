import { DriveError, driveErrorResponse, fetchAgent, verifyDriveMedia } from '@/lib/drive-server';
import { isDriveId } from '@/lib/drive-model';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Proxy dell'anteprima: il browser non parla mai direttamente con l'agente,
 * e il token che firma l'URL dura un'ora. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const signature = new URL(request.url).searchParams.get('s');

  if (!isDriveId(id) || !verifyDriveMedia(id, 'thumb', signature)) {
    return Response.json({ error: 'Anteprima non autorizzata o scaduta.' }, { status: 403 });
  }

  try {
    const upstream = await fetchAgent(`/thumb/${id}`);
    if (!upstream.ok || !upstream.body) {
      return Response.json({ error: 'Anteprima non disponibile.' }, { status: 404 });
    }

    const headers = new Headers({
      'Content-Type': upstream.headers.get('content-type') || 'image/webp',
      'Cache-Control': 'private, max-age=3600',
    });
    const length = upstream.headers.get('content-length');
    if (length) headers.set('Content-Length', length);

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return driveErrorResponse(
      error instanceof DriveError ? error : new DriveError("L'agente del drive non risponde.", 503),
      'DRIVE_THUMB_ERROR',
    );
  }
}
