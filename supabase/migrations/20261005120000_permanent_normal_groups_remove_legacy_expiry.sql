-- Circle Panda: permanent normal groups.
-- Activated normal groups no longer expire after 24 hours. The legacy
-- expires_at column remains for compatibility, but is no longer enforced.

update public.groups
set expires_at = null,
    status = case when activated_at is not null then 'active' else status end
where activated_at is not null;

create or replace function public.get_group_summaries(
  p_country text default '',
  p_state_province text default '',
  p_city text default '',
  p_area text default ''
) returns table(
  id uuid,name text,topic text,owner_id uuid,created_at timestamptz,
  activated_at timestamptz,expires_at timestamptz,status text,
  member_count bigint,member_role text,join_pending boolean,
  country text,state_province text,city text,area text
)
language sql stable security definer set search_path=public,pg_temp as $function$
  with me as (
    select
      coalesce((select dp.country from public.dating_profiles dp where dp.user_id=(select auth.uid()) limit 1),'') as country,
      coalesce((select dp.location from public.dating_profiles dp where dp.user_id=(select auth.uid()) limit 1),'') as city
  )
  select
    g.id,g.name,g.topic,g.owner_id,g.created_at,g.activated_at,
    null::timestamptz as expires_at,g.status,
    (select count(*) from public.group_members m where m.group_id=g.id and m.left_at is null),
    (select m.role from public.group_members m where m.group_id=g.id and m.user_id=(select auth.uid()) and m.left_at is null limit 1),
    exists(select 1 from public.group_join_requests jr where jr.group_id=g.id and jr.user_id=(select auth.uid()) and jr.status='pending'),
    g.country,g.state_province,g.city,g.area
  from public.groups g cross join me
  where (nullif(trim(p_country),'') is null or lower(coalesce(g.country,'')) like '%'||lower(trim(p_country))||'%')
    and (nullif(trim(p_state_province),'') is null or lower(coalesce(g.state_province,'')) like '%'||lower(trim(p_state_province))||'%')
    and (nullif(trim(p_city),'') is null or lower(coalesce(g.city,'')) like '%'||lower(trim(p_city))||'%')
    and (nullif(trim(p_area),'') is null or lower(coalesce(g.area,'')) like '%'||lower(trim(p_area))||'%')
  order by
    case when nullif(trim(me.city),'') is not null and lower(coalesce(g.city,''))=lower(trim(me.city)) then 0
         when nullif(trim(me.country),'') is not null and lower(coalesce(g.country,''))=lower(trim(me.country)) then 1
         else 2 end,
    g.created_at desc
  limit 100;
$function$;

create or replace function public.join_group_secure(p_group_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $function$
declare
  uid uuid:=auth.uid();
  cnt integer;
  v_status text;
  activated timestamptz;
  needs_approval boolean;
  existing_status text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select status,activated_at into v_status,activated from public.groups where id=p_group_id for update;
  if not found then raise exception 'Group not found'; end if;

  select coalesce(approve_new_members,false) into needs_approval
  from public.group_settings where group_id=p_group_id;

  if needs_approval and not exists(
    select 1 from public.group_members
    where group_id=p_group_id and user_id=uid and role in ('owner','admin') and left_at is null
  ) then
    select status into existing_status
    from public.group_join_requests
    where group_id=p_group_id and user_id=uid
    order by created_at desc limit 1;

    if existing_status='pending' then
      return jsonb_build_object('status','pending','member_count',
        (select count(*) from public.group_members where group_id=p_group_id and left_at is null));
    end if;

    insert into public.group_join_requests(group_id,user_id) values(p_group_id,uid);
    insert into public.cp_notifications(user_id,title,body,kind)
      select gm.user_id,'New group join request',
        'An anonymous member requested to join your group.','group_join_request'
      from public.group_members gm
      where gm.group_id=p_group_id and gm.role in ('owner','admin') and gm.left_at is null;

    return jsonb_build_object('status','pending','member_count',
      (select count(*) from public.group_members where group_id=p_group_id and left_at is null));
  end if;

  insert into public.group_members(group_id,user_id,role)
    values(p_group_id,uid,case when exists(select 1 from public.groups where id=p_group_id and owner_id=uid) then 'owner' else 'member' end)
    on conflict(group_id,user_id) do update set left_at=null;

  insert into public.group_settings(group_id) values(p_group_id)
    on conflict(group_id) do nothing;

  select count(*) into cnt
  from public.group_members
  where group_id=p_group_id and left_at is null;

  if v_status='locked' and cnt>=3 then
    update public.groups
      set status='active',activated_at=coalesce(activated_at,now()),expires_at=null
      where id=p_group_id;

    insert into public.cp_notifications(user_id,title,body,kind)
      select gm.user_id,'Group activated 🐼',
        'Your Circle Panda group has reached 3 members and is now active.',
        'group_activation'
      from public.group_members gm
      where gm.group_id=p_group_id and gm.role in ('owner','admin','member') and gm.left_at is null
        and not exists(
          select 1 from public.cp_notifications n
          where n.user_id=gm.user_id and n.kind='group_activation'
            and n.body like 'Your Circle Panda group has reached 3 members%'
        );

    v_status:='active';
  end if;

  return jsonb_build_object(
    'group_id',p_group_id,'member_count',cnt,'status',v_status,
    'activated',v_status='active',
    'activated_at',(select activated_at from public.groups where id=p_group_id)
  );
end;
$function$;

create or replace function public.open_group_secure(p_group_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $function$
declare
  uid uuid:=auth.uid();
  owner uuid;
  cnt integer;
  activated timestamptz;
begin
  if uid is null then raise exception 'Unauthorized'; end if;

  select owner_id,activated_at into owner,activated
  from public.groups where id=p_group_id for update;

  if owner is null then raise exception 'Group not found'; end if;

  if not exists(
    select 1 from public.group_members
    where group_id=p_group_id and user_id=uid and left_at is null
  ) then raise exception 'You are not a member of this group'; end if;

  select count(*) into cnt
  from public.group_members
  where group_id=p_group_id and left_at is null;

  if cnt<3 then raise exception 'A group needs 3 active members before it can open'; end if;

  if activated is null then
    update public.groups
      set status='active',activated_at=now(),expires_at=null
      where id=p_group_id;

    insert into public.cp_notifications(user_id,title,body,kind)
      select user_id,'Group activated 🐼',
        'Your Circle Panda group is now active.',
        'group_activation'
      from public.group_members
      where group_id=p_group_id and left_at is null;
  else
    update public.groups set expires_at=null where id=p_group_id;
  end if;

  return jsonb_build_object(
    'opened_at',(select activated_at from public.groups where id=p_group_id),
    'member_count',cnt
  );
end;
$function$;

create or replace function public.send_group_message_secure(p_group_id uuid,p_body text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $function$
declare
  uid uuid:=auth.uid();
  mid uuid;
  allowed boolean:=true;
begin
  if uid is null then raise exception 'Unauthorized'; end if;

  select coalesce(gs.send_messages,true) into allowed
  from public.group_settings gs where gs.group_id=p_group_id;

  if not allowed and not exists(
    select 1 from public.group_members gm
    where gm.group_id=p_group_id and gm.user_id=uid
      and gm.role in ('owner','admin') and gm.left_at is null
  ) then raise exception 'Only group admins can send messages right now'; end if;

  if not exists(
    select 1 from public.groups g
    join public.group_members gm on gm.group_id=g.id
    where g.id=p_group_id and gm.user_id=uid and gm.left_at is null
      and g.activated_at is not null
  ) then raise exception 'Group is not active'; end if;

  if length(trim(p_body))=0 or length(p_body)>2000 then raise exception 'Invalid message'; end if;

  insert into public.cp_group_messages(group_id,user_id,body)
    values(p_group_id,uid,trim(p_body)) returning id into mid;

  perform public.apply_bc_delta(uid,-1,'Group message','group_message',mid);
  return jsonb_build_object('id',mid,'created_at',now(),'bc_charged',1);
end;
$function$;

create or replace function public.send_group_message_secure(p_group_id uuid,p_body text,p_reply_to_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $function$
declare
  uid uuid:=auth.uid();
  mid uuid;
  allowed boolean:=true;
begin
  if uid is null then raise exception 'Unauthorized'; end if;

  select coalesce(gs.send_messages,true) into allowed
  from public.group_settings gs where gs.group_id=p_group_id;

  if not allowed and not exists(
    select 1 from public.group_members gm
    where gm.group_id=p_group_id and gm.user_id=uid
      and gm.role in ('owner','admin') and gm.left_at is null
  ) then raise exception 'Only group admins can send messages right now'; end if;

  if not exists(
    select 1 from public.groups g
    join public.group_members gm on gm.group_id=g.id
    where g.id=p_group_id and gm.user_id=uid and gm.left_at is null
      and g.activated_at is not null
  ) then raise exception 'Group is not active'; end if;

  if length(trim(p_body))=0 or length(p_body)>2000 then raise exception 'Invalid message'; end if;

  if p_reply_to_id is not null and not exists(
    select 1 from public.cp_group_messages m
    where m.id=p_reply_to_id and m.group_id=p_group_id
  ) then raise exception 'Invalid reply target'; end if;

  insert into public.cp_group_messages(group_id,user_id,body,reply_to_id)
    values(p_group_id,uid,trim(p_body),p_reply_to_id) returning id into mid;

  perform public.apply_bc_delta(uid,-1,'Group message','group_message',mid);
  return jsonb_build_object(
    'id',mid,'created_at',now(),'bc_charged',1,'reply_to_id',p_reply_to_id
  );
end;
$function$;

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
set search_path=public,pg_temp
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
  ) then raise exception 'Group is not active'; end if;

  if not coalesce((select gs.send_messages from public.group_settings gs where gs.group_id=p_group_id),true)
     and not exists(
       select 1 from public.group_members gm
       where gm.group_id=p_group_id and gm.user_id=uid
         and gm.role in ('owner','admin') and gm.left_at is null
     )
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

  insert into public.cp_group_messages(
    group_id,user_id,body,message_type,media_path,mime_type,duration_seconds,view_once
  )
  values(
    p_group_id,uid,message_body,p_message_type,p_media_path,p_mime_type,
    p_duration_seconds,coalesce(p_view_once,true)
  )
  returning id into mid;

  perform public.apply_bc_delta(uid,-1,'Group media message','group_media_message',mid);

  return jsonb_build_object(
    'id',mid,'created_at',now(),'bc_charged',1,
    'view_once',coalesce(p_view_once,true)
  );
end;
$function$;

revoke execute on function public.join_group_secure(uuid) from public,anon;
grant execute on function public.join_group_secure(uuid) to authenticated;
revoke execute on function public.open_group_secure(uuid) from public,anon;
grant execute on function public.open_group_secure(uuid) to authenticated;
revoke execute on function public.send_group_message_secure(uuid,text) from public,anon;
grant execute on function public.send_group_message_secure(uuid,text) to authenticated;
revoke execute on function public.send_group_message_secure(uuid,text,uuid) from public,anon;
grant execute on function public.send_group_message_secure(uuid,text,uuid) to authenticated;
revoke execute on function public.send_group_media_secure(uuid,text,text,text,integer,boolean,text) from public,anon;
grant execute on function public.send_group_media_secure(uuid,text,text,text,integer,boolean,text) to authenticated;


-- Finalize the group sending RPC to one unambiguous signature.
drop function if exists public.send_group_message_secure(uuid,text);
revoke all on function public.send_group_message_secure(uuid,text,uuid) from public,anon;
grant execute on function public.send_group_message_secure(uuid,text,uuid) to authenticated;
