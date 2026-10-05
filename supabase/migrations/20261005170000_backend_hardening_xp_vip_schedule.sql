-- Circle Panda backend hardening: server-authoritative XP for group messaging,
-- correct VIP call schedule windows, and worldwide VIP room runtime access.

create or replace function public.get_vip_group_call_prompt(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  uid uuid := auth.uid(); p record; r record; c record;
  local_hour integer; can_show boolean := true; reason text := 'eligible';
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into p from public.profiles where id=uid and is_vip=true and (vip_expires_at is null or vip_expires_at>now());
  if not found then return jsonb_build_object('show',false,'reason','vip_required'); end if;
  select * into r from public.cp_vip_group_rooms where id=p_group_id and enabled=true;
  if not found then return jsonb_build_object('show',false,'reason','group_not_found'); end if;
  if not r.is_worldwide and lower(coalesce(r.country,''))<>lower(coalesce(p.country,'')) then
    return jsonb_build_object('show',false,'reason','country_mismatch');
  end if;
  select * into c from public.cp_vip_group_call_config where id=1;
  if c is null or not c.enabled then return jsonb_build_object('show',false,'reason','disabled'); end if;
  if c.country_mode='user' and lower(coalesce(r.country,''))<>lower(coalesce(p.country,'')) then
    can_show:=false; reason:='country_mismatch';
  end if;
  if can_show and c.local_start_hour is not null and c.local_end_hour is not null and c.local_start_hour<>c.local_end_hour then
    local_hour:=extract(hour from now() at time zone 'UTC');
    if c.local_start_hour<c.local_end_hour then
      if local_hour<c.local_start_hour or local_hour>=c.local_end_hour then can_show:=false; reason:='outside_time_window'; end if;
    else
      if local_hour<c.local_start_hour and local_hour>=c.local_end_hour then can_show:=false; reason:='outside_time_window'; end if;
    end if;
  end if;
  return jsonb_build_object('show',can_show,'reason',reason,'voice_enabled',c.voice_enabled,'video_enabled',c.video_enabled,
    'local_start_hour',c.local_start_hour,'local_end_hour',c.local_end_hour,'country_mode',c.country_mode,
    'initial_call_minutes',coalesce(c.initial_call_minutes,20));
end;
$$;

create or replace function public.get_vip_group_call_runtime(p_group_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare uid uuid:=auth.uid(); cfg record; last_shown timestamptz; room_country text; room_worldwide boolean; user_country text;
begin
  if uid is null then raise exception 'Unauthorized'; end if;
  select p.country into user_country from public.profiles p where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now());
  if not found then return jsonb_build_object('show',false,'reason','vip_required'); end if;
  select r.country,r.is_worldwide into room_country,room_worldwide from public.cp_vip_group_rooms r where r.id=p_group_id and r.enabled=true;
  if not found or (not coalesce(room_worldwide,false) and lower(coalesce(room_country,''))<>lower(coalesce(user_country,''))) then
    return jsonb_build_object('show',false,'reason','group_access_denied');
  end if;
  select c.* into cfg from public.cp_vip_group_call_config c where c.id=1;
  if cfg is null or not cfg.enabled then return jsonb_build_object('show',false,'reason','disabled'); end if;
  select v.last_shown_at into last_shown from public.cp_vip_group_call_views v where v.user_id=uid and v.group_id=p_group_id;
  if last_shown is null then
    if now() < cfg.updated_at + make_interval(hours=>cfg.popup_after_hours) then return jsonb_build_object('show',false,'reason','scheduled'); end if;
  elsif now() < last_shown + make_interval(hours=>cfg.repeat_every_hours) then
    return jsonb_build_object('show',false,'reason','cooldown');
  end if;
  insert into public.cp_vip_group_call_views(user_id,group_id,last_shown_at) values(uid,p_group_id,now())
  on conflict(user_id,group_id) do update set last_shown_at=excluded.last_shown_at;
  return jsonb_build_object('show',true,'voice_enabled',cfg.voice_enabled,'video_enabled',cfg.video_enabled,
    'repeat_every_hours',cfg.repeat_every_hours,'initial_call_minutes',coalesce(cfg.initial_call_minutes,20));
end;
$$;

-- XP is awarded only after the message row is created and is idempotent by message id.
-- BC charging remains server-side and atomic through apply_bc_delta().
create or replace function public.send_group_message_secure(p_group_id uuid,p_body text,p_reply_to_id uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $$
declare uid uuid:=auth.uid(); mid uuid; allowed boolean:=true; vip boolean:=false;
begin
  if uid is null then raise exception 'Unauthorized'; end if;
  vip:=private.is_vip_group(p_group_id);
  if not exists(select 1 from public.groups g join public.group_members gm on gm.group_id=g.id and gm.user_id=uid and gm.left_at is null where g.id=p_group_id and g.activated_at is not null) then raise exception 'Group is not active'; end if;
  select coalesce(gs.send_messages,true) into allowed from public.group_settings gs where gs.group_id=p_group_id;
  if not allowed and not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=uid and gm.role in ('owner','admin') and gm.left_at is null) then raise exception 'Only group admins can send messages right now'; end if;
  if length(trim(p_body))=0 or length(p_body)>2000 then raise exception 'Invalid message'; end if;
  if p_reply_to_id is not null and not exists(select 1 from public.cp_group_messages m where m.id=p_reply_to_id and m.group_id=p_group_id) then raise exception 'Invalid reply target'; end if;
  insert into public.cp_group_messages(group_id,user_id,body,reply_to_id,view_once) values(p_group_id,uid,trim(p_body),p_reply_to_id,not vip) returning id into mid;
  if not vip then perform public.apply_bc_delta(uid,-1,'Group message','group_message',mid); end if;
  perform public.award_xp_secure('group_message',mid,'group_message:'||mid::text);
  return jsonb_build_object('id',mid,'created_at',now(),'bc_charged',case when vip then 0 else 1 end,'vip_free',vip,'reply_to_id',p_reply_to_id);
end;
$$;

create or replace function public.send_group_media_secure(p_group_id uuid,p_message_type text,p_media_path text,p_mime_type text default null,p_duration_seconds integer default null,p_view_once boolean default true,p_body text default '')
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $$
declare uid uuid:=auth.uid(); mid uuid; message_body text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_message_type not in ('image','video','audio') then raise exception 'Invalid media type'; end if;
  if p_message_type='audio' then p_view_once:=false; end if;
  if p_media_path is null or split_part(p_media_path,'/',1)<>uid::text or split_part(p_media_path,'/',2)<>p_group_id::text then raise exception 'Invalid media path'; end if;
  if not exists(select 1 from public.groups g join public.group_members gm on gm.group_id=g.id where g.id=p_group_id and gm.user_id=uid and gm.left_at is null and g.activated_at is not null) then raise exception 'You are not an active member of this group'; end if;
  if not coalesce((select gs.send_messages from public.group_settings gs where gs.group_id=p_group_id),true) and not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=uid and gm.role in ('owner','admin') and gm.left_at is null) then raise exception 'Only group admins can send messages right now'; end if;
  if p_duration_seconds is not null and (p_duration_seconds<0 or p_duration_seconds>3600) then raise exception 'Invalid media duration'; end if;
  message_body:=left(trim(coalesce(p_body,'')),2000);
  if message_body='' then message_body:=case p_message_type when 'image' then 'Photo' when 'video' then 'Video' else 'Voice note' end; end if;
  insert into public.cp_group_messages(group_id,user_id,body,message_type,media_path,mime_type,duration_seconds,view_once) values(p_group_id,uid,message_body,p_message_type,p_media_path,p_mime_type,p_duration_seconds,p_view_once) returning id into mid;
  perform public.apply_bc_delta(uid,-1,'Group media message','group_media_message',mid);
  perform public.award_xp_secure('group_message',mid,'group_message:'||mid::text);
  return jsonb_build_object('id',mid,'created_at',now(),'bc_charged',1,'view_once',p_view_once);
end;
$$;

create or replace function public.send_group_reply_secure(p_group_id uuid,p_body text,p_reply_to_id uuid,p_message_type text default 'text',p_media_path text default null,p_mime_type text default null,p_duration_seconds integer default null,p_view_once boolean default true)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $$
declare uid uuid:=auth.uid(); mid uuid; v_view boolean;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_reply_to_id is null then raise exception 'Reply target required'; end if;
  if not exists(select 1 from public.cp_group_messages m join public.group_members gm on gm.group_id=m.group_id and gm.user_id=uid and gm.left_at is null where m.id=p_reply_to_id and m.group_id=p_group_id) then raise exception 'Reply target not found'; end if;
  if not exists(select 1 from public.groups g join public.group_members gm on gm.group_id=g.id and gm.user_id=uid and gm.left_at is null where g.id=p_group_id and g.activated_at is not null) then raise exception 'Group is not active'; end if;
  if p_message_type not in ('text','image','video','audio') then raise exception 'Invalid message type'; end if;
  if p_message_type in ('image','video') and p_media_path is not null and (split_part(p_media_path,'/',1)<>uid::text or split_part(p_media_path,'/',2)<>p_group_id::text) then raise exception 'Invalid media path'; end if;
  v_view:=case when p_message_type='audio' then false else coalesce(p_view_once,true) end;
  insert into public.cp_group_messages(group_id,user_id,body,message_type,media_path,mime_type,duration_seconds,reply_to_id,view_once)
  values(p_group_id,uid,left(coalesce(nullif(trim(p_body),''),case p_message_type when 'image' then 'Photo' when 'video' then 'Video' when 'audio' then 'Voice note' else '' end),2000),p_message_type,p_media_path,p_mime_type,p_duration_seconds,p_reply_to_id,v_view)
  returning id into mid;
  perform public.apply_bc_delta(uid,-1,'Group reply','group_message_reply',mid);
  perform public.award_xp_secure('reply',mid,'reply:'||mid::text);
  return jsonb_build_object('id',mid,'reply_to_id',p_reply_to_id,'bc_charged',1,'view_once',v_view);
end;
$$;

create or replace function public.send_vip_group_message_secure(p_group_id uuid,p_body text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare uid uuid:=auth.uid(); mid uuid;
begin
  if uid is null then raise exception 'Unauthorized'; end if;
  if not exists(select 1 from public.profiles p where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())) then raise exception 'VIP membership required'; end if;
  if not exists(select 1 from public.cp_vip_group_rooms r join public.profiles p on p.id=uid where r.id=p_group_id and r.enabled=true and (r.is_worldwide=true or lower(r.country)=lower(p.country))) then raise exception 'VIP group access denied'; end if;
  if length(trim(coalesce(p_body,'')))=0 or length(p_body)>2000 then raise exception 'Invalid message'; end if;
  insert into public.cp_vip_group_messages(group_id,user_id,body) values(p_group_id,uid,trim(p_body)) returning id into mid;
  perform public.award_xp_secure('group_message',mid,'vip_group_message:'||mid::text);
  return jsonb_build_object('id',mid,'created_at',now(),'bc_charged',0);
end;
$$;

create or replace function public.send_vip_group_media_secure(p_group_id uuid,p_message_type text,p_media_path text,p_mime_type text default null,p_duration_seconds integer default null,p_view_once boolean default false,p_body text default '')
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $$
declare uid uuid:=auth.uid(); mid uuid; message_body text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_message_type not in ('image','video','audio') then raise exception 'Invalid media type'; end if;
  if p_message_type='audio' then p_view_once:=false; end if;
  if p_media_path is null or split_part(p_media_path,'/',1)<>'vip' or split_part(p_media_path,'/',2)<>uid::text or split_part(p_media_path,'/',3)<>p_group_id::text then raise exception 'Invalid VIP media path'; end if;
  if not exists(select 1 from public.profiles p where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())) then raise exception 'VIP membership required'; end if;
  if not exists(select 1 from public.cp_vip_group_rooms r join public.profiles p on p.id=uid where r.id=p_group_id and r.enabled=true and (r.is_worldwide=true or lower(r.country)=lower(p.country))) then raise exception 'VIP group access denied'; end if;
  if p_duration_seconds is not null and (p_duration_seconds<0 or p_duration_seconds>3600) then raise exception 'Invalid media duration'; end if;
  message_body:=left(trim(coalesce(p_body,'')),2000);
  if message_body='' then message_body:=case p_message_type when 'image' then 'Photo' when 'video' then 'Video' else 'Voice note' end; end if;
  insert into public.cp_vip_group_messages(group_id,user_id,body,message_type,media_path,mime_type,duration_seconds,view_once) values(p_group_id,uid,message_body,p_message_type,p_media_path,p_mime_type,p_duration_seconds,p_view_once) returning id into mid;
  perform public.award_xp_secure('group_message',mid,'vip_group_media:'||mid::text);
  return jsonb_build_object('id',mid,'created_at',now(),'bc_charged',0,'view_once',p_view_once);
end;
$$;
