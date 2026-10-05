-- Harden VIP call gate lifecycle: gate cannot be accepted early, both participants must accept,
-- both must complete the configured ad, then the session becomes unlimited. Anonymous callers
-- cannot invoke the gate transition functions.

create or replace function public.advance_vip_call(p_session_id uuid)
returns text
language plpgsql
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_status text;
  v_group uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select status, group_id into v_status, v_group
  from public.vip_call_sessions where id=p_session_id for update;
  if not found then return 'missing'; end if;
  if not exists(select 1 from public.group_members where group_id=v_group and user_id=uid and left_at is null) then
    raise exception 'NOT_MEMBER';
  end if;
  if v_status='active' and now() >= (select gate_at from public.vip_call_sessions where id=p_session_id) then
    update public.vip_call_sessions set status='gated' where id=p_session_id;
    return 'gated';
  end if;
  return v_status;
end;
$$;

create or replace function public.vip_accept_call_gate(p_session_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_gate_at timestamptz;
  v_status text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select gate_at, status into v_gate_at, v_status from public.vip_call_sessions where id=p_session_id;
  if not found then raise exception 'CALL_NOT_FOUND'; end if;
  if v_status not in ('active','gated') then raise exception 'CALL_NOT_ACCEPTING_GATE'; end if;
  if now() < v_gate_at then raise exception 'VIP_GATE_NOT_OPEN'; end if;
  if not exists(select 1 from public.vip_call_participants where session_id=p_session_id and user_id=uid) then
    raise exception 'NOT_A_PARTICIPANT';
  end if;
  update public.vip_call_gate_acceptances set accepted=true, updated_at=now()
  where session_id=p_session_id and user_id=uid;
  update public.vip_call_sessions set status='gated'
  where id=p_session_id and status='active' and now() >= gate_at;
  return public.vip_call_state(p_session_id);
end;
$$;

create or replace function public.vip_complete_call_gate_ad(p_session_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  participant_count integer;
  accepted_count integer;
  ad_count integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.vip_call_participants where session_id=p_session_id and user_id=uid) then
    raise exception 'NOT_A_PARTICIPANT';
  end if;
  if not exists(select 1 from public.vip_call_sessions where id=p_session_id and now() >= gate_at and status in ('active','gated')) then
    raise exception 'VIP_GATE_NOT_OPEN';
  end if;
  select count(*) into participant_count from public.vip_call_participants where session_id=p_session_id;
  select count(*) into accepted_count from public.vip_call_gate_acceptances where session_id=p_session_id and accepted=true;
  if participant_count < 2 or accepted_count < participant_count then
    raise exception 'BOTH_PARTICIPANTS_MUST_ACCEPT';
  end if;
  select count(*) into ad_count from public.vip_call_gate_config c
  where c.id=true and c.active=true and c.ad_id is not null;
  if ad_count = 0 then raise exception 'VIP_GATE_AD_NOT_CONFIGURED'; end if;
  update public.vip_call_gate_acceptances set ad_completed=true, updated_at=now()
  where session_id=p_session_id and user_id=uid;
  if not exists(select 1 from public.vip_call_gate_acceptances where session_id=p_session_id and ad_completed=false) then
    update public.vip_call_sessions
    set unlimited_at=coalesce(unlimited_at,now()), status='unlimited'
    where id=p_session_id and status in ('active','gated');
  end if;
  return public.vip_call_state(p_session_id);
end;
$$;

revoke execute on function public.advance_vip_call(uuid) from anon;
revoke execute on function public.vip_accept_call_gate(uuid) from anon;
revoke execute on function public.vip_complete_call_gate_ad(uuid) from anon;
grant execute on function public.advance_vip_call(uuid) to authenticated;
grant execute on function public.vip_accept_call_gate(uuid) to authenticated;
grant execute on function public.vip_complete_call_gate_ad(uuid) to authenticated;
