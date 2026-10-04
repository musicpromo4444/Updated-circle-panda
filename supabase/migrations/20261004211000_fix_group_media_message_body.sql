create or replace function public.send_group_media_secure(
  p_group_id uuid,
  p_message_type text,
  p_media_path text,
  p_mime_type text default null,
  p_duration_seconds integer default null,
  p_view_once boolean default true,
  p_body text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  uid uuid := auth.uid();
  mid uuid;
  message_body text;
begin
  if uid is null then raise exception 'Unauthorized'; end if;
  if p_message_type not in ('image','video','audio') then raise exception 'Invalid media type'; end if;
  if p_media_path is null
     or split_part(p_media_path,'/',1) <> uid::text
     or split_part(p_media_path,'/',2) <> p_group_id::text then
    raise exception 'Invalid media path';
  end if;
  if not exists (
    select 1 from public.groups g
    join public.group_members gm on gm.group_id=g.id
    where g.id=p_group_id and gm.user_id=uid and gm.left_at is null
      and g.activated_at is not null
      and coalesce(g.expires_at,now()+interval '1 second')>now()
  ) then raise exception 'Group is not active'; end if;
  if not coalesce((select gs.send_messages from public.group_settings gs where gs.group_id=p_group_id),true)
     and not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=uid and gm.role in ('owner','admin') and gm.left_at is null)
  then raise exception 'Only group admins can send messages right now'; end if;

  message_body := left(trim(coalesce(p_body,'')),2000);
  if message_body = '' then
    message_body := case p_message_type
      when 'image' then 'Photo'
      when 'video' then 'Video'
      when 'audio' then 'Voice note'
      else 'Media'
    end;
  end if;

  insert into public.cp_group_messages(group_id,user_id,body,message_type,media_path,mime_type,duration_seconds,view_once)
  values(p_group_id,uid,message_body,p_message_type,p_media_path,p_mime_type,p_duration_seconds,coalesce(p_view_once,true))
  returning id into mid;

  perform public.apply_bc_delta(uid,-1,'Group media message','group_media_message',mid);
  return jsonb_build_object('id',mid,'created_at',now(),'bc_charged',1,'view_once',coalesce(p_view_once,true));
end
$function$;

revoke all on function public.send_group_media_secure(uuid,text,text,text,integer,boolean,text) from public;
grant execute on function public.send_group_media_secure(uuid,text,text,text,integer,boolean,text) to authenticated;