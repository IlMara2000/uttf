-- Iscritti storici della newsletter senza prova del consenso (art. 7.1 GDPR).
--
-- Eseguire dall'SQL Editor del progetto Supabase oieqtrfeoyfabyjirrqa.
-- Il piano operativo completo è in docs/legale/newsletter-iscritti-storici.md.
--
-- Regola generale del file: si lavora solo su righe con consent_at is null,
-- quindi ogni blocco è ripetibile e non tocca gli iscritti nuovi (che hanno
-- consent_at valorizzato dal form).

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

-- ---------------------------------------------------------------------------
-- B. REGISTRAZIONE DI UNA RICONFERMA (solo se scegli l'email di riconferma)
--    Da eseguire dopo che la persona ha risposto "SÌ" dalla propria casella.
--    Metti la data e l'ora reali della risposta, non quelle dell'invio.
--    consent_ip_hash resta null: la prova è la risposta stessa, conservata
--    nella casella dell'associazione.
-- ---------------------------------------------------------------------------
begin;

update public.newsletter_subscribers
set consent_at = timestamptz '2026-11-25 09:12:00+01',
    consent_version = 'privacy 2.1 (riconferma via email)'
where lower(email) = lower('nome@example.com')
  and consent_at is null
returning id, email, consent_at, consent_version;

commit;

-- ---------------------------------------------------------------------------
-- C. CHIUSURA DELLA RICONFERMA (dopo la scadenza, 24 dicembre 2026)
--    Cancella chi non ha risposto entro il termine dichiarato nell'email.
-- ---------------------------------------------------------------------------
begin;

delete from public.newsletter_subscribers
where consent_at is null
returning id, email, created_at;

commit;
