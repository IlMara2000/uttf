-- Iscritti storici della newsletter senza prova del consenso (art. 7.1 GDPR).
--
-- Eseguire dall'SQL Editor del progetto Supabase oieqtrfeoyfabyjirrqa.
-- Il piano operativo completo è in docs/legale/newsletter-iscritti-storici.md.
--
-- Regola generale del file: si lavora solo su righe con consent_at is null,
-- quindi ogni blocco è ripetibile e non tocca gli iscritti nuovi (che hanno
-- consent_at valorizzato dal form).
--
-- Stato: pratica chiusa il 23 novembre 2026 con il blocco A. I blocchi sulla
-- riconferma via email sono stati rimossi perché quel percorso non è stato
-- seguito.

-- ---------------------------------------------------------------------------
-- 1. Fotografia: chi sono, prima di decidere
-- ---------------------------------------------------------------------------
select id, created_at, name, email, phone, consent_at, consent_version
from public.newsletter_subscribers
where consent_at is null
order by created_at;

-- 1b. Copia di sicurezza in JSON: esegui questa e salva il risultato in un
--     foglio prima di cancellare qualsiasi cosa.
select coalesce(json_agg(row_to_json(t)), '[]'::json) as backup
from (
  select *
  from public.newsletter_subscribers
  where consent_at is null
) t;

-- ---------------------------------------------------------------------------
-- A. CANCELLAZIONE (opzione consigliata con 3 iscritti)
--    Restituisce le righe eliminate: annota gli id nel registro delle attività.
--    ESEGUITO il 23 novembre 2026: 3 righe eliminate, verifica finale 0.
--    Gli id sono in docs/legale/pendenze-compliance.md §4.
-- ---------------------------------------------------------------------------
begin;

delete from public.newsletter_subscribers
where consent_at is null
returning id, email, created_at;

commit;

-- Verifica: deve restituire 0.
select count(*) as iscritti_senza_prova
from public.newsletter_subscribers
where consent_at is null;
