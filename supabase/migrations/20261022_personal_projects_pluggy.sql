-- projectType is optional in workspace JSON: old projects remain professional.
create table if not exists public.user_pluggy_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  client_id text not null,
  encrypted_secret text not null,
  item_ids uuid[] not null check (cardinality(item_ids) between 1 and 5),
  updated_at timestamptz not null default now()
);
create table if not exists public.pluggy_accounts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  payload jsonb not null,
  synced_at timestamptz,
  primary key(owner_id,id),
  check(payload->>'id' = id::text)
);
alter table public.user_pluggy_settings enable row level security;
alter table public.pluggy_accounts enable row level security;
drop policy if exists own_pluggy_settings on public.user_pluggy_settings;
create policy own_pluggy_settings on public.user_pluggy_settings for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists own_pluggy_accounts on public.pluggy_accounts;
create policy own_pluggy_accounts on public.pluggy_accounts for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
revoke all on public.user_pluggy_settings,public.pluggy_accounts from anon;
grant select,insert,update,delete on public.user_pluggy_settings,public.pluggy_accounts to authenticated;

create table if not exists public.pluggy_usage (
  owner_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  requests integer not null default 0,
  primary key(owner_id,window_start)
);
alter table public.pluggy_usage enable row level security;
revoke all on public.pluggy_usage from anon,authenticated;
create or replace function public.consume_pluggy_quota() returns boolean
language plpgsql security definer set search_path = public as $$
declare hits integer;
begin
  if auth.uid() is null then return false; end if;
  insert into public.pluggy_usage values(auth.uid(),date_trunc('hour',now()),1)
  on conflict(owner_id,window_start) do update set requests=pluggy_usage.requests+1
  returning requests into hits;
  return hits <= 60;
end;
$$;
revoke all on function public.consume_pluggy_quota() from public,anon;
grant execute on function public.consume_pluggy_quota() to authenticated;

-- One complete account snapshot per transaction. RLS also applies inside this function.
-- Merge annotations against the current database row, not a stale browser copy.
create or replace function public.sync_pluggy_account(
  p_account jsonb, p_entries jsonb, p_date_from date,
  p_started_at timestamptz, p_config_version timestamptz
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  account_id uuid := (p_account->>'id')::uuid;
  config public.user_pluggy_settings;
  previous_sync timestamptz;
  removed integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into config from public.user_pluggy_settings where owner_id=auth.uid() for update;
  if config.owner_id is null or config.updated_at <> p_config_version
    or not ((p_account->>'itemId')::uuid = any(config.item_ids)) then
    raise exception 'configuration changed';
  end if;
  select synced_at into previous_sync from public.pluggy_accounts
  where owner_id=auth.uid() and id=account_id for update;
  if previous_sync is not null and previous_sync > p_started_at then raise exception 'stale snapshot'; end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) = 0 then raise exception 'empty snapshot'; end if;
  if exists(select 1 from jsonb_array_elements(p_entries) e where
    e->>'kind' <> 'transaction' or e#>>'{bank,provider}' <> 'pluggy'
    or e#>>'{bank,accountId}' <> account_id::text) then raise exception 'invalid snapshot'; end if;
  insert into public.workspace_entries(owner_id,id,kind,payload,updated_at)
  select auth.uid(),(e->>'id')::uuid,'transaction',e,now() from jsonb_array_elements(p_entries) e
  on conflict(owner_id,id) do update set
    payload = excluded.payload || jsonb_build_object(
      'createdAt',workspace_entries.payload->'createdAt',
      'projectId',coalesce(workspace_entries.payload->'projectId','""'::jsonb),
      'category',coalesce(workspace_entries.payload->'category',excluded.payload->'category'),
      'excludedFromTotals',coalesce(workspace_entries.payload->'excludedFromTotals',excluded.payload->'excludedFromTotals'),
      'paid',case when excluded.payload#>>'{bank,accountType}' = 'CREDIT'
        then coalesce(workspace_entries.payload->'paid','false'::jsonb) else excluded.payload->'paid' end
    ), updated_at=now();
  -- Reconcile deletions only inside the fully-read provider date window, retaining older history.
  delete from public.workspace_entries w where w.owner_id=auth.uid() and w.kind='transaction'
    and w.payload#>>'{bank,provider}'='pluggy' and w.payload#>>'{bank,accountId}'=account_id::text
    and left(w.payload#>>'{bank,originalDate}',10) >= p_date_from::text
    and not exists(select 1 from jsonb_array_elements(p_entries) e where e->>'id'=w.id::text);
  get diagnostics removed = row_count;
  insert into public.pluggy_accounts(owner_id,id,payload,synced_at)
  values(auth.uid(),account_id,p_account,p_started_at)
  on conflict(owner_id,id) do update set payload=excluded.payload,synced_at=excluded.synced_at;
  return jsonb_build_object('removed',removed);
end;
$$;
revoke all on function public.sync_pluggy_account(jsonb,jsonb,date,timestamptz,timestamptz) from public,anon;
grant execute on function public.sync_pluggy_account(jsonb,jsonb,date,timestamptz,timestamptz) to authenticated;

-- Editing a bank entry changes annotations only, keeping concurrent provider updates intact.
create or replace function public.update_pluggy_annotation(
  p_id uuid, p_project_id text, p_category text, p_excluded boolean, p_paid boolean
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_project_id <> '' and not exists(select 1 from public.workspace_entries
    where owner_id=auth.uid() and id::text=p_project_id and kind='project') then raise exception 'invalid project'; end if;
  if length(trim(p_category)) = 0 or length(p_category) > 300 then raise exception 'invalid category'; end if;
  update public.workspace_entries set payload=payload || jsonb_build_object(
    'projectId',p_project_id,'category',trim(p_category),'excludedFromTotals',p_excluded,
    'paid',case when payload#>>'{bank,accountType}'='CREDIT' then to_jsonb(p_paid) else payload->'paid' end
  ), updated_at=now()
  where owner_id=auth.uid() and id=p_id and kind='transaction' and payload#>>'{bank,provider}'='pluggy'
  returning payload into result;
  if result is null then raise exception 'bank entry not found'; end if;
  return result;
end;
$$;
revoke all on function public.update_pluggy_annotation(uuid,text,text,boolean,boolean) from public,anon;
grant execute on function public.update_pluggy_annotation(uuid,text,text,boolean,boolean) to authenticated;
