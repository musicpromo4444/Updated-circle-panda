-- Circle Panda authoritative group media backend v2.
alter table public.cp_group_messages add column if not exists view_once boolean not null default true;
alter table public.cp_vip_group_messages add column if not exists view_once boolean not null default false;

create table if not exists public.cp_vip_group_media_views (
  message_id uuid not null references public.cp_vip_group_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key(message_id,user_id)
);
alter table public.cp_vip_group_media_views enable row level security;
revoke all on public.cp_vip_group_media_views from anon,authenticated;
drop policy if exists deny_vip_group_media_views_api on public.cp_vip_group_media_views;
create policy deny_vip_group_media_views_api on public.cp_vip_group_media_views for all to authenticated using(false) with check(false);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('circle-panda-group-media','circle-panda-group-media',false,26214400,
array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','video/mp4','video/webm','video/quicktime','audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-m4a','audio/aac']::text[])
on conflict(id) do update set public=false,file_size_limit=26214400,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "group media member read" on storage.objects;
drop policy if exists "group media member upload" on storage.objects;
drop policy if exists "group media own delete" on storage.objects;
drop policy if exists "group media upload" on storage.objects;
drop policy if exists "group media read" on storage.objects;
drop policy if exists "VIP group media upload" on storage.objects;
drop policy if exists "VIP group media read" on storage.objects;
drop policy if exists "VIP group media delete own" on storage.objects;

create policy "circle panda group media upload v2" on storage.objects
for insert to authenticated
with check (
 bucket_id='circle-panda-group-media' and (
  (split_part(name,'/',1)=(select auth.uid())::text and exists(
    select 1 from public.group_members gm
    where gm.group_id=(nullif(split_part(name,'/',2),'')::uuid)
      and gm.user_id=(select auth.uid()) and gm.left_at is null
  ))
  or
  (split_part(name,'/',1)='vip' and split_part(name,'/',2)=(select auth.uid())::text and exists(
    select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())
  ) and exists(
    select 1 from public.cp_vip_group_rooms r join public.profiles p on p.id=(select auth.uid())
    where r.id=(nullif(split_part(name,'/',3),'')::uuid) and r.enabled=true
      and (r.is_worldwide=true or lower(r.country)=lower(p.country))
  ))
  or
  (split_part(name,'/',1)='admin' and public.is_admin() and split_part(name,'/',2)=(select auth.uid())::text)
 )
);

create policy "circle panda group media read v2" on storage.objects
for select to authenticated
using (
 bucket_id='circle-panda-group-media' and (
  exists(
    select 1 from public.cp_group_messages m
    join public.group_members gm on gm.group_id=m.group_id and gm.user_id=(select auth.uid()) and gm.left_at is null
    where m.media_path=name and (m.view_once=false or exists(
      select 1 from public.cp_group_media_views v where v.message_id=m.id and v.user_id=(select auth.uid())
    ))
  )
  or
  exists(
    select 1 from public.cp_vip_group_messages m
    join public.cp_vip_group_rooms r on r.id=m.group_id and r.enabled=true
    join public.profiles p on p.id=(select auth.uid()) and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())
    where m.media_path=name and (r.is_worldwide=true or lower(r.country)=lower(p.country))
      and (m.view_once=false or exists(
        select 1 from public.cp_vip_group_media_views v where v.message_id=m.id and v.user_id=(select auth.uid())
      ))
  )
 )
);

create policy "circle panda group media delete v2" on storage.objects
for delete to authenticated
using (
 bucket_id='circle-panda-group-media' and (
  split_part(name,'/',1)=(select auth.uid())::text
  or (split_part(name,'/',1)='vip' and split_part(name,'/',2)=(select auth.uid())::text)
  or (split_part(name,'/',1)='admin' and split_part(name,'/',2)=(select auth.uid())::text and public.is_admin())
 )
);

drop function if exists public.send_group_media_secure(uuid,text,text,text,integer,boolean,text);
create or replace function public.send_group_media_secure(
 p_group_id uuid,p_message_type text,p_media_path text,p_mime_type text default null,
 p_duration_seconds integer default null,p_view_once boolean default true,p_body text default ''
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $function$
declare uid uuid:=auth.uid(); mid uuid; message_body text;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_message_type not in ('image','video','audio') then raise exception 'Invalid media type'; end if;
 if p_message_type='audio' then p_view_once:=false; end if;
 if p_media_path is null or split_part(p_media_path,'/',1)<>uid::text or split_part(p_media_path,'/',2)<>p_group_id::text then raise exception 'Invalid media path'; end if;
 if not exists(select 1 from public.groups g join public.group_members gm on gm.group_id=g.id where g.id=p_group_id and gm.user_id=uid and gm.left_at is null and g.activated_at is not null) then raise exception 'You are not an active member of this group'; end if;
 if not coalesce((select gs.send_messages from public.group_settings gs where gs.group_id=p_group_id),true)
 and not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=uid and gm.role in ('owner','admin') and gm.left_at is null) then raise exception 'Only group admins can send messages right now'; end if;
 if p_duration_seconds is not null and (p_duration_seconds<0 or p_duration_seconds>3600) then raise exception 'Invalid media duration'; end if;
 message_body:=left(trim(coalesce(p_body,'')),2000);
 if message_body='' then message_body:=case p_message_type when 'image' then 'Photo' when 'video' then 'Video' else 'Voice note' end; end if;
 insert into public.cp_group_messages(group_id,user_id,body,message_type,media_path,mime_type,duration_seconds,view_once)
 values(p_group_id,uid,message_body,p_message_type,p_media_path,p_mime_type,p_duration_seconds,p_view_once) returning id into mid;
 perform public.apply_bc_delta(uid,-1,'Group media message','group_media_message',mid);
 return jsonb_build_object('id',mid,'created_at',now(),'bc_charged',1,'view_once',p_view_once);
end;$function$;
revoke all on function public.send_group_media_secure(uuid,text,text,text,integer,boolean,text) from public,anon;
grant execute on function public.send_group_media_secure(uuid,text,text,text,integer,boolean,text) to authenticated;

create or replace function public.claim_group_media_view_once(p_message_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $function$
declare uid uuid:=auth.uid(); inserted_count integer;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.cp_group_messages m join public.group_members gm on gm.group_id=m.group_id and gm.user_id=uid and gm.left_at is null where m.id=p_message_id and m.view_once=true and m.message_type in ('image','video')) then return false; end if;
 insert into public.cp_group_media_views(message_id,user_id,viewed_at) values(p_message_id,uid,now()) on conflict(message_id,user_id) do nothing;
 get diagnostics inserted_count=row_count;
 return inserted_count>0;
end;$function$;
revoke all on function public.claim_group_media_view_once(uuid) from public,anon;
grant execute on function public.claim_group_media_view_once(uuid) to authenticated;

drop function if exists public.send_vip_group_media_secure(uuid,text,text,text,integer,text);
drop function if exists public.send_vip_group_media_secure(uuid,text,text,text,integer,boolean,text);
create or replace function public.send_vip_group_media_secure(
 p_group_id uuid,p_message_type text,p_media_path text,p_mime_type text default null,
 p_duration_seconds integer default null,p_view_once boolean default false,p_body text default ''
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $function$
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
 insert into public.cp_vip_group_messages(group_id,user_id,body,message_type,media_path,mime_type,duration_seconds,view_once)
 values(p_group_id,uid,message_body,p_message_type,p_media_path,p_mime_type,p_duration_seconds,p_view_once) returning id into mid;
 return jsonb_build_object('id',mid,'created_at',now(),'bc_charged',0,'view_once',p_view_once);
end;$function$;
revoke all on function public.send_vip_group_media_secure(uuid,text,text,text,integer,boolean,text) from public,anon;
grant execute on function public.send_vip_group_media_secure(uuid,text,text,text,integer,boolean,text) to authenticated;

create or replace function public.claim_vip_group_media_view_once(p_message_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $function$
declare uid uuid:=auth.uid(); inserted_count integer;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.cp_vip_group_messages m join public.cp_vip_group_rooms r on r.id=m.group_id and r.enabled=true join public.profiles p on p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now()) where m.id=p_message_id and m.view_once=true and m.message_type in ('image','video') and (r.is_worldwide=true or lower(r.country)=lower(p.country))) then return false; end if;
 insert into public.cp_vip_group_media_views(message_id,user_id,viewed_at) values(p_message_id,uid,now()) on conflict(message_id,user_id) do nothing;
 get diagnostics inserted_count=row_count;
 return inserted_count>0;
end;$function$;
revoke all on function public.claim_vip_group_media_view_once(uuid) from public,anon;
grant execute on function public.claim_vip_group_media_view_once(uuid) to authenticated;

create or replace function public.admin_list_group_media_targets()
returns table(id uuid,name text,kind text,subtitle text)
language sql security definer set search_path=public,pg_temp as $function$
 select g.id,g.name,'group'::text,coalesce(g.country,'')||case when coalesce(g.city,'')<>'' then ' · '||g.city else '' end
 from public.groups g where public.is_admin()
 union all
 select r.id,r.name,'vip'::text,case when r.is_worldwide then 'Worldwide VIP' else coalesce(r.country,'VIP') end
 from public.cp_vip_group_rooms r where public.is_admin() and r.enabled=true
 order by 2;
$function$;
revoke all on function public.admin_list_group_media_targets() from public,anon;
grant execute on function public.admin_list_group_media_targets() to authenticated;

create or replace function public.admin_send_group_media_secure(
 p_group_id uuid,p_is_vip boolean,p_message_type text,p_media_path text,p_mime_type text default null,
 p_duration_seconds integer default null,p_view_once boolean default true,p_body text default ''
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $function$
declare uid uuid:=auth.uid(); mid uuid; message_body text;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if p_message_type not in ('image','video','audio') then raise exception 'Invalid media type'; end if;
 if p_message_type='audio' then p_view_once:=false; end if;
 if p_media_path is null or split_part(p_media_path,'/',1)<>'admin' or split_part(p_media_path,'/',2)<>uid::text or split_part(p_media_path,'/',3)<>p_group_id::text then raise exception 'Invalid admin media path'; end if;
 if p_is_vip then
  if not exists(select 1 from public.cp_vip_group_rooms where id=p_group_id and enabled=true) then raise exception 'VIP group not found'; end if;
  message_body:=coalesce(nullif(left(trim(coalesce(p_body,'')),2000),''),case p_message_type when 'image' then 'Photo' when 'video' then 'Video' else 'Voice note' end);
  insert into public.cp_vip_group_messages(group_id,user_id,body,message_type,media_path,mime_type,duration_seconds,view_once)
  values(p_group_id,uid,message_body,p_message_type,p_media_path,p_mime_type,p_duration_seconds,p_view_once) returning id into mid;
 else
  if not exists(select 1 from public.groups where id=p_group_id) then raise exception 'Group not found'; end if;
  message_body:=coalesce(nullif(left(trim(coalesce(p_body,'')),2000),''),case p_message_type when 'image' then 'Photo' when 'video' then 'Video' else 'Voice note' end);
  insert into public.cp_group_messages(group_id,user_id,body,message_type,media_path,mime_type,duration_seconds,view_once)
  values(p_group_id,uid,message_body,p_message_type,p_media_path,p_mime_type,p_duration_seconds,p_view_once) returning id into mid;
 end if;
 insert into public.admin_audit_log(admin_user_id,action,metadata) values(uid,'send_group_media',jsonb_build_object('group_id',p_group_id,'vip',p_is_vip,'message_id',mid,'message_type',p_message_type,'view_once',p_view_once));
 return jsonb_build_object('id',mid,'created_at',now(),'view_once',p_view_once);
end;$function$;
revoke all on function public.admin_send_group_media_secure(uuid,boolean,text,text,text,integer,boolean,text) from public,anon;
grant execute on function public.admin_send_group_media_secure(uuid,boolean,text,text,text,integer,boolean,text) to authenticated;
