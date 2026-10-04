-- VIP group floating sponsor gift + secure BC claim flow
alter table public.ad_creatives add column if not exists reward_bc bigint;
alter table public.ad_creatives drop constraint if exists ad_creatives_reward_bc_check;
alter table public.ad_creatives add constraint ad_creatives_reward_bc_check check (reward_bc is null or reward_bc in (5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100));

create table if not exists public.cp_vip_group_sponsor_config (
  id integer primary key default 1 check (id=1),
  enabled boolean not null default false,
  display_text text not null default '50,000 BC 🪙 GIVEAWAY FROM OUR VIP SPONSOR — CLICK TO CLAIM',
  ad_id uuid references public.ad_creatives(id) on delete set null,
  reward_bc bigint not null default 5 check (reward_bc in (5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100)),
  cooldown_hours integer not null default 24 check (cooldown_hours between 1 and 168),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.cp_vip_group_sponsor_config(id) values(1) on conflict(id) do nothing;
alter table public.cp_vip_group_sponsor_config enable row level security;
revoke all on table public.cp_vip_group_sponsor_config from public, anon, authenticated;

create table if not exists public.cp_vip_group_sponsor_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid not null references public.ad_creatives(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  claimed_at timestamptz,
  reward_bc bigint not null check (reward_bc in (5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100))
);
create index if not exists cp_vip_group_sponsor_sessions_user_idx on public.cp_vip_group_sponsor_sessions(user_id,started_at desc);
alter table public.cp_vip_group_sponsor_sessions enable row level security;
revoke all on table public.cp_vip_group_sponsor_sessions from public, anon, authenticated;

create or replace function public.get_vip_group_sponsor_offer(p_group_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); c record; ad record; last_claim timestamptz;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.profiles p where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())) then
   return jsonb_build_object('show',false,'reason','vip_required');
 end if;
 select * into c from public.cp_vip_group_sponsor_config where id=1;
 if c.id is null or not c.enabled or c.ad_id is null then return jsonb_build_object('show',false,'reason','disabled'); end if;
 select * into ad from public.ad_creatives where id=c.ad_id and status='active' and placement='vip_group_sponsor';
 if ad.id is null then return jsonb_build_object('show',false,'reason','no_active_sponsor'); end if;
 select max(claimed_at) into last_claim from public.cp_vip_group_sponsor_sessions where group_id=p_group_id and user_id=uid and claimed_at is not null;
 if last_claim is not null and last_claim > now()-(c.cooldown_hours||' hours')::interval then
   return jsonb_build_object('show',false,'reason','cooldown','next_at',last_claim+(c.cooldown_hours||' hours')::interval);
 end if;
 return jsonb_build_object('show',true,'display_text',c.display_text,'reward_bc',c.reward_bc,'cooldown_hours',c.cooldown_hours,
   'sponsor',ad.sponsor,'headline',ad.headline,'description',ad.description,'tagline',ad.tagline,'image_url',ad.image_url,
   'video_url',ad.video_url,'poster_url',ad.poster_url,'destination_url',ad.destination_url,'call_to_action',ad.call_to_action,
   'duration_seconds',greatest(1,coalesce(ad.duration_seconds,5)),'skip_after_seconds',ad.skip_after_seconds,'format',ad.format);
end $$;

create or replace function public.start_vip_group_sponsor_secure(p_group_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); offer jsonb; sid uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('vip-sponsor:'||p_group_id::text||':'||uid::text,0));
 offer:=public.get_vip_group_sponsor_offer(p_group_id);
 if coalesce((offer->>'show')::boolean,false)=false then return offer; end if;
 insert into public.cp_vip_group_sponsor_sessions(group_id,user_id,ad_id,reward_bc)
 select p_group_id,uid,(select ad_id from public.cp_vip_group_sponsor_config where id=1),(offer->>'reward_bc')::bigint returning id into sid;
 return offer || jsonb_build_object('session_id',sid);
end $$;

create or replace function public.complete_vip_group_sponsor_secure(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); s record; ad record;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into s from public.cp_vip_group_sponsor_sessions where id=p_session_id and user_id=uid for update;
 if s.id is null then raise exception 'Sponsor session not found'; end if;
 if s.claimed_at is not null then return jsonb_build_object('completed',true,'claimable',false,'already_claimed',true,'reward_bc',s.reward_bc); end if;
 select * into ad from public.ad_creatives where id=s.ad_id;
 if extract(epoch from(now()-s.started_at)) < greatest(1,coalesce(ad.duration_seconds,5)) then raise exception 'Please watch the sponsor message to the end'; end if;
 update public.cp_vip_group_sponsor_sessions set completed_at=coalesce(completed_at,now()) where id=s.id;
 return jsonb_build_object('completed',true,'claimable',true,'reward_bc',s.reward_bc);
end $$;

create or replace function public.claim_vip_group_sponsor_reward_secure(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); s record; bal bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into s from public.cp_vip_group_sponsor_sessions where id=p_session_id and user_id=uid for update;
 if s.id is null then raise exception 'Sponsor session not found'; end if;
 if s.completed_at is null then raise exception 'Sponsor has not been completed'; end if;
 if s.claimed_at is not null then
   select balance into bal from public.bc_accounts where user_id=uid;
   return jsonb_build_object('claimed',false,'already_claimed',true,'reward_bc',s.reward_bc,'balance',coalesce(bal,0));
 end if;
 update public.cp_vip_group_sponsor_sessions set claimed_at=now() where id=s.id;
 perform public.apply_bc_delta(uid,s.reward_bc,'VIP group sponsor reward','vip_group_sponsor',s.id);
 select balance into bal from public.bc_accounts where user_id=uid;
 return jsonb_build_object('claimed',true,'reward_bc',s.reward_bc,'balance',coalesce(bal,0));
end $$;

revoke execute on function public.get_vip_group_sponsor_offer(uuid) from public,anon;
revoke execute on function public.start_vip_group_sponsor_secure(uuid) from public,anon;
revoke execute on function public.complete_vip_group_sponsor_secure(uuid) from public,anon;
revoke execute on function public.claim_vip_group_sponsor_reward_secure(uuid) from public,anon;
grant execute on function public.get_vip_group_sponsor_offer(uuid) to authenticated;
grant execute on function public.start_vip_group_sponsor_secure(uuid) to authenticated;
grant execute on function public.complete_vip_group_sponsor_secure(uuid) to authenticated;
grant execute on function public.claim_vip_group_sponsor_reward_secure(uuid) to authenticated;

create or replace function public.admin_get_vip_group_sponsor_config()
returns jsonb language plpgsql security definer set search_path='' as $$
declare c record; ad record;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 select * into c from public.cp_vip_group_sponsor_config where id=1;
 if c.ad_id is not null then select * into ad from public.ad_creatives where id=c.ad_id; end if;
 return jsonb_build_object('enabled',c.enabled,'display_text',c.display_text,'ad_id',c.ad_id,'reward_bc',c.reward_bc,'cooldown_hours',c.cooldown_hours,
   'ad',case when ad.id is null then null else jsonb_build_object('id',ad.id,'sponsor',ad.sponsor,'headline',ad.headline,'status',ad.status,'placement',ad.placement) end);
end $$;

create or replace function public.admin_save_vip_group_sponsor_config(p_enabled boolean,p_display_text text,p_ad_id uuid,p_reward_bc bigint,p_cooldown_hours integer)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if p_reward_bc not in (5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100) then raise exception 'Invalid reward amount'; end if;
 if p_cooldown_hours<1 or p_cooldown_hours>168 then raise exception 'Invalid cooldown'; end if;
 if p_ad_id is not null and not exists(select 1 from public.ad_creatives where id=p_ad_id and placement='vip_group_sponsor') then raise exception 'Select a VIP sponsor creative'; end if;
 update public.cp_vip_group_sponsor_config set enabled=p_enabled,display_text=left(trim(p_display_text),140),ad_id=p_ad_id,reward_bc=p_reward_bc,cooldown_hours=p_cooldown_hours,updated_at=now(),updated_by=auth.uid() where id=1;
 return public.admin_get_vip_group_sponsor_config();
end $$;

revoke execute on function public.admin_get_vip_group_sponsor_config() from public,anon;
revoke execute on function public.admin_save_vip_group_sponsor_config(boolean,text,uuid,bigint,integer) from public,anon;
grant execute on function public.admin_get_vip_group_sponsor_config() to authenticated;
grant execute on function public.admin_save_vip_group_sponsor_config(boolean,text,uuid,bigint,integer) to authenticated;

create or replace function public.admin_upsert_ad_creative(p_id uuid,p_sponsor text,p_headline text,p_description text,p_tagline text,p_image_url text,p_destination_url text,p_video_url text,p_poster_url text,p_placement text,p_format text,p_category text,p_call_to_action text,p_duration_seconds integer,p_skip_after_seconds integer,p_status text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $function$
declare rid uuid;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if p_placement not in ('popup_1_daily_login','popup_1_daily_login_bottom','popup_2_engagement','main_feed_card','speed_dating_interstitial','crush_interstitial','seven_day_banner','seven_day_playable','hot_seat_comments','hot_seat_questions','hot_seat_water_break','group_message_rewarded','vip_group_sponsor') then raise exception 'Invalid placement'; end if;
 if p_format not in ('banner','video') then raise exception 'Invalid format'; end if;
 if p_status not in ('active','paused') then raise exception 'Invalid status'; end if;
 if p_format='video' and coalesce(nullif(trim(p_video_url),''),'')='' then raise exception 'Video URL required for video creative'; end if;
 insert into public.ad_creatives(id,sponsor,headline,description,tagline,image_url,destination_url,video_url,poster_url,placement,format,category,call_to_action,duration_seconds,skip_after_seconds,status,updated_at)
 values(coalesce(p_id,gen_random_uuid()),trim(p_sponsor),trim(p_headline),trim(coalesce(p_description,'')),trim(coalesce(p_tagline,'')),nullif(trim(coalesce(p_image_url,'')),''),nullif(trim(coalesce(p_destination_url,'')),''),nullif(trim(coalesce(p_video_url,'')),''),nullif(trim(coalesce(p_poster_url,'')),''),p_placement,p_format,coalesce(nullif(trim(p_category),''),'Sponsored Partner'),coalesce(nullif(trim(p_call_to_action),''),'Learn More'),greatest(1,coalesce(p_duration_seconds,8)),greatest(0,coalesce(p_skip_after_seconds,5)),p_status,now())
 on conflict(id) do update set sponsor=excluded.sponsor,headline=excluded.headline,description=excluded.description,tagline=excluded.tagline,image_url=excluded.image_url,destination_url=excluded.destination_url,video_url=excluded.video_url,poster_url=excluded.poster_url,placement=excluded.placement,format=excluded.format,category=excluded.category,call_to_action=excluded.call_to_action,duration_seconds=excluded.duration_seconds,skip_after_seconds=excluded.skip_after_seconds,status=excluded.status,updated_at=now()
 returning id into rid; return rid;
end $function$;

create or replace function public.admin_list_vip_group_sponsor_creatives()
returns setof jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 return query
 select jsonb_build_object('id',id,'sponsor',sponsor,'headline',headline,'status',status,'placement',placement)
 from public.ad_creatives
 where placement='vip_group_sponsor'
 order by updated_at desc;
end $$;
revoke execute on function public.admin_list_vip_group_sponsor_creatives() from public,anon;
grant execute on function public.admin_list_vip_group_sponsor_creatives() to authenticated;
