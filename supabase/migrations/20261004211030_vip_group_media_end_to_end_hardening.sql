-- VIP group media uses a private bucket and reusable media (never view-once).
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'circle-panda-group-media',
  'circle-panda-group-media',
  false,
  26214400,
  array[
    'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif',
    'video/mp4','video/webm','video/quicktime',
    'audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-m4a','audio/aac'
  ]::text[]
)
on conflict (id) do update
set public=false,file_size_limit=26214400,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "VIP group media upload" on storage.objects;
create policy "VIP group media upload" on storage.objects
for insert to authenticated
with check (
  bucket_id='circle-panda-group-media'
  and split_part(name,'/',1)='vip'
  and split_part(name,'/',2)=(select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.is_vip=true
      and (p.vip_expires_at is null or p.vip_expires_at>now())
  )
);

drop policy if exists "VIP group media read" on storage.objects;
create policy "VIP group media read" on storage.objects
for select to authenticated
using (
  bucket_id='circle-panda-group-media'
  and split_part(name,'/',1)='vip'
  and exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.is_vip=true
      and (p.vip_expires_at is null or p.vip_expires_at>now())
  )
);

drop policy if exists "VIP group media delete own" on storage.objects;
create policy "VIP group media delete own" on storage.objects
for delete to authenticated
using (
  bucket_id='circle-panda-group-media'
  and split_part(name,'/',1)='vip'
  and split_part(name,'/',2)=(select auth.uid())::text
);

create or replace function public.send_vip_group_media_secure(
  p_group_id uuid,p_message_type text,p_media_path text,
  p_mime_type text default null,p_duration_seconds integer default null,p_body text default ''
)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare uid uuid:=auth.uid(); mid uuid;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if p_message_type not in ('image','video','audio') then raise exception 'Invalid media type'; end if;
 if p_media_path is null or split_part(p_media_path,'/',1)<>'vip'
    or split_part(p_media_path,'/',2)<>uid::text
    or split_part(p_media_path,'/',3)<>p_group_id::text then
   raise exception 'Invalid VIP media path';
 end if;
 if not exists (
   select 1 from public.profiles p
   where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())
 ) then raise exception 'VIP membership required'; end if;
 if not exists (
   select 1 from public.cp_vip_group_rooms r join public.profiles p on p.id=uid
   where r.id=p_group_id and r.enabled=true
     and (r.is_worldwide=true or lower(r.country)=lower(p.country))
 ) then raise exception 'VIP group access denied'; end if;
 if p_duration_seconds is not null and (p_duration_seconds<0 or p_duration_seconds>3600) then
   raise exception 'Invalid media duration';
 end if;
 insert into public.cp_vip_group_messages(group_id,user_id,body,message_type,media_path,mime_type,duration_seconds)
 values(p_group_id,uid,left(coalesce(trim(p_body),''),2000),p_message_type,p_media_path,p_mime_type,p_duration_seconds)
 returning id into mid;
 return jsonb_build_object('id',mid,'created_at',now(),'bc_charged',0,'view_once',false);
end;
$function$;

revoke all on function public.send_vip_group_media_secure(uuid,text,text,text,integer,text) from public,anon;
grant execute on function public.send_vip_group_media_secure(uuid,text,text,text,integer,text) to authenticated;

create or replace function public.send_vip_group_message_secure(p_group_id uuid,p_body text)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare uid uuid:=auth.uid(); mid uuid;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if not exists (
   select 1 from public.profiles p
   where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())
 ) then raise exception 'VIP membership required'; end if;
 if not exists (
   select 1 from public.cp_vip_group_rooms r join public.profiles p on p.id=uid
   where r.id=p_group_id and r.enabled=true
     and (r.is_worldwide=true or lower(r.country)=lower(p.country))
 ) then raise exception 'VIP group access denied'; end if;
 if length(trim(coalesce(p_body,'')))=0 or length(p_body)>2000 then raise exception 'Invalid message'; end if;
 insert into public.cp_vip_group_messages(group_id,user_id,body)
 values(p_group_id,uid,trim(p_body))
 returning id into mid;
 return jsonb_build_object('id',mid,'created_at',now(),'bc_charged',0);
end;
$function$;

revoke all on function public.send_vip_group_message_secure(uuid,text) from public,anon;
grant execute on function public.send_vip_group_message_secure(uuid,text) to authenticated;

create or replace function public.get_vip_group_messages(p_group_id uuid)
returns setof public.cp_vip_group_messages
language plpgsql security definer set search_path=''
as $function$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if not exists (
   select 1 from public.profiles p join public.cp_vip_group_rooms r
     on r.id=p_group_id and r.enabled=true
    and (r.is_worldwide=true or lower(r.country)=lower(p.country))
   where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())
 ) then raise exception 'VIP group access denied'; end if;
 return query select m.* from public.cp_vip_group_messages m
 where m.group_id=p_group_id order by m.created_at asc limit 1000;
end;
$function$;

revoke all on function public.get_vip_group_messages(uuid) from public,anon;
grant execute on function public.get_vip_group_messages(uuid) to authenticated;
