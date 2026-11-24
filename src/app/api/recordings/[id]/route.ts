import { NextResponse } from 'next/server';
import { isUuid } from '@/lib/recordings/model';
import { RecordingError, errorResponse, loadRecording, requireStaff } from '@/lib/recordings/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * Stato della sessione. La pagina della nota lo interroga invece di fidarsi
 * della risposta di `stop`: quella richiesta può essere uccisa dal timeout del
 * deploy (o dal client che chiude il tab), mentre la trascrizione continua e
 * questa lettura dice sempre a che punto è.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    if (!isUuid(id)) throw new RecordingError('Registrazione non trovata.', 404);
    const { client } = await requireStaff(request);
    const recording = await loadRecording(client, id);

    return NextResponse.json(
      {
        id: recording.id,
        status: recording.status,
        noteId: recording.note_id,
        error: recording.error,
        sentences: recording.transcript?.sentences?.length ?? 0,
        startedAt: recording.started_at,
        recordedMs: recording.recorded_ms,
        updatedAt: recording.updated_at,
      },
      { headers },
    );
  } catch (error) {
    return errorResponse(error, 'GET /recordings/:id');
  }
}
