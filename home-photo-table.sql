-- The home photo is public; only signed-in, non-anonymous staff accounts may change it.
create table public.home_photo (
  id smallint primary key default 1 check (id = 1),
  url text not null check (url = '/labs/foto1.jpeg' or url ~ '^https://oieqtrfeoyfabyjirrqa[.]supabase[.]co/storage/v1/object/public/site-photos/home/[a-z0-9-]+[.](jpg|png|webp)$'),
  version integer not null default 0 check (version >= 0)
);
alter table public.home_photo enable row level security;
revoke all on public.home_photo from anon, authenticated;
grant select on public.home_photo to anon, authenticated;
grant update (url, version) on public.home_photo to authenticated;
create policy "Public reads home photo" on public.home_photo for select to anon, authenticated using (true);
create policy "Accounts edit home photo" on public.home_photo for update to authenticated
using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')))
with check ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')));
insert into public.home_photo (id, url) values (1, '/labs/foto1.jpeg');
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-photos', 'site-photos', true, 10485760, array['image/jpeg','image/png','image/webp']);
create policy "Accounts upload site photos" on storage.objects for insert to authenticated
with check (bucket_id = 'site-photos' and (select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')));
create policy "Public reads site photos" on storage.objects for select to anon, authenticated using (bucket_id = 'site-photos');
