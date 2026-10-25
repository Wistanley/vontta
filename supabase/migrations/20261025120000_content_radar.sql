-- Radar integrado ao workspace existente. Segredos permanecem cifrados no servidor.
create table if not exists public.radar_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  spec jsonb not null default '{}', encrypted_apify_token text,
  updated_at timestamptz not null default now()
);
create table if not exists public.radar_sources (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check(platform in ('instagram','tiktok')), username text not null,
  name text not null, enabled boolean not null default true, tags jsonb not null default '[]', group_name text not null default '',
  last_collected_at timestamptz, last_error text, created_at timestamptz not null default now(),
  unique(owner_id,id), unique(owner_id,platform,username)
);
create table if not exists public.radar_contents (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid, platform text not null check(platform in ('instagram','tiktok','manual')), external_id text not null,
  permalink text, title text not null, caption text, published_at timestamptz, media_path text,
  payload jsonb not null default '{}', created_at timestamptz not null default now(),
  unique(owner_id,id), unique(owner_id,platform,external_id),
  foreign key(owner_id,source_id) references public.radar_sources(owner_id,id)
);
create table if not exists public.radar_metric_snapshots (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null, recorded_at timestamptz not null default now(), source text not null,
  views bigint, likes bigint, comments bigint, shares bigint, saves bigint, followers bigint,
  foreign key(owner_id,content_id) references public.radar_contents(owner_id,id) on delete cascade,
  unique(owner_id,content_id,recorded_at,source),
  check(views is null or views >= 0),check(likes is null or likes >= 0),check(comments is null or comments >= 0),check(shares is null or shares >= 0),check(saves is null or saves >= 0)
);
create table if not exists public.radar_jobs (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('collect','analyze','script','report','trends')),
  status text not null default 'queued' check(status in ('queued','running','waiting','succeeded','failed','cancelled')),
  payload jsonb not null default '{}', idempotency_key text not null, attempts integer not null default 0,
  max_attempts integer not null default 3, not_before timestamptz not null default now(), lease_until timestamptz, lease_token uuid,
  error text, reserved_usd numeric not null default 0, actual_usd numeric,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id,id),unique(owner_id,idempotency_key)
);
create table if not exists public.radar_analyses (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null, job_id uuid not null, version integer not null,
  mode text not null check(mode in ('FULL','AUDIO_ONLY','VISUAL_ONLY','METADATA_ONLY','UNAVAILABLE')),
  data jsonb not null, created_at timestamptz not null default now(),
  unique(owner_id,id),unique(owner_id,content_id,version),unique(job_id),
  foreign key(owner_id,content_id) references public.radar_contents(owner_id,id) on delete cascade,
  foreign key(owner_id,job_id) references public.radar_jobs(owner_id,id)
);
create table if not exists public.radar_scripts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null, profile_id uuid not null, version integer not null default 1,
  status text not null default 'draft' check(status in ('idea','draft','approved','recorded','published')),
  favorite boolean not null default false, data jsonb not null, job_id uuid unique references public.radar_jobs(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id,id), foreign key(owner_id,content_id) references public.radar_contents(owner_id,id),
  foreign key(owner_id,profile_id) references public.post_profiles(owner_id,id)
);
create table if not exists public.radar_script_versions (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  script_id uuid not null, version integer not null, data jsonb not null, created_at timestamptz not null default now(),
  unique(owner_id,script_id,version),foreign key(owner_id,script_id) references public.radar_scripts(owner_id,id) on delete cascade
);
create table if not exists public.radar_reports (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('daily','weekly')), period text not null, data jsonb not null,
  created_at timestamptz not null default now(),unique(owner_id,kind,period)
);
create table if not exists public.radar_usage (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null, operation_key text not null, service text not null,
  reserved_usd numeric not null check(reserved_usd >= 0), actual_usd numeric,
  details jsonb not null default '{}',created_at timestamptz not null default now(),
  unique(owner_id,operation_key),foreign key(owner_id,job_id) references public.radar_jobs(owner_id,id)
);
create table if not exists public.radar_events (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid, kind text not null, message text not null,created_at timestamptz not null default now(),
  foreign key(owner_id,job_id) references public.radar_jobs(owner_id,id)
);
create table if not exists public.radar_worker_state (
  id text primary key, last_run timestamptz not null, capabilities jsonb not null default '{}'
);
create index if not exists radar_jobs_queue on public.radar_jobs(status,not_before,lease_until);
create index if not exists radar_contents_dates on public.radar_contents(owner_id,published_at desc);
create index if not exists radar_metrics_history on public.radar_metric_snapshots(owner_id,content_id,recorded_at);
create index if not exists radar_analyses_history on public.radar_analyses(owner_id,content_id,version desc);
create index if not exists radar_usage_month on public.radar_usage(owner_id,created_at);

do $$ declare t text; begin
  foreach t in array array['radar_settings','radar_sources','radar_contents','radar_metric_snapshots','radar_jobs','radar_analyses','radar_scripts','radar_script_versions','radar_reports','radar_usage','radar_events'] loop
    execute format('alter table public.%I enable row level security',t);
    if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_owner') then
      execute format('create policy %I on public.%I for all to authenticated using(auth.uid() = owner_id) with check(auth.uid() = owner_id)',t||'_owner',t);
    end if;
    execute format('revoke all on public.%I from anon',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
alter table public.radar_worker_state enable row level security;
create policy radar_worker_read on public.radar_worker_state for select to authenticated using(true);
grant select on public.radar_worker_state to authenticated;
grant all on public.radar_worker_state to service_role;
revoke all on public.radar_worker_state from anon;

-- Apenas o worker autenticado como serviço pode reivindicar tarefas. Uma lease expirável
-- permite retomar um processo interrompido sem executar o mesmo job em dois workers.
create or replace function public.claim_radar_job(p_token uuid)
returns setof public.radar_jobs language plpgsql security invoker set search_path=public as $$
begin
  return query update public.radar_jobs j set status='running',lease_token=p_token,lease_until=now()+interval '10 minutes',attempts=j.attempts+1,updated_at=now()
  where j.id=(select q.id from public.radar_jobs q
    where q.status in ('queued','waiting','running') and q.not_before <= now()
    and (q.lease_until is null or q.lease_until < now()) and q.attempts < q.max_attempts
    order by q.created_at for update skip locked limit 1) returning j.*;
end $$;
revoke all on function public.claim_radar_job(uuid) from public,anon,authenticated;
grant execute on function public.claim_radar_job(uuid) to service_role;

-- A reserva é feita ANTES da chamada paga, sob lock por conta. Custos finais não
-- informados pelo provedor continuam consumindo a reserva, sem virar zero fictício.
create or replace function public.reserve_radar_budget(p_job uuid,p_key text,p_service text,p_amount numeric)
returns uuid language plpgsql security invoker set search_path=public as $$
declare j public.radar_jobs; cap numeric; used numeric; existing uuid; new_id uuid;
begin
 select * into j from public.radar_jobs where id=p_job;
 if not found or j.status <> 'running' or p_amount <= 0 or p_amount > 100 then raise exception 'invalid_job'; end if;
 perform pg_advisory_xact_lock(hashtextextended(j.owner_id::text,0));
 select id into existing from public.radar_usage where owner_id=j.owner_id and operation_key=p_key;
 if existing is not null then return existing; end if;
 select coalesce((spec->>'monthlyBudget')::numeric,5) into cap from public.radar_settings where owner_id=j.owner_id;
 cap:=coalesce(cap,5);
 select coalesce(sum(coalesce(actual_usd,reserved_usd)),0) into used from public.radar_usage where owner_id=j.owner_id and created_at>=date_trunc('month',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
 if used+p_amount>cap then raise exception 'radar_budget_exceeded'; end if;
 insert into public.radar_usage(owner_id,job_id,operation_key,service,reserved_usd) values(j.owner_id,j.id,p_key,p_service,p_amount) returning id into new_id;
 update public.radar_jobs set reserved_usd=reserved_usd+p_amount where id=j.id;
 return new_id;
end $$;
revoke all on function public.reserve_radar_budget(uuid,text,text,numeric) from public,anon,authenticated;
grant execute on function public.reserve_radar_budget(uuid,text,text,numeric) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('radar-media','radar-media',false,157286400,array['video/mp4','video/webm','video/quicktime','audio/mpeg','audio/wav','image/jpeg','image/png']) on conflict(id) do nothing;
create policy radar_media_owner on storage.objects for all to authenticated using(bucket_id='radar-media' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='radar-media' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.save_radar_script(p_id uuid,p_owner uuid,p_version integer,p_data jsonb,p_status text,p_favorite boolean)
returns integer language plpgsql security invoker set search_path=public as $$
declare s public.radar_scripts;
begin
 select * into s from public.radar_scripts where id=p_id and owner_id=p_owner for update;
 if not found or s.version<>p_version then raise exception 'O roteiro mudou. Recarregue antes de salvar.'; end if;
 insert into public.radar_script_versions(owner_id,script_id,version,data) values(p_owner,p_id,s.version,s.data) on conflict do nothing;
 update public.radar_scripts set data=p_data,version=s.version+1,status=p_status,favorite=p_favorite,updated_at=now() where id=p_id and owner_id=p_owner;
 return s.version+1;
end $$;
revoke all on function public.save_radar_script(uuid,uuid,integer,jsonb,text,boolean) from public,anon;
grant execute on function public.save_radar_script(uuid,uuid,integer,jsonb,text,boolean) to authenticated,service_role;
