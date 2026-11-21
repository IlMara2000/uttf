# Migrazione dell'app su Cloudflare Workers

Stato al 21 novembre 2026. Oggi l'app gira su **Vercel** (progetto `uttf-app`,
dominio `uttf.vercel.app`, funzioni in `iad1`); database, auth e file stanno su
**Supabase**. Questo documento elenca cosa va cambiato, in che ordine, e i punti
del codice che **non** funzionano su Workers così come sono.

**Fase 1 completata**: i tre blocchi di codice sono risolti, `wrangler.jsonc` e
`open-next.config.ts` esistono, e il Worker è stato compilato e avviato in
workerd in locale (`opennextjs-cloudflare build` e `preview`). Non è stato
deployato nulla e la produzione resta su Vercel.

Riferimenti verificati: `opennext.js.org/cloudflare`, `developers.cloudflare.com/workers/framework-guides/web-apps/opennext`.
Il progetto è su Next **16.4.5** con `@opennextjs/cloudflare` **1.20.18**, la
combinazione richiesta dall'adapter (peer `next >= 16.4.5`). Cloudflare ora consiglia **vinext** per le
app nuove, ma per un'app già in produzione il percorso è **OpenNext**: esegue il
vero `next build` e adatta l'output a workerd.

## Cosa resta uguale

- **Supabase** resta database, autenticazione e storage. R2/D1 non sostituiscono
  PostgREST, Auth e Storage: sarebbero una riscrittura, non una migrazione.
- Il codice applicativo (App Router, route handler, RLS, `service_role`,
  `node:crypto`) resta: Workers espone le API Node con `nodejs_compat`.
- Le variabili d'ambiente mantengono gli stessi nomi, diventano secret del
  Worker. Le `NEXT_PUBLIC_*` restano valori di build.

## Blocchi verificati nel codice

| Punto | File | Perché blocca | Rimedio |
|---|---|---|---|
| Lettura del font da disco | ~~`src/app/api/registrations/route.ts`~~ **risolto** | Su Workers non esiste un filesystem: `node:fs` non è disponibile | Fatto: `src/lib/registrations/font.ts` scarica il font da `public/fonts` con `fetch` (servito da `ASSETS`), con memo per isolate; `outputFileTracingIncludes` rimosso |
| Ottimizzazione immagini | ~~`next.config.ts`~~ **risolto** | `sharp` non gira su Workers; `/_next/image` richiede un binding | Fatto: `images.unoptimized = true`. Le foto del gestionale sono già ridimensionate a 1600 px in WebP dal browser (`src/lib/optimize-upload.ts`), quindi Cloudflare Images non serve |
| ISR | `src/app/page.tsx`: `export const revalidate = 60` | Senza cache configurata l'ISR non persiste tra isolate | Fatto: `open-next.config.ts` con cache incrementale su **R2** (`NEXT_INC_CACHE_R2_BUCKET`), tag cache su **D1** (`NEXT_TAG_CACHE_D1`) e coda su Durable Object (`NEXT_CACHE_DO_QUEUE`). I binding vanno creati nella fase 2 |
| Proxy media | `src/app/api/publications/media/[name]/route.ts` (`force-dynamic`) | Su Vercel è la voce di costo principale e ha il limite body 4,5 MB | Su Workers valutare R2 + binding diretto, o mantenere Supabase Storage con URL firmati |
| Archivio su disco | `src/lib/drive-server.ts`, agente su `127.0.0.1:8787` | Su Workers non esiste rete locale verso il Mac | Cloudflare Tunnel + Access (già previste `CF_ACCESS_CLIENT_ID/SECRET` e `DRIVE_PUBLIC_URL`) |
| Cron | `vercel.json` | I cron di Vercel non esistono su Cloudflare | Cron Trigger in `wrangler.jsonc` + `scheduled` handler che chiama `runRetention` da `src/lib/retention.ts` |
| Header IP | `src/app/api/newsletter/route.ts` legge `x-vercel-forwarded-for` | Header assente su Workers | Il fallback su `x-forwarded-for` funziona; Cloudflare espone anche `cf-connecting-ip`: usarlo come prima scelta dopo la migrazione |
| PDF | `pdf-lib` + `@pdf-lib/fontkit` + `fflate` | Sono JS puri, ma il rendering pesa in CPU | Verificare il tempo CPU sul piano Workers Paid; se serve, generare il PDF in una coda |

`src/proxy.ts` (il "middleware" di Next 16, runtime Node) protegge `/dashboard`,
`/admin` e `/drive`. OpenNext lo supporta in modo sperimentale dalle versioni
1.20.x: verificare la versione installata e rifare il test di redirect al login
prima del cutover.

## Passi

1. **Prima del trasloco** (sul codice, con Vercel ancora attivo):
   - ~~sostituire `readFile` del font con import/asset~~ (fatto);
   - ~~decidere immagini: Cloudflare Images o `unoptimized`~~ (fatto: `unoptimized`);
   - ~~`open-next.config.ts` con le cache ISR~~ (fatto);
   - esporre la retention anche come funzione pura (già fatto: `runRetention`);
   - aggiungere `RETENTION_TOKEN` all'ambiente e togliere la dipendenza da
     `CRON_SECRET` quando si passa ai Cron Trigger.
2. Installare l'adapter: `npm i @opennextjs/cloudflare` e `npm i -D wrangler`.
3. ~~Creare `wrangler.jsonc`~~ **fatto**: `main`, `compatibility_date`,
   i due flag, `assets` con `ASSETS`, self-reference, R2, D1 e Durable Object.
   Restano da creare le risorse e da sostituire l'id D1 segnaposto.
   Il binding `IMAGES` è volutamente assente: le immagini sono `unoptimized`.
4. ~~Creare `open-next.config.ts`~~ **fatto** con `defineCloudflareConfig()` e le
   tre cache.
5. **Build e prova locale** — fatta il 21 novembre 2026: `opennextjs-cloudflare
   build` completa e `preview` serve `/`, `/privacy`, `/cookie`, `/sitemap.xml`,
   `/api/health` e `/fonts/NotoSans-Regular.ttf` con i content-type corretti. La
   fetch del font dall'interno del Worker restituisce 569.208 byte, quindi il
   rimedio funziona su workerd. Da rifare qui i controlli che oggi si fanno su
   `next start` con un database raggiungibile: login staff, upload, PDF, cron.
   Nota: i Durable Object "interni" non vengono emulati da `wrangler dev` (la
   coda di rivalidazione va provata con le risorse reali); il middleware Node
   (`src/proxy.ts`) è supportato in modo sperimentale e va verificato al cutover.
6. Creare le risorse Cloudflare (R2, D1, KV se serve) e caricare i secret con
   `wrangler secret put` (stessi nomi di `.env.example`).
7. Deploy su un dominio di prova (`*.workers.dev`) e verificare:
   - pagine pubbliche e legali con i content-type corretti;
   - login, sessione, 401/403;
   - upload e download dal bucket privato;
   - job di retention in dry-run;
   - immagini ottimizzate.
8. Spostare il DNS su Cloudflare, abbassare il TTL a 5 minuti, aggiungere il
   custom domain al Worker e fare il cutover. **Mantenere il deployment Vercel
   attivo** per almeno una settimana come rollback.
9. Dopo il cutover: aggiornare `SITE_URL` in `src/app/seo.ts` e `siteUrl` in
   `src/lib/legal-entity.ts`, il registro dei trattamenti e i DPA.

## Costi indicativi (novembre 2026)

| Voce | Vercel oggi | Cloudflare |
|---|---|---|
| Hosting | Pro 20 $/posto + credito incluso | Workers Paid 5 $/mese |
| Cache ISR | inclusa | R2 (0,015 $/GB-mese) + D1 (piano gratuito sufficiente) |
| Immagini | optimizer incluso | Cloudflare Images (a consumo) o `unoptimized` |
| Egress | incluso nel piano | R2 senza costi di uscita |

Il risparmio vero non è l'hosting: è togliere il proxy media `force-dynamic` e
spostare i file su R2, che oggi è la voce che cresce con le visite.

## Rollback

Il rollback è DNS: riportare il record sul progetto Vercel, che resta intatto
fino a quando la migrazione non è stabile. Tenere il TTL basso per tutta la
settimana di osservazione e non cancellare il progetto Vercel prima di aver
verificato un ciclo completo di fatturazione.
