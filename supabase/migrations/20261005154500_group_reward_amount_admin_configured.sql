update public.app_settings set group_first_message_reward_bc=coalesce(group_first_message_reward_bc,3),updated_at=now() where id=1;

create or replace function public.get_group_first_message_reward_bc()
returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare amount bigint;
begin
 select group_first_message_reward_bc into amount from public.app_settings where id=1;
 if amount is null or amount<0 then raise exception 'Group message reward is not configured'; end if;
 return amount;
end $$;

create or replace function public.start_group_reward_ad_secure(p_group_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); ad record; sid uuid; last_seen timestamptz; existing_sid uuid; reward_amount bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 reward_amount:=public.get_group_first_message_reward_bc();
 if private.is_vip_group(p_group_id) then return jsonb_build_object('show',false,'reason','vip_group'); end if;
 perform pg_advisory_xact_lock(hashtextextended(p_group_id::text||':'||uid::text,0));
 if not exists(select 1 from public.group_members gm join public.groups g on g.id=gm.group_id where gm.group_id=p_group_id and gm.user_id=uid and gm.left_at is null and g.activated_at is not null) then raise exception 'You are not an active member of this group'; end if;
 select last_shown_at into last_seen from public.cp_group_reward_ad_views where group_id=p_group_id and user_id=uid;
 if last_seen is not null and last_seen>now()-interval '24 hours' then return jsonb_build_object('show',false,'reason','cooldown','next_at',last_seen+interval '24 hours'); end if;
 select id into existing_sid from public.cp_group_reward_ad_sessions where group_id=p_group_id and user_id=uid and completed_at is null and started_at>now()-interval '15 minutes' order by started_at desc limit 1;
 if existing_sid is not null then
   select ac.* into ad from public.cp_group_reward_ad_sessions s join public.ad_creatives ac on ac.id=s.ad_id where s.id=existing_sid;
   return jsonb_build_object('show',true,'session_id',existing_sid,'sponsor',ad.sponsor,'headline',ad.headline,'image_url',ad.image_url,'video_url',ad.video_url,'poster_url',ad.poster_url,'duration_seconds',greatest(1,coalesce(ad.duration_seconds,5)),'reward_bc',reward_amount);
 end if;
 select * into ad from public.ad_creatives where placement='group_message_rewarded' and status='active' order by updated_at desc limit 1;
 if ad.id is null then return jsonb_build_object('show',false,'reason','no_active_sponsor'); end if;
 insert into public.cp_group_reward_ad_sessions(group_id,user_id,ad_id,reward_bc) values(p_group_id,uid,ad.id,reward_amount) returning id into sid;
 return jsonb_build_object('show',true,'session_id',sid,'sponsor',ad.sponsor,'headline',ad.headline,'image_url',ad.image_url,'video_url',ad.video_url,'poster_url',ad.poster_url,'duration_seconds',greatest(1,coalesce(ad.duration_seconds,5)),'reward_bc',reward_amount);
end $$;

create or replace function public.complete_group_reward_ad_secure(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); s record; ad record; bal bigint; reward_amount bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into s from public.cp_group_reward_ad_sessions where id=p_session_id and user_id=uid for update;
 if s.id is null then raise exception 'Reward session not found'; end if;
 reward_amount:=public.get_group_first_message_reward_bc();
 if s.completed_at is not null then
   select balance into bal from public.bc_accounts where user_id=uid;
   return jsonb_build_object('rewarded',false,'already_completed',true,'reward_bc',s.reward_bc,'balance',coalesce(bal,0));
 end if;
 if s.started_at<now()-interval '15 minutes' then raise exception 'Reward session expired'; end if;
 select * into ad from public.ad_creatives where id=s.ad_id;
 if ad.id is null then raise exception 'Sponsor ad no longer exists'; end if;
 if extract(epoch from (now()-s.started_at))<greatest(1,coalesce(ad.duration_seconds,5)) then raise exception 'Please watch the sponsor message to the end'; end if;
 update public.cp_group_reward_ad_sessions set completed_at=now(),reward_bc=reward_amount where id=s.id;
 insert into public.cp_group_reward_ad_views(group_id,user_id,last_shown_at) values(s.group_id,uid,now()) on conflict(group_id,user_id) do update set last_shown_at=excluded.last_shown_at;
 perform public.apply_bc_delta(uid,reward_amount,'First group message sponsor reward','group_reward_ad',s.id);
 select balance into bal from public.bc_accounts where user_id=uid;
 return jsonb_build_object('rewarded',true,'reward_bc',reward_amount,'balance',coalesce(bal,0));
end $$;

create or replace function public.claim_rewarded_ad_secure(p_surface text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); amount bigint; last_claim timestamptz; bal bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 amount:=case p_surface when 'free_coins' then 30 when 'group_message' then public.get_group_first_message_reward_bc() when 'hotseat' then 10 else 0 end;
 if amount<=0 then raise exception 'Invalid rewarded ad surface'; end if;
 select created_at into last_claim from public.rewarded_ad_claims where user_id=uid and surface=p_surface order by created_at desc limit 1;
 if last_claim is not null and last_claim>now()-interval '5 minutes' and p_surface='free_coins' then raise exception 'Rewarded ad cooldown active'; end if;
 if last_claim is not null and last_claim>now()-interval '60 seconds' and p_surface<>'free_coins' then raise exception 'Rewarded ad cooldown active'; end if;
 insert into public.bc_accounts(user_id,balance,updated_at) values(uid,amount,now()) on conflict(user_id) do update set balance=bc_accounts.balance+amount,updated_at=now();
 insert into public.bc_ledger(user_id,amount,reason,reference_type) values(uid,amount,'Rewarded ad: '||p_surface,'rewarded_ad');
 insert into public.rewarded_ad_claims(user_id,surface,reward_bc) values(uid,p_surface,amount);
 select balance into bal from public.bc_accounts where user_id=uid;
 return jsonb_build_object('reward',amount,'balance',bal);
end $$;
