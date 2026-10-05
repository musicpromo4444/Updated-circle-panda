create or replace function private.send_group_message(
  p_group_id uuid,
  p_body text default null,
  p_media_type text default null,
  p_media_path text default null,
  p_reply_to_id uuid default null,
  p_view_once boolean default false,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_existing uuid;
  v_vip boolean;
  v_send boolean;
  v_cooldown integer;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select is_vip into v_vip from public.groups where id=p_group_id;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if not exists(select 1 from public.group_members where group_id=p_group_id and user_id=v_uid and left_at is null) then raise exception 'NOT_MEMBER'; end if;
  select coalesce(send_messages,true) into v_send from public.group_settings where group_id=p_group_id;
  if coalesce(v_send,true)=false and not exists(select 1 from public.groups where id=p_group_id and creator_id=v_uid) then raise exception 'MESSAGES_DISABLED'; end if;
  if p_body is null and p_media_path is null then raise exception 'EMPTY_MESSAGE'; end if;
  if p_media_type is not null and p_media_type not in ('image','video','audio') then raise exception 'INVALID_MEDIA_TYPE'; end if;
  if p_media_path is not null and not exists(select 1 from storage.objects o where o.bucket_id='circle-panda-group-media' and o.name=p_media_path and o.owner_id=v_uid::text) then raise exception 'MEDIA_NOT_OWNED'; end if;
  if p_reply_to_id is not null and not exists(select 1 from public.group_messages r where r.id=p_reply_to_id and r.group_id=p_group_id) then raise exception 'INVALID_REPLY'; end if;
  if p_idempotency_key is not null then
    select message_id into v_existing from public.group_message_idempotency where sender_id=v_uid and idempotency_key=p_idempotency_key;
    if v_existing is not null then return v_existing; end if;
  end if;
  if v_vip then
    if p_media_type='audio' then p_view_once:=false; else p_view_once:=coalesce(p_view_once,false); end if;
  else
    select cooldown_hours into v_cooldown from public.group_reward_config where id=true and active=true;
    if not exists(select 1 from public.group_ad_completions where group_id=p_group_id and user_id=v_uid and completed_at > now()-make_interval(hours=>coalesce(v_cooldown,24))) then raise exception 'GROUP_FIRST_MESSAGE_AD_REQUIRED'; end if;
    perform public.spend_bc(1,'group_message','group',p_group_id,p_idempotency_key);
    if p_media_type='audio' then p_view_once:=false; elsif p_media_type in ('image','video') then p_view_once:=true; else p_view_once:=false; end if;
  end if;
  if p_media_type='audio' then p_view_once:=false; end if;
  insert into public.group_messages(group_id,sender_id,body,reply_to_id,media_type,media_path,view_once)
  values(p_group_id,v_uid,nullif(trim(coalesce(p_body,'')),''),p_reply_to_id,p_media_type,p_media_path,p_view_once)
  returning id into v_id;
  if p_idempotency_key is not null then
    insert into public.group_message_idempotency(sender_id,idempotency_key,message_id)
    values(v_uid,p_idempotency_key,v_id) on conflict(sender_id,idempotency_key) do nothing;
  end if;
  perform public.award_xp('group_message',null,'group_message:'||v_id::text);
  return v_id;
end
$function$;

create or replace function public.delete_group_message(p_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_sender uuid;
  v_group uuid;
  v_media_path text;
  v_media_type text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select sender_id,group_id,media_path,media_type into v_sender,v_group,v_media_path,v_media_type from public.group_messages where id=p_message_id;
  if not found then raise exception 'MESSAGE_NOT_FOUND'; end if;
  if v_sender<>v_uid then raise exception 'NOT_MESSAGE_OWNER'; end if;
  update public.group_messages set reply_to_id=null where reply_to_id=p_message_id;
  delete from public.group_message_reactions where message_id=p_message_id;
  delete from public.group_media_views where message_id=p_message_id;
  delete from public.group_message_idempotency where message_id=p_message_id;
  delete from public.notifications where data->>'message_id'=p_message_id::text;
  delete from public.group_messages where id=p_message_id;
  return jsonb_build_object('deleted',true,'message_id',p_message_id,'group_id',v_group,'media_path',v_media_path,'media_type',v_media_type);
end
$function$;

revoke all on function public.delete_group_message(uuid) from public,anon;
grant execute on function public.delete_group_message(uuid) to authenticated;

alter table public.group_messages replica identity full;
