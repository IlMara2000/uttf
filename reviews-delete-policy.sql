alter table public.reviews enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reviews'
      and policyname = 'authenticated can delete reviews'
  ) then
    create policy "authenticated can delete reviews"
    on public.reviews
    for delete
    to authenticated
    using (true);
  end if;
end
$$;
