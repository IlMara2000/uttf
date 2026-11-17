-- Semplificazione delle due RPC di prenotazione (nessun cambio di comportamento):
-- NOTA: la definizione di reserve_booking_slot qui sotto è superata dalla
-- 20281117000006 (versione a uscita unica). Serve solo come storia delle
-- migration; la versione corrente è quella della 00006 e di booking-tables.sql.
-- 1) take_booking_slot: niente più DELETE sull'intera tabella a ogni chiamata
--    (scan + contention sotto spam). La riga scaduta si azzera in UPSERT.
-- 2) reserve_booking_slot: stessi status, ma senza i "return;" irraggiungibili
--    e i rami di azzeramento ridondanti.
-- Da applicare su Supabase (UTTF HUB) dopo le 20281117000001 / ...0002.

create or replace function public.take_booking_slot(bucket_key text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  insert into public.booking_rate_limits(key, hits, expires_at)
  values (bucket_key, 1, now() + interval '1 hour')
  on conflict(key) do update set
    hits = case when public.booking_rate_limits.expires_at < now() then 1
                else public.booking_rate_limits.hits + 1 end,
    expires_at = case when public.booking_rate_limits.expires_at < now()
                      then now() + interval '1 hour'
                      else public.booking_rate_limits.expires_at end
  returning hits into n;
  return n <= 15;
end $$;

revoke all on function public.take_booking_slot(text) from public, anon, authenticated;
grant execute on function public.take_booking_slot(text) to service_role;

create or replace function public.reserve_booking_slot(
  p_slot_id uuid,
  p_code text,
  p_name text,
  p_email text,
  p_phone text,
  p_people integer,
  p_notes text
) returns table (
  status text,
  free integer,
  slot_date date,
  slot_start time,
  slot_end time,
  capacity integer
) language plpgsql security invoker set search_path = '' as $$
declare
  v_slot public.booking_slots%rowtype;
  v_taken integer;
begin
  select s.* into v_slot
  from public.booking_slots s
  where s.id = p_slot_id
  for update;

  if not found then
    status := 'not_found';
    free := 0;
    return next;
    return; -- RETURN NEXT non esce dalla funzione: il RETURN chiude il ramo.
  end if;

  slot_date := v_slot.date;
  slot_start := v_slot.start_time;
  slot_end := v_slot.end_time;
  capacity := v_slot.capacity;

  if v_slot.date < current_date then
    status := 'past';
    free := 0;
    return next;
    return;
  end if;

  select coalesce(sum(r.people), 0) into v_taken
  from public.booking_reservations r
  where r.slot_id = p_slot_id
    and r.status = 'confirmed';

  free := greatest(v_slot.capacity - v_taken, 0);
  if p_people > free then
    status := 'full';
    return next;
    return;
  end if;

  insert into public.booking_reservations(slot_id, code, name, email, phone, people, notes, status)
  values (p_slot_id, p_code, p_name, p_email, p_phone, p_people, p_notes, 'confirmed');

  free := free - p_people;
  status := 'ok';
  return next;
end $$;

revoke all on function public.reserve_booking_slot(uuid, text, text, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.reserve_booking_slot(uuid, text, text, text, text, integer, text) to service_role;
