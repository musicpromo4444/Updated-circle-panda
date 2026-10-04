begin;

create or replace function public.get_vip_group_sponsor_offer(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid:=auth.uid(); c record; ad record; claimed_at timestamptz;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if not exists(
   select 1 from public.cp_vip_group_rooms r
   join public.profiles p on p.id=uid
   where r.id=p_group_id and r.enabled=true
     and (r.is_worldwide=true or lower(r.country)=lower(p.country))
 ) then
   return jsonb_build_object('show',false,'reason','vip_group_access_denied');
 end if;
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

commit;
