export type RecorderMode = 'call' | 'standalone';

export type RecorderStatus =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'finalizing'
  | 'done'
  | 'error';

/**
 * Una pausa è ancorata alla timeline REGISTRATA (pause escluse):
 * `atRecordedMs` = quanto audio c'era già quando è iniziata,
 * `durationMs`  = quanto è durata (0 se ancora aperta).
 * Da qui si ricostruisce l'ora di parete di ogni istante del trascritto.
 */
export type PauseInterval = {
  atRecordedMs: number;
  durationMs: number;
};

export type SessionMeta = {
  id: string;
  mode: RecorderMode;
  title: string;
  location?: string;
  status: 'recording' | 'finalizing' | 'closed' | 'aborted';
  /** epoch ms del primo frame registrato */
  startedAt: number;
  /** durata registrata (pause escluse) all'ultimo salvataggio */
  recordedMs: number;
  pauses: PauseInterval[];
  mimeType: string;
  chunkCount: number;
  /** identifica il tab che registra: serve a non recuperare una sessione ancora viva */
  ownerTabId: string;
  /** heartbeat: ms epoch dell'ultimo aggiornamento */
  updatedAt: number;
};

export type StoredChunk = {
  sessionId: string;
  index: number;
  blob: Blob;
  hash: string;
  uploaded: boolean;
  createdAt: number;
};

export type ChunkStats = { total: number; uploaded: number; failed: number };
