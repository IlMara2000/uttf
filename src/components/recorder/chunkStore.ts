import type { SessionMeta, StoredChunk } from './types';

const DB_NAME = 'recorder-db';
const DB_VERSION = 1;
const SESSIONS = 'sessions';
const CHUNKS = 'chunks';
const BY_SESSION = 'bySession';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB non disponibile'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSIONS)) {
        db.createObjectStore(SESSIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CHUNKS)) {
        const store = db.createObjectStore(CHUNKS, { keyPath: ['sessionId', 'index'] });
        store.createIndex(BY_SESSION, 'sessionId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Apertura IndexedDB fallita'));
  });
  return dbPromise;
}

function wrap<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Operazione IndexedDB fallita'));
  });
}

async function store(name: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export async function saveSession(meta: SessionMeta): Promise<void> {
  const s = await store(SESSIONS, 'readwrite');
  await wrap(s.put(meta));
}

export async function getSession(id: string): Promise<SessionMeta | undefined> {
  const s = await store(SESSIONS, 'readonly');
  return wrap<SessionMeta | undefined>(s.get(id) as IDBRequest<SessionMeta | undefined>);
}

export async function listOpenSessions(): Promise<SessionMeta[]> {
  const s = await store(SESSIONS, 'readonly');
  const all = await wrap<SessionMeta[]>(s.getAll() as IDBRequest<SessionMeta[]>);
  return all.filter((m) => m.status === 'recording' || m.status === 'finalizing');
}

export async function saveChunk(chunk: StoredChunk): Promise<void> {
  const s = await store(CHUNKS, 'readwrite');
  await wrap(s.put(chunk));
}

export async function listChunks(sessionId: string): Promise<StoredChunk[]> {
  const s = await store(CHUNKS, 'readonly');
  const index = s.index(BY_SESSION);
  const all = await wrap<StoredChunk[]>(index.getAll(sessionId) as IDBRequest<StoredChunk[]>);
  return all.sort((a, b) => a.index - b.index);
}

export async function markChunkUploaded(sessionId: string, index: number): Promise<void> {
  const s = await store(CHUNKS, 'readwrite');
  const existing = await wrap<StoredChunk | undefined>(
    s.get([sessionId, index]) as IDBRequest<StoredChunk | undefined>,
  );
  if (!existing) return;
  await wrap(s.put({ ...existing, uploaded: true }));
}

/** Cancella sessione e chunk (usare dopo conferma dell'utente). */
export async function deleteSession(sessionId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([SESSIONS, CHUNKS], 'readwrite');
    tx.objectStore(SESSIONS).delete(sessionId);
    const index = tx.objectStore(CHUNKS).index(BY_SESSION);
    const cursorRequest = index.openKeyCursor(IDBKeyRange.only(sessionId));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      tx.objectStore(CHUNKS).delete(cursor.primaryKey);
      cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Cancellazione fallita'));
  });
}
