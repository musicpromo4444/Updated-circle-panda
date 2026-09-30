-- Circle Panda: enforce a true 24-hour daily-login XP cooldown server-side.
create or replace function public.record_activity_participation(
  p_activity_id uuid,
  p_activity_type text,
  p_reference_id uuid default null,
  p_points bigint default 0
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  uid uuid:=auth.uid();
  activity_row public.activities;
  duplicate boolean:=false;
  awarded_bc bigint:=0;
  awarded_xp bigint:=0;
  new_balance bigint;
  xp_action text;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  -- Serialize login claims per user so two simultaneous app opens cannot both earn XP.
  insert into public.user_xp(user_id,xp,updated_at)
  values(uid,0,now()) on conflict(user_id) do nothing;
  perform 1 from public.user_xp where user_id=uid for update;

  select * into activity_row
  from public.activities
  where (
    id=p_activity_id
    or (
      p_activity_id is null
      and activity_type=case p_activity_type
        when 'event_created' then 'create_event'
        when 'confession_created' then 'post_confession'
        when 'event_attended' then 'attend_event'
        else p_activity_type
      end
    )
  )
  and is_enabled=true
  order by id limit 1;

  if not found then raise exception 'Activity is unavailable'; end if;

  if p_activity_type='daily_login' then
    duplicate:=exists(
      select 1 from public.activity_participation
      where user_id=uid
        and activity_id=activity_row.id
        and created_at >= now() - interval '24 hours'
    );
    xp_action:='daily_login';
  elsif p_activity_type in ('event_created','create_event') then
    if p_reference_id is null or not exists(select 1 from events where id=p_reference_id and owner_id=uid) then raise exception 'Event ownership could not be verified'; end if;
    duplicate:=exists(select 1 from activity_participation where user_id=uid and activity_id=activity_row.id and reference_id=p_reference_id);
    xp_action:='create_event';
  elsif p_activity_type in ('post_confession','confession_created') then
    if p_reference_id is null or not exists(select 1 from confessions where id=p_reference_id and author_id=uid) then raise exception 'Confession ownership could not be verified'; end if;
    duplicate:=exists(select 1 from activity_participation where user_id=uid and activity_id=activity_row.id and reference_id=p_reference_id);
    xp_action:='confession';
  elsif p_activity_type in ('attend_event','event_attended') then
    if p_reference_id is null or not exists(select 1 from event_attendees where event_id=p_reference_id and user_id=uid) then raise exception 'Event attendance could not be verified'; end if;
    duplicate:=exists(select 1 from activity_participation where user_id=uid and activity_id=activity_row.id and reference_id=p_reference_id);
    xp_action:='attend_event';
  elsif p_activity_type='join_group' then
    if p_reference_id is null or not exists(select 1 from group_members where group_id=p_reference_id and user_id=uid and left_at is null) then raise exception 'Join the group first'; end if;
    duplicate:=exists(select 1 from activity_participation where user_id=uid and activity_id=activity_row.id and reference_id=p_reference_id);
    xp_action:='join_group';
  elsif p_activity_type='complete_profile' then
    duplicate:=exists(select 1 from activity_participation where user_id=uid and activity_id=activity_row.id);
    xp_action:='complete_profile';
  else
    duplicate:=exists(select 1 from activity_participation where user_id=uid and activity_id=activity_row.id);
    xp_action:='daily_activity';
  end if;

  if duplicate then
    return jsonb_build_object(
      'awarded',false,
      'reason',case when p_activity_type='daily_login' then 'cooldown_24_hours' else 'already_completed' end,
      'cooldown_hours',case when p_activity_type='daily_login' then 24 else null end
    );
  end if;

  if xp_action='daily_login' then
    awarded_xp:=private.award_circle_panda_xp(
      uid,'daily_login',null,extract(epoch from clock_timestamp())::bigint::text
    );
  elsif xp_action in ('create_event','confession','attend_event','join_group','complete_profile') then
    awarded_xp:=private.award_circle_panda_xp(uid,xp_action,p_reference_id);
  else
    awarded_xp:=private.award_circle_panda_xp(uid,'daily_activity',p_reference_id);
  end if;

  insert into activity_participation(user_id,activity_id,reference_id,points)
  values(uid,activity_row.id,p_reference_id,awarded_xp);

  awarded_bc:=coalesce(activity_row.reward_bc,0);
  if awarded_bc>0 then
    insert into bc_accounts(user_id,balance,updated_at)
    values(uid,awarded_bc,now())
    on conflict(user_id) do update set balance=bc_accounts.balance+excluded.balance,updated_at=now();
    insert into bc_ledger(user_id,amount,reason,reference_type,reference_id)
    values(uid,awarded_bc,'Activity reward','activity',activity_row.id);
  end if;

  select balance into new_balance from bc_accounts where user_id=uid;
  return jsonb_build_object(
    'awarded',true,
    'activity_id',activity_row.id,
    'reward_bc',awarded_bc,
    'xp',awarded_xp,
    'balance',coalesce(new_balance,0),
    'cooldown_hours',24
  );
end;
$$;
