-- Public laboratory content. Every non-anonymous account may edit existing panels.
create table public.labs (
  slug text primary key,
  title text not null check (length(trim(title)) between 1 and 120),
  description text not null check (length(trim(description)) between 1 and 2000),
  "detailIntro" text not null check (length(trim("detailIntro")) between 1 and 4000),
  tags text[] not null check (cardinality(tags) <= 40 and length(array_to_string(tags, ',')) <= 500),
  active boolean not null default false,
  "primaryLabel" text not null check (length(trim("primaryLabel")) between 1 and 80),
  "primaryUrl" text not null check (length("primaryUrl") <= 2000 and "primaryUrl" !~ '[[:space:][:cntrl:]\\]' and "primaryUrl" ~* '^(/([^/]|$)|https?://[^/]+|mailto:[^@]+@[^@]+|tel:[+0-9])'),
  "secondaryLabel" text not null check (length(trim("secondaryLabel")) between 1 and 80),
  "secondaryUrl" text not null check (length("secondaryUrl") <= 2000 and "secondaryUrl" !~ '[[:space:][:cntrl:]\\]' and "secondaryUrl" ~* '^(/([^/]|$)|https?://[^/]+|mailto:[^@]+@[^@]+|tel:[+0-9])'),
  photos text[] not null default '{}' check (cardinality(photos) <= 8 and array_to_string(photos, ',') !~ '[[:space:][:cntrl:]]'),
  version integer not null default 0 check (version >= 0)
);
alter table public.labs enable row level security;
revoke all on public.labs from anon, authenticated;
grant select on public.labs to anon, authenticated;
grant update (title, description, "detailIntro", tags, active, "primaryLabel", "primaryUrl", "secondaryLabel", "secondaryUrl", photos, version) on public.labs to authenticated;
create policy "Public reads laboratories" on public.labs for select to anon, authenticated using (true);
create policy "Accounts edit laboratories" on public.labs for update to authenticated
using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false')
with check ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lab-photos', 'lab-photos', true, 10485760, array['image/jpeg','image/png','image/webp']);
create policy "Accounts upload laboratory photos" on storage.objects for insert to authenticated
with check (bucket_id = 'lab-photos' and (select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false');
create policy "Public reads laboratory photos" on storage.objects for select to anon, authenticated using (bucket_id = 'lab-photos');

insert into public.labs select * from jsonb_populate_recordset(null::public.labs, '[{"primaryLabel":"Scopri di più","secondaryLabel":"Voglio partecipare","secondaryUrl":"/labs#iscrizioni","photos":[],"version":0,"active":true,"primaryUrl":"/labs/rap-fcktory","slug":"rap-fcktory","title":"RAP_F*CKTORY","description":"Rap, scrittura e condivisione. Uno spazio per esprimersi attraverso le parole e incontrare altre persone con la stessa passione.","detailIntro":"Per sapere quali attività sono disponibili e come partecipare, contattaci. I laboratori sono aperti a tutti.","tags":["RAP","SCRITTURA","INCONTRI"]},{"primaryLabel":"Scopri di più","secondaryLabel":"Voglio partecipare","secondaryUrl":"/labs#iscrizioni","photos":[],"version":0,"active":false,"primaryUrl":"/labs/rastapower","slug":"rastapower","title":"RASTAPOWER","description":"Iniziative sporadiche della Factory, senza un calendario continuativo. Scrivici per sapere se ci sono appuntamenti in programma.","detailIntro":"Gli appuntamenti RASTAPOWER vengono organizzati in modo sporadico. Contattaci per conoscere le prossime iniziative, quando disponibili.","tags":["INIZIATIVE SPORADICHE","RASTAPOWER"]},{"primaryLabel":"Scopri di più","secondaryLabel":"Voglio partecipare","secondaryUrl":"/labs#iscrizioni","photos":[],"version":0,"active":false,"primaryUrl":"/labs/graffiti","slug":"graffiti","title":"GRAFFITI","description":"Iniziative sporadiche dedicate ai graffiti. Occasioni per condividere questa passione, quando vengono organizzate.","detailIntro":"Le iniziative sui graffiti sono occasionali e non costituiscono un corso continuativo. Scrivici per sapere se ci sono attività in programma.","tags":["GRAFFITI","INIZIATIVE SPORADICHE"]},{"primaryLabel":"Scopri di più","secondaryLabel":"Voglio partecipare","secondaryUrl":"/labs#iscrizioni","photos":[],"version":0,"active":true,"primaryUrl":"/labs/community-hub","slug":"community-hub","title":"INCONTRARSI","description":"La Factory è anche un posto dove conoscersi e condividere la passione per la cultura urbana. Aperto a tutti.","detailIntro":"Vuoi conoscere la Factory? Scrivici per concordare un incontro e scoprire quello che facciamo.","tags":["INCONTRI","CONDIVISIONE","ROZZANO"]}]'::jsonb);
alter table public.labs add constraint lab_photo_urls check (cardinality(photos) = 0 or array_to_string(photos, ',') ~ '^https://oieqtrfeoyfabyjirrqa[.]supabase[.]co/storage/v1/object/public/lab-photos/[a-z0-9/-]+[.](jpg|png|webp)(,https://oieqtrfeoyfabyjirrqa[.]supabase[.]co/storage/v1/object/public/lab-photos/[a-z0-9/-]+[.](jpg|png|webp))*$');
