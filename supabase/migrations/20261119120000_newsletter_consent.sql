-- Prova del consenso per la newsletter (art. 7.1 e art. 5.2 GDPR).
--
-- L'iscrizione è una comunicazione promozionale: serve un consenso separato e
-- dimostrabile (art. 6.1.a GDPR e art. 130 del D.Lgs. 196/2003). Conserviamo la
-- data del consenso, la versione dell'informativa accettata e un hash HMAC
-- dell'indirizzo IP usato al momento dell'iscrizione: l'IP non è memorizzato in
-- chiaro e l'hash non consente di risalire all'interessato senza la chiave.
--
-- Da applicare una sola volta, prima del deploy dell'API aggiornata. L'API
-- funziona anche senza queste colonne, ma senza prova del consenso.

alter table public.newsletter_subscribers
  add column if not exists consent_at timestamptz,
  add column if not exists consent_version text,
  add column if not exists consent_ip_hash text;

comment on column public.newsletter_subscribers.consent_at is
  'Data e ora del consenso alla newsletter (art. 7 GDPR).';
comment on column public.newsletter_subscribers.consent_version is
  'Versione dell''informativa privacy accettata al momento del consenso.';
comment on column public.newsletter_subscribers.consent_ip_hash is
  'HMAC-SHA256 dell''IP al momento dell''iscrizione, usato come prova anti-abuso.';

-- Le iscrizioni storiche non hanno prova del consenso: vanno riconfermate o
-- cancellate dallo staff entro la revisione della lista (principio di
-- responsabilizzazione). Non valorizziamo la colonna per non creare prove false.
