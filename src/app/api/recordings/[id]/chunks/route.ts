import { NextResponse } from 'next/server';
import { MAX_CHUNK_BYTES, MAX_CHUNKS, cleanText, isUuid } from '@/lib/recordings/model';
import {
  BUCKET,
  RecordingError,
  assertSameOrigin,
  chunkPath,
  errorResponse,
  loadRecording,
  requireStaff,
  sha256Hex,
} from '@/lib/recordings/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Un chunk da 5 s pesa poche decine di KB: un minuto è già abbondante. */
export const maxDuration = 60;

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * `multipart/form-data`: `index`, `hash`, `file`.
 *
 * Idempotente su `index`: un retry della rete non duplica né sovrascrive. Se lo
 * stesso indice arriva con un contenuto diverso si risponde 409 invece di
 * tenere in silenzio l'ultimo arrivato (che darebbe un audio sbagliato).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    assertSameOrigin(request);
    if (!isUuid(id)) throw new RecordingError('Registrazione non trovata.', 404);
    const { client } = await requireStaff(request);

    const recording = await loadRecording(client, id);
    if (recording.status !== 'recording' && recording.status !== 'stopped') {
      throw new RecordingError('Registrazione già chiusa.', 409);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new RecordingError('Corpo multipart non valido.');
    }

    const filePart = form.get('file');
    if (!(filePart instanceof Blob)) throw new RecordingError('Chunk mancante.');
    if (filePart.size === 0) throw new RecordingError('Chunk vuoto.');
    if (filePart.size > MAX_CHUNK_BYTES) {
      throw new RecordingError('Chunk troppo grande.', 413);
    }

    // `cleanText` restituisce null per un campo assente o vuoto: senza questo
    // controllo `Number('')` darebbe 0 e il primo chunk verrebbe sovrascritto.
    const rawIndex = cleanText(form.get('index'), 20);
    const index = rawIndex === null ? Number.NaN : Number(rawIndex);
    if (!Number.isInteger(index) || index < 0 || index >= MAX_CHUNKS) {
      throw new RecordingError('Indice del chunk non valido.');
    }

    const bytes = new Uint8Array(await filePart.arrayBuffer());
    const sha = sha256Hex(bytes);
    const declared = cleanText(form.get('hash'), 64);

    // Il client manda sempre sha256 (nessun fallback): se dichiara un hash
    // diverso dai byte, il chunk è corrotto in transito e non va salvato.
    if (declared && declared !== sha) {
      throw new RecordingError('Hash del chunk non corrispondente.', 400);
    }

    const { data: existing, error: existingError } = await client
      .from('meeting_recording_chunks')
      .select('hash')
      .eq('recording_id', id)
      .eq('chunk_index', index)
      .maybeSingle();
    if (existingError) throw new RecordingError('Verifica del chunk non riuscita.', 500);

    if (existing) {
      if (existing.hash !== sha) {
        throw new RecordingError('Chunk già ricevuto con contenuto diverso.', 409);
      }
      return new NextResponse(null, { status: 204, headers });
    }

    const path = chunkPath(id, index);
    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: 'application/octet-stream', upsert: true });
    if (uploadError) throw new RecordingError('Salvataggio del chunk non riuscito.', 502);

    // `ignoreDuplicates`: se due retry arrivano insieme, la riga della chiave
    // primaria resta una e il contenuto è già quello giusto (verificato sopra).
    const { error: insertError } = await client.from('meeting_recording_chunks').upsert(
      {
        recording_id: id,
        chunk_index: index,
        hash: sha,
        byte_size: bytes.byteLength,
        storage_path: path,
      },
      { onConflict: 'recording_id,chunk_index', ignoreDuplicates: true },
    );
    if (insertError) throw new RecordingError('Chunk non registrato.', 500);

    return new NextResponse(null, { status: 204, headers });
  } catch (error) {
    return errorResponse(error, 'POST /recordings/:id/chunks');
  }
}
