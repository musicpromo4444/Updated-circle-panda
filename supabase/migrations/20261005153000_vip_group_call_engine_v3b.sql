create table if not exists public.cp_vip_group_call_sessions (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.cp_vip_group_rooms(id) on delete cascade,
 call_type text not null check(call_type in ('voice','video')),
 created_by uuid not null references auth.users(id) on delete cascade,
 status text not null default 'ringing' check(status in ('ringing','active','ended','declined','expired')),
 first_window_ends_at timestamptz not null default (now()+interval '20 minutes'),
 ad_gate_required boolean not null default false,
 ad_gate_completed_at timestamptz,
 unlimited_at timestamptz,
 started_at timestamptz,
 ended_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.cp_vip_group_call_participants (
 session_id uuid not null references public.cp_vip_group_call_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 accepted boolean not null default false,
 responded_at timestamptz,
 joined_at timestamptz,
 left_at timestamptz,
 primary key(session_id,user_id)
);
alter table public.cp_vip_group_call_config add column if not exists local_start_hour smallint;
alter table public.cp_vip_group_call_config add column if not exists local_end_hour smallint;
alter table public.cp_vip_group_call_config add column if not exists country_mode text not null default 'room';
alter table public.cp_vip_group_call_config drop constraint if exists cp_vip_group_call_config_country_mode_check;
alter table public.cp_vip_group_call_config add constraint cp_vip_group_call_config_country_mode_check check(country_mode in ('room','user','worldwide'));
alter table public.cp_vip_group_call_sessions enable row level security;
alter table public.cp_vip_group_call_participants enable row level security;
revoke all on public.cp_vip_group_call_sessions,public.cp_vip_group_call_participants from anon,authenticated;
drop policy if exists deny_vip_group_call_sessions_api on public.cp_vip_group_call_sessions;
drop policy if exists deny_vip_group_call_participants_api on public.cp_vip_group_call_participants;
create policy deny_vip_group_call_sessions_api on public.cp_vip_group_call_sessions for all to authenticated using(false) with check(false);
create policy deny_vip_group_call_participants_api on public.cp_vip_group_call_participants for all to authenticated using(false) with check(false);
-- Server functions are deployed by the matching Supabase migration vip_group_call_engine_v3b.
