-- Circle Panda: complete timed daily game engine
create or replace function public.play_timed_daily_activity(p_slug text, p_action text default 'start')
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := auth.uid();
  a public.seven_day_activity_attempts%rowtype;
  c public.seven_day_activity_configs%rowtype;
  attempts_left integer;
  started_at timestamptz;
  elapsed_seconds integer;
  reward bigint := 0;
  reward_label text := 'Activity reward';
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_slug not in ('coin_drop','slots') then raise exception 'Timed activity unavailable'; end if;
  select * into c from public.seven_day_activity_configs where slug=p_slug and is_enabled=true;
  if not found then raise exception 'Activity unavailable'; end if;
  insert into public.seven_day_activity_attempts(user_id,activity_slug,activity_date)
  values(uid,p_slug,current_date)
  on conflict(user_id,activity_slug,activity_date) do nothing;
  select * into a from public.seven_day_activity_attempts
  where user_id=uid and activity_slug=p_slug and activity_date=current_date for update;
  attempts_left:=greatest(0,c.free_attempts+a.extra_attempts-a.attempts_used);

  if p_action='start' then
    if attempts_left<=0 then raise exception 'No attempts remaining'; end if;
    update public.seven_day_activity_attempts
      set attempts_used=attempts_used+1,
          last_result=jsonb_build_object('result','timed_started','started_at',now()),
          updated_at=now()
      where id=a.id;
    return jsonb_build_object('result','timed_started','seconds',coalesce(c.timer_seconds,60),'attempts_left',attempts_left-1);
  end if;

  if p_action='finish' then
    if coalesce(a.last_result->>'result','')<>'timed_started' then raise exception 'Start the activity first'; end if;
    started_at:=(a.last_result->>'started_at')::timestamptz;
    elapsed_seconds:=floor(extract(epoch from (now()-started_at)))::integer;
    if elapsed_seconds<greatest(1,c.timer_seconds) then raise exception 'The timer has not finished yet'; end if;

    if p_slug='coin_drop' then
      if random()<0.001 then reward:=500; reward_label:='Rare 500 BC blink';
      else reward:=1+floor(random()*2)::bigint; reward_label:=reward::text||' BC'; end if;
    else
      select x->>'label',coalesce((x->>'amount')::bigint,0)
      into reward_label,reward
      from jsonb_array_elements(c.reward_pool) x order by random() limit 1;
    end if;

    if reward<>0 then perform public.apply_bc_delta(uid,reward,'7-Day Activity: '||c.title,'seven_day_activity'); end if;
    update public.seven_day_activity_attempts
      set last_result=jsonb_build_object('result','timed_finished','reward_bc',reward,'reward_label',reward_label,'elapsed_seconds',elapsed_seconds),
          updated_at=now()
      where id=a.id;
    return jsonb_build_object('result','timed_finished','reward_bc',reward,'reward_label',reward_label,'elapsed_seconds',elapsed_seconds,'attempts_left',attempts_left);
  end if;
  raise exception 'Invalid timed activity action';
end;
$$;
revoke execute on function public.play_timed_daily_activity(text,text) from public;
grant execute on function public.play_timed_daily_activity(text,text) to authenticated;

update public.seven_day_activity_configs
set is_enabled=true,updated_at=now()
where slug='guess_sponsor';
