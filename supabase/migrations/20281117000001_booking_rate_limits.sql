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
  delete from public.booking_rate_limits where expires_at < now();
  insert into public.booking_rate_limits(key, hits, expires_at)
  values (bucket_key, 1, now() + interval '1 hour')
  on conflict(key) do update set hits = public.booking_rate_limits.hits + 1
  returning hits into n;
  return n <= 15;
end $$;

revoke all on function public.take_booking_slot(text) from public, anon, authenticated;
grant execute on function public.take_booking_slot(text) to service_role;
