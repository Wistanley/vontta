create table if not exists public.radar_script_feedback (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 profile_id uuid not null, script_id uuid not null, instruction text not null check(length(instruction)<=4000),
 created_at timestamptz not null default now(),
 foreign key(owner_id,profile_id) references public.post_profiles(owner_id,id) on delete cascade,
 foreign key(owner_id,script_id) references public.radar_scripts(owner_id,id) on delete cascade
);
alter table public.radar_script_feedback enable row level security;
create policy radar_script_feedback_owner on public.radar_script_feedback for all to authenticated using(auth.uid()=owner_id) with check(auth.uid()=owner_id);
revoke all on public.radar_script_feedback from anon;
grant select,insert,update,delete on public.radar_script_feedback to authenticated;
grant all on public.radar_script_feedback to service_role;
create index radar_feedback_profile on public.radar_script_feedback(owner_id,profile_id,created_at desc);
