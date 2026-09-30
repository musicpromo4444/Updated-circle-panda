-- Circle Panda server-authoritative XP action table.
-- Exact XP: post 7, confession 7, reply 5, daily_activity 5, create_event 6,
-- attend_event 2, join_group 6, complete_profile 10, daily_login 3,
-- message 1, group_message 1, wcw_mcm_vote 2, create_group 10,
-- dating_match_chat 3, reward_wheel_spin 5, gift_purchase 10.
-- Production deployment also updates the secure RPCs and triggers described below.

create table if not exists public.user_xp_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  reference_id uuid,
  reference_key text,
  xp bigint not null check (xp > 0),
  created_at timestamptz not null default now(),
  unique (user_id, action, reference_id),
  unique (user_id, action, reference_key)
);

create index if not exists user_xp_awards_user_created_idx
  on public.user_xp_awards(user_id, created_at desc);

alter table public.user_xp_awards enable row level security;
drop policy if exists "users read own xp awards" on public.user_xp_awards;
create policy "users read own xp awards"
  on public.user_xp_awards for select to authenticated
  using (user_id = auth.uid());

create or replace function private.award_circle_panda_xp(
  p_user_id uuid,
  p_action text,
  p_reference_id uuid default null,
  p_reference_key text default null
) returns bigint
language plpgsql security definer
set search_path to 'public','pg_temp'
as $$
declare v_xp bigint;
begin
  v_xp := case p_action
    when 'post' then 7 when 'confession' then 7 when 'reply' then 5
    when 'daily_activity' then 5 when 'create_event' then 6
    when 'attend_event' then 2 when 'join_group' then 6
    when 'complete_profile' then 10 when 'daily_login' then 3
    when 'message' then 1 when 'group_message' then 1
    when 'wcw_mcm_vote' then 2 when 'create_group' then 10
    when 'dating_match_chat' then 3 when 'reward_wheel_spin' then 5
    when 'gift_purchase' then 10 else 0 end;
  if v_xp <= 0 then raise exception 'Unknown XP action: %', p_action; end if;
  insert into public.user_xp_awards(user_id,action,reference_id,reference_key,xp)
  values(p_user_id,p_action,p_reference_id,p_reference_key,v_xp)
  on conflict do nothing;
  if found then
    insert into public.user_xp(user_id,xp,updated_at) values(p_user_id,v_xp,now())
    on conflict(user_id) do update set xp=public.user_xp.xp+excluded.xp,updated_at=now();
    return v_xp;
  end if;
  return 0;
end;
$$;

revoke all on function private.award_circle_panda_xp(uuid,text,uuid,text) from public;

-- Production RPCs now call this private function for posts, replies, confessions,
-- direct messages, group messages, groups, joins, and profile completion.
-- Server triggers cover events, WCW/MCM votes, dating matches, reward-wheel spins,
-- and Hot Seat gifts. record_activity_participation maps daily login/activity/event
-- actions to this same server-side table and ignores client-supplied XP amounts.
