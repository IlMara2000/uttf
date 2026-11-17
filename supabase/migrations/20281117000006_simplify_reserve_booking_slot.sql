-- reserve_booking_slot: versione definitiva, a uscita unica.
-- Sostituisce le definizioni di 20281117000002, ...0003 e ...0004.
--
-- Perché è più manutenibile:
-- 1) Nessun RETURN NEXT. In una funzione RETURNS TABLE il RETURN NEXT emette la
--    riga ma non interrompe l'esecuzione: era esattamente questo a far
--    proseguire la funzione fino all'INSERT nei rami not_found/past/full
--    (il bug corretto dalla 20281117000004). Con un solo RETURN QUERY finale
--    la classe di errore non si può ripresentare.
-- 2) Lo stato è calcolato con if/elsif in una variabile, non assegnando a mano
--    le colonne di output su ogni ramo.
-- 3) Via il caso 'not_found': uno slot inesistente restituisce zero righe e il
--    client lo tratta già come "slot sparito" (createReservation: if (!row ...)).
--    Restano tre stati: 'ok' | 'past' | 'full'.
-- 4) Il lock di riga resta: due prenotazioni simultanee sulla stessa fascia
--    vengono serializzate sulla SELECT ... FOR UPDATE.

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
  v_free integer := 0;
  v_status text;
begin
  select s.* into v_slot
  from public.booking_slots s
  where s.id = p_slot_id
  for update;

  if not found then
    return; -- Slot inesistente: nessuna riga, il client risponde "slot sparito".
  end if;

  if v_slot.date < current_date then
    v_status := 'past';
  else
    select coalesce(sum(r.people), 0) into v_taken
    from public.booking_reservations r
    where r.slot_id = p_slot_id
      and r.status = 'confirmed';

    v_free := greatest(v_slot.capacity - v_taken, 0);

    if p_people > v_free then
      v_status := 'full';
    else
      insert into public.booking_reservations(slot_id, code, name, email, phone, people, notes, status)
      values (p_slot_id, p_code, p_name, p_email, p_phone, p_people, p_notes, 'confirmed');

      v_free := v_free - p_people;
      v_status := 'ok';
    end if;
  end if;

  return query
    select v_status, v_free, v_slot.date, v_slot.start_time, v_slot.end_time, v_slot.capacity;
  return;
end $$;

revoke all on function public.reserve_booking_slot(uuid, text, text, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.reserve_booking_slot(uuid, text, text, text, text, integer, text) to service_role;
