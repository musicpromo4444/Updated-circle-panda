-- Circle Panda production XP schedule
-- Server-authoritative XP ledger and action mappings.

create table if not exists public.cp_xp_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  reference_id uuid,
  award_key text not null,
  xp bigint not null check (xp > 0),
  created_at timestamptz not null default now(),
  unique (user_id, award_key)
);
alter table public.cp_xp_awards enable row level security;
revoke all on public.cp_xp_awards from public, anon, authenticated;

create or replace function public.award_xp_secure(p_action text,p_reference_id uuid default null,p_award_key text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); action text:=lower(trim(coalesce(p_action,''))); xp_value bigint; award_key text; inserted_id uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 xp_value:=case action
  when 'reply_post' then 5 when 'create_post' then 7 when 'create_confession' then 7
  when 'daily_activity' then 5 when 'create_event' then 6 when 'attend_event' then 2
  when 'join_group' then 6 when 'complete_profile' then 10 when 'daily_login' then 3
  when 'send_message' then 1 when 'send_group_message' then 1 when 'wcw_vote' then 2
  when 'create_group' then 10 when 'dating_match_chat' then 3 when 'reward_wheel_spin' then 5
  when 'buy_gift' then 10 else 0 end;
 if xp_value<=0 then return jsonb_build_object('awarded',false,'xp',0,'reason','action_not_configured'); end if;
 award_key:=coalesce(nullif(trim(p_award_key),''),
   case when action='daily_login' then action||':'||current_date::text
        when action='complete_profile' then action
        when p_reference_id is not null then action||':'||p_reference_id::text
        else action||':'||clock_timestamp()::text end);
 insert into public.cp_xp_awards(user_id,action,reference_id,award_key,xp)
 values(uid,action,p_reference_id,award_key,xp_value)
 on conflict(user_id,award_key) do nothing returning id into inserted_id;
 if inserted_id is null then return jsonb_build_object('awarded',false,'xp',0,'reason','already_awarded'); end if;
 insert into public.user_xp(user_id,xp,updated_at) values(uid,xp_value,now())
 on conflict(user_id) do update set xp=public.user_xp.xp+excluded.xp,updated_at=now();
 return jsonb_build_object('awarded',true,'xp',xp_value,'award_id',inserted_id);
end; $$;

revoke execute on function public.award_xp_secure(text,uuid,text) from public,anon;
grant execute on function public.award_xp_secure(text,uuid,text) to authenticated;

-- Existing secure actions are amended to call award_xp_secure rather than trusting client XP.
-- The production migration that introduced this file also updated:
-- create_post_secure=7, create_post_reply_secure=5, submit_confession_secure=7,
-- create_group_secure=10, join_group_secure=6, create_event_secure=6,
-- send_direct_message=1, send_group_message_secure=1, create_direct_thread=3,
-- cast_crush_vote_secure=2, cp_spin_reward=5, send_hot_seat_gift=10.
-- record_activity_participation maps complete_profile=10, daily_login=3,
-- attend_event=2, and all other daily activity participation=5.


-- Remove the legacy client-supplied XP overload.
drop function if exists public.award_xp_secure(text,uuid,bigint);
