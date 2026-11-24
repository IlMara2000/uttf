export type UploadOutcome = 'uploaded' | 'failed';

export type UploadJob = {
  sessionId: string;
  index: number;
  blob: Blob;
  hash?: string;
};

export type UploaderOptions = {
  endpoint: (sessionId: string) => string;
  fetchImpl?: typeof fetch;
  maxConcurrent?: number;
  maxAttempts?: number;
  onResult?: (job: UploadJob, outcome: UploadOutcome) => void;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** SHA-256 esadecimale del blob: il server lo confronta con quello che calcola lui. */
export async function sha256Hex(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

class UploadHttpError extends Error {
  constructor(readonly status: number) {
    super(`Upload non riuscito (HTTP ${status})`);
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof UploadHttpError) {
    return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500;
  }
  return true; // errore di rete / abort: vale la pena ritentare
}

/**
 * I chunk viaggiano con il loro indice: possono arrivare fuori ordine,
 * il server li ricompone per `index`.
 */
export class ChunkUploader {
  private queue: UploadJob[] = [];
  private active = 0;
  private readonly maxConcurrent: number;
  private readonly maxAttempts: number;

  constructor(private readonly options: UploaderOptions) {
    this.maxConcurrent = options.maxConcurrent ?? 2;
    this.maxAttempts = options.maxAttempts ?? 3;
  }

  /** Chunk ancora in coda o in volo. */
  get pending(): number {
    return this.queue.length + this.active;
  }

  enqueue(job: UploadJob): void {
    this.queue.push(job);
    this.pump();
  }

  /**
   * Attende che la coda si svuoti. Fa polling breve invece di
   * contabilità di promise: meno stato, meno modi di bloccarsi.
   */
  async flush(timeoutMs = 120_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (this.pending > 0 && Date.now() < deadline) {
      await sleep(200);
    }
  }

  private pump(): void {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) return;
      this.active += 1;
      void this.run(job).finally(() => {
        this.active -= 1;
        this.pump();
      });
    }
  }

  private async run(job: UploadJob): Promise<void> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        await this.send(job);
        this.options.onResult?.(job, 'uploaded');
        return;
      } catch (error) {
        if (!isRetryable(error) || attempt === this.maxAttempts) {
          this.options.onResult?.(job, 'failed');
          return;
        }
        await sleep(500 * 2 ** (attempt - 1)); // 500ms, 1s, 2s
      }
    }
  }

  private async send(job: UploadJob): Promise<void> {
    const doFetch = this.options.fetchImpl ?? fetch;
    const form = new FormData();
    form.append('index', String(job.index));
    if (job.hash) form.append('hash', job.hash);
    form.append('file', job.blob, `chunk-${String(job.index).padStart(5, '0')}.bin`);

    const response = await doFetch(this.options.endpoint(job.sessionId), {
      method: 'POST',
      body: form,
      credentials: 'same-origin',
    });

    if (!response.ok) throw new UploadHttpError(response.status);
  }
}
