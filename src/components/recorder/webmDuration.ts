/**
 * Durata vera per i WebM di `MediaRecorder`.
 *
 * `MediaRecorder` scrive un Segment di dimensione ignota e nessun elemento
 * `Duration` in `Info`: il browser quindi decodifica il file ma dichiara
 * `audio.duration === Infinity`, e la barra di avanzamento resta senza fondo.
 * Qui si infila `Duration` (float, in unità di `TimecodeScale`, di norma 1 ms)
 * nell'`Info` già presente nell'header, con il tempo misurato dal client
 * (pause escluse). Se il file non è un WebM riconoscibile si restituisce
 * l'originale: meglio un player con Infinity che un blob rotto.
 */

const ID_EBML = 0x1a45dfa3;
const ID_SEGMENT = 0x18538067;
const ID_INFO = 0x1549a966;
const ID_TIMECODE_SCALE = 0x2ad7b1;
const ID_DURATION = 0x4489;
const DEFAULT_TIMECODE_SCALE = 1_000_000; // nanosecondi per tick = 1 ms
const DURATION_ELEMENT_LENGTH = 11; // id (2) + size (1) + float64 (8)

type SizeField = { value: number; length: number };

function readId(view: DataView, offset: number): { id: number; length: number } | null {
  if (offset >= view.byteLength) return null;
  const first = view.getUint8(offset);
  if (first === 0) return null;
  let length = 1;
  let mask = 0x80;
  while ((first & mask) === 0) {
    mask >>= 1;
    length += 1;
    if (length > 4) return null;
  }
  if (offset + length > view.byteLength) return null;
  let id = 0;
  for (let i = 0; i < length; i += 1) id = id * 256 + view.getUint8(offset + i);
  return { id, length };
}

/** `value: -1` quando la dimensione è "ignota" (tutti i bit a 1). */
function readSize(view: DataView, offset: number): SizeField | null {
  if (offset >= view.byteLength) return null;
  const first = view.getUint8(offset);
  if (first === 0) return null;
  let length = 1;
  let mask = 0x80;
  while ((first & mask) === 0) {
    mask >>= 1;
    length += 1;
    if (length > 8) return null;
  }
  if (offset + length > view.byteLength) return null;
  let value = first & (mask - 1);
  for (let i = 1; i < length; i += 1) value = value * 256 + view.getUint8(offset + i);
  const unknown = value === Math.pow(2, 7 * length) - 1;
  return { value: unknown ? -1 : value, length };
}

function sizeLengthFor(value: number): number {
  for (let length = 1; length <= 8; length += 1) {
    if (value < Math.pow(2, 7 * length) - 1) return length;
  }
  return 8;
}

function writeSize(target: Uint8Array, offset: number, value: number, length = sizeLengthFor(value)): void {
  for (let i = length - 1; i >= 0; i -= 1) {
    target[offset + i] = value % 256;
    value = Math.floor(value / 256);
  }
  target[offset] |= 0x80 >> (length - 1);
}

/** Byte del file con `Duration` valorizzata, oppure `null` se non è un WebM utile. */
export function patchWebmDuration(bytes: Uint8Array, durationMs: number): Uint8Array | null {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const ebml = readId(view, 0);
  if (!ebml || ebml.id !== ID_EBML) return null;
  const ebmlSize = readSize(view, ebml.length);
  if (!ebmlSize || ebmlSize.value < 0) return null;

  const segmentOffset = ebml.length + ebmlSize.length + ebmlSize.value;
  const segment = readId(view, segmentOffset);
  if (!segment || segment.id !== ID_SEGMENT) return null;
  const segmentSize = readSize(view, segmentOffset + segment.length);
  if (!segmentSize) return null;
  const segmentDataStart = segmentOffset + segment.length + segmentSize.length;
  const segmentDataEnd =
    segmentSize.value < 0 ? bytes.byteLength : segmentDataStart + segmentSize.value;

  // Info è il primo figlio del Segment nell'output di MediaRecorder.
  let info: { sizeStart: number; sizeLength: number; dataStart: number; dataEnd: number } | null = null;
  let cursor = segmentDataStart;
  while (cursor < segmentDataEnd) {
    const id = readId(view, cursor);
    if (!id) break;
    const size = readSize(view, cursor + id.length);
    if (!size || size.value < 0) break;
    const dataStart = cursor + id.length + size.length;
    const dataEnd = dataStart + size.value;
    if (dataEnd > bytes.byteLength) break;
    if (id.id === ID_INFO) {
      info = { sizeStart: cursor + id.length, sizeLength: size.length, dataStart, dataEnd };
      break;
    }
    cursor = dataEnd;
  }
  if (!info) return null;

  let timecodeScale = DEFAULT_TIMECODE_SCALE;
  let existingDuration: { offset: number; size: number } | null = null;
  let inner = info.dataStart;
  while (inner < info.dataEnd) {
    const id = readId(view, inner);
    if (!id) break;
    const size = readSize(view, inner + id.length);
    if (!size || size.value < 0) break;
    const dataStart = inner + id.length + size.length;
    if (dataStart + size.value > bytes.byteLength) break;
    if (id.id === ID_TIMECODE_SCALE && size.value > 0 && size.value <= 8) {
      let scale = 0;
      for (let i = 0; i < size.value; i += 1) scale = scale * 256 + view.getUint8(dataStart + i);
      if (scale > 0) timecodeScale = scale;
    }
    if (id.id === ID_DURATION) existingDuration = { offset: dataStart, size: size.value };
    inner = dataStart + size.value;
  }

  const durationUnits = (durationMs * 1_000_000) / timecodeScale;

  // Caso facile: Duration c'è già, si sovrascrive senza toccare le dimensioni.
  if (existingDuration && (existingDuration.size === 8 || existingDuration.size === 4)) {
    const copy = bytes.slice();
    const copyView = new DataView(copy.buffer, copy.byteOffset, copy.byteLength);
    if (existingDuration.size === 8) copyView.setFloat64(existingDuration.offset, durationUnits);
    else copyView.setFloat32(existingDuration.offset, durationUnits);
    return copy;
  }
  // Duration c'è ma con una dimensione strana: non vale la pena riscriverla.
  if (existingDuration) return null;

  const dataLength = info.dataEnd - info.dataStart;
  const newDataLength = dataLength + DURATION_ELEMENT_LENGTH;
  const newSizeLength = sizeLengthFor(newDataLength);
  if (segmentSize.value >= 0 && sizeLengthFor(segmentSize.value + DURATION_ELEMENT_LENGTH + newSizeLength - info.sizeLength) !== segmentSize.length) {
    return null; // il Segment conosce la sua dimensione e non entra nello stesso campo
  }

  const out = new Uint8Array(bytes.byteLength + (newSizeLength - info.sizeLength) + DURATION_ELEMENT_LENGTH);
  out.set(bytes.subarray(0, info.sizeStart), 0);
  writeSize(out, info.sizeStart, newDataLength, newSizeLength);
  out.set(bytes.subarray(info.dataStart, info.dataEnd), info.sizeStart + newSizeLength);

  const durationOffset = info.sizeStart + newSizeLength + dataLength;
  out[durationOffset] = 0x44;
  out[durationOffset + 1] = 0x89;
  out[durationOffset + 2] = 0x88; // 8 byte di payload
  new DataView(out.buffer, out.byteOffset, out.byteLength).setFloat64(durationOffset + 3, durationUnits);

  out.set(bytes.subarray(info.dataEnd), durationOffset + DURATION_ELEMENT_LENGTH);

  if (segmentSize.value >= 0) {
    writeSize(out, segmentOffset + segment.length, newDataLength + (segmentSize.value - dataLength), segmentSize.length);
  }

  return out;
}

/** Blob pronto per `<audio>`: stessa traccia, con la durata nell'header. */
export async function withWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const patched = patchWebmDuration(bytes, durationMs);
    if (!patched) return blob;
    const copy = new ArrayBuffer(patched.byteLength);
    new Uint8Array(copy).set(patched);
    return new Blob([copy], { type: blob.type || 'audio/webm' });
  } catch {
    return blob;
  }
}
