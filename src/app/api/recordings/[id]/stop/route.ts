import { NextResponse } from 'next/server';
import {
  MAX_CHUNKS,
  MAX_RECORDED_MS,
  buildNoteContent,
  formatDateTime,
  isUuid,
  sanitizePauses,
} from '@/lib/recordings/model';
import {
  BUCKET,
  RecordingError,
  TRANSCRIBE_LOCK_MS,
  assertSameOrigin,
  audioPath,
  dateSegments,
  errorResponse,
  loadRecording,
  readBody,
  recompose,
  requireStaff,
  transcribe,
} from '@/lib/recordings/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Ricomposizione + trascrizione di un'ora di audio: serve margine. */
export const maxDuration = 300;

const headers = { 'Cache-Control': 'private, no-store' };
const nowIso = () => new Date().toISOString();

/**
 * Chiude la sessione, ricompone i chunk in ordine, trascrive e crea la nota.
 *
 * Il corpo è facoltativo: senza `recordedMs`/`pauses`/`chunkCount` si usano i
 * valori già salvati, così un retry dopo un fallimento è `POST` con `{}`.
 * Idempotente: su una sessione `ready` risponde con la stessa nota.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    assertSameOrigin(request);
    if (!isUuid(id)) throw new RecordingError('Registrazione non trovata.', 404);
    const { client } = await requireStaff(request);
    const recording = await loadRecording(client, id);

    /** Esito negativo: la riga dice sempre com'è finita, per la pagina della nota. */
    const mark = (status: 'stopped' | 'failed', error: string) =>
      client
        .from('meeting_recordings')
        .update({ status, error: error.slice(0, 500), updated_at: nowIso() })
        .eq('id', id);

    if (recording.status === 'ready') {
      return NextResponse.json(
        {
          recordingId: id,
          noteId: recording.note_id,
          status: 'ready',
          sentences: recording.transcript?.sentences?.length ?? 0,
        },
        { headers },
      );
    }
    // Trascrizione in corso e viva: non se ne avvia una seconda. Oltre il lock
    // il tentativo è morto (timeout, deploy) e si può rifare.
    if (
      recording.status === 'transcribing' &&
      Date.now() < Date.parse(recording.updated_at) + TRANSCRIBE_LOCK_MS
    ) {
      throw new RecordingError('Trascrizione già in corso.', 409);
    }

    const body = await readBody(request, 32_768);
    const recordedMs = body.recordedMs === undefined ? recording.recorded_ms : Number(body.recordedMs);
    if (!Number.isInteger(recordedMs) || recordedMs < 0 || recordedMs > MAX_RECORDED_MS) {
      throw new RecordingError('recordedMs non valido.');
    }
    const pauses =
      body.pauses === undefined ? (recording.pauses ?? []) : sanitizePauses(body.pauses);
    if (!pauses) throw new RecordingError('pauses non valido.');
    const chunkCount =
      body.chunkCount === undefined ? recording.chunk_count : Number(body.chunkCount);
    if (!Number.isInteger(chunkCount) || chunkCount < 0 || chunkCount > MAX_CHUNKS) {
      throw new RecordingError('chunkCount non valido.');
    }

    const { error: stopError } = await client
      .from('meeting_recordings')
      .update({
        recorded_ms: recordedMs,
        pauses,
        chunk_count: chunkCount,
        status: 'transcribing',
        error: null,
        updated_at: nowIso(),
      })
      .eq('id', id);
    if (stopError) throw new RecordingError('Chiusura non registrata.', 500);

    // 1. Ricomposizione nell'ordine di `index`, senza indovinare i buchi.
    const { buffer, missing } = await recompose(client, id, chunkCount);
    if (buffer.length === 0) {
      const detail =
        missing.length > 0
          ? `Mancano ${missing.length} chunk (indici ${missing.slice(0, 20).join(', ')}).`
          : 'Nessun audio ricevuto.';
      await mark('stopped', detail);
      throw new RecordingError(`${detail} Ricarica l'audio e richiama stop.`, 409);
    }

    // 2. Un file unico: input del trascrittore e allegato della nota.
    const audio = audioPath(id, recording.mime_type);
    const { error: audioError } = await client.storage
      .from(BUCKET)
      .upload(audio, buffer, { contentType: recording.mime_type, upsert: true });
    if (audioError) throw new RecordingError("Salvataggio dell'audio non riuscito.", 502);

    // 3. Trascrizione, frasi datate sull'orologio di parete, nota.
    const startedAtMs = Date.parse(recording.started_at);
    try {
      const stt = await transcribe(buffer, recording.mime_type, {
        title: recording.title,
        location: recording.location,
      });
      const sentences = dateSegments(startedAtMs, pauses, stt.segments, recording.speaker_label);

      const { data: note, error: noteError } = await client
        .from('notes')
        .insert({
          title: `Riunione «${recording.title}» — ${formatDateTime(startedAtMs)}`,
          content: buildNoteContent({
            title: recording.title,
            location: recording.location,
            mode: recording.mode,
            startedAt: startedAtMs,
            recordedMs,
            pauses,
            sentences,
            audioPath: audio,
          }),
          attachments: [audio],
          user_id: recording.created_by,
          updated_at: nowIso(),
        })
        .select('id')
        .single();
      if (noteError || !note) throw new RecordingError('Nota non creata.', 500);

      const { error: finalizeError } = await client
        .from('meeting_recordings')
        .update({
          status: 'ready',
          note_id: note.id,
          transcript: { text: stt.text, sentences },
          error: null,
          updated_at: nowIso(),
        })
        .eq('id', id);
      if (finalizeError) throw new RecordingError('Stato della registrazione non aggiornato.', 500);

      return NextResponse.json(
        {
          recordingId: id,
          noteId: String(note.id),
          status: 'ready',
          sentences: sentences.length,
          durationMs: stt.durationMs,
        },
        { headers },
      );
    } catch (error) {
      // L'audio è già sul server: la nota si può rifare senza riregistrare.
      const message = error instanceof Error ? error.message : 'Trascrizione non riuscita.';
      await mark('failed', message);
      throw error instanceof RecordingError
        ? error
        : new RecordingError(`Audio salvato, trascrizione non riuscita: ${message}`, 502);
    }
  } catch (error) {
    return errorResponse(error, 'POST /recordings/:id/stop');
  }
}
