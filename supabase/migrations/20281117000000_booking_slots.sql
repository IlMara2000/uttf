-- Prenotazioni slot (calendly interno), orari settimanali e impostazioni email staff.
-- Lettura pubblica degli slot e degli orari; scritture riservate allo staff via RLS.
-- La prenotazione pubblica passa dall'API server (service role) che controlla la capienza.

create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  capacity integer not null check (capacity between 1 and 100),
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
select s.id, s.date, s.start_time, s.end_time, s.capacity,
  greatest(s.capacity - coalesce(sum(case when r.status = 'confirmed' then r.people else 0 end), 0), 0) as free_seats
from public.booking_slots s
left join public.booking_reservations r on r.slot_id = s.id
group by s.id;
grant select on public.booking_slot_availability to anon, authenticated;

-- Nessun insert pubblico diretto: la prenotazione avviene solo dall'API server.
-- Le policy RLS sopra concedono insert/update/delete solo allo staff autenticato.
revoke insert on public.booking_reservations from anon, authenticated;
