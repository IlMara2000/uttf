-- booking_settings esisteva solo per l'email di conferma (staff_email).
-- Le prenotazioni non mandano email: la conferma è il codice a schermo e lo
-- staff legge le prenotazioni nel pannello, quindi nessun codice legge più
-- questa tabella. La si elimina insieme alla sua policy RLS.
--
-- Idempotente e senza dipendenze: la tabella conteneva una sola riga di semina
-- (staff_email = ass.uttf@gmail.com), mai modificata.

drop table if exists public.booking_settings;
