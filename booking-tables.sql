-- Prenotazioni slot (calendly interno), orari settimanali e impostazioni email staff.
-- Lettura pubblica degli slot e degli orari; scritture riservate allo staff via RLS.
-- La prenotazione pubblica passa dall'API server (service role) che controlla la capienza.

create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  capacity integer not null check (capacity between 1 and 100),
  category text not null default 'Attività ricreativa',
  internal_note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.booking_reservations (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.booking_slots(id) on delete restrict,
  code text not null unique,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null check (char_length(phone) between 3 and 40),
  people integer not null check (people between 1 and 20),
  notes text not null default '' check (char_length(notes) <= 1000),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'attended')),
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_hours (
  day_of_week integer primary key check (day_of_week between 1 and 7),
  is_open boolean not null default false,
  morning_start time,
  morning_end time,
  afternoon_start time,
  afternoon_end time,
  updated_at timestamptz not null default now(),
  constraint weekly_hours_morning_valid check (morning_start is null or morning_end is null or morning_end > morning_start),
  constraint weekly_hours_afternoon_valid check (afternoon_start is null or afternoon_end is null or afternoon_end > afternoon_start)
);

insert into public.weekly_hours (day_of_week) values (1),(2),(3),(4),(5),(6),(7)
on conflict (day_of_week) do nothing;

create table if not exists public.booking_settings (
  id integer primary key check (id = 1),
  staff_email text not null default 'ass.uttf@gmail.com' check (char_length(staff_email) between 3 and 254),
  updated_at timestamptz not null default now()
);

insert into public.booking_settings (id) values (1) on conflict (id) do nothing;

create index if not exists booking_slots_date_idx on public.booking_slots (date, start_time);
create index if not exists booking_reservations_slot_idx on public.booking_reservations (slot_id, status);

alter table public.booking_slots enable row level security;
alter table public.booking_reservations enable row level security;
alter table public.weekly_hours enable row level security;
alter table public.booking_settings enable row level security;

-- Pubblico: leggere slot e orari (solo future/visibili e righe valide).
drop policy if exists "Public reads booking slots" on public.booking_slots;
create policy "Public reads booking slots" on public.booking_slots for select to anon, authenticated
  using (date >= (current_date - 1));

drop policy if exists "Public reads weekly hours" on public.weekly_hours;
create policy "Public reads weekly hours" on public.weekly_hours for select to anon, authenticated
  using (true);

-- Staff autenticato: gestione completa.
drop policy if exists "Staff manages booking slots" on public.booking_slots;
create policy "Staff manages booking slots" on public.booking_slots for all to authenticated
  using ((select private.staff_role()) is not null) with check ((select private.staff_role()) is not null);

drop policy if exists "Staff reads reservations" on public.booking_reservations;
create policy "Staff reads reservations" on public.booking_reservations for select to authenticated
  using ((select private.staff_role()) is not null);

drop policy if exists "Staff updates reservations" on public.booking_reservations;
create policy "Staff updates reservations" on public.booking_reservations for update to authenticated
  using ((select private.staff_role()) is not null) with check ((select private.staff_role()) is not null);

drop policy if exists "Staff manages weekly hours" on public.weekly_hours;
create policy "Staff manages weekly hours" on public.weekly_hours for all to authenticated
  using ((select private.staff_role()) is not null) with check ((select private.staff_role()) is not null);

drop policy if exists "Staff manages booking settings" on public.booking_settings;
create policy "Staff manages booking settings" on public.booking_settings for all to authenticated
  using ((select private.staff_role()) is not null) with check ((select private.staff_role()) is not null);

-- Vista pubblica con i posti liberi, senza dati personali.
drop view if exists public.booking_slot_availability;
create view public.booking_slot_availability as
select s.id, s.date, s.start_time, s.end_time, s.capacity, s.category,
  greatest(s.capacity - coalesce(sum(case when r.status = 'confirmed' then r.people else 0 end), 0), 0) as free_seats
from public.booking_slots s
left join public.booking_reservations r on r.slot_id = s.id
group by s.id;
grant select on public.booking_slot_availability to anon, authenticated;

-- Nessun insert pubblico diretto: la prenotazione avviene solo dall'API server.
-- Le policy RLS sopra concedono insert/update/delete solo allo staff autenticato.
revoke insert on public.booking_reservations from anon, authenticated;

-- Rate limiting per POST /api/bookings, sullo stesso schema di registration-tables.sql
-- (tabella limiti + RPC take_*_slot): 15 tentativi/ora per IP (IP salvato hashato).
-- Tabella e funzione separate da quelle dei laboratori, così i due limiti non si sommano.
create table if not exists public.booking_rate_limits (
  key text primary key,
  hits integer not null,
  expires_at timestamptz not null
);

alter table public.booking_rate_limits enable row level security;
revoke all on public.booking_rate_limits from anon, authenticated;
grant all on public.booking_rate_limits to service_role;

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

-- Rende atomico il controllo capienza in createReservation.
-- La funzione blocca la riga dello slot (SELECT ... FOR UPDATE) così tra
-- due prenotazioni simultanee sulla stessa fascia una sola può vincere:
-- la seconda attende il commit della prima e vede i posti aggiornati.
-- Uscita unica (un solo RETURN QUERY): nessun RETURN NEXT, quindi non può
-- succedere che un ramo di errore prosegua fino all'INSERT.
-- Stati: 'ok' | 'past' | 'full'. Slot inesistente = zero righe.
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
