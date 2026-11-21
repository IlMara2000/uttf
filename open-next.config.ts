import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

/**
 * Cache ISR per Cloudflare Workers (OpenNext).
 *
 * Su Vercel l'ISR è gestito dalla piattaforma; su Workers va detto dove
 * salvare le pagine e con quale coda rigenerarle. Le tre scelte:
 *
 * - `incrementalCache` su **R2** (binding `NEXT_INC_CACHE_R2_BUCKET`): pagine
 *   e dati ISR sopravvivono agli isolate. È il pezzo che oggi manca e che
 *   renderebbe `revalidate = 60` in `src/app/page.tsx` una cache per-richiesta.
 * - `tagCache` su **D1** (binding `NEXT_TAG_CACHE_D1`): `revalidateTag` e
 *   `revalidatePath` funzionano anche tra isolate diversi.
 * - `queue` su **Durable Object** (binding `NEXT_CACHE_DO_QUEUE`): le
 *   rigenerazioni in background vengono accodate invece di partire una per
 *   richiesta.
 *
 * `enableCacheInterception` serve la pagina dalla cache prima di instradare la
 * richiesta: con pagine quasi-statiche riduce CPU e latenza. Va spento se in
 * futuro si attiva PPR (Partial Prerendering).
 *
 * I tre binding non esistono ancora: vanno dichiarati in `wrangler.jsonc`
 * (R2, D1 e la classe Durable Object dell'adapter) nella fase 2, insieme al
 * flag di compatibilità `global_fetch_strictly_public`.
 *
 * Nota sulle versioni: questa configurazione è scritta per
 * `@opennextjs/cloudflare` 1.20.15, l'ultima compatibile con Next 16.4.3.
 * Dalla 1.20.16 l'adapter richiede Next >= 16.4.5, quindi l'aggiornamento di
 * Next patch va fatto prima di passare all'adapter più recente.
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: doQueue,
  enableCacheInterception: true,
});
