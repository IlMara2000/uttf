-- Restore intended CRM operations without opening them to arbitrary signed-in accounts.
do $$ declare t text; begin
  foreach t in array array['activities','activity_assignments','events','media_storage','social_posts'] loop
    execute format('create policy "Current staff CRM access" on public.%I for all to authenticated using ((select private.staff_role()) is not null) with check ((select private.staff_role()) is not null)', t);
  end loop;
end $$;
