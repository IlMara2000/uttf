-- One authoritative, current staff lookup. Private schema prevents RPC exposure.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create or replace function private.staff_role() returns text
language sql stable security definer set search_path = '' as $$
  select a.role from public.authorized_users a
  join auth.users u on lower(u.email) = lower(a.email)
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null
    and not coalesce(u.is_anonymous, false) and a.role in ('admin', 'staff')
  limit 1
$$;
revoke all on function private.staff_role() from public;
grant execute on function private.staff_role() to anon, authenticated;

-- Remove the anonymous directory of staff email addresses.
drop policy if exists "Enable read access for all users" on public.authorized_users;
drop policy if exists "authorized_users: select own email" on public.authorized_users;
create policy "Own membership or admin" on public.authorized_users for select to authenticated
using (lower(email) = lower((select auth.jwt()->>'email')) or (select private.staff_role()) = 'admin');
create policy "Admins manage membership" on public.authorized_users for all to authenticated
using ((select private.staff_role()) = 'admin') with check ((select private.staff_role()) = 'admin');
revoke all on public.authorized_users from anon;

-- Existing permissive policies must be removed, not ORed with a new restriction.
drop policy if exists "Team Notes Access" on public.notes;
drop policy if exists "Team Tasks Access" on public.tasks;
create policy "Current staff notes" on public.notes for all to authenticated
using ((select private.staff_role()) is not null) with check ((select private.staff_role()) is not null);
create policy "Current staff tasks" on public.tasks for all to authenticated
using ((select private.staff_role()) is not null) with check ((select private.staff_role()) is not null);
drop policy if exists "Lettura pubblica" on public.profiles;
drop policy if exists "Inserimento dati" on public.profiles;
drop policy if exists "Modifica personale" on public.profiles;
create policy "Staff read profiles" on public.profiles for select to authenticated using ((select private.staff_role()) is not null);
create policy "Staff insert own profile" on public.profiles for insert to authenticated
with check (id = (select auth.uid()) and (select private.staff_role()) is not null);
create policy "Staff update own profile" on public.profiles for update to authenticated
using (id = (select auth.uid()) and (select private.staff_role()) is not null)
with check (id = (select auth.uid()) and (select private.staff_role()) is not null);

-- A restrictive guard also protects against accidentally reapplying old setup scripts.
do $$ declare t text; begin
  foreach t in array array['home_photo','labs','team_members','team_intro','bio_page','publications'] loop
    execute format('create policy "Staff insert guard" on public.%I as restrictive for insert to authenticated with check ((select private.staff_role()) is not null)', t);
    execute format('create policy "Staff update guard" on public.%I as restrictive for update to authenticated using ((select private.staff_role()) is not null) with check ((select private.staff_role()) is not null)', t);
    execute format('create policy "Staff delete guard" on public.%I as restrictive for delete to authenticated using ((select private.staff_role()) is not null)', t);
  end loop;
end $$;
create policy "Staff publish" on public.publications for all to authenticated
using ((select private.staff_role()) is not null) with check ((select private.staff_role()) is not null);
create policy "Staff read newsletter" on public.newsletter_subscribers for select to authenticated
using ((select private.staff_role()) is not null);
drop policy if exists "authenticated can delete reviews" on public.reviews;
create policy "Staff delete reviews" on public.reviews for delete to authenticated using ((select private.staff_role()) is not null);
create policy "Staff delete reviews guard" on public.reviews as restrictive for delete to authenticated using ((select private.staff_role()) is not null);
alter table public.reviews add constraint review_text_limits check (length(author_name) <= 120 and length(comment) <= 4000) not valid;

-- Close unauthenticated mutation and internal file listing/download.
drop policy if exists "Admin Delete" on storage.objects;
drop policy if exists "Admin Update" on storage.objects;
drop policy if exists "Admin Upload" on storage.objects;
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 1mpvhye_0" on storage.objects;
create policy "Staff factory assets" on storage.objects for all to authenticated
using (bucket_id = 'factory-assets' and (select private.staff_role()) is not null)
with check (bucket_id = 'factory-assets' and (select private.staff_role()) is not null);
create policy "Public publication assets" on storage.objects for select to anon, authenticated
using (bucket_id = 'factory-assets' and (storage.foldername(name))[1] = 'publications');
create policy "Staff storage insert guard" on storage.objects as restrictive for insert to public
with check (bucket_id not in ('factory-assets','lab-photos','site-photos','team-photos') or (select private.staff_role()) is not null);
create policy "Staff storage update guard" on storage.objects as restrictive for update to public
using (bucket_id not in ('factory-assets','lab-photos','site-photos','team-photos') or (select private.staff_role()) is not null)
with check (bucket_id not in ('factory-assets','lab-photos','site-photos','team-photos') or (select private.staff_role()) is not null);
create policy "Staff storage delete guard" on storage.objects as restrictive for delete to public
using (bucket_id not in ('factory-assets','lab-photos','site-photos','team-photos') or (select private.staff_role()) is not null);
-- Revokes old public note URLs while retaining all bytes and object paths.
update storage.buckets set public = false where id = 'factory-assets';
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
