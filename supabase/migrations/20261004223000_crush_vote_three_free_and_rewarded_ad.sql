-- Circle Panda MCM/WCW voting: 3 free votes per user per week.
-- Extra votes are earned in blocks of 3 by completing a sponsored video.
create table if not exists public.crush_vote_ad_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0,
  updated_at timestamptz not null default now(),
  week_start date not null default date_trunc('week', current_date)::date
);

alter table public.crush_vote_ad_credits enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='crush_vote_ad_credits'
      and policyname='Users can read own crush vote credits'
  ) then
    create policy "Users can read own crush vote credits"
      on public.crush_vote_ad_credits
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;

create or replace function public.cast_crush_vote_secure(p_nominee_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_kind text;
  v_week_start date;
  v_votes_used integer;
  v_ad_credits integer;
  v_vote_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select c.kind, c.week_start::date into v_kind, v_week_start
  from public.crush_nominees c
  where c.id = p_nominee_id
    and c.week_start::date = date_trunc('week', current_date)::date
  limit 1;

  if v_kind is null then raise exception 'INVALID_NOMINEE'; end if;

  if exists (
    select 1 from public.crush_votes v
    join public.crush_nominees n on n.id = v.nominee_id
    where v.user_id = v_user
      and v.nominee_id = p_nominee_id
      and n.week_start::date = v_week_start
  ) then
    raise exception 'ALREADY_VOTED_FOR_NOMINEE';
  end if;

  select count(*)::integer into v_votes_used
  from public.crush_votes v
  join public.crush_nominees n on n.id = v.nominee_id
  where v.user_id = v_user
    and n.week_start::date = v_week_start;

  if v_votes_used >= 3 then
    select credits into v_ad_credits
    from public.crush_vote_ad_credits
    where user_id = v_user and week_start = v_week_start
    for update;

    if coalesce(v_ad_credits, 0) <= 0 then
      raise exception 'FREE_VOTES_EXHAUSTED';
    end if;

    update public.crush_vote_ad_credits
    set credits = credits - 1, updated_at = now()
    where user_id = v_user and week_start = v_week_start;
  end if;

  insert into public.crush_votes (user_id, nominee_id)
  values (v_user, p_nominee_id)
  returning id into v_vote_id;

  perform public.award_xp_secure('wcw_vote', p_nominee_id);

  return jsonb_build_object(
    'ok', true,
    'vote_id', v_vote_id,
    'xp_awarded', 2,
    'votes_used', v_votes_used + 1,
    'free_votes_remaining', greatest(3 - (v_votes_used + 1), 0)
  );
end;
$$;

revoke all on function public.cast_crush_vote_secure(uuid) from public, anon;
grant execute on function public.cast_crush_vote_secure(uuid) to authenticated;

create or replace function public.complete_crush_vote_ad_secure(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_duration integer;
  v_started timestamptz;
  v_week_start date := date_trunc('week', current_date)::date;
  v_credits integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select duration_seconds, started_at into v_duration, v_started
  from public.rewarded_ad_sessions
  where id = p_session_id
    and user_id = v_user
    and surface = 'crush_vote'
  for update;

  if v_started is null then raise exception 'INVALID_AD_SESSION'; end if;

  if exists (
    select 1 from public.rewarded_ad_sessions
    where id = p_session_id and completed_at is not null
  ) then
    raise exception 'AD_ALREADY_COMPLETED';
  end if;

  if now() < v_started + make_interval(secs => greatest(coalesce(v_duration,0),1)) then
    raise exception 'AD_NOT_FINISHED';
  end if;

  insert into public.crush_vote_ad_credits(user_id, week_start, credits)
  values (v_user, v_week_start, 3)
  on conflict (user_id) do update
    set week_start = excluded.week_start,
        credits = case
          when public.crush_vote_ad_credits.week_start = excluded.week_start
            then public.crush_vote_ad_credits.credits + 3
          else 3
        end,
        updated_at = now();

  update public.rewarded_ad_sessions
  set completed_at = now()
  where id = p_session_id;

  select credits into v_credits
  from public.crush_vote_ad_credits
  where user_id = v_user and week_start = v_week_start;

  return jsonb_build_object(
    'ok', true,
    'credits', v_credits,
    'votes_added', 3,
    'week_start', v_week_start
  );
end;
$$;

revoke all on function public.complete_crush_vote_ad_secure(uuid) from public, anon;
grant execute on function public.complete_crush_vote_ad_secure(uuid) to authenticated;
