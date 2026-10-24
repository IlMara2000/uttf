-- Editable public profiles; all non-anonymous accounts signed into Area Staff may edit.
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  sort_order bigint generated always as identity,
  name text not null check (length(trim(name)) between 1 and 120),
  role text not null check (length(trim(role)) between 1 and 160),
  description text not null check (length(trim(description)) between 1 and 3000),
  image text not null default '/team/placeholder.svg' check (
    image in ('/team/elle-pio.jpg','/team/drew.jpg','/team/placeholder.svg','/team/gioitz.jpg','/team/geo.jpg','/team/den.jpg')
    or image ~ '^https://oieqtrfeoyfabyjirrqa[.]supabase[.]co/storage/v1/object/public/team-photos/[a-z0-9-]+/[a-z0-9-]+[.](jpg|png|webp)$'
  ),
  photo_position integer not null default 50 check (photo_position between 0 and 100),
  skills text[] not null default '{}' check (cardinality(skills) <= 20 and length(array_to_string(skills, ',')) <= 500),
  tags text[] not null default '{}' check (cardinality(tags) <= 20 and length(array_to_string(tags, ',')) <= 500),
  link_url text not null default '' check (link_url = '' or (length(link_url) <= 2000 and link_url !~ '[[:space:][:cntrl:]\\]' and link_url ~* '^(/([^/]|$)|https?://[^/]+|mailto:[^@]+@[^@]+|tel:[+0-9])')),
  link_label text not null default '' check (length(link_label) <= 80),
  version integer not null default 0 check (version >= 0)
);
alter table public.team_members enable row level security;
revoke all on public.team_members from anon, authenticated;
grant select on public.team_members to anon, authenticated;
grant insert (id, name, role, description, image, photo_position, skills, tags, link_url, link_label) on public.team_members to authenticated;
grant update (name, role, description, image, photo_position, skills, tags, link_url, link_label, version) on public.team_members to authenticated;
create policy "Public reads team" on public.team_members for select to anon, authenticated using (true);
create policy "Accounts add team members" on public.team_members for insert to authenticated
with check ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')));
create policy "Accounts edit team members" on public.team_members for update to authenticated
using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')))
with check ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')));

create table public.team_intro (
  id smallint primary key default 1 check (id = 1),
  title text not null check (length(trim(title)) between 1 and 80),
  subtitle text not null check (length(trim(subtitle)) between 1 and 80),
  accent text not null check (length(trim(accent)) between 1 and 80),
  description text not null check (length(trim(description)) between 1 and 2000),
  version integer not null default 0 check (version >= 0)
);
alter table public.team_intro enable row level security;
revoke all on public.team_intro from anon, authenticated;
grant select on public.team_intro to anon, authenticated;
grant update (title, subtitle, accent, description, version) on public.team_intro to authenticated;
create policy "Public reads team intro" on public.team_intro for select to anon, authenticated using (true);
create policy "Accounts edit team intro" on public.team_intro for update to authenticated
using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')))
with check ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-photos', 'team-photos', true, 10485760, array['image/jpeg','image/png','image/webp']);
create policy "Accounts upload team photos" on storage.objects for insert to authenticated
with check (bucket_id = 'team-photos' and (select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')));
create policy "Public reads team photos" on storage.objects for select to anon, authenticated using (bucket_id = 'team-photos');

insert into public.team_members (id, name, role, description, image, photo_position, skills, tags, link_url, link_label) select id, name, role, description, image, photo_position, skills, tags, link_url, link_label from jsonb_populate_recordset(null::public.team_members, '[{"id":"00000000-0000-4000-8000-000000000001","sort_order":1,"version":0,"photo_position":50,"link_url":"","link_label":"","name":"Elle Piò","role":"Presidente & Founder","image":"/team/elle-pio.jpg","description":"Presidente e fondatore, porta avanti con tenacia una visione nata da bambino e trasformata in UTTF: un punto di riferimento che accoglie, orienta e fa crescere un gruppo di ragazzi attraverso arte, disciplina e comunità.","skills":["Leadership","Creative Direction","Education"],"tags":["FOUNDER","RAP ARTIST","EDUCAZIONE"]},{"id":"00000000-0000-4000-8000-000000000002","sort_order":2,"version":0,"photo_position":50,"link_url":"","link_label":"","name":"Drew","role":"Video Maker","image":"/team/drew.jpg","description":"Cresciuto professionalmente dentro UTTF, ha trasformato la passione per l''immagine in un mestiere. Oggi lavora come videomaker con artisti riconosciuti, portando tecnica, visione e affidabilità in ogni produzione.","skills":["Video Editing","Directing","Color Grading"],"tags":["FILMMAKER","VISUALS","RAP ARTIST"]},{"id":"00000000-0000-4000-8000-000000000003","sort_order":3,"version":0,"photo_position":50,"link_url":"","link_label":"","name":"Sarso","role":"Vocalist","image":"/team/placeholder.svg","description":"Artista tenace, crede profondamente nel valore della propria arte. Nato oltre 15 anni fa con il beatbox, è diventato MC, presentatore live e giudice di contest hip-hop, con collaborazioni e featuring importanti nella scena.","skills":["Vocal Coaching","Social Work","Stage Presence"],"tags":["VOCALIST","ENERGY"]},{"id":"00000000-0000-4000-8000-000000000004","sort_order":4,"version":0,"photo_position":50,"link_url":"","link_label":"","name":"Gioitz","role":"Produttore / DJ","image":"/team/gioitz.jpg","description":"Studia musica da sempre, cercandone struttura, suono e dettagli. Diplomato come produttore musicale, unisce orecchio preciso e creatività naturale per costruire beat, atmosfere e identità sonore.","skills":["Music Production","DJing","Sound Design"],"tags":["PRODUCER","MUSICIAN","STYLE"]},{"id":"00000000-0000-4000-8000-000000000005","sort_order":5,"version":0,"photo_position":50,"link_url":"","link_label":"","name":"Geo","role":"Operatrice / Creative Support","image":"/team/geo.jpg","description":"Determinata e caparbia, si mette continuamente in gioco. Lavora nel mondo della moda e porta in UTTF visione estetica, presenza operativa e competenze da social media manager dell''associazione.","skills":["Team Support","Creative Coordination","Operational Flow"],"tags":["OPERATOR","CREATIVE SUPPORT","TEAM FLOW"]},{"id":"00000000-0000-4000-8000-000000000006","sort_order":6,"version":0,"photo_position":50,"link_url":"","link_label":"","name":"Den","role":"Fonico / SMM","image":"/team/den.jpg","description":"Diplomato in grafica e comunicazione, fotografo, fonico certificato e project manager. È il profilo trasversale che entra dove serve: tecnico, creativo, problem solver e sviluppatore web, creatore di questo sito.","skills":["Audio Engineering","Social Media","Graphic Design"],"tags":["AUDIO TECH","SMM","PROBLEM SOLVER"]}]'::jsonb);
insert into public.team_intro select * from jsonb_populate_record(null::public.team_intro, '{"id":1,"title":"Le persone.","subtitle":"La nostra","accent":"forza.","description":"Siamo artisti, volontari e persone che condividono la passione per l’arte e la cultura hip-hop. Ci incontriamo a Rozzano e mettiamo in comune esperienze e idee.","version":0}'::jsonb);
