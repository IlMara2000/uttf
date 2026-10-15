-- Link in bio: one document, atomic updates and authorization from the staff allowlist.
create or replace function public.valid_bio_links(items jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare item jsonb; seen text[] := '{}';
begin
  if jsonb_typeof(items) is distinct from 'array' then return false; end if;
  if jsonb_array_length(items) > 50 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item->'id') is distinct from 'string'
      or length(item->>'id') not between 1 and 100
      or (item->>'id') = any(seen)
      or jsonb_typeof(item->'title') is distinct from 'string'
      or length(trim(item->>'title')) not between 1 and 100
      or jsonb_typeof(item->'description') is distinct from 'string'
      or length(item->>'description') > 200
      or jsonb_typeof(item->'visible') is distinct from 'boolean'
      or jsonb_typeof(item->'url') is distinct from 'string'
      or length(item->>'url') not between 1 and 2000
      or (item->>'url') ~ '[[:space:][:cntrl:]\\]'
      or not ((item->>'url') ~ '^/([^/]|$)' or (item->>'url') ~* '^(https?://[^/]+|mailto:[^@]+@[^@]+|tel:[+0-9])')
      then return false; end if;
    seen := array_append(seen, item->>'id');
  end loop;
  return true;
end;
$$;
create table public.bio_page (
  id smallint primary key default 1 check (id = 1),
  links jsonb not null check (public.valid_bio_links(links)),
  version integer not null default 0 check (version >= 0)
);
alter table public.bio_page enable row level security;
grant select on public.bio_page to anon, authenticated;
grant update (links, version) on public.bio_page to authenticated;
create policy "Read link in bio" on public.bio_page for select to anon, authenticated using (true);
create policy "Staff edits link in bio" on public.bio_page for update to authenticated
using (
  (select auth.uid()) is not null
  and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false'
  and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')))
)
with check (
  (select auth.uid()) is not null
  and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false'
  and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')))
);

insert into public.bio_page (id, links) values (1, '[{"id":"site","title":"Sito web UTTF","url":"/","description":"Entra nella Factory.","visible":true},{"id":"labs","title":"Iscrizione ai laboratori","url":"https://forms.gle/gbkbEvaavFaHFkkG9","description":"Le idee prendono voce.","visible":true},{"id":"instagram","title":"Under The Tower Factory","url":"https://www.instagram.com/under_the_tower_factory","description":"Seguici su Instagram.","visible":true},{"id":"rap","title":"RAPF*CKTORY","url":"https://www.instagram.com/rapfcktory","description":"Rap, scrittura e comunità.","visible":true},{"id":"tiktok","title":"RAPF*CKTORY su TikTok","url":"https://www.tiktok.com/@rapfcktory","description":"Video e momenti dalla community.","visible":true},{"id":"spotify","title":"Spotify playlist","url":"https://open.spotify.com/user/314eujaiyh7mys322dsnqcvo4ire","description":"La musica che ci accompagna.","visible":true},{"id":"youtube","title":"YouTube channel","url":"https://youtube.com/@underthetowerfactory83","description":"Video e live della Factory.","visible":true},{"id":"sumfest","title":"SUMFEST 24 — Archivio","url":"https://www.facebook.com/share/EmFuE2mTfGagaWBW/?mibextid=9l3rBW","description":"Un evento concluso, una storia da rivedere.","visible":true},{"id":"facebook","title":"Facebook","url":"https://facebook.com/underthetowerfactory","description":"La nostra pagina.","visible":true},{"id":"whatsapp","title":"Contattaci su WhatsApp","url":"https://api.whatsapp.com/send?phone=393491188626","description":"Restiamo in contatto.","visible":true},{"id":"news","title":"Diario della Factory","url":"/feed","description":"Le ultime novità, direttamente da qui.","visible":true},{"id":"email","title":"Scrivici","url":"mailto:ass.uttf@gmail.com","description":"Facciamo qualcosa insieme.","visible":true}]'::jsonb);
