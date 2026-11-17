-- Corregge reserve_booking_slot dopo la 20281117000003: in una funzione
-- RETURNS TABLE, "RETURN NEXT" restituisce la riga ma NON esce dalla
-- funzione: senza il "RETURN;" successivo l'esecuzione proseguiva fino
-- all'INSERT anche nei rami not_found/past/full (violazione FK su
-- not_found, prenotazione inserita comunque su past/full).
-- La 20281117000003 nel repo è già corretta; questa migration serve solo
-- a riallineare i DB dove la 00003 era stata applicata senza i RETURN.
-- NOTA: superata dalla 20281117000006, che elimina del tutto il RETURN NEXT
-- e quindi la necessità di questa correzione. Resta come storia delle migration.

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
    return;
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
