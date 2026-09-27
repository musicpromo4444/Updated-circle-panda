-- Extend rewarded retry ads to failed Panda Puzzle attempts.
CREATE OR REPLACE FUNCTION public.play_seven_day_activity(p_slug text, p_action text DEFAULT 'play'::text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 uid uuid:=auth.uid(); day_no smallint:=extract(isodow from current_date)::smallint; scheduled_slug text;
 c public.seven_day_activity_configs%rowtype; a public.seven_day_activity_attempts%rowtype;
 outcome jsonb; reward bigint:=0; reward_label text:=''; attempts_left integer;
 stone_count integer:=0; coin_score integer:=0; x jsonb; current_score integer:=0; current_stones integer:=0;
 started_at timestamptz; current_balance bigint:=0; selected_sponsor text; correct_sponsor text; choices jsonb;
 target_x numeric; target_y numeric; shot_x numeric; shot_y numeric; distance numeric; puzzle jsonb; answer text;
 ad_session_id uuid; ad_session public.rewarded_ad_sessions%rowtype;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select activity_slug into scheduled_slug from public.seven_day_activity_schedule where day_number=day_no and enabled=true;
 if scheduled_slug is null or scheduled_slug<>p_slug then raise exception 'This activity is not scheduled for today'; end if;
 select * into c from public.seven_day_activity_configs where slug=p_slug and is_enabled=true;
 if not found then raise exception 'Activity unavailable'; end if;
 insert into public.seven_day_activity_attempts(user_id,activity_slug,activity_date) values(uid,p_slug,current_date)
 on conflict(user_id,activity_slug,activity_date) do nothing;
 select * into a from public.seven_day_activity_attempts where user_id=uid and activity_slug=p_slug and activity_date=current_date for update;
 attempts_left:=greatest(0,c.free_attempts+a.extra_attempts-a.attempts_used);

 if p_slug='playable_ad' then
   if p_action<>'playable_complete' then raise exception 'Complete the playable experience first'; end if;
   if attempts_left<=0 then raise exception 'Playable already completed today'; end if;
   ad_session_id:=nullif(p_payload->>'session_id','')::uuid;
   if ad_session_id is null then raise exception 'Rewarded playable session required'; end if;
   select * into ad_session from public.rewarded_ad_sessions where id=ad_session_id and user_id=uid for update;
   if not found or ad_session.completed_at is null then raise exception 'Complete the rewarded playable first'; end if;
   if ad_session.surface<>'seven_day_playable_only' then raise exception 'Invalid rewarded playable session'; end if;
   update public.seven_day_activity_attempts set attempts_used=attempts_used+1,last_result=jsonb_build_object('result','completed','reward_bc',0),updated_at=now() where id=a.id;
   return jsonb_build_object('result','completed','reward_bc',0,'reward_label','Playable completed','detail','Activity 9 is an ad-only experience. No BC is awarded.','attempts_left',attempts_left-1);
 end if;

 if p_action='ad_retry' then
   if p_slug not in ('mystery_box','pick_prize','puzzle') then raise exception 'Ad retry is not available for this activity'; end if;
   if (p_slug='puzzle' and coalesce(a.last_result->>'result','')<>'failed') or (p_slug in ('mystery_box','pick_prize') and coalesce(a.last_result->>'result','')<>'revealed') then raise exception 'The activity is not ready for a retry'; end if;
   ad_session_id:=nullif(p_payload->>'session_id','')::uuid;
   if ad_session_id is null then raise exception 'Rewarded playable session required'; end if;
   select * into ad_session from public.rewarded_ad_sessions where id=ad_session_id and user_id=uid for update;
   if not found or ad_session.completed_at is null then raise exception 'Complete the rewarded playable first'; end if;
   if ad_session.surface<>('seven_day_retry_'||p_slug) then raise exception 'Invalid rewarded retry session'; end if;
   if coalesce(a.last_result->>'retry_ad_session_id','')=ad_session_id::text then raise exception 'This rewarded playable was already used'; end if;
   update public.seven_day_activity_attempts
      set extra_attempts=extra_attempts+1,
          last_result=jsonb_build_object('result','retry_unlocked','retry_ad_session_id',ad_session_id::text),
          updated_at=now()
    where id=a.id;
   return jsonb_build_object('result','retry_unlocked','reward_bc',0,'attempts_left',attempts_left+1);
 end if;

 if p_slug='guess_sponsor' and p_action='options' then
   if attempts_left<=0 then raise exception 'No attempts remaining'; end if;
   select jsonb_agg(jsonb_build_object('key',k,'sponsor',sponsor) order by k), max(case when k=1 then sponsor end)
   into choices,correct_sponsor
   from (select row_number() over(order by random())::integer k,sponsor
         from (select distinct trim(sponsor) sponsor from public.ad_creatives
               where status='active' and placement in ('seven_day_banner','seven_day_playable')
               and length(trim(sponsor))>0 order by trim(sponsor) limit 4) q) picked;
   if choices is null or jsonb_array_length(choices)<2 then raise exception 'Sponsor guessing is temporarily unavailable'; end if;
   update public.seven_day_activity_attempts set last_result=jsonb_build_object('result','guess_ready','choices',choices,'correct_sponsor',correct_sponsor,'created_at',now()),updated_at=now() where id=a.id;
   return jsonb_build_object('result','guess_ready','choices',choices,'attempts_left',attempts_left);
 end if;

 if p_slug='target' and p_action='start' then
   if attempts_left<=0 then raise exception 'No attempts remaining'; end if;
   target_x:=round((15+random()*70)::numeric,2); target_y:=round((15+random()*70)::numeric,2);
   update public.seven_day_activity_attempts set attempts_used=attempts_used+1,last_result=jsonb_build_object('result','target_ready','target_x',target_x,'target_y',target_y,'started_at',now()),updated_at=now() where id=a.id;
   return jsonb_build_object('result','target_ready','target_x',target_x,'target_y',target_y,'attempts_left',attempts_left-1);
 end if;

 if p_action='finish' and p_slug not in ('coin_drop','slots') then raise exception 'Finish is only valid for timed activities'; end if;

 if p_action='start' then
   if attempts_left<=0 then raise exception 'No attempts remaining'; end if;
   update public.seven_day_activity_attempts set attempts_used=attempts_used+1,updated_at=now(),last_result=jsonb_build_object('result','running','started_at',now(),'score',0,'stones',0) where id=a.id;
   return jsonb_build_object('result','running','attempts_left',attempts_left-1,'timer_seconds',c.timer_seconds);
 end if;

 if p_slug='coin_drop' and p_action='drop' then
   if coalesce(a.last_result->>'result','')<>'running' then raise exception 'Start Coin Drop first'; end if;
   started_at:=(a.last_result->>'started_at')::timestamptz;
   if now()>started_at+make_interval(secs=>greatest(1,c.timer_seconds)) then raise exception 'Coin Drop time has expired'; end if;
   coin_score:=case when random()<0.08 then 2 else 1 end; stone_count:=case when random()<0.10 then 1 else 0 end;
   current_score:=coalesce((a.last_result->>'score')::integer,0)+coin_score; current_stones:=coalesce((a.last_result->>'stones')::integer,0)+stone_count;
   update public.seven_day_activity_attempts set last_result=jsonb_build_object('result','running','started_at',a.last_result->>'started_at','score',current_score,'stones',current_stones),updated_at=now() where id=a.id;
   return jsonb_build_object('result','running','score',current_score,'stones',current_stones,'attempts_left',attempts_left);
 end if;

 if p_action not in ('finish','drop','target','options','start') then
   if attempts_left<=0 then raise exception 'No attempts remaining'; end if;
   update public.seven_day_activity_attempts set attempts_used=attempts_used+1,updated_at=now() where id=a.id;
   attempts_left:=attempts_left-1;
 end if;

 if p_slug='target' and p_action='target' then
   if coalesce(a.last_result->>'result','')<>'target_ready' then raise exception 'Start the target first'; end if;
   target_x:=(a.last_result->>'target_x')::numeric; target_y:=(a.last_result->>'target_y')::numeric;
   shot_x:=greatest(0,least(100,coalesce((p_payload->>'x')::numeric,0))); shot_y:=greatest(0,least(100,coalesce((p_payload->>'y')::numeric,0)));
   distance:=sqrt(power(shot_x-target_x,2)+power(shot_y-target_y,2));
   select x->>'label',coalesce((x->>'amount')::bigint,0) into reward_label,reward from jsonb_array_elements(c.reward_pool) x order by random() limit 1;
   outcome:=jsonb_build_object('result','revealed','reward_bc',reward,'reward_label',coalesce(reward_label,'Target result'),'score',greatest(0,round(100-distance*1.7)::integer),'detail','Target position and score were resolved from the server.');
 elsif p_slug='coin_drop' and p_action='finish' then
   if coalesce(a.last_result->>'result','')<>'running' then raise exception 'Start Coin Drop first'; end if;
   started_at:=(a.last_result->>'started_at')::timestamptz;
   if now()<started_at+make_interval(secs=>greatest(1,c.timer_seconds)) then raise exception 'Coin Drop is still running'; end if;
   coin_score:=greatest(0,coalesce((a.last_result->>'score')::integer,0)); stone_count:=greatest(0,coalesce((a.last_result->>'stones')::integer,0));
   select coalesce(balance,0) into current_balance from public.bc_accounts where user_id=uid for update;
   reward:=greatest(-current_balance,coin_score-(stone_count*3));
   outcome:=jsonb_build_object('result','revealed','score',coin_score,'stones',stone_count,'reward_bc',reward,'reward_label',case when reward<0 then 'Coin Drop penalty' else 'Coin Drop reward' end,'detail','Normal drops are 1 BC, rare drops can be 2 BC, and each stone hit costs 3 BC.','ad_required',true);
 elsif p_slug='slots' and p_action='finish' then
   if coalesce(a.last_result->>'result','')<>'running' then raise exception 'Start Slots first'; end if;
   started_at:=(a.last_result->>'started_at')::timestamptz;
   if now()<started_at+make_interval(secs=>greatest(1,c.timer_seconds)) then raise exception 'Slots is still running'; end if;
   select x->>'label',coalesce((x->>'amount')::bigint,0) into reward_label,reward from jsonb_array_elements(c.reward_pool) x order by random() limit 1;
   outcome:=jsonb_build_object('result','revealed','reward_bc',reward,'reward_label',coalesce(reward_label,'Result revealed'),'detail','The 60-second play and calculating phase are complete.','ad_required',true);
 elsif p_slug='puzzle' and p_action='solve' then
   if jsonb_array_length(c.puzzle_bank)=0 then raise exception 'Puzzle inventory unavailable'; end if;
   puzzle:=c.puzzle_bank[((extract(doy from current_date)::integer-1)%jsonb_array_length(c.puzzle_bank))];
   answer:=lower(trim(coalesce(p_payload->>'answer','')));
   if answer=lower(trim(puzzle->>'answer')) then
     select x->>'label',coalesce((x->>'amount')::bigint,0) into reward_label,reward from jsonb_array_elements(c.reward_pool) x order by random() limit 1;
     outcome:=jsonb_build_object('result','solved','reward_bc',reward,'reward_label',coalesce(reward_label,'Puzzle solved'),'detail','Correct answer.');
   else outcome:=jsonb_build_object('result','failed','reward_bc',0,'reward_label','Try Again','detail','That answer was not correct.','ad_required',true); end if;
 elsif p_slug='guess_sponsor' and p_action='guess' then
   if coalesce(a.last_result->>'result','')<>'guess_ready' then raise exception 'Load the sponsor choices first'; end if;
   selected_sponsor:=trim(coalesce(p_payload->>'sponsor','')); if selected_sponsor='' then raise exception 'Choose a sponsor option'; end if;
   correct_sponsor:=a.last_result->>'correct_sponsor';
   if not exists(select 1 from jsonb_array_elements(a.last_result->'choices') v where trim(v->>'sponsor')=selected_sponsor) then raise exception 'Invalid sponsor option'; end if;
   outcome:=jsonb_build_object('result','revealed','reward_bc',0,'reward_label',case when selected_sponsor=correct_sponsor then 'Correct sponsor' else 'Sponsor revealed' end,'sponsor',correct_sponsor,'correct',selected_sponsor=correct_sponsor,'detail',case when selected_sponsor=correct_sponsor then 'Correct. The sponsor was revealed from active Circle Panda ad inventory.' else 'The sponsor has been revealed from active Circle Panda ad inventory.' end,'ad_required',true);
 elsif p_slug in ('mystery_box','wheel_spin','pick_prize') and p_action in ('play','pick') then
   if p_slug='pick_prize' and p_action<>'pick' then raise exception 'Choose a prize first'; end if;
   if jsonb_array_length(c.reward_pool)>0 then select x->>'label',coalesce((x->>'amount')::bigint,0) into reward_label,reward from jsonb_array_elements(c.reward_pool) x order by random() limit 1; end if;
   outcome:=jsonb_build_object('result','revealed','reward_bc',reward,'reward_label',coalesce(reward_label,'Result revealed'),'detail','The Circle Panda reward engine selected the result before the reveal animation.','ad_required',p_slug in ('mystery_box','pick_prize'));
 else raise exception 'Invalid activity action'; end if;

 if reward<>0 then
   insert into public.bc_accounts(user_id,balance,updated_at) values(uid,reward,now()) on conflict(user_id) do update set balance=bc_accounts.balance+reward,updated_at=now();
   insert into public.bc_ledger(user_id,amount,reason,reference_type) values(uid,reward,'7-Day Activity: '||c.title,'seven_day_activity');
 end if;
 update public.seven_day_activity_attempts set last_result=outcome,updated_at=now() where id=a.id;
 return outcome || jsonb_build_object('attempts_left',attempts_left);
end; $function$

