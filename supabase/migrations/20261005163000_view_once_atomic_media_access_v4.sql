create or replace function public.claim_group_media_view_once(p_message_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); inserted_count integer;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.cp_group_messages m join public.group_members gm on gm.group_id=m.group_id and gm.user_id=uid and gm.left_at is null where m.id=p_message_id and m.view_once=true and m.message_type in ('image','video') and m.user_id<>uid) then return false; end if;
 insert into public.cp_group_media_views(message_id,user_id,viewed_at) values(p_message_id,uid,now()) on conflict(message_id,user_id) do nothing;
 get diagnostics inserted_count=row_count;
 return inserted_count>0;
end $$;

create or replace function public.claim_vip_group_media_view_once(p_message_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); inserted_count integer;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.cp_vip_group_messages m join public.cp_vip_group_rooms r on r.id=m.group_id and r.enabled=true join public.profiles p on p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now()) where m.id=p_message_id and m.view_once=true and m.message_type in ('image','video') and m.user_id<>uid and (r.is_worldwide=true or lower(r.country)=lower(p.country))) then return false; end if;
 insert into public.cp_vip_group_media_views(message_id,user_id,viewed_at) values(p_message_id,uid,now()) on conflict(message_id,user_id) do nothing;
 get diagnostics inserted_count=row_count;
 return inserted_count>0;
end $$;

drop policy if exists "circle panda group media read v2" on storage.objects;
create policy "circle panda group media read v3" on storage.objects for select to authenticated using (
 bucket_id='circle-panda-group-media'
 and (
   exists(select 1 from public.cp_group_messages m join public.group_members gm on gm.group_id=m.group_id and gm.user_id=(select auth.uid()) and gm.left_at is null where m.media_path=objects.name and m.view_once=false)
   or exists(select 1 from public.cp_vip_group_messages m join public.cp_vip_group_rooms r on r.id=m.group_id and r.enabled=true join public.profiles p on p.id=(select auth.uid()) and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now()) where m.media_path=objects.name and m.view_once=false and (r.is_worldwide=true or lower(r.country)=lower(p.country)))
   or (split_part(name,'/',1)=(select auth.uid())::text)
   or (split_part(name,'/',1)='vip' and split_part(name,'/',2)=(select auth.uid())::text)
   or (split_part(name,'/',1)='admin' and split_part(name,'/',2)=(select auth.uid())::text and public.is_admin())
 )
);