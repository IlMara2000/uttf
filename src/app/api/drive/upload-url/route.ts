import { NextResponse } from 'next/server';
import {
  DriveError,
  driveErrorResponse,
  drivePublicUrl,
  requireDriveStaff,
  signAgentUpload,
} from '@/lib/drive-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const MAX_NAME_LENGTH = 180;
const UPLOAD_TTL_SECONDS = 15 * 60;

/** URL firmato per far caricare il browser direttamente al tunnel: serve a
 * superare il limite di 4,5 MB per richiesta delle funzioni Vercel. */
export async function POST(request: Request) {
  try {
    await requireDriveStaff(request);

    const payload = (await request.json().catch(() => null)) as
      | { name?: unknown; folder?: unknown }
      | null;
    const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
    const folder = typeof payload?.folder === 'string' ? payload.folder.trim() : '';

    if (!name) throw new DriveError('Nome del file mancante.', 400);
    if (name.length > MAX_NAME_LENGTH) throw new DriveError('Nome del file troppo lungo.', 400);

    const base = drivePublicUrl();
    const signature = signAgentUpload(name, folder);
    if (!base || !signature) {
      return NextResponse.json(
        { direct: false, error: 'Caricamento diretto non configurato.' },
        { status: 501, headers },
      );
    }

    const params = new URLSearchParams({ name });
    if (folder) params.set('folder', folder);

    return NextResponse.json(
      {
        direct: true,
        url: `${base}/api/files?${params.toString()}&${signature}`,
        expiresInSeconds: UPLOAD_TTL_SECONDS,
      },
      { headers },
    );
  } catch (error) {
    return driveErrorResponse(error, 'DRIVE_UPLOAD_URL_ERROR');
  }
}
