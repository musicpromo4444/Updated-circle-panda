-- Server-authoritative mechanics for the interactive daily games.
create or replace function public.play_daily_choice_game(
  p_slug text,
  p_action text default 'start',
  p_choice integer default null,
  p_hits integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  a public.seven_day_activity_attempts%rowtype;
  c public.seven_day_activity_configs%rowtype;
  attempts_left integer;
  winning_choice integer;
  reward bigint := 0;
  reward_label text := 'No reward';
  scheduled_slug text;
  day_no smallint := extract(isodow from current_date)::smallint;
  success boolean := false;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select activity_slug into scheduled_slug
  from public.seven_day_activity_schedule
  where day_number = day_no and enabled = true;

  if scheduled_slug is null or scheduled_slug <> p_slug then
    raise exception 'This activity is not scheduled for today';
  end if;

  if p_slug not in ('wheel_spin','mystery_box','target','guess_sponsor','cup_shuffle') then
    raise exception 'Choice activity unavailable';
  end if;

  select * into c from public.seven_day_activity_configs
  where slug = p_slug and is_enabled = true;
  if not found then raise exception 'Activity unavailable'; end if;

  insert into public.seven_day_activity_attempts(user_id,activity_slug,activity_date)
  values(uid,p_slug,current_date)
  on conflict(user_id,activity_slug,activity_date) do nothing;

  select * into a from public.seven_day_activity_attempts
  where user_id=uid and activity_slug=p_slug and activity_date=current_date
  for update;

  attempts_left := greatest(0,c.free_attempts+a.extra_attempts-a.attempts_used);

  if p_action = 'start' then
    if attempts_left <= 0 then raise exception 'No attempts remaining'; end if;

    if p_slug = 'target' then
      update public.seven_day_activity_attempts
      set attempts_used=attempts_used+1,
          last_result=jsonb_build_object('result','target_started','target_hits',0),
          updated_at=now()
      where id=a.id;
      return jsonb_build_object('result','target_started','attempts_left',attempts_left-1,'target_hits_required',5);
    end if;

    winning_choice := floor(random()*3)::integer;
    update public.seven_day_activity_attempts
    set attempts_used=attempts_used+1,
        last_result=jsonb_build_object('result','choice_ready','winning_choice',winning_choice),
        updated_at=now()
    where id=a.id;

    return jsonb_build_object('result','choice_ready','attempts_left',attempts_left-1,'choices',3);
  end if;

  if p_action = 'finish' then
    if p_slug = 'target' then
      if coalesce(a.last_result->>'result','') <> 'target_started' then
        raise exception 'Start the target game first';
      end if;
      if p_hits < 5 then
        update public.seven_day_activity_attempts
        set last_result=jsonb_build_object('result','target_failed','hits',greatest(p_hits,0),'reward_bc',0),
            updated_at=now()
        where id=a.id;
        return jsonb_build_object('result','failed','reward_bc',0,'hits',greatest(p_hits,0),'target_hits_required',5);
      end if;
      success := true;
    else
      if coalesce(a.last_result->>'result','') <> 'choice_ready' then
        raise exception 'Start the game first';
      end if;
      if p_choice is null or p_choice not between 0 and 2 then
        raise exception 'Invalid choice';
      end if;
      success := p_choice = (a.last_result->>'winning_choice')::integer;
    end if;

    if success then
      select x->>'label', coalesce((x->>'amount')::bigint,0)
      into reward_label,reward
      from jsonb_array_elements(c.reward_pool) x
      order by random() limit 1;
      if reward <> 0 then
        perform public.apply_bc_delta(uid,reward,'7-Day Activity: '||c.title,'seven_day_activity');
      end if;
    end if;

    update public.seven_day_activity_attempts
    set last_result=jsonb_build_object(
      'result',case when success then 'won' else 'lost' end,
      'choice',p_choice,
      'hits',greatest(p_hits,0),
      'reward_bc',case when success then reward else 0 end,
      'reward_label',case when success then reward_label else 'No reward' end
    ),
    updated_at=now()
    where id=a.id;

    return jsonb_build_object(
      'result',case when success then 'won' else 'lost' end,
      'reward_bc',case when success then reward else 0 end,
      'reward_label',case when success then reward_label else 'No reward' end,
      'hits',greatest(p_hits,0),
      'attempts_left',attempts_left
    );
  end if;

  raise exception 'Invalid game action';
end;
$$;

revoke execute on function public.play_daily_choice_game(text,text,integer,integer) from public, anon;
grant execute on function public.play_daily_choice_game(text,text,integer,integer) to authenticated;