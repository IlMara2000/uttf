-- Categorie per gli slot (Studio didattico, Attività ricreativa, Studio
-- professionale, ...): colonna libera con default, la lista curata vive nel
-- codice (BOOKING_CATEGORIES in src/lib/bookings/model.ts). La vista pubblica
-- va ricreata per esporre la categoria senza dati personali.

alter table public.booking_slots
  add column if not exists category text not null default 'Attività ricreativa';

drop view if exists public.booking_slot_availability;
create view public.booking_slot_availability as
select s.id, s.date, s.start_time, s.end_time, s.capacity, s.category,
  greatest(s.capacity - coalesce(sum(case when r.status = 'confirmed' then r.people else 0 end), 0), 0) as free_seats
from public.booking_slots s
left join public.booking_reservations r on r.slot_id = s.id
group by s.id;
grant select on public.booking_slot_availability to anon, authenticated;
