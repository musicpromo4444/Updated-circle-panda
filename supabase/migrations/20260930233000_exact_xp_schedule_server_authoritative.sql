-- Circle Panda exact XP schedule, server-authoritative.
create or replace function private.award_circle_panda_xp(p_user_id uuid,p_action text,p_reference_id uuid default null,p_reference_key text default null)
returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare v_xp bigint; v_action text:=lower(trim(coalesce(p_action,'')));
begin
 if p_user_id is null then raise exception 'XP user is required'; end if;
 v_xp:=case v_action
  when 'post' then 7 when 'create_post' then 7 when 'confession' then 7 when 'create_confession' then 7
  when 'reply' then 5 when 'post_reply' then 5 when 'daily_activity' then 5 when 'create_event' then 6
  when 'attend_event' then 2 when 'join_group' then 6 when 'complete_profile' then 10 when 'daily_login' then 3
  when 'message' then 1 when 'direct_message' then 1 when 'group_message' then 1 when 'wcw_mcm_vote' then 2
  when 'wcw_vote' then 2 when 'create_group' then 10 when 'dating_match_chat' then 3
  when 'reward_wheel_spin' then 5 when 'gift_purchase' then 10 when 'buy_gift' then 10 else 0 end;
 if v_xp<=0 then raise exception 'Unknown XP action: %',p_action; end if;
 insert into public.user_xp_awards(user_id,action,reference_id,reference_key,xp)
 values(p_user_id,v_action,p_reference_id,p_reference_key,v_xp) on conflict do nothing;
 if found then
  insert into public.user_xp(user_id,xp,updated_at) values(p_user_id,v_xp,now())
  on conflict(user_id) do update set xp=public.user_xp.xp+excluded.xp,updated_at=now();
  return v_xp;
 end if;
 return 0;
end; $$;

create or replace function private.xp_after_event_attendance() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin perform private.award_circle_panda_xp(new.user_id,'attend_event',new.event_id); return new; end; $$;

drop trigger if exists trg_xp_event_attendance on public.event_attendees;
create trigger trg_xp_event_attendance after insert on public.event_attendees
for each row execute function private.xp_after_event_attendance();

-- VIP activation intentionally has no XP award.
