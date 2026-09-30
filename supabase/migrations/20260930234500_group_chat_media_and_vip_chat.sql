-- Group chat media + VIP group chat hardening
alter table public.cp_group_messages
  add column if not exists message_type text not null default 'text',
  add column if not exists media_path text,
  add column if not exists mime_type text,
  add column if not exists duration_seconds integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cp_group_messages_message_type_check') then
    alter table public.cp_group_messages
      add constraint cp_group_messages_message_type_check
      check (message_type in ('text','image','video','audio'));
  end if;
end $$;

create table if not exists public.cp_vip_group_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  message_type text not null default 'text',
  media_path text,
  mime_type text,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  constraint cp_vip_group_messages_type_check check (message_type in ('text','image','video','audio')),
  constraint cp_vip_group_messages_body_check check (length(body) <= 2000)
);

alter table public.cp_vip_group_messages enable row level security;

drop policy if exists "vip group read" on public.cp_vip_group_messages;
create policy "vip group read" on public.cp_vip_group_messages
for select to authenticated
using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())));

drop policy if exists "vip group insert" on public.cp_vip_group_messages;
create policy "vip group insert" on public.cp_vip_group_messages
for insert to authenticated
with check (user_id=auth.uid() and exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('circle-panda-group-media','circle-panda-group-media',false,26214400,
array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/webm','audio/mp4','audio/mpeg','audio/ogg'])
on conflict (id) do update set public=false,file_size_limit=26214400,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "group media member read" on storage.objects;
create policy "group media member read" on storage.objects for select to authenticated
using (bucket_id='circle-panda-group-media' and (
  exists (select 1 from public.group_members gm where gm.group_id=nullif(split_part(name,'/',1),'vip')::uuid and gm.user_id=auth.uid() and gm.left_at is null)
  or exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now()) and split_part(name,'/',1)='vip')
));

drop policy if exists "group media member upload" on storage.objects;
create policy "group media member upload" on storage.objects for insert to authenticated
with check (bucket_id='circle-panda-group-media' and split_part(name,'/',2)=auth.uid()::text and (
  exists (select 1 from public.group_members gm where gm.group_id=nullif(split_part(name,'/',1),'vip')::uuid and gm.user_id=auth.uid() and gm.left_at is null)
  or (split_part(name,'/',1)='vip' and exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now()))
));

drop policy if exists "group media own delete" on storage.objects;
create policy "group media own delete" on storage.objects for delete to authenticated
using (bucket_id='circle-panda-group-media' and split_part(name,'/',2)=auth.uid()::text);

create or replace function public.send_group_media_secure(p_group_id uuid,p_message_type text,p_media_path text,p_mime_type text default null,p_duration_seconds integer default null,p_body text default '')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); mid uuid;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if p_message_type not in ('image','video','audio') then raise exception 'Invalid media type'; end if;
 if p_media_path is null or split_part(p_media_path,'/',1)<>p_group_id::text or split_part(p_media_path,'/',2)<>uid::text then raise exception 'Invalid media path'; end if;
 if not exists(select 1 from public.groups g join public.group_members gm on gm.group_id=g.id where g.id=p_group_id and gm.user_id=uid and gm.left_at is null and g.activated_at is not null and coalesce(g.expires_at,now()+interval '1 second')>now()) then raise exception 'Group is not active'; end if;
 if not coalesce((select gs.send_messages from public.group_settings gs where gs.group_id=p_group_id),true)
    and not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=uid and gm.role in ('owner','admin') and gm.left_at is null) then raise exception 'Only group admins can send messages right now'; end if;
 insert into public.cp_group_messages(group_id,user_id,body,message_type,media_path,mime_type,duration_seconds)
 values(p_group_id,uid,left(coalesce(trim(p_body),''),2000),p_message_type,p_media_path,p_mime_type,p_duration_seconds) returning id into mid;
 return jsonb_build_object('id',mid,'created_at',now());
end $$;
revoke all on function public.send_group_media_secure(uuid,text,text,text,integer,text) from public,anon;
grant execute on function public.send_group_media_secure(uuid,text,text,text,integer,text) to authenticated;

create or replace function public.send_vip_group_message_secure(p_body text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); mid uuid;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if not exists(select 1 from public.profiles p where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())) then raise exception 'VIP membership required'; end if;
 if length(trim(coalesce(p_body,'')))=0 or length(p_body)>2000 then raise exception 'Invalid message'; end if;
 insert into public.cp_vip_group_messages(user_id,body) values(uid,trim(p_body)) returning id into mid;
 return jsonb_build_object('id',mid,'created_at',now());
end $$;
revoke all on function public.send_vip_group_message_secure(text) from public,anon;
grant execute on function public.send_vip_group_message_secure(text) to authenticated;

create or replace function public.send_vip_group_media_secure(p_message_type text,p_media_path text,p_mime_type text default null,p_duration_seconds integer default null,p_body text default '')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); mid uuid;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if p_message_type not in ('image','video','audio') then raise exception 'Invalid media type'; end if;
 if split_part(p_media_path,'/',1)<>'vip' or split_part(p_media_path,'/',2)<>uid::text then raise exception 'Invalid media path'; end if;
 if not exists(select 1 from public.profiles p where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())) then raise exception 'VIP membership required'; end if;
 insert into public.cp_vip_group_messages(user_id,body,message_type,media_path,mime_type,duration_seconds)
 values(uid,left(coalesce(trim(p_body),''),2000),p_message_type,p_media_path,p_mime_type,p_duration_seconds) returning id into mid;
 return jsonb_build_object('id',mid,'created_at',now());
end $$;
revoke all on function public.send_vip_group_media_secure(text,text,text,integer,text) from public,anon;
grant execute on function public.send_vip_group_media_secure(text,text,text,integer,text) to authenticated;

do $
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='cp_vip_group_messages'
  ) then
    alter publication supabase_realtime add table public.cp_vip_group_messages;
  end if;
end $;
