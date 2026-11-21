-- Schema della tag cache ISR su D1 (binding NEXT_TAG_CACHE_D1).
--
-- Va applicato al database D1 una sola volta, dopo averlo creato:
--   npx wrangler d1 create uttf-tag-cache
--   npx wrangler d1 execute uttf-tag-cache --remote --file=cloudflare/d1-next-tag-cache.sql
--
-- La tabella è quella letta da `d1-next-tag-cache` di @opennextjs/cloudflare:
-- una riga per tag, con il timestamp dell'ultima rivalidazione. Senza questa
-- tabella `revalidateTag` e `revalidatePath` falliscono sul Worker.

CREATE TABLE IF NOT EXISTS revalidations (
  tag TEXT NOT NULL,
  revalidatedAt INTEGER NOT NULL,
  stale INTEGER,
  expire INTEGER DEFAULT NULL,
  UNIQUE(tag) ON CONFLICT REPLACE
);
