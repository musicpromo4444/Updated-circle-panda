-- Public, read-only engagement configuration for the onboarding/features UI.
-- Sensitive external survey API credentials are never returned.
create or replace function public.get_engagement_runtime_config()
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_cfg jsonb;
  v_ext jsonb;
  v_secret_configured boolean;
begin
  select value into v_cfg
  from public.app_settings
  where key = 'engagement_config';

  v_cfg := coalesce(v_cfg, '{
    "standardDailyReward": 2,
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
      "endpointUrl": "",
      "integrationMode": "external_redirect",
      "rewardBc": 10,
      "screenoutRewardBc": 1,
      "dailySurveyCap": 3,
      "surveyTopicFilter": ""
    }
  }'::jsonb);

  select exists (
    select 1 from public.admin_integrations
    where provider = 'external_survey'
      and purpose = 'engagement'
      and nullif(secret_ref, '') is not null
  ) into v_secret_configured;

  v_ext := coalesce(v_cfg->'externalSurvey', '{}'::jsonb) - 'apiKey';
  v_ext := jsonb_set(v_ext, '{apiKey}', '""'::jsonb, true);
  v_ext := jsonb_set(v_ext, '{apiKeyConfigured}', to_jsonb(v_secret_configured), true);
  v_cfg := jsonb_set(v_cfg, '{externalSurvey}', v_ext, true);

  return jsonb_build_object('config', v_cfg);
end;
$function$;

revoke all on function public.get_engagement_runtime_config() from public;
grant execute on function public.get_engagement_runtime_config() to anon, authenticated;
