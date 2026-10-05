create or replace function public.send_group_message_secure(p_group_id uuid,p_body text,p_reply_to_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare uid uuid:=auth.uid(); mid uuid; allowed boolean:=true; vip boolean:=false;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 vip:=private.is_vip_group(p_group_id);
 if not exists(select 1 from public.groups g join public.group_members gm on gm.group_id=g.id and gm.user_id=uid and gm.left_at is null where g.id=p_group_id and g.activated_at is not null) then raise exception 'Group is not active'; end if;
 select coalesce(gs.send_messages,true) into allowed from public.group_settings gs where gs.group_id=p_group_id;
 if not allowed and not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=uid and gm.role in ('owner','admin') and gm.left_at is null) then raise exception 'Only group admins can send messages right now'; end if;
 if length(trim(p_body))=0 or length(p_body)>2000 then raise exception 'Invalid message'; end if;
 if p_reply_to_id is not null and not exists(select 1 from public.cp_group_messages m where m.id=p_reply_to_id and m.group_id=p_group_id) then raise exception 'Invalid reply target'; end if;
 insert into public.cp_group_messages(group_id,user_id,body,reply_to_id,view_once) values(p_group_id,uid,trim(p_body),p_reply_to_id,false) returning id into mid;
 if not vip then perform public.apply_bc_delta(uid,-1,'Group message','group_message',mid); end if;
 perform public.award_xp_secure('group_message',mid,'group_message:'||mid::text);
 return jsonb_build_object('id',mid,'created_at',now(),'bc_charged',case when vip then 0 else 1 end,'vip_free',vip,'reply_to_id',p_reply_to_id,'view_once',false);
end;$function$;

create or replace function public.send_group_reply_secure(p_group_id uuid,p_body text,p_reply_to_id uuid,p_message_type text default 'text',p_media_path text default null,p_mime_type text default null,p_duration_seconds integer default null,p_view_once boolean default true)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare uid uuid:=auth.uid(); mid uuid; v_view boolean;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_reply_to_id is null then raise exception 'Reply target required'; end if;
 if not exists(select 1 from public.cp_group_messages m join public.group_members gm on gm.group_id=m.group_id and gm.user_id=uid and gm.left_at is null where m.id=p_reply_to_id and m.group_id=p_group_id) then raise exception 'Reply target not found'; end if;
 if not exists(select 1 from public.groups g join public.group_members gm on gm.group_id=g.id and gm.user_id=uid and gm.left_at is null where g.id=p_group_id and g.activated_at is not null) then raise exception 'Group is not active'; end if;
 if p_message_type not in ('text','image','video','audio') then raise exception 'Invalid message type'; end if;
 if p_message_type in ('image','video') and p_media_path is not null and (split_part(p_media_path,'/',1)<>uid::text or split_part(p_media_path,'/',2)<>p_group_id::text) then raise exception 'Invalid media path'; end if;
 v_view:=case when p_message_type in ('text','audio') then false else coalesce(p_view_once,true) end;
 insert into public.cp_group_messages(group_id,user_id,body,message_type,media_path,mime_type,duration_seconds,reply_to_id,view_once)
 values(p_group_id,uid,left(coalesce(nullif(trim(p_body),''),case p_message_type when 'image' then 'Photo' when 'video' then 'Video' when 'audio' then 'Voice note' else '' end),2000),p_message_type,p_media_path,p_mime_type,p_duration_seconds,p_reply_to_id,v_view) returning id into mid;
 perform public.apply_bc_delta(uid,-1,'Group reply','group_message_reply',mid);
 perform public.award_xp_secure('reply',mid,'reply:'||mid::text);
 return jsonb_build_object('id',mid,'reply_to_id',p_reply_to_id,'bc_charged',1,'view_once',v_view);
end;$function$;