-- Prevent concurrent first messages from opening two sponsor ads for the same user/group.
create or replace function public.start_group_reward_ad_secure(p_group_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); ad record; sid uuid; last_seen timestamptz;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_group_id::text||':'||uid::text,0));
 if not exists(select 1 from public.group_members gm join public.groups g on g.id=gm.group_id where gm.group_id=p_group_id and gm.user_id=uid and gm.left_at is null and g.activated_at is not null and coalesce(g.expires_at,now()+interval '1 second')>now()) then raise exception 'You are not an active member of this group'; end if;
 select last_shown_at into last_seen from public.cp_group_reward_ad_views where group_id=p_group_id and user_id=uid for update;
 if last_seen is not null and last_seen > now()-interval '24 hours' then return jsonb_build_object('show',false,'reason','cooldown','next_at',last_seen+interval '24 hours'); end if;
 select * into ad from public.ad_creatives where placement='group_message_rewarded' and status='active' order by updated_at desc limit 1;
 if ad.id is null then return jsonb_build_object('show',false,'reason','no_active_sponsor'); end if;
 insert into public.cp_group_reward_ad_views(group_id,user_id,last_shown_at) values(p_group_id,uid,now())
 on conflict(group_id,user_id) do update set last_shown_at=now();
 insert into public.cp_group_reward_ad_sessions(group_id,user_id,ad_id,reward_bc) values(p_group_id,uid,ad.id,3) returning id into sid;
 return jsonb_build_object('show',true,'session_id',sid,'sponsor',ad.sponsor,'headline',ad.headline,'description',ad.description,'tagline',ad.tagline,'image_url',ad.image_url,'video_url',ad.video_url,'poster_url',ad.poster_url,'destination_url',ad.destination_url,'call_to_action',ad.call_to_action,'duration_seconds',greatest(1,coalesce(ad.duration_seconds,5)),'skip_after_seconds',ad.skip_after_seconds,'format',ad.format,'reward_bc',3);
end $$;