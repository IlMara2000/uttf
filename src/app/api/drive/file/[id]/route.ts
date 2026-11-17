import {
  DriveError,
  driveErrorResponse,
  fetchAgent,
  signAgentFile,
  verifyDriveMedia,
} from '@/lib/drive-server';
import { isDriveId } from '@/lib/drive-model';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Inoltra il Range all'agente: i video si vedono in streaming dal disco,
 * senza mai passare da Supabase Storage. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);

  if (!isDriveId(id) || !verifyDriveMedia(id, 'file', url.searchParams.get('s'))) {
    return Response.json({ error: 'File non autorizzato o link scaduto.' }, { status: 403 });
  }

  // L'agente accetta solo richieste firmate quando ha DRIVE_MEDIA_SECRET.
  const signature = signAgentFile(id);
  const range = request.headers.get('range');
  let upstream: Response;
  try {
    upstream = await fetchAgent(
      `/file/${id}${signature ? `?${signature}` : ''}`,
      range ? { headers: { Range: range } } : {},
      0,
    );
  } catch {
    return Response.json({ error: "L'agente del drive non risponde." }, { status: 503 });
  }

  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 404 ? 404 : upstream.status === 416 ? 416 : 502;
    return Response.json({ error: 'File non disponibile sul disco.' }, { status });
  }

  const headers = new Headers();
  for (const name of [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'content-disposition',
    'last-modified',
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Cache-Control', 'private, max-age=0, must-revalidate');

  try {
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return driveErrorResponse(
      error instanceof DriveError ? error : new DriveError('Trasferimento non riuscito.', 502),
      'DRIVE_FILE_ERROR',
    );
  }
}
