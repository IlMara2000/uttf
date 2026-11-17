/** Tipi e normalizzazioni condivisi tra API e dashboard del drive.
 * Nessun import server: questo file gira anche nel browser. */

export type DriveKind = 'image' | 'video' | 'audio' | 'other';

export type DriveTag = {
  id: string;
  name: string;
  color: string;
};

export type DriveAsset = {
  id: string;
  name: string;
  folderPath: string;
  relPath: string;
  mime: string;
  kind: DriveKind;
  sizeBytes: number;
  sha256: string;
  duplicateOf: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  hasThumb: boolean;
  capturedAt: string;
  tags: DriveTag[];
  thumbUrl: string | null;
  fileUrl: string;
  /** URL firmato che punta all'agente/tunnel: null se l'accesso diretto è spento. */
  directFileUrl: string | null;
};

export type DriveFolderSummary = {
  path: string;
  name: string;
  assetCount: number;
  totalBytes: number;
};

/** Stato della copia di sicurezza, letto da /api/health dell'agente. */
export type DriveBackupStatus = {
  configured: boolean;
  volume: string | null;
  mounted: boolean;
  pending: number;
  lastCopyAt: string | null;
  lastError: string | null;
};

export type DriveAgentStatus = {
  reachable: boolean;
  root: string | null;
  files: number | null;
  bytes: number | null;
  freeBytes: number | null;
  totalBytes: number | null;
  backup: DriveBackupStatus;
  error: string | null;
};

/** Stato senza asset: gli URL firmati restano quelli gia' caricati dalla pagina. */
export type DriveStatusPayload = {
  folders: DriveFolderSummary[];
  totals: { assets: number; bytes: number };
  agent: DriveAgentStatus;
  syncedAt: string | null;
};

export type DriveIndexPayload = DriveStatusPayload & {
  assets: DriveAsset[];
  tags: DriveTag[];
};

const MAX_TAG_LENGTH = 40;

/** Slug accettato dal check SQL di drive_tags.name. */
export function driveTagSlug(value: unknown) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 _-]/g, '')
    .replace(/^[- _]+|[- _]+$/g, '')
    .slice(0, MAX_TAG_LENGTH)
    .trim();
}

export function isDriveId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export function driveKindFromMime(mime: string): DriveKind {
  const value = mime.toLowerCase();
  if (value.startsWith('image/')) return 'image';
  if (value.startsWith('video/')) return 'video';
  if (value.startsWith('audio/')) return 'audio';
  return 'other';
}

/** Numero non negativo arrivato da JSON o dal database, altrimenti null. */
export function driveNumberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function formatDriveBytes(bytes: number | null | undefined) {
  if (!bytes || bytes < 1) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
