-- Registrazioni riunioni: sessione, chunk e trascritto.

create table if not exists public.meeting_recordings (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('call', 'standalone')),
  title text not null check (char_length(trim(title)) between 1 and 200),
  location text check (location is null or char_length(location) <= 200),
  speaker_label text check (speaker_label is null or char_length(speaker_label) <= 120),
  mime_type text not null default 'audio/webm' check (char_length(mime_type) <= 120),
  started_at timestamptz not null,
  recorded_ms integer not null default 0 check (recorded_ms >= 0),
  pauses jsonb not null default '[]'::jsonb check (jsonb_typeof(pauses) = 'array'),
  chunk_count integer not null default 0 check (chunk_count between 0 and 6000),
  status text not null default 'recording'
    check (status in ('recording', 'stopped', 'transcribing', 'ready', 'failed')),
  -- uuid di public.notes: senza vincolo FK, la tabella non è nelle migration del repo
  note_id uuid,
  transcript jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meeting_recordings_owner_idx
  on public.meeting_recordings (created_by, started_at desc);

create table if not exists public.meeting_recording_chunks (
  recording_id uuid not null references public.meeting_recordings (id) on delete cascade,
  chunk_index integer not null check (chunk_index between 0 and 5999),
  hash text not null check (hash ~ '^[0-9a-f]{64}$'),
  byte_size integer not null check (byte_size > 0),
  storage_path text not null check (char_length(storage_path) <= 400),
  uploaded_at timestamptz not null default now(),
  primary key (recording_id, chunk_index)
);

alter table public.meeting_recordings enable row level security;
alter table public.meeting_recording_chunks enable row level security;

revoke all on public.meeting_recordings from anon, authenticated;
revoke all on public.meeting_recording_chunks from anon, authenticated;

-- Nessun grant e nessuna policy: le due tabelle le legge e le scrive solo la
-- service role. Le pagine passano da GET /recordings/:id, così un trascritto non
-- è raggiungibile nemmeno con la sessione di un altro membro dello staff.
