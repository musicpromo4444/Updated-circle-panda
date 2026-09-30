-- Circle Panda reward wheel production alignment.
-- This migration keeps the wheel server-authoritative, seeds the production
-- reward allocation window, and connects qualification prizes to the
-- immediately displayed claim form.

alter table public.cp_reward_campaigns enable row level security;
drop policy if exists "authenticated can read enabled reward campaigns" on public.cp_reward_campaigns;
create policy "authenticated can read enabled reward campaigns"
on public.cp_reward_campaigns for select to authenticated
using (enabled=true);

alter table public.cp_reward_stages enable row level security;
drop policy if exists "authenticated can read released reward stages" on public.cp_reward_stages;
create policy "authenticated can read released reward stages"
on public.cp_reward_stages for select to authenticated
using (enabled=true and released_at is not null);

update public.cp_reward_campaigns
set enabled=true, window_size=10000, max_qualifiers_per_user=1,
    qualification_message='Congratulations! You qualified. Complete the next step now to continue your prize claim.',
    updated_at=now()
where name='Circle Panda Reward Wheel';

delete from public.cp_reward_wheel_slots
where campaign_id=(select id from public.cp_reward_campaigns where name='Circle Panda Reward Wheel' limit 1);

delete from public.cp_reward_prizes
where campaign_id=(select id from public.cp_reward_campaigns where name='Circle Panda Reward Wheel' limit 1)
  and prize_type <> 'try_again';

insert into public.cp_reward_prizes
(campaign_id,name,description,image_url,emoji,prize_type,value,allocation_count,allocation_window,qualification_label,fulfilment_type,fulfilment_config,enabled,sort_order)
select c.id,'iPhone 16 Pro Max','Grand prize. Winner contact and delivery are verified after qualification.',null,'📱','physical',1,5,10000,'Qualified for iPhone 16 Pro Max — complete the claim form.','claim_form','{"delivery":"manual_verification"}'::jsonb,true,1 from public.cp_reward_campaigns c where c.name='Circle Panda Reward Wheel'
union all select c.id,'PlayStation 5','Grand prize. Winner contact and delivery are verified after qualification.',null,'🎮','physical',1,5,10000,'Qualified for PlayStation 5 — complete the claim form.','claim_form','{"delivery":"manual_verification"}'::jsonb,true,2 from public.cp_reward_campaigns c where c.name='Circle Panda Reward Wheel'
union all select c.id,'2GB Data Top-up','Data prize. Recipient details are verified after qualification.',null,'📶','data',2,2600,10000,'Qualified for 2GB Data — complete the claim form.','claim_form','{"delivery":"manual_verification"}'::jsonb,true,3 from public.cp_reward_campaigns c where c.name='Circle Panda Reward Wheel'
union all select c.id,'1,000 Black Coins','1,000 BC credited immediately.',null,'💎','bc',1000,600,10000,'1,000 BC reward','automatic_bc','{}'::jsonb,true,4 from public.cp_reward_campaigns c where c.name='Circle Panda Reward Wheel'
union all select c.id,'100 Black Coins','100 BC credited immediately.',null,'🪙','bc',100,4000,10000,'100 BC reward','automatic_bc','{}'::jsonb,true,5 from public.cp_reward_campaigns c where c.name='Circle Panda Reward Wheel'
union all select c.id,'7-Day VIP Pass','Seven days of VIP credited immediately.',null,'👑','vip',7,1200,10000,'7-Day VIP reward','automatic_vip','{}'::jsonb,true,6 from public.cp_reward_campaigns c where c.name='Circle Panda Reward Wheel'
union all select c.id,'Sweepstakes Ticket','One weekly sweepstakes ticket credited immediately.',null,'🎟️','custom',1,1590,10000,'1 sweepstakes ticket','automatic_bc','{"draw":"weekly"}'::jsonb,true,7 from public.cp_reward_campaigns c where c.name='Circle Panda Reward Wheel';

select public.cp_generate_reward_slots(
  (select id from public.cp_reward_campaigns where name='Circle Panda Reward Wheel' limit 1),1
);

create or replace function public.cp_spin_reward(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid:=auth.uid();
  c public.cp_reward_campaigns;
  st public.cp_reward_wheel_state;
  slot public.cp_reward_wheel_slots;
  p public.cp_reward_prizes;
  attempt uuid;
  qual uuid;
  nextn bigint;
begin
  if uid is null then raise exception 'login required'; end if;
  select * into c from public.cp_reward_campaigns where id=p_campaign_id and enabled;
  if not found then raise exception 'campaign unavailable'; end if;
  if exists(select 1 from public.cp_reward_spin_attempts where campaign_id=p_campaign_id and user_id=uid and created_at>now()-interval '24 hours') then
    raise exception 'You can spin once every 24 hours';
  end if;
  insert into public.cp_reward_wheel_state(campaign_id,window_no,spins_in_window,total_spins)
  values(p_campaign_id,1,0,0) on conflict(campaign_id) do nothing;
  select * into st from public.cp_reward_wheel_state where campaign_id=p_campaign_id for update;
  if st.spins_in_window>=c.window_size then
    update public.cp_reward_wheel_state set window_no=st.window_no+1,spins_in_window=0,updated_at=now()
    where campaign_id=p_campaign_id returning * into st;
    perform public.cp_generate_reward_slots(p_campaign_id,st.window_no);
  end if;
  nextn:=st.spins_in_window+1;
  select * into slot from public.cp_reward_wheel_slots
  where campaign_id=p_campaign_id and window_no=st.window_no and spin_number=nextn;
  if slot.prize_id is null then
    select * into p from public.cp_reward_prizes
    where campaign_id=p_campaign_id and prize_type='try_again' and enabled order by sort_order limit 1;
    if p.id is null then
      select * into p from public.cp_reward_prizes
      where campaign_id=p_campaign_id and enabled order by allocation_count asc,sort_order limit 1;
    end if;
  else
    select * into p from public.cp_reward_prizes where id=slot.prize_id;
  end if;
  if p.id is null then raise exception 'No reward configured for this wheel'; end if;
  insert into public.cp_reward_spin_attempts(campaign_id,user_id,window_no,spin_number,prize_id)
  values(p_campaign_id,uid,st.window_no,nextn,p.id) returning id into attempt;
  update public.cp_reward_wheel_state set spins_in_window=nextn,total_spins=total_spins+1,updated_at=now()
  where campaign_id=p_campaign_id;
  if p.prize_type<>'try_again' and p.fulfilment_type in ('claim_form','lead_form','manual') then
    insert into public.cp_reward_qualifications(campaign_id,prize_id,user_id,spin_attempt_id)
    values(p_campaign_id,p.id,uid,attempt)
    on conflict(campaign_id,prize_id,user_id) do nothing returning id into qual;
  end if;
  if p.prize_type='bc' then
    insert into public.bc_accounts(user_id,balance) values(uid,p.value)
    on conflict(user_id) do update set balance=public.bc_accounts.balance+excluded.balance,updated_at=now();
    insert into public.bc_ledger(user_id,amount,reason,reference_type,reference_id)
    values(uid,p.value,'Reward wheel: '||p.name,'reward_wheel',attempt);
  elsif p.prize_type='vip' then
    update public.profiles set is_vip=true,
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

do $$
declare r record;
begin
  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
      and has_function_privilege('anon',p.oid,'EXECUTE')
      and p.proname<>'get_universal_ad_runtime_config'
  loop
    execute format('revoke execute on function %s from anon',r.oid::regprocedure);
  end loop;
end $$;