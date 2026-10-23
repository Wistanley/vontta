-- Perfis e fila independentes dos roteiros existentes.
create table if not exists public.post_profiles (
  id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
  spec jsonb not null, created_at timestamptz not null default now(),
  unique(owner_id,id)
);
create table if not exists public.creator_posts (
  id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null, status text not null default 'draft', data jsonb not null,
  slot text, lease_until timestamptz, lease_token uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(owner_id,profile_id) references public.post_profiles(owner_id,id),
  unique(profile_id,slot), unique(owner_id,id),
  check(status in ('draft','generating','changes','awaiting_approval','approved','sending','sent','failed','delivery_unknown'))
);
create index if not exists creator_posts_queue on public.creator_posts(status,updated_at);
create table if not exists public.post_feedback (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null, post_id uuid not null,
  instruction text not null check(length(instruction) between 1 and 4000), snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  foreign key(owner_id,profile_id) references public.post_profiles(owner_id,id),
  foreign key(owner_id,post_id) references public.creator_posts(owner_id,id) on delete cascade
);
create table if not exists public.post_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_token text, chat_id text not null default '', updated_at timestamptz not null default now()
);
create table if not exists public.post_worker_state (
  id boolean primary key default true check(id), last_run timestamptz not null
);
alter table public.post_profiles enable row level security;
alter table public.creator_posts enable row level security;
alter table public.post_feedback enable row level security;
alter table public.post_connections enable row level security;
alter table public.post_worker_state enable row level security;
create policy post_profiles_owner on public.post_profiles for all to authenticated using(auth.uid() = owner_id) with check(auth.uid() = owner_id);
create policy creator_posts_owner on public.creator_posts for all to authenticated using(auth.uid() = owner_id) with check(auth.uid() = owner_id);
create policy post_feedback_owner on public.post_feedback for all to authenticated using(auth.uid() = owner_id) with check(auth.uid() = owner_id);
create policy post_connections_owner on public.post_connections for all to authenticated using(auth.uid() = owner_id) with check(auth.uid() = owner_id);
create policy post_worker_read on public.post_worker_state for select to authenticated using(true);
revoke all on public.post_profiles, public.creator_posts, public.post_feedback, public.post_connections, public.post_worker_state from anon;
grant select,insert,update,delete on public.post_profiles, public.creator_posts, public.post_feedback, public.post_connections to authenticated;
grant select on public.post_worker_state to authenticated;
grant all on public.post_profiles, public.creator_posts, public.post_feedback, public.post_connections, public.post_worker_state to service_role;

-- Lease persistente: duas abas/cron concorrentes nunca processam a mesma etapa.
create or replace function public.claim_creator_post(post_id uuid, token uuid) returns boolean
language plpgsql security invoker set search_path = public as $$
declare affected integer;
begin
  update creator_posts set lease_until=now()+interval '5 minutes', lease_token=token
  where id=post_id and (lease_until is null or lease_until < now());
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;
revoke all on function public.claim_creator_post(uuid,uuid) from public,anon;
grant execute on function public.claim_creator_post(uuid,uuid) to authenticated,service_role;

create table if not exists public.post_usage (
  owner_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null, requests integer not null default 0,
  primary key(owner_id,window_start)
);
alter table public.post_usage enable row level security;
revoke all on public.post_usage from anon,authenticated;
create or replace function public.consume_post_quota(p_owner uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare hits integer;
begin
  if auth.uid() is distinct from p_owner and coalesce(auth.role(),'') <> 'service_role' then return false; end if;
  insert into post_usage(owner_id,window_start,requests) values(p_owner,date_trunc('hour',now()),1)
  on conflict(owner_id,window_start) do update set requests=post_usage.requests+1 returning requests into hits;
  return hits <= 60;
end;
$$;
revoke all on function public.consume_post_quota(uuid) from public,anon;
grant execute on function public.consume_post_quota(uuid) to authenticated,service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('post-assets','post-assets',false,20971520,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
create policy post_assets_owner on storage.objects for all to authenticated
using(bucket_id='post-assets' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='post-assets' and (storage.foldername(name))[1]=auth.uid()::text);
