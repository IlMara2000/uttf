-- UTTF Drive: Supabase conserva solo l'indice. I byte di foto e video restano
-- sul disco Hiksemi e sono serviti dall'agente locale: qui non si scrive nulla
-- in storage.objects, quindi la quota Supabase da 1 GB resta intatta.

create table public.drive_folders (
  path text primary key check (
    length(path) between 1 and 512
    and path !~ '^/'
    and path !~ '//'
    and path !~ '(^|/)\.{1,2}(/|$)'
  ),
  name text not null check (length(btrim(name)) between 1 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table public.drive_assets (
  -- remote_id e' l'id generato dall'agente: stabile tra una sincronizzazione e l'altra.
  remote_id uuid primary key,
  folder_path text not null default '',
  name text not null check (length(name) between 1 and 180),
  rel_path text not null unique check (length(rel_path) between 1 and 1024),
  mime text not null check (length(mime) between 1 and 160),
  kind text not null check (kind in ('image', 'video', 'audio', 'other')),
  size_bytes bigint not null check (size_bytes > 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  -- Nessuna FK: un duplicato puo' essere indicizzato prima del suo originale.
  duplicate_of uuid,
  width integer check (width > 0),
  height integer check (height > 0),
  duration_seconds numeric(10, 2) check (duration_seconds >= 0),
  has_thumb boolean not null default false,
  captured_at timestamptz not null,
  indexed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index drive_assets_folder_idx on public.drive_assets (folder_path, captured_at desc);
create index drive_assets_recent_idx on public.drive_assets (captured_at desc);
create index drive_assets_hash_idx on public.drive_assets (sha256);
create index drive_assets_name_idx on public.drive_assets (lower(name));

create table public.drive_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name = lower(btrim(name)) and name ~ '^[a-z0-9][a-z0-9 _-]{0,39}$'),
  color text not null default '#FF914D' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now()
);

create table public.drive_asset_tags (
  asset_id uuid not null references public.drive_assets(remote_id) on delete cascade,
  tag_id uuid not null references public.drive_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (asset_id, tag_id)
);

create index drive_asset_tags_tag_idx on public.drive_asset_tags (tag_id);

-- Conteggi per cartella, incluse le sottocartelle. security_invoker: valgono le RLS.
create view public.drive_folder_overview with (security_invoker = true) as
select
  f.path,
  f.name,
  count(a.remote_id)::int as asset_count,
  coalesce(sum(a.size_bytes), 0) as total_bytes,
  max(a.captured_at) as last_captured_at
from public.drive_folders f
left join public.drive_assets a
  on a.folder_path = f.path or starts_with(a.folder_path, f.path || '/')
group by f.path, f.name;

alter table public.drive_folders enable row level security;
alter table public.drive_assets enable row level security;
alter table public.drive_tags enable row level security;
alter table public.drive_asset_tags enable row level security;

revoke all on public.drive_folders, public.drive_assets, public.drive_tags, public.drive_asset_tags from anon, authenticated;
revoke all on public.drive_folder_overview from anon, authenticated;

grant select, insert, update, delete on public.drive_folders to authenticated;
grant select, insert, update, delete on public.drive_assets to authenticated;
grant select, insert, update, delete on public.drive_tags to authenticated;
grant select, insert, delete on public.drive_asset_tags to authenticated;
grant select on public.drive_folder_overview to authenticated;

-- Solo staff/admin confermati (vedi private.staff_role in security_hardening).
create policy "Staff manage drive folders" on public.drive_folders for all to authenticated
using ((select private.staff_role()) is not null)
with check ((select private.staff_role()) is not null);

create policy "Staff manage drive assets" on public.drive_assets for all to authenticated
using ((select private.staff_role()) is not null)
with check ((select private.staff_role()) is not null);

create policy "Staff manage drive tags" on public.drive_tags for all to authenticated
using ((select private.staff_role()) is not null)
with check ((select private.staff_role()) is not null);

create policy "Staff manage drive asset tags" on public.drive_asset_tags for all to authenticated
using ((select private.staff_role()) is not null)
with check ((select private.staff_role()) is not null);

comment on table public.drive_assets is 'Indice del drive su disco locale: metadati e hash, nessun byte caricato su Supabase.';
comment on column public.drive_assets.remote_id is 'ID generato da drive-agent/agent.cjs; chiave stabile per anteprime e file originali.';
comment on view public.drive_folder_overview is 'Cartelle con numero file e byte, sottocartelle incluse.';
