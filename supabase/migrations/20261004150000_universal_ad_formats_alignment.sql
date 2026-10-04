-- Align the legacy creative inventory with the universal ad architecture.
alter table public.ad_creatives drop constraint if exists ad_creatives_format_check;
alter table public.ad_creatives add constraint ad_creatives_format_check check (format = any (array['banner','native','interstitial','rewarded','playable','sponsor','offerwall','link','video']::text[]));
alter table public.ad_creatives drop constraint if exists ad_creatives_placement_check;
alter table public.ad_creatives add constraint ad_creatives_placement_check check (placement = any (array[
'activities','audio_time_bottom','audio_time_top','confessions','confessions_inline','daily_reward','dating','dating_inline','events','events_inline','groups','groups_inline','home','home_bottom','home_inline','hot_seat','leaders','leaders_inline','live','live_inline','login_bottom','login_top','main_feed','messages','messages_inline','music_time','music_time_bottom','music_time_inline','music_time_top','normal_groups','notifications','notifications_inline','profile','profile_inline','secret_confessions','secret_profile_slot_1','secret_profile_slot_2','secret_profile_slot_3','secret_profile_slot_4','settings','store','sweepstakes','sweepstakes_inline','video_postroll','video_preroll','vip','vip_groups','wcw_mcm','wcw_mcm_banner','wcw_mcm_interstitial','wcw_mcm_native','wcw_mcm_playable','wcw_mcm_popup','group_message_rewarded','vip_group_sponsor'
]::text[]));

alter table public.universal_ad_provider_configs drop constraint if exists universal_ad_provider_configs_format_check;
alter table public.universal_ad_provider_configs add constraint universal_ad_provider_configs_format_check check (format = any (array['banner','native','interstitial','rewarded','playable','sponsor','offerwall','link','video']::text[]));

create or replace function public.admin_upsert_ad_creative(p_id uuid,p_sponsor text,p_headline text,p_description text,p_tagline text,p_image_url text,p_destination_url text,p_video_url text,p_poster_url text,p_placement text,p_format text,p_category text,p_call_to_action text,p_duration_seconds integer,p_skip_after_seconds integer,p_status text)
returns uuid language plpgsql security definer set search_path='public','pg_temp'
as $$
declare rid uuid;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if p_placement not in ('activities','audio_time_bottom','audio_time_top','confessions','confessions_inline','daily_reward','dating','dating_inline','events','events_inline','groups','groups_inline','home','home_bottom','home_inline','hot_seat','leaders','leaders_inline','live','live_inline','login_bottom','login_top','main_feed','messages','messages_inline','music_time','music_time_bottom','music_time_inline','music_time_top','normal_groups','notifications','notifications_inline','profile','profile_inline','secret_confessions','secret_profile_slot_1','secret_profile_slot_2','secret_profile_slot_3','secret_profile_slot_4','settings','store','sweepstakes','sweepstakes_inline','video_postroll','video_preroll','vip','vip_groups','wcw_mcm','wcw_mcm_banner','wcw_mcm_interstitial','wcw_mcm_native','wcw_mcm_playable','wcw_mcm_popup','group_message_rewarded','vip_group_sponsor') then raise exception 'Invalid placement'; end if;
 if p_format not in ('banner','native','interstitial','rewarded','playable','sponsor','offerwall','link','video') then raise exception 'Invalid format'; end if;
 if p_status not in ('active','paused') then raise exception 'Invalid status'; end if;
 if p_format='video' and coalesce(nullif(trim(p_video_url),''),'')='' then raise exception 'Video URL required for video creative'; end if;
 insert into public.ad_creatives(id,sponsor,headline,description,tagline,image_url,destination_url,video_url,poster_url,placement,format,category,call_to_action,duration_seconds,skip_after_seconds,status,updated_at)
 values(coalesce(p_id,gen_random_uuid()),trim(p_sponsor),trim(p_headline),trim(coalesce(p_description,'')),trim(coalesce(p_tagline,'')),nullif(trim(coalesce(p_image_url,'')),''),nullif(trim(coalesce(p_destination_url,'')),''),nullif(trim(coalesce(p_video_url,'')),''),nullif(trim(coalesce(p_poster_url,'')),''),p_placement,p_format,coalesce(nullif(trim(p_category),''),'Sponsored Partner'),coalesce(nullif(trim(p_call_to_action),''),'Learn More'),greatest(1,coalesce(p_duration_seconds,8)),greatest(0,coalesce(p_skip_after_seconds,5)),p_status,now())
 on conflict(id) do update set sponsor=excluded.sponsor,headline=excluded.headline,description=excluded.description,tagline=excluded.tagline,image_url=excluded.image_url,destination_url=excluded.destination_url,video_url=excluded.video_url,poster_url=excluded.poster_url,placement=excluded.placement,format=excluded.format,category=excluded.category,call_to_action=excluded.call_to_action,duration_seconds=excluded.duration_seconds,skip_after_seconds=excluded.skip_after_seconds,status=excluded.status,updated_at=now()
 returning id into rid; return rid;
end $$;
revoke execute on function public.admin_upsert_ad_creative(uuid,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text) from public,anon;
grant execute on function public.admin_upsert_ad_creative(uuid,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text) to authenticated;
