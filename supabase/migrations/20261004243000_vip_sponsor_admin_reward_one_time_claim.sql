begin;

alter table public.cp_vip_group_sponsor_config
  drop constraint if exists cp_vip_group_sponsor_config_reward_bc_check;

alter table public.cp_vip_group_sponsor_config
  add constraint cp_vip_group_sponsor_config_reward_bc_check
  check (reward_bc >= 1 and reward_bc <= 10000000);

create or replace function public.admin_save_vip_group_sponsor_config(
  p_enabled boolean,
  p_display_text text,
  p_ad_id uuid,
  p_reward_bc bigint,
  p_cooldown_hours integer
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if p_reward_bc < 1 or p_reward_bc > 10000000 then raise exception 'Reward must be between 1 and 10,000,000 BC'; end if;
 if p_cooldown_hours<1 or p_cooldown_hours>168 then raise exception 'Invalid cooldown'; end if;
 if p_ad_id is not null and not exists(select 1 from public.ad_creatives where id=p_ad_id and placement='vip_group_sponsor') then raise exception 'Select a VIP sponsor creative'; end if;
 update public.cp_vip_group_sponsor_config
 set enabled=p_enabled, display_text=left(trim(p_display_text),140), ad_id=p_ad_id,
     reward_bc=p_reward_bc, cooldown_hours=p_cooldown_hours, updated_at=now(), updated_by=auth.uid()
 where id=1;
 return public.admin_get_vip_group_sponsor_config();
end;
$$;

create or replace function public.get_vip_group_sponsor_offer(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid:=auth.uid(); c record; ad record; claimed_at timestamptz;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.profiles p where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())) then
   return jsonb_build_object('show',false,'reason','vip_required');
 end if;
 select * into c from public.cp_vip_group_sponsor_config where id=1;
 if c.id is null or not c.enabled or c.ad_id is null then return jsonb_build_object('show',false,'reason','disabled'); end if;
 select * into ad from public.ad_creatives where id=c.ad_id and status='active' and placement='vip_group_sponsor';
 if ad.id is null then return jsonb_build_object('show',false,'reason','no_active_sponsor'); end if;
 select max(s.claimed_at) into claimed_at from public.cp_vip_group_sponsor_sessions s where s.user_id=uid and s.claimed_at is not null;
 if claimed_at is not null then return jsonb_build_object('show',false,'reason','already_claimed'); end if;
 return jsonb_build_object(
   'show',true,'display_text',c.display_text,'reward_bc',c.reward_bc,'cooldown_hours',c.cooldown_hours,
   'sponsor',ad.sponsor,'headline',ad.headline,'description',ad.description,'tagline',ad.tagline,
   'image_url',ad.image_url,'video_url',ad.video_url,'poster_url',ad.poster_url,
   'destination_url',ad.destination_url,'call_to_action',ad.call_to_action,
   'duration_seconds',greatest(1,coalesce(ad.duration_seconds,5)),'skip_after_seconds',ad.skip_after_seconds,'format',ad.format
 );
end;
$$;

create or replace function public.start_vip_group_sponsor_secure(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid:=auth.uid(); offer jsonb; sid uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('vip-sponsor:'||uid::text,0));
 offer:=public.get_vip_group_sponsor_offer(p_group_id);
 if coalesce((offer->>'show')::boolean,false)=false then return offer; end if;
 insert into public.cp_vip_group_sponsor_sessions(group_id,user_id,ad_id,reward_bc)
 select p_group_id,uid,(select ad_id from public.cp_vip_group_sponsor_config where id=1),(offer->>'reward_bc')::bigint
 returning id into sid;
 return offer || jsonb_build_object('session_id',sid);
end;
$$;

revoke all on function public.get_vip_group_sponsor_offer(uuid) from public, anon;
grant execute on function public.get_vip_group_sponsor_offer(uuid) to authenticated;
revoke all on function public.start_vip_group_sponsor_secure(uuid) from public, anon;
grant execute on function public.start_vip_group_sponsor_secure(uuid) to authenticated;
revoke all on function public.admin_save_vip_group_sponsor_config(boolean,text,uuid,bigint,integer) from public, anon;
grant execute on function public.admin_save_vip_group_sponsor_config(boolean,text,uuid,bigint,integer) to authenticated;

commit;
