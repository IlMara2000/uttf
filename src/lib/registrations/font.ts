/**
 * Byte del font usato per generare il PDF di autorizzazione.
 *
 * Su Workers non esiste un filesystem leggibile, quindi `readFile` di
 * `public/fonts/...` non funziona. Il file resta in `public/`, che OpenNext
 * serve con il binding `ASSETS`: lo scarichiamo dal sito stesso e lo teniamo in
 * memoria per isolate (il font è immutabile).
 *
 * Sul Worker la richiesta verso il proprio hostname ha bisogno del flag di
 * compatibilità `global_fetch_strictly_public` in `wrangler.jsonc`; Vercel
 * serve `public/` allo stesso modo, quindi il codice è identico sui due host.
 */
const FONT_PATH = "/fonts/NotoSans-Regular.ttf";

let cached: Uint8Array | null = null;

export async function notoSansBytes(origin: string): Promise<Uint8Array> {
  if (cached) return cached;

  const response = await fetch(new URL(FONT_PATH, origin));
  if (!response.ok) {
    throw new Error(`Font non disponibile (HTTP ${response.status}).`);
  }

  cached = new Uint8Array(await response.arrayBuffer());
  return cached;
}
