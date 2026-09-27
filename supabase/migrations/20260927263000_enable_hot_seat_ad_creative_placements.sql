-- Allow the Admin ad inventory to create the three approved Hot Seat placements.
create or replace function public.admin_upsert_ad_creative(
p_id uuid,p_sponsor text,p_headline text,p_description text,p_tagline text,p_image_url text,p_destination_url text,p_video_url text,p_poster_url text,p_placement text,p_format text,p_category text,p_call_to_action text,p_duration_seconds integer,p_skip_after_seconds integer,p_status text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare rid uuid;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if p_placement not in ('popup_1_daily_login','popup_1_daily_login_bottom','popup_2_engagement','main_feed_card','speed_dating_interstitial','crush_interstitial','seven_day_banner','seven_day_playable','hot_seat_comments','hot_seat_questions','hot_seat_water_break') then raise exception 'Invalid placement'; end if;
 if p_format not in ('banner','video') then raise exception 'Invalid format'; end if;
 if p_status not in ('active','paused') then raise exception 'Invalid status'; end if;
 if p_format='video' and coalesce(nullif(trim(p_video_url),''),'')='' then raise exception 'Video URL required for video creative'; end if;
 insert into public.ad_creatives(id,sponsor,headline,description,tagline,image_url,destination_url,video_url,poster_url,placement,format,category,call_to_action,duration_seconds,skip_after_seconds,status,updated_at)
 values(coalesce(p_id,gen_random_uuid()),trim(p_sponsor),trim(p_headline),trim(p_description),trim(p_tagline),nullif(trim(coalesce(p_image_url,'')),''),nullif(trim(coalesce(p_destination_url,'')),''),nullif(trim(coalesce(p_video_url,'')),''),nullif(trim(coalesce(p_poster_url,'')),''),p_placement,p_format,coalesce(nullif(trim(p_category),''),'Sponsored Partner'),coalesce(nullif(trim(p_call_to_action),''),'Learn More'),p_duration_seconds,p_skip_after_seconds,p_status,now())
 on conflict(id) do update set sponsor=excluded.sponsor,headline=excluded.headline,description=excluded.description,tagline=excluded.tagline,image_url=excluded.image_url,destination_url=excluded.destination_url,video_url=excluded.video_url,poster_url=excluded.poster_url,placement=excluded.placement,format=excluded.format,category=excluded.category,call_to_action=excluded.call_to_action,duration_seconds=excluded.duration_seconds,skip_after_seconds=excluded.skip_after_seconds,status=excluded.status,updated_at=now()
 returning id into rid;
 return rid;
end; $$;
