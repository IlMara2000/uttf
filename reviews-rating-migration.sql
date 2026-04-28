do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'reviews_rating_check'
  ) then
    alter table public.reviews drop constraint reviews_rating_check;
  end if;

  alter table public.reviews
  add constraint reviews_rating_check
  check (rating >= 1.0 and rating <= 5.0 and rating = trunc(rating));
end
$$;
