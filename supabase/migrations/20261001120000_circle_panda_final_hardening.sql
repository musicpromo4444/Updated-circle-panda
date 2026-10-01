-- Circle Panda production hardening: universal winner chaining and anonymous table DML lockdown
-- 2026-10-01

do $$
declare r record;
begin
  for r in
    select format('revoke insert, update, delete, truncate, references, trigger on table %I.%I from anon;', n.nspname, c.relname) as stmt
    from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','v','m','f','p')
  loop
    execute r.stmt;
  end loop;
end $$;

create or replace function public.cp_start_winner_cycle(
  p_scope text,
  p_activity_id uuid,
  p_activity_key text,
  p_title text,
  p_prize text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_winner_mode text default 'random',
  p_xp_weight numeric default 0.5,
  p_activity_weight numeric default 0.5,
  p_manual_winner_id uuid default null,
  p_max_attempts integer default 1,
  p_entry_limit integer default null,
  p_eligibility jsonb default '{}'::jsonb,
  p_completion_reward_bc bigint default 0,
  p_completion_reward_xp bigint default 0,
  p_winner_reward_bc bigint default 0,
  p_winner_reward_xp bigint default 0,
  p_winner_badge text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_id uuid;
  v_prev record;
begin
  if not public.cp_is_admin() then raise exception 'Admin access required'; end if;
  if p_ends_at <= p_starts_at then raise exception 'End time must be after start time'; end if;
  if p_max_attempts < 1 or p_max_attempts > 100 then raise exception 'Invalid attempt limit'; end if;
  if p_entry_limit is not null and p_entry_limit < 1 then raise exception 'Invalid entry limit'; end if;
  if p_winner_mode not in ('random','weighted','manual') then raise exception 'Invalid winner mode'; end if;
  if p_completion_reward_bc < 0 or p_completion_reward_xp < 0 or p_winner_reward_bc < 0 or p_winner_reward_xp < 0 then raise exception 'Rewards cannot be negative'; end if;

  select c.winner_id,c.winner_name,c.winner_avatar,c.prize,c.winner_score
    into v_prev
  from public.cp_activity_winner_cycles c
  where c.scope = p_scope
    and c.activity_key = p_activity_key
    and c.status = 'announced'
    and c.winner_id is not null
  order by c.announced_at desc nulls last,c.created_at desc
  limit 1;

  insert into public.cp_activity_winner_cycles(
    scope,activity_id,activity_key,title,prize,status,starts_at,ends_at,winner_mode,
    xp_weight,activity_weight,manual_winner_id,previous_winner_id,previous_winner_name,
    previous_winner_avatar,previous_winner_prize,previous_winner_score,created_by,max_attempts,
    entry_limit,eligibility,completion_reward_bc,completion_reward_xp,winner_reward_bc,
    winner_reward_xp,winner_badge
  )
  values(
    p_scope,p_activity_id,p_activity_key,p_title,p_prize,
    case when p_starts_at <= now() then 'open' else 'scheduled' end,
    p_starts_at,p_ends_at,p_winner_mode,p_xp_weight,p_activity_weight,p_manual_winner_id,
    v_prev.winner_id,v_prev.winner_name,v_prev.winner_avatar,v_prev.prize,v_prev.winner_score,
    auth.uid(),p_max_attempts,p_entry_limit,coalesce(p_eligibility,'{}'::jsonb),
    p_completion_reward_bc,p_completion_reward_xp,p_winner_reward_bc,p_winner_reward_xp,p_winner_badge
  )
  returning id into v_id;
  return v_id;
end
$function$;


create or replace function public.start_free_coins_rewarded_ad()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  uid uuid := auth.uid();
  sid uuid;
  ad record;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into ad
  from public.ad_creatives
  where status='active' and format='video'
  order by case when placement='free_coins' then 0 else 1 end, created_at desc
  limit 1;
  if ad.id is null then raise exception 'Sponsored video unavailable'; end if;
  if exists (
    select 1 from public.rewarded_ad_sessions
    where user_id=uid and surface='free_coins'
      and created_at > now()-interval '5 minutes'
  ) then raise exception 'Rewarded ad cooldown active'; end if;
  insert into public.rewarded_ad_sessions(user_id,ad_id,surface,reward_bc)
  values(uid,ad.id,'free_coins',30)
  returning id into sid;
  return jsonb_build_object(
    'session_id',sid,'ad_id',ad.id,
    'duration_seconds',greatest(1,coalesce(ad.duration_seconds,5)),
    'reward_bc',30,'sponsor',ad.sponsor,'headline',ad.headline,
    'description',ad.description,'video_url',ad.video_url,
    'poster_url',ad.poster_url,'destination_url',ad.destination_url
  );
end
$function$;

revoke execute on function public.start_free_coins_rewarded_ad() from public, anon;
grant execute on function public.start_free_coins_rewarded_ad() to authenticated;
