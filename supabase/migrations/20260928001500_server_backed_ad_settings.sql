-- Keep Circle Panda ad placement controls server-backed for every device.
create or replace function public.admin_set_ad_placement_config(
  p_daily_login_popup_banner boolean,
  p_engagement_popup_banner boolean,
  p_main_feed_banner boolean,
  p_feed_banner_interval integer,
  p_crush_video_frequency integer,
  p_seven_day_banner_enabled boolean,
  p_seven_day_playable_enabled boolean,
  p_android_native_bridge_enabled boolean
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if not private.is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  insert into public.ad_placement_config (
    id,daily_login_popup_banner,engagement_popup_banner,main_feed_banner,
    feed_banner_interval,crush_video_frequency,seven_day_banner_enabled,
    seven_day_playable_enabled,android_native_bridge_enabled,updated_at
  ) values (
    true,p_daily_login_popup_banner,p_engagement_popup_banner,p_main_feed_banner,
    greatest(1,p_feed_banner_interval),greatest(1,p_crush_video_frequency),
    p_seven_day_banner_enabled,p_seven_day_playable_enabled,
    p_android_native_bridge_enabled,now()
  )
  on conflict (id) do update set
    daily_login_popup_banner=excluded.daily_login_popup_banner,
    engagement_popup_banner=excluded.engagement_popup_banner,
    main_feed_banner=excluded.main_feed_banner,
    feed_banner_interval=excluded.feed_banner_interval,
    crush_video_frequency=excluded.crush_video_frequency,
    seven_day_banner_enabled=excluded.seven_day_banner_enabled,
    seven_day_playable_enabled=excluded.seven_day_playable_enabled,
    android_native_bridge_enabled=excluded.android_native_bridge_enabled,
    updated_at=now();
  return (select to_jsonb(c) from public.ad_placement_config c where id=true);
end $function$;

insert into public.ad_placement_config (
  id,daily_login_popup_banner,engagement_popup_banner,main_feed_banner,
  feed_banner_interval,crush_video_frequency,seven_day_banner_enabled,
  seven_day_playable_enabled,android_native_bridge_enabled,
  hot_seat_comments_ads_enabled,hot_seat_questions_ads_enabled,
  hot_seat_water_break_ads_enabled
) values (true,true,true,true,4,5,true,true,true,true,true,false)
on conflict (id) do nothing;

revoke all on function public.admin_set_ad_placement_config(boolean,boolean,boolean,integer,integer,boolean,boolean,boolean) from public;
grant execute on function public.admin_set_ad_placement_config(boolean,boolean,boolean,integer,integer,boolean,boolean,boolean) to authenticated;