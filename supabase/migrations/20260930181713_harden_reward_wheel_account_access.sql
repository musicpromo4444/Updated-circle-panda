-- Reward-wheel account access hardening.

-- Reward-wheel qualification is account-bound and must not be completed by
-- temporary anonymous Supabase accounts.
create or replace function public.cp_spin_reward(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  c public.cp_reward_campaigns;
  st public.cp_reward_wheel_state;
  slot public.cp_reward_wheel_slots;
  p public.cp_reward_prizes;
  attempt uuid;
  qual uuid;
  nextn bigint;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Create or sign in to a Circle Panda account before using the reward wheel';
  end if;
  select * into c from public.cp_reward_campaigns where id=p_campaign_id and enabled;
  if not found then raise exception 'campaign unavailable'; end if;
  if exists (
    select 1 from public.cp_reward_spin_attempts
    where campaign_id=p_campaign_id and user_id=uid
      and created_at > now()-interval '24 hours'
  ) then raise exception 'You can spin once every 24 hours'; end if;
  if (
    select count(*) from public.cp_reward_qualifications
    where campaign_id=p_campaign_id and user_id=uid
  ) >= c.max_qualifiers_per_user then
    raise exception 'You have already completed the qualification for this reward campaign';
  end if;

  insert into public.cp_reward_wheel_state(campaign_id,window_no,spins_in_window,total_spins)
  values(p_campaign_id,1,0,0)
  on conflict(campaign_id) do nothing;
  select * into st from public.cp_reward_wheel_state where campaign_id=p_campaign_id for update;

  if st.spins_in_window >= c.window_size then
    update public.cp_reward_wheel_state
    set window_no=st.window_no+1,spins_in_window=0,updated_at=now()
    where campaign_id=p_campaign_id returning * into st;
    perform public.cp_generate_reward_slots(p_campaign_id,st.window_no);
  end if;

  nextn := st.spins_in_window+1;
  select * into slot from public.cp_reward_wheel_slots
  where campaign_id=p_campaign_id and window_no=st.window_no and spin_number=nextn;

  if slot.prize_id is null then
    select * into p from public.cp_reward_prizes
    where campaign_id=p_campaign_id and prize_type='try_again' and enabled
    order by sort_order limit 1;
    if p.id is null then
      select * into p from public.cp_reward_prizes
      where campaign_id=p_campaign_id and enabled
      order by allocation_count asc,sort_order limit 1;
    end if;
  else
    select * into p from public.cp_reward_prizes where id=slot.prize_id;
  end if;

  if p.id is null then raise exception 'No reward configured for this wheel'; end if;

  insert into public.cp_reward_spin_attempts(campaign_id,user_id,window_no,spin_number,prize_id)
  values(p_campaign_id,uid,st.window_no,nextn,p.id) returning id into attempt;

  update public.cp_reward_wheel_state
  set spins_in_window=nextn,total_spins=total_spins+1,updated_at=now()
  where campaign_id=p_campaign_id;

  if p.prize_type <> 'try_again'
     and p.fulfilment_type in ('claim_form','lead_form','manual') then
    insert into public.cp_reward_qualifications(campaign_id,prize_id,user_id,spin_attempt_id)
    values(p_campaign_id,p.id,uid,attempt)
    on conflict(campaign_id,prize_id,user_id) do nothing
    returning id into qual;
  end if;

  if p.prize_type='bc' then
    insert into public.bc_accounts(user_id,balance) values(uid,p.value)
    on conflict(user_id) do update set balance=public.bc_accounts.balance+excluded.balance,updated_at=now();
    insert into public.bc_ledger(user_id,amount,reason,reference_type,reference_id)
    values(uid,p.value,'Reward wheel: '||p.name,'reward_wheel',attempt);
  elsif p.prize_type='vip' then
    update public.profiles
    set is_vip=true,
        vip_expires_at=greatest(coalesce(vip_expires_at,now()),now())+make_interval(days=>p.value)
    where id=uid;
  elsif p.prize_type='custom' and coalesce(p.fulfilment_config->>'draw','')='weekly' then
    insert into public.sweep_tickets(user_id,draw) values(uid,'weekly');
  end if;

  return jsonb_build_object(
    'attempt_id',attempt,'qualification_id',qual,'window_no',st.window_no,'spin_number',nextn,
    'prize_id',p.id,'title',p.name,'description',p.description,'image_url',p.image_url,
    'emoji',p.emoji,'prize_type',p.prize_type,'value',p.value,
    'qualification_label',p.qualification_label,'fulfilment_type',p.fulfilment_type,
    'fulfilment_config',p.fulfilment_config
  );
end;
$function$;

create or replace function public.cp_submit_reward_stage(
  p_qualification_id uuid,p_stage_id uuid,p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid:=auth.uid();
  q public.cp_reward_qualifications;
  s public.cp_reward_stages;
  next_stage public.cp_reward_stages;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Create or sign in to a Circle Panda account before submitting a reward qualification';
  end if;
  select * into q from public.cp_reward_qualifications
  where id=p_qualification_id and user_id=uid for update;
  if not found then raise exception 'qualification not found'; end if;
  select * into s from public.cp_reward_stages
  where id=p_stage_id and campaign_id=q.campaign_id and enabled
    and stage_number=q.current_stage and released_at is not null;
  if not found then raise exception 'stage is not currently available'; end if;
  insert into public.cp_reward_stage_submissions(qualification_id,stage_id,user_id,answers)
  values(q.id,s.id,uid,coalesce(p_answers,'{}'::jsonb))
  on conflict(qualification_id,stage_id)
  do update set answers=excluded.answers,status='submitted',updated_at=now();
  select * into next_stage from public.cp_reward_stages
  where campaign_id=q.campaign_id and stage_number=s.stage_number+1 and enabled;
  update public.cp_reward_qualifications
  set current_stage=s.stage_number+1,
      status=case when next_stage.id is not null then 'stage_'||(s.stage_number+1)::text else 'finalist' end,
      updated_at=now()
  where id=q.id;
  return jsonb_build_object(
    'ok',true,'next_stage',s.stage_number+1,
    'next_stage_released',coalesce(next_stage.released_at is not null,false)
  );
end;
$function$;