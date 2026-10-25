-- Editable public profiles; all non-anonymous accounts signed into Area Staff may edit.
create table public.gallery_artworks (
  id uuid primary key default gen_random_uuid(),
  sort_order bigint generated always as identity,
  name text not null check (length(trim(name)) between 1 and 120),
  role text not null check (length(trim(role)) between 1 and 160),
  description text not null check (length(trim(description)) between 1 and 3000),
  image text not null check (
    image in ('/instagram/post1.jpeg','/instagram/post2.jpeg','/instagram/post3.jpeg','/instagram/post4.jpeg','/labs/foto1.jpeg','/labs/foto2.jpeg')
    or image ~ '^https://oieqtrfeoyfabyjirrqa[.]supabase[.]co/storage/v1/object/public/gallery-photos/[a-z0-9-]+/[a-z0-9-]+[.](jpg|png|webp)$'
  ),
  photo_position integer not null default 50 check (photo_position between 0 and 100),
  skills text[] not null default '{}' check (cardinality(skills) <= 20 and length(array_to_string(skills, ',')) <= 500),
  tags text[] not null default '{}' check (cardinality(tags) <= 20 and length(array_to_string(tags, ',')) <= 500),
  link_url text not null default '' check (link_url = '' or (length(link_url) <= 2000 and link_url !~ '[[:space:][:cntrl:]\\]' and link_url ~* '^(/([^/]|$)|https?://[^/]+|mailto:[^@]+@[^@]+|tel:[+0-9])')),
  link_label text not null default '' check (length(link_label) <= 80),
  archived boolean not null default false,
  version integer not null default 0 check (version >= 0)
);
alter table public.gallery_artworks enable row level security;
revoke all on public.gallery_artworks from anon, authenticated;
grant select on public.gallery_artworks to anon, authenticated;
grant insert (id, name, role, description, image, photo_position, skills, tags, link_url, link_label, archived) on public.gallery_artworks to authenticated;
grant update (name, role, description, image, photo_position, skills, tags, link_url, link_label, version, archived) on public.gallery_artworks to authenticated;
create policy "Public reads gallery" on public.gallery_artworks for select to anon, authenticated using (not archived);
create policy "Accounts add gallery members" on public.gallery_artworks for insert to authenticated
with check ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')));
create policy "Accounts edit gallery members" on public.gallery_artworks for update to authenticated
using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')))
with check ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')));

create table public.gallery_intro (
  id smallint primary key default 1 check (id = 1),
  title text not null check (length(trim(title)) between 1 and 80),
  subtitle text not null check (length(subtitle) <= 80),
  accent text not null check (length(trim(accent)) between 1 and 80),
  description text not null check (length(trim(description)) between 1 and 2000),
  version integer not null default 0 check (version >= 0)
);
alter table public.gallery_intro enable row level security;
revoke all on public.gallery_intro from anon, authenticated;
grant select on public.gallery_intro to anon, authenticated;
grant update (title, subtitle, accent, description, version) on public.gallery_intro to authenticated;
create policy "Public reads gallery intro" on public.gallery_intro for select to anon, authenticated using (true);
create policy "Accounts edit gallery intro" on public.gallery_intro for update to authenticated
using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')))
with check ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery-photos', 'gallery-photos', true, 10485760, array['image/jpeg','image/png','image/webp']);
create policy "Accounts upload gallery photos" on storage.objects for insert to authenticated
with check (bucket_id = 'gallery-photos' and (select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false' and exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')));
create policy "Public reads gallery photos" on storage.objects for select to anon, authenticated using (bucket_id = 'gallery-photos');

create policy "Staff reads archived artworks" on public.gallery_artworks for select to authenticated using (exists (select 1 from public.authorized_users where email = lower((select auth.jwt()->>'email')) and role in ('staff', 'admin')));

insert into public.gallery_artworks (id,name,role,description,image,photo_position,skills,tags,link_url,link_label) select id,name,role,description,image,photo_position,skills,tags,link_url,link_label from jsonb_populate_recordset(null::public.gallery_artworks, '[{"id":"10000000-0000-4000-8000-000000000001","name":"Muro Vivo","role":"Urban Canvas","image":"/instagram/post1.jpeg","description":"Opera nata dal territorio, tra segni rapidi, materia urbana e identita locale. Un frammento visivo della factory lasciato respirare a pochi passi da casa.","skills":["Street Art","Mixed Media","Local Roots"],"tags":["KM0","URBAN","COMMUNITY"],"photo_position":50,"sort_order":1,"version":0,"link_url":"","link_label":"","archived":false},{"id":"10000000-0000-4000-8000-000000000002","name":"Factory Signs","role":"Visual Archive","image":"/instagram/post2.jpeg","description":"Tracce, dettagli e simboli raccolti dentro il flusso creativo UTTF. Ogni immagine conserva il rumore buono delle idee nate sul posto.","skills":["Photography","Archive","Composition"],"tags":["ARCHIVE","DETAILS","UTTF"],"photo_position":50,"sort_order":2,"version":0,"link_url":"","link_label":"","archived":false},{"id":"10000000-0000-4000-8000-000000000003","name":"Linea Locale","role":"Handmade Piece","image":"/instagram/post3.jpeg","description":"Un lavoro costruito con mani vicine, materiali accessibili e visione diretta. Arte a km0 significa partire da quello che abbiamo intorno.","skills":["Handmade","Texture","Color Study"],"tags":["HANDMADE","LOCAL","RAW"],"photo_position":50,"sort_order":3,"version":0,"link_url":"","link_label":"","archived":false},{"id":"10000000-0000-4000-8000-000000000004","name":"Sotto La Torre","role":"Community Work","image":"/instagram/post4.jpeg","description":"Un pezzo che tiene insieme luogo, persone e memoria. La galleria diventa mappa emotiva di quello che succede sotto la torre.","skills":["Community Art","Storytelling","Visual Map"],"tags":["PLACE","PEOPLE","MEMORY"],"photo_position":50,"sort_order":4,"version":0,"link_url":"","link_label":"","archived":false},{"id":"10000000-0000-4000-8000-000000000005","name":"Lab Session 01","role":"Creative Process","image":"/labs/foto1.jpeg","description":"Scatto dal processo creativo: prove, tentativi, strumenti e intuizioni. Qui la galleria mostra anche quello che arriva prima del risultato.","skills":["Process","Workshop","Experiment"],"tags":["LAB","PROCESS","SESSION"],"photo_position":50,"sort_order":5,"version":0,"link_url":"","link_label":"","archived":false},{"id":"10000000-0000-4000-8000-000000000006","name":"Lab Session 02","role":"Local Experiment","image":"/labs/foto2.jpeg","description":"Esperimento visivo nato in laboratorio, con energia diretta e spirito artigianale. Nessuna distanza: solo idee lavorate vicino alla community.","skills":["Experiment","Craft","Culture"],"tags":["LOCAL","CRAFT","CULTURE"],"photo_position":50,"sort_order":6,"version":0,"link_url":"","link_label":"","archived":false}]'::jsonb);
insert into public.gallery_intro select * from jsonb_populate_record(null::public.gallery_intro, '{"id":1,"title":"L’arte nasce","subtitle":"","accent":"qui vicino.","description":"Immagini, processi e frammenti creativi dal territorio. La nostra galleria racconta quello che nasce quando le persone hanno lo spazio per esprimersi.","version":0}'::jsonb);
