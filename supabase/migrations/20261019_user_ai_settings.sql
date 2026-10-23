-- Chaves de provedores são cifradas no servidor com AES-256-GCM.
-- A chave mestra permanece exclusivamente no ambiente do servidor.
create table if not exists public.user_ai_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  providers jsonb not null default '{}'::jsonb check (jsonb_typeof(providers) = 'object'),
  default_provider text check (default_provider in ('openai','anthropic','google')),
  updated_at timestamptz not null default now()
);
alter table public.user_ai_settings enable row level security;
drop policy if exists own_ai_settings on public.user_ai_settings;
create policy own_ai_settings on public.user_ai_settings for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
revoke all on public.user_ai_settings from anon;
grant select,insert,update,delete on public.user_ai_settings to authenticated;
