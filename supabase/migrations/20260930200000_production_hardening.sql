-- Circle Panda production hardening
-- 1) Admin engagement configuration is server-persisted; no client/localStorage source of truth.
create table if not exists public.cp_engagement_config (
  id integer primary key default 1 check (id = 1),
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.cp_engagement_config enable row level security;

insert into public.cp_engagement_config (id, config)
values (
  1,
  '{
    "standardDailyReward": 10,
    "streakMilestoneReward": 50,
    "streakMilestoneDays": 3,
    "freeSpinsActive": true,
    "dailyQuizzesActive": true,
    "hotSeatActive": true,
    "crushSwipesActive": true,
    "quizQuestion": "",
    "quizOptions": [],
    "quizCorrectIndex": 0,
    "quizRewardBc": 10,
    "externalSurvey": {
      "enabled": false,
      "provider": "custom",
      "providerName": "",
      "apiKey": "",
      "endpointUrl": "",
      "integrationMode": "external_redirect",
      "rewardBc": 10,
      "screenoutRewardBc": 1,
      "dailySurveyCap": 3,
      "surveyTopicFilter": ""
    }
  }'::jsonb
)
on conflict (id) do nothing;

create or replace function public.admin_get_engagement_config()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  return jsonb_build_object(
    'config',
    coalesce(
      (select config from public.cp_engagement_config where id = 1),
      '{}'::jsonb
    )
  );
end;
$$;

create or replace function public.admin_save_engagement_config(p_config jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_config jsonb;
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  if p_config is null or jsonb_typeof(p_config) <> 'object' then
    raise exception 'Invalid engagement configuration';
  end if;

  v_config := jsonb_build_object(
    'standardDailyReward', greatest(0, coalesce((p_config->>'standardDailyReward')::integer, 10)),
    'streakMilestoneReward', greatest(0, coalesce((p_config->>'streakMilestoneReward')::integer, 50)),
    'streakMilestoneDays', greatest(1, coalesce((p_config->>'streakMilestoneDays')::integer, 3)),
    'freeSpinsActive', coalesce((p_config->>'freeSpinsActive')::boolean, true),
    'dailyQuizzesActive', coalesce((p_config->>'dailyQuizzesActive')::boolean, true),
    'hotSeatActive', coalesce((p_config->>'hotSeatActive')::boolean, true),
    'crushSwipesActive', coalesce((p_config->>'crushSwipesActive')::boolean, true),
    'quizQuestion', coalesce(p_config->>'quizQuestion', ''),
    'quizOptions', coalesce(p_config->'quizOptions', '[]'::jsonb),
    'quizCorrectIndex', greatest(0, coalesce((p_config->>'quizCorrectIndex')::integer, 0)),
    'quizRewardBc', greatest(0, coalesce((p_config->>'quizRewardBc')::integer, 10)),
    'externalSurvey', coalesce(p_config->'externalSurvey', '{}'::jsonb)
  );

  insert into public.cp_engagement_config (id, config, updated_at, updated_by)
  values (1, v_config, now(), auth.uid())
  on conflict (id) do update
    set config = excluded.config,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;

  return jsonb_build_object('config', v_config);
end;
$$;

revoke execute on function public.admin_get_engagement_config() from public, anon;
revoke execute on function public.admin_save_engagement_config(jsonb) from public, anon;
grant execute on function public.admin_get_engagement_config() to authenticated;
grant execute on function public.admin_save_engagement_config(jsonb) to authenticated;

-- These functions already reject missing auth internally; anonymous API execution is unnecessary.
-- The auth trigger continues to run because trigger execution is not a Data API call.
revoke execute on function public.complete_quick_profile(text, text, text) from public, anon;
revoke execute on function public.handle_new_circle_panda_user() from public, anon;
