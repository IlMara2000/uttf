alter table public.labs add column registration_config jsonb not null default '{}'::jsonb check (jsonb_typeof(registration_config) = 'object' and octet_length(registration_config::text) <= 64000);
grant update (registration_config) on public.labs to authenticated;
grant insert (slug,title,description,"detailIntro",tags,active,"primaryLabel","primaryUrl","secondaryLabel","secondaryUrl",photos,registration_config) on public.labs to authenticated;
create policy "Staff creates activities" on public.labs for insert to authenticated with check ((select private.staff_role()) is not null);
create table public.activity_registrations (
 id uuid primary key,
 created_at timestamptz not null default now(),
 lab_slug text not null references public.labs(slug),
 activity_title text not null,
 participant_name text not null,
 status text not null default 'pending' check(status in ('pending','received','reviewed')),
 submission_hash text not null,
 snapshot jsonb not null,
 files jsonb not null default '[]'::jsonb
);
alter table public.activity_registrations enable row level security;
revoke all on public.activity_registrations from anon,authenticated;
grant all on public.activity_registrations to service_role;
create index activity_registrations_created on public.activity_registrations(created_at desc);
create index activity_registrations_lab on public.activity_registrations(lab_slug);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('registration-files','registration-files',false,3145728,array['application/pdf','image/jpeg','image/png','text/plain']);
-- Files and answers are served only by staff-authorized server endpoints. No client policies.
create table public.registration_rate_limits(key text primary key, hits integer not null, expires_at timestamptz not null);
alter table public.registration_rate_limits enable row level security;
revoke all on public.registration_rate_limits from anon,authenticated;
grant all on public.registration_rate_limits to service_role;
create function public.take_registration_slot(bucket_key text) returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 delete from public.registration_rate_limits where expires_at < now();
 insert into public.registration_rate_limits(key,hits,expires_at) values(bucket_key,1,now()+interval '1 hour') on conflict(key) do update set hits=public.registration_rate_limits.hits+1 returning hits into n;
 return n<=15;
end $$;
revoke all on function public.take_registration_slot(text) from public,anon,authenticated;
grant execute on function public.take_registration_slot(text) to service_role;

-- Existing activities keep their content and receive an editable form draft.
update public.labs set registration_config='{"kind":"workshop","open":false,"schedule":"","location":"","materials":"","fee":"","allowMinors":true,"signedDocument":false,"pickup":false,"questions":[{"id":"workshop-0","label":"Hai già esperienza in questa attività?","required":true},{"id":"workshop-1","label":"Che cosa vorresti imparare o realizzare?","required":false}],"instructions":"Compila una richiesta per ogni partecipante. L’invio non conferma automaticamente il posto: lo staff ti contatterà dopo la verifica. Non inserire dati sanitari o copie di documenti di identità nei campi liberi.","participation":"Chiedo la partecipazione all’attività indicata, dopo aver letto programma, luogo, orari, costi e materiali richiesti. Mi impegno a rispettare le indicazioni organizzative e le regole di utilizzo degli spazi e dei materiali. Per un partecipante minorenne, la richiesta e l’autorizzazione devono essere rese da chi esercita la responsabilità genitoriale o dal tutore. Questa autorizzazione non comporta una rinuncia ai diritti del partecipante né esonera gli organizzatori dalle responsabilità previste dalla legge.","privacy":"Under The Tower Factory, contattabile a ass.uttf@gmail.com, tratta i dati di questo modulo per gestire la richiesta di partecipazione, le comunicazioni organizzative e le autorizzazioni collegate. La base giuridica è la gestione della richiesta e del rapporto di partecipazione (art. 6.1.b GDPR); gli eventuali adempimenti di legge sono trattati secondo l’art. 6.1.c. I dati obbligatori sono necessari per gestire la richiesta. Il consenso per foto e video è separato e facoltativo: il rifiuto non impedisce di partecipare. Accedono ai dati solo lo staff autorizzato e i fornitori tecnici del sito, dell’hosting e dell’archiviazione, nei rispettivi ruoli. Le richieste non accolte sono conservate fino a 12 mesi dalla chiusura dell’attività; le iscrizioni accolte e le autorizzazioni per il periodo necessario alla gestione e agli obblighi amministrativi applicabili, da specificare per l’attività. Puoi chiedere accesso, rettifica, cancellazione nei casi previsti, limitazione, portabilità ove applicabile, opposizione e revocare i consensi facoltativi scrivendo all’associazione. Puoi proporre reclamo al Garante per la protezione dei dati personali. Non sono previste decisioni automatizzate. Consulta anche l’informativa del sito per i dettagli sui fornitori e sugli eventuali trasferimenti fuori dallo SEE.","media":"Acconsento facoltativamente alla realizzazione e pubblicazione di fotografie e video che mi ritraggono durante questa attività, per documentarla e comunicarla sul sito uttf.vercel.app e sui canali social ufficiali Under The Tower Factory indicati nella pagina Contatti. Il consenso non comprende la cessione a terzi per finalità pubblicitarie estranee all’associazione. Posso revocarlo per gli utilizzi futuri scrivendo a ass.uttf@gmail.com. Per i minori, questa scelta deve essere confermata nell’autorizzazione firmata da chi esercita la responsabilità genitoriale o dal tutore."}'::jsonb, version=version+1 where registration_config='{}'::jsonb;
