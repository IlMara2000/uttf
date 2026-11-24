import { NextResponse } from 'next/server';
import { cleanText, type RecordingMode } from '@/lib/recordings/model';
import {
  RecordingError,
  assertSameOrigin,
  errorResponse,
  readBody,
  requireStaff,
} from '@/lib/recordings/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * Apre la sessione di registrazione. La chiama il pulsante REC prima di
 * `MediaRecorder.start()`: se questa fallisce, il client non registra nulla
 * che non possa essere salvato.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { client, user } = await requireStaff(request);

    const body = await readBody(request, 8_192);

    const mode: RecordingMode | null =
      body.mode === 'call' ? 'call' : body.mode === 'standalone' ? 'standalone' : null;
    if (!mode) throw new RecordingError('Modalità non valida.');

    const title = cleanText(body.title, 200) ?? 'Riunione';
    const location = cleanText(body.location, 200);
    const mimeType = cleanText(body.mimeType, 120) ?? 'audio/webm';
    const speaker = cleanText(body.speaker, 120);

    const startedAtMs =
      typeof body.startedAt === 'string' ? Date.parse(body.startedAt) : Number.NaN;
    if (!Number.isFinite(startedAtMs)) {
      throw new RecordingError('startedAt non valido.');
    }

    const { data, error } = await client
      .from('meeting_recordings')
      .insert({
        created_by: user.id,
        mode,
        title,
        location,
        speaker_label: speaker,
        mime_type: mimeType,
        started_at: new Date(startedAtMs).toISOString(),
        status: 'recording',
      })
      .select('id')
      .single();

    if (error || !data) throw new RecordingError('Creazione della registrazione non riuscita.', 500);

    return NextResponse.json({ id: String(data.id) }, { status: 201, headers });
  } catch (error) {
    return errorResponse(error, 'POST /recordings');
  }
}
