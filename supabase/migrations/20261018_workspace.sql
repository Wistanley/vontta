-- Nova estrutura isolada: preserva todas as tabelas e informações anteriores.
create table if not exists public.workspace_entries (
  id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('task','content','project','client','transaction','preferences')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id,id),
  constraint payload_identity check (payload->>'id' = id::text and payload->>'kind' = kind)
);
create index if not exists workspace_owner_kind on public.workspace_entries(owner_id,kind);
alter table public.workspace_entries enable row level security;
drop policy if exists workspace_owner on public.workspace_entries;
create policy workspace_owner on public.workspace_entries for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
revoke all on public.workspace_entries from anon;
grant select,insert,update,delete on public.workspace_entries to authenticated;

-- Cota de IA compartilhada entre instâncias do servidor (30 solicitações/hora).
create table if not exists public.ai_usage (
  owner_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  requests integer not null default 0,
  primary key(owner_id, window_start)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
create or replace function public.consume_ai_quota() returns boolean
language plpgsql security definer set search_path = public as $$
declare hits integer;
begin
  if auth.uid() is null then return false; end if;
  insert into public.ai_usage(owner_id,window_start,requests)
  values(auth.uid(),date_trunc('hour',now()),1)
  on conflict(owner_id,window_start) do update set requests=ai_usage.requests+1
  returning requests into hits;
  return hits <= 30;
end;
$$;
revoke all on function public.consume_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota() to authenticated;
