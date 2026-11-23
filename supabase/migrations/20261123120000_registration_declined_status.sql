-- Stato esplicito "non accolta" per le richieste di iscrizione.
--
-- Prima la valutazione dello staff non aveva uno stato proprio: `received`
-- (invio completato, non ancora verificato) e `reviewed` (documenti verificati)
-- misuravano solo la verifica della cartella, e la retention trattava
-- `received` oltre 12 mesi come rifiuto. Ora `declined` distingue la richiesta
-- valutata e non accolta (o ritirata) da quella ancora in attesa di verifica,
-- che non va cancellata come un rifiuto.
--
-- Il vincolo preesistente è anonimo (check inline della create table), quindi
-- viene rimosso cercandolo per definizione invece che per nome.

do $$
declare
  conname text;
begin
  for conname in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.activity_registrations'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format(
      'alter table public.activity_registrations drop constraint %I',
      conname
    );
  end loop;
end $$;

alter table public.activity_registrations
  add constraint activity_registrations_status_check
  check (status in ('pending', 'received', 'reviewed', 'declined'));
