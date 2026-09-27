-- Circle Panda: live admin controls for the seven-day game library
create or replace function public.admin_get_daily_games()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare result jsonb;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  select jsonb_build_object(
    'schedule', coalesce((select jsonb_agg(to_jsonb(s) order by s.day_number) from public.seven_day_activity_schedule s),'[]'::jsonb),
    'games', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order) from public.seven_day_activity_configs c),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.admin_set_daily_game(p_day smallint,p_slug text,p_enabled boolean default true)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare uid uuid:=auth.uid();
begin
  if not private.is_admin(uid) then raise exception 'Admin access required'; end if;
  if p_day not between 1 and 7 then raise exception 'Day must be 1 to 7'; end if;
  if p_enabled and not exists(select 1 from public.seven_day_activity_configs where slug=p_slug and is_enabled=true) then raise exception 'Game is disabled or unavailable'; end if;
  update public.seven_day_activity_schedule
  set activity_slug=case when p_enabled then p_slug else null end, enabled=p_enabled, updated_at=now(), updated_by=uid
  where day_number=p_day;
  insert into public.admin_audit_log(admin_user_id,action,metadata) values(uid,'SET_DAILY_GAME',jsonb_build_object('day',p_day,'slug',p_slug,'enabled',p_enabled));
  return jsonb_build_object('day',p_day,'slug',p_slug,'enabled',p_enabled);
end;
$$;

create or replace function public.admin_update_daily_game(p_slug text,p_enabled boolean,p_free_attempts integer,p_timer_seconds integer,p_reward_pool jsonb,p_puzzle_bank jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare uid uuid:=auth.uid(); updated_row public.seven_day_activity_configs%rowtype;
begin
  if not private.is_admin(uid) then raise exception 'Admin access required'; end if;
  if p_free_attempts not between 1 and 10 then raise exception 'Free attempts must be 1-10'; end if;
  if p_timer_seconds not between 0 and 300 then raise exception 'Timer must be 0-300 seconds'; end if;
  update public.seven_day_activity_configs
  set is_enabled=p_enabled,free_attempts=p_free_attempts,timer_seconds=p_timer_seconds,reward_pool=coalesce(p_reward_pool,'[]'::jsonb),puzzle_bank=coalesce(p_puzzle_bank,'[]'::jsonb),updated_at=now()
  where slug=p_slug returning * into updated_row;
  if not found then raise exception 'Game not found'; end if;
  insert into public.admin_audit_log(admin_user_id,action,metadata) values(uid,'UPDATE_DAILY_GAME',jsonb_build_object('slug',p_slug,'enabled',p_enabled,'free_attempts',p_free_attempts,'timer_seconds',p_timer_seconds));
  return to_jsonb(updated_row);
end;
$$;

revoke execute on function public.admin_get_daily_games() from public,anon;
revoke execute on function public.admin_set_daily_game(smallint,text,boolean) from public,anon;
revoke execute on function public.admin_update_daily_game(text,boolean,integer,integer,jsonb,jsonb) from public,anon;
grant execute on function public.admin_get_daily_games() to authenticated;
grant execute on function public.admin_set_daily_game(smallint,text,boolean) to authenticated;
grant execute on function public.admin_update_daily_game(text,boolean,integer,integer,jsonb,jsonb) to authenticated;
