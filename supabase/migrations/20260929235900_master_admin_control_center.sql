-- Circle Panda master admin control center
create or replace function public.admin_get_dashboard_overview()
returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
 if not public.cp_admin_is_admin() then raise exception 'Admin access required'; end if;
 select jsonb_build_object(
  'users',(select count(*) from auth.users),
  'banned',(select count(*) from public.user_controls where is_banned),
  'vip',(select count(*) from public.profiles where is_vip and (vip_expires_at is null or vip_expires_at>now())),
  'bc_balance',(select coalesce(sum(balance),0) from public.bc_accounts),
  'bc_24h',(select coalesce(sum(amount) filter(where created_at>now()-interval '24 hours'),0) from public.bc_ledger),
  'messages_24h',(select count(*) from public.cp_thread_messages where created_at>now()-interval '24 hours'),
  'groups',(select count(*) from public.groups),
  'events',(select count(*) from public.events),
  'dating_profiles',(select count(*) from public.dating_profiles),
  'active_hot_seat',(select count(*) from public.hot_seat_sessions where status in ('live','scheduled')),
  'active_winner_cycles',(select count(*) from public.cp_activity_winner_cycles where status in ('scheduled','open')),
  'audit_24h',(select count(*) from public.admin_audit_log where created_at>now()-interval '24 hours')
 ) into r;
 return r;
end $$;

create or replace function public.admin_get_app_control_center()
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.app_settings%rowtype; ad public.ad_placement_config%rowtype; c public.crush_admin_config%rowtype;
begin
 if not public.cp_admin_is_admin() then raise exception 'Admin access required'; end if;
 select * into a from public.app_settings where id=1;
 select * into ad from public.ad_placement_config where id=true;
 select * into c from public.crush_admin_config where id=true;
 return jsonb_build_object('app',to_jsonb(a),'ads',to_jsonb(ad),'crush',to_jsonb(c));
end $$;

create or replace function public.admin_save_app_control_center(p_app jsonb,p_ads jsonb,p_crush jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not public.cp_admin_is_admin() then raise exception 'Admin access required'; end if;
 update public.app_settings set
  hot_seat_mode=coalesce(p_app->>'hot_seat_mode',hot_seat_mode), daily_drops=coalesce((p_app->>'daily_drops')::integer,daily_drops),
  waiting_media_mode=coalesce(p_app->>'waiting_media_mode',waiting_media_mode), waiting_media_url=coalesce(p_app->>'waiting_media_url',waiting_media_url),
  waiting_cta_label=coalesce(p_app->>'waiting_cta_label',waiting_cta_label), waiting_cta_url=coalesce(p_app->>'waiting_cta_url',waiting_cta_url),
  waiting_sponsor_name=coalesce(p_app->>'waiting_sponsor_name',waiting_sponsor_name), feed_ads_enabled=coalesce((p_app->>'feed_ads_enabled')::boolean,feed_ads_enabled),
  dating_enabled=coalesce((p_app->>'dating_enabled')::boolean,dating_enabled), spin_wheel_enabled=coalesce((p_app->>'spin_wheel_enabled')::boolean,spin_wheel_enabled),
  rewarded_ads_enabled=coalesce((p_app->>'rewarded_ads_enabled')::boolean,rewarded_ads_enabled), live_stream_enabled=coalesce((p_app->>'live_stream_enabled')::boolean,live_stream_enabled),
  apk_url=coalesce(p_app->>'apk_url',apk_url), show_download_button=coalesce((p_app->>'show_download_button')::boolean,show_download_button), updated_at=now() where id=1;
 update public.ad_placement_config set
  daily_login_popup_banner=coalesce((p_ads->>'daily_login_popup_banner')::boolean,daily_login_popup_banner), engagement_popup_banner=coalesce((p_ads->>'engagement_popup_banner')::boolean,engagement_popup_banner),
  main_feed_banner=coalesce((p_ads->>'main_feed_banner')::boolean,main_feed_banner), feed_banner_interval=coalesce((p_ads->>'feed_banner_interval')::integer,feed_banner_interval),
  crush_video_frequency=coalesce((p_ads->>'crush_video_frequency')::integer,crush_video_frequency), seven_day_banner_enabled=coalesce((p_ads->>'seven_day_banner_enabled')::boolean,seven_day_banner_enabled),
  seven_day_playable_enabled=coalesce((p_ads->>'seven_day_playable_enabled')::boolean,seven_day_playable_enabled), android_native_bridge_enabled=coalesce((p_ads->>'android_native_bridge_enabled')::boolean,android_native_bridge_enabled),
  hot_seat_comments_ads_enabled=coalesce((p_ads->>'hot_seat_comments_ads_enabled')::boolean,hot_seat_comments_ads_enabled), hot_seat_questions_ads_enabled=coalesce((p_ads->>'hot_seat_questions_ads_enabled')::boolean,hot_seat_questions_ads_enabled),
  hot_seat_water_break_ads_enabled=coalesce((p_ads->>'hot_seat_water_break_ads_enabled')::boolean,hot_seat_water_break_ads_enabled), updated_at=now() where id=true;
 update public.crush_admin_config set enabled=coalesce((p_crush->>'enabled')::boolean,enabled), mcm_release_hour=coalesce((p_crush->>'mcm_release_hour')::smallint,mcm_release_hour),
  wcw_release_hour=coalesce((p_crush->>'wcw_release_hour')::smallint,wcw_release_hour), ad_every_swipes=coalesce((p_crush->>'ad_every_swipes')::smallint,ad_every_swipes),
  ad_same_frame=coalesce((p_crush->>'ad_same_frame')::boolean,ad_same_frame), updated_at=now() where id=true;
 insert into public.admin_audit_log(admin_user_id,action,metadata) values(auth.uid(),'update_app_control_center',jsonb_build_object('sections',jsonb_build_array('app','ads','crush')));
 return public.admin_get_app_control_center();
end $$;

create or replace function public.admin_get_recent_audit(p_limit integer default 30)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not public.cp_admin_is_admin() then raise exception 'Admin access required'; end if;
 return coalesce((select jsonb_agg(x order by created_at desc) from (select id,action,target_user_id,metadata,created_at from public.admin_audit_log order by created_at desc limit greatest(1,least(p_limit,100))) x),'[]'::jsonb);
end $$;

revoke all on function public.admin_get_dashboard_overview() from public,anon,authenticated;
grant execute on function public.admin_get_dashboard_overview() to authenticated;
revoke all on function public.admin_get_app_control_center() from public,anon,authenticated;
grant execute on function public.admin_get_app_control_center() to authenticated;
revoke all on function public.admin_save_app_control_center(jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.admin_save_app_control_center(jsonb,jsonb,jsonb) to authenticated;
revoke all on function public.admin_get_recent_audit(integer) from public,anon,authenticated;
grant execute on function public.admin_get_recent_audit(integer) to authenticated;
