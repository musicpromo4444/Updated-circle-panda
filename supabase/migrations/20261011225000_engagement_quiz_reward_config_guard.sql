-- Harden the engagement quiz RPC against malformed admin configuration.
create or replace function public.submit_engagement_quiz_answer(p_answer_index integer)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_uid uuid := auth.uid();
  v_config jsonb;
  v_correct_index integer;
  v_reward bigint;
  v_correct boolean;
  v_claim_id uuid;
  v_balance bigint;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from auth.users u where u.id = v_uid and coalesce(u.is_anonymous, false)) then raise exception 'AUTH_REQUIRED'; end if;
  select value into v_config from public.app_settings where key = 'engagement_config';
  v_config := coalesce(v_config, '{}'::jsonb);
  if coalesce((v_config->>'dailyQuizzesActive')::boolean, true) is false then raise exception 'QUIZ_DISABLED'; end if;
  if jsonb_typeof(coalesce(v_config->'quizOptions', '[]'::jsonb)) <> 'array' then raise exception 'QUIZ_NOT_CONFIGURED'; end if;
  if p_answer_index is null or p_answer_index < 0 or p_answer_index >= jsonb_array_length(coalesce(v_config->'quizOptions', '[]'::jsonb)) then raise exception 'INVALID_ANSWER'; end if;
  v_correct_index := greatest(0, coalesce((v_config->>'quizCorrectIndex')::integer, 0));
  v_reward := least(1000, greatest(0, coalesce((v_config->>'quizRewardBc')::integer, 0)));
  v_correct := p_answer_index = v_correct_index;
  insert into public.engagement_quiz_claims(user_id, claim_date, selected_index, is_correct, reward_bc)
  values (v_uid, (now() at time zone 'utc')::date, p_answer_index, v_correct, 0)
  on conflict (user_id, claim_date) do nothing returning id into v_claim_id;
  if v_claim_id is null then return jsonb_build_object('result', 'already_claimed', 'reward_bc', 0); end if;
  if v_correct and v_reward > 0 then
    insert into public.wallet_ledger(user_id, amount, reason, reference_type, reference_id, idempotency_key)
    values (v_uid, v_reward, 'Daily Community Trivia Reward', 'engagement_quiz', v_claim_id, 'engagement_quiz:' || v_uid::text || ':' || to_char((now() at time zone 'utc')::date, 'YYYY-MM-DD'))
    on conflict (user_id, idempotency_key) do nothing;
    update public.engagement_quiz_claims set reward_bc = v_reward where id = v_claim_id;
  end if;
  select balance into v_balance from public.wallets where user_id = v_uid;
  return jsonb_build_object('result', case when v_correct then 'correct' else 'incorrect' end, 'reward_bc', case when v_correct then v_reward else 0 end, 'balance', coalesce(v_balance, 0));
end;
$function$;
revoke all on function public.submit_engagement_quiz_answer(integer) from public;
grant execute on function public.submit_engagement_quiz_answer(integer) to authenticated;
