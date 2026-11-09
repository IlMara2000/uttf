-- Google Calendar (sola lettura): importa gli eventi nel planner del gestionale.
-- Eseguire una volta nel SQL editor di Supabase.

create table if not exists public.google_calendar_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  refresh_token_encrypted text not null,
  calendar_id text not null default 'primary',
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- I token sono leggibili solo dal service role: nessuna policy per anon/authenticated.
alter table public.google_calendar_accounts enable row level security;
revoke all on public.google_calendar_accounts from anon, authenticated;

create table if not exists public.google_calendar_events (
  id text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  starts_on date not null,
  ends_on date,
  starts_at time,
  html_link text,
  updated_at timestamptz not null default now()
);

create index if not exists google_calendar_events_owner_start_idx
  on public.google_calendar_events (owner_id, starts_on);

alter table public.google_calendar_events enable row level security;
revoke all on public.google_calendar_events from anon, authenticated;
grant select on public.google_calendar_events to authenticated;

create policy "Staff reads imported Google events"
  on public.google_calendar_events for select to authenticated
  using (
    coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false'
    and exists (
      select 1 from public.authorized_users
      where email = lower((select auth.jwt()->>'email'))
        and role in ('staff', 'admin')
    )
  );
