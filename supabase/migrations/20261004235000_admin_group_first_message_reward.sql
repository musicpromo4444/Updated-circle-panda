alter table public.app_settings
  add column if not exists group_first_message_reward_bc bigint not null default 3;

alter table public.app_settings
  add constraint app_settings_group_first_message_reward_bc_chk
  check (group_first_message_reward_bc >= 0 and group_first_message_reward_bc <= 100000)
  not valid;

alter table public.app_settings validate constraint app_settings_group_first_message_reward_bc_chk;

create or replace function public.admin_save_app_control_center(p_app jsonb, p_ads jsonb, p_crush jsonb)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare a public.app_settings%rowtype; ad public.ad_placement_config%rowtype; c public.crush_admin_config%rowtype;
begin
 if not public.cp_admin_is_admin() then raise exception 'Admin access required'; end if;
 update public.app_settings set
  hot_seat_mode=coalesce(p_app->>'hot_seat_mode',hot_seat_mode),
  daily_drops=coalesce((p_app->>'daily_drops')::integer,daily_drops),
  waiting_media_mode=coalesce(p_app->>'waiting_media_mode',waiting_media_mode),
  waiting_media_url=coalesce(p_app->>'waiting_media_url',waiting_media_url),
  waiting_cta_label=coalesce(p_app->>'waiting_cta_label',waiting_cta_label),
  waiting_cta_url=coalesce(p_app->>'waiting_cta_url',waiting_cta_url),
  waiting_sponsor_name=coalesce(p_app->>'waiting_sponsor_name',waiting_sponsor_name),
  feed_ads_enabled=coalesce((p_app->>'feed_ads_enabled')::boolean,feed_ads_enabled),
  dating_enabled=coalesce((p_app->>'dating_enabled')::boolean,dating_enabled),
  spin_wheel_enabled=coalesce((p_app->>'spin_wheel_enabled')::boolean,spin_wheel_enabled),
  rewarded_ads_enabled=coalesce((p_app->>'rewarded_ads_enabled')::boolean,rewarded_ads_enabled),
  live_stream_enabled=coalesce((p_app->>'live_stream_enabled')::boolean,live_stream_enabled),
  apk_url=coalesce(p_app->>'apk_url',apk_url),
  android_app_url=coalesce(p_app->>'android_app_url',android_app_url),
  ios_app_url=coalesce(p_app->>'ios_app_url',ios_app_url),
  show_download_button=coalesce((p_app->>'show_download_button')::boolean,show_download_button),
  download_popup_enabled=coalesce((p_app->>'download_popup_enabled')::boolean,download_popup_enabled),
  download_popup_title=coalesce(p_app->>'download_popup_title',download_popup_title),
  download_popup_message=coalesce(p_app->>'download_popup_message',download_popup_message),
  download_popup_reward=coalesce(p_app->>'download_popup_reward',download_popup_reward),
  download_popup_cta=coalesce(p_app->>'download_popup_cta',download_popup_cta),
  download_popup_cooldown_hours=greatest(1,coalesce((p_app->>'download_popup_cooldown_hours')::integer,download_popup_cooldown_hours)),
  download_popup_mobile_only=coalesce((p_app->>'download_popup_mobile_only')::boolean,download_popup_mobile_only),
  download_popup_version=coalesce(p_app->>'download_popup_version',download_popup_version),
  group_first_message_reward_bc=greatest(0,least(100000,coalesce((p_app->>'group_first_message_reward_bc')::bigint,group_first_message_reward_bc))),
  updated_at=now() where id=1;
 update public.ad_placement_config set
  daily_login_popup_banner=coalesce((p_ads->>'daily_login_popup_banner')::boolean,daily_login_popup_banner),
  engagement_popup_banner=coalesce((p_ads->>'engagement_popup_banner')::boolean,engagement_popup_banner),
  main_feed_banner=coalesce((p_ads->>'main_feed_banner')::boolean,main_feed_banner),
  feed_banner_interval=coalesce((p_ads->>'feed_banner_interval')::integer,feed_banner_interval),
  crush_video_frequency=coalesce((p_ads->>'crush_video_frequency')::integer,crush_video_frequency),
  seven_day_banner_enabled=coalesce((p_ads->>'seven_day_banner_enabled')::boolean,seven_day_banner_enabled),
  seven_day_playable_enabled=coalesce((p_ads->>'seven_day_playable_enabled')::boolean,seven_day_playable_enabled),
  android_native_bridge_enabled=coalesce((p_ads->>'android_native_bridge_enabled')::boolean,android_native_bridge_enabled),
  hot_seat_comments_ads_enabled=coalesce((p_ads->>'hot_seat_comments_ads_enabled')::boolean,hot_seat_comments_ads_enabled),
  hot_seat_questions_ads_enabled=coalesce((p_ads->>'hot_seat_questions_ads_enabled')::boolean,hot_seat_questions_ads_enabled),
  hot_seat_water_break_ads_enabled=coalesce((p_ads->>'hot_seat_water_break_ads_enabled')::boolean,hot_seat_water_break_ads_enabled),
  updated_at=now() where id=true;
 update public.crush_admin_config set
  enabled=coalesce((p_crush->>'enabled')::boolean,enabled),
  mcm_release_hour=coalesce((p_crush->>'mcm_release_hour')::smallint,mcm_release_hour),
  wcw_release_hour=coalesce((p_crush->>'wcw_release_hour')::smallint,wcw_release_hour),
  ad_every_swipes=coalesce((p_crush->>'ad_every_swipes')::smallint,ad_every_swipes),
  ad_same_frame=coalesce((p_crush->>'ad_same_frame')::boolean,ad_same_frame),
  updated_at=now() where id=true;
 insert into public.admin_audit_log(admin_user_id,action,metadata) values(auth.uid(),'update_app_control_center',jsonb_build_object('sections',jsonb_build_array('app','ads','crush')));
 return public.admin_get_app_control_center();
end $function$;

create or replace function public.claim_rewarded_ad_secure(p_surface text)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare uid uuid:=auth.uid(); amount bigint; last_claim timestamptz; bal bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 amount := case p_surface
   when 'free_coins' then 30
   when 'group_message' then (select coalesce(group_first_message_reward_bc,3) from public.app_settings where id=1)
   when 'hotseat' then 10
   else 0 end;
 if amount <= 0 then raise exception 'Invalid rewarded ad surface'; end if;
 select created_at into last_claim from public.rewarded_ad_claims where user_id=uid and surface=p_surface order by created_at desc limit 1;
 if last_claim is not null and last_claim > now()-interval '5 minutes' and p_surface='free_coins' then raise exception 'Rewarded ad cooldown active'; end if;
 if last_claim is not null and last_claim > now()-interval '60 seconds' and p_surface<>'free_coins' then raise exception 'Rewarded ad cooldown active'; end if;
 insert into public.bc_accounts(user_id,balance,updated_at) values(uid,amount,now()) on conflict(user_id) do update set balance=bc_accounts.balance+amount,updated_at=now();
 insert into public.bc_ledger(user_id,amount,reason,reference_type) values(uid,amount,'Rewarded ad: '||p_surface,'rewarded_ad');
 insert into public.rewarded_ad_claims(user_id,surface,reward_bc) values(uid,p_surface,amount);
 select balance into bal from public.bc_accounts where user_id=uid;
 return jsonb_build_object('reward',amount,'balance',bal);
end; $function$;