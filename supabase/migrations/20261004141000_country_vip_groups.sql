-- Country-scoped VIP rooms: each VIP sees Worldwide + their registered country only.
create table if not exists public.cp_vip_group_rooms (
  id uuid primary key default gen_random_uuid(),
  country text null,
  name text not null,
  is_worldwide boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  constraint cp_vip_group_rooms_worldwide_check check (is_worldwide = (country is null))
);
create unique index if not exists cp_vip_group_rooms_worldwide_uq on public.cp_vip_group_rooms (is_worldwide) where is_worldwide = true;
create unique index if not exists cp_vip_group_rooms_country_uq on public.cp_vip_group_rooms (lower(country)) where country is not null;
alter table public.cp_vip_group_rooms enable row level security;
revoke all on table public.cp_vip_group_rooms from anon, authenticated;
insert into public.cp_vip_group_rooms(country,name,is_worldwide,enabled)
select null,'Worldwide VIP',true,true
where not exists (select 1 from public.cp_vip_group_rooms where is_worldwide=true);

alter table public.cp_vip_group_messages add column if not exists group_id uuid references public.cp_vip_group_rooms(id) on delete cascade;
update public.cp_vip_group_messages m set group_id=r.id from public.cp_vip_group_rooms r where r.is_worldwide=true and m.group_id is null;
alter table public.cp_vip_group_messages alter column group_id set not null;
create index if not exists cp_vip_group_messages_group_created_idx on public.cp_vip_group_messages(group_id,created_at);

drop function if exists public.send_vip_group_message_secure(text);
drop function if exists public.send_vip_group_media_secure(text,text,text,integer,text);

create or replace function public.get_vip_group_rooms_for_user()
returns table(id uuid,name text,country text,is_worldwide boolean)
language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); user_country text; room_id uuid;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 select p.country into user_country from public.profiles p where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now());
 if not found then raise exception 'VIP membership required'; end if;
 if user_country is null or length(trim(user_country))=0 then raise exception 'Country is required for VIP groups'; end if;
 select r.id into room_id from public.cp_vip_group_rooms r where r.is_worldwide=true and r.enabled=true limit 1;
 if room_id is null then raise exception 'Worldwide VIP group unavailable'; end if;
 if not exists (select 1 from public.cp_vip_group_rooms r where lower(r.country)=lower(trim(user_country)) and r.enabled=true) then
   insert into public.cp_vip_group_rooms(country,name,is_worldwide,enabled) values(trim(user_country),trim(user_country)||' VIP',false,true) on conflict ((lower(country))) do nothing;
 end if;
 return query select r.id,r.name,r.country,r.is_worldwide from public.cp_vip_group_rooms r where r.enabled=true and (r.is_worldwide=true or lower(r.country)=lower(trim(user_country))) order by r.is_worldwide desc,r.name;
end; $$;
revoke execute on function public.get_vip_group_rooms_for_user() from public,anon;
grant execute on function public.get_vip_group_rooms_for_user() to authenticated;

create or replace function public.send_vip_group_message_secure(p_group_id uuid,p_body text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); mid uuid;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if not exists (select 1 from public.profiles p where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())) then raise exception 'VIP membership required'; end if;
 if not exists (select 1 from public.cp_vip_group_rooms r join public.profiles p on p.id=uid where r.id=p_group_id and r.enabled=true and (r.is_worldwide=true or lower(r.country)=lower(p.country))) then raise exception 'VIP group access denied'; end if;
 if length(trim(coalesce(p_body,'')))=0 or length(p_body)>2000 then raise exception 'Invalid message'; end if;
 insert into public.cp_vip_group_messages(group_id,user_id,body) values(p_group_id,uid,trim(p_body)) returning id into mid;
 return jsonb_build_object('id',mid,'created_at',now());
end; $$;
revoke execute on function public.send_vip_group_message_secure(uuid,text) from public,anon;
grant execute on function public.send_vip_group_message_secure(uuid,text) to authenticated;

create or replace function public.send_vip_group_media_secure(p_group_id uuid,p_message_type text,p_media_path text,p_mime_type text default null,p_duration_seconds integer default null,p_body text default '')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); mid uuid;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if p_message_type not in ('image','video','audio') then raise exception 'Invalid media type'; end if;
 if split_part(p_media_path,'/',1)<>'vip' or split_part(p_media_path,'/',2)<>uid::text then raise exception 'Invalid media path'; end if;
 if not exists (select 1 from public.profiles p where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())) then raise exception 'VIP membership required'; end if;
 if not exists (select 1 from public.cp_vip_group_rooms r join public.profiles p on p.id=uid where r.id=p_group_id and r.enabled=true and (r.is_worldwide=true or lower(r.country)=lower(p.country))) then raise exception 'VIP group access denied'; end if;
 insert into public.cp_vip_group_messages(group_id,user_id,body,message_type,media_path,mime_type,duration_seconds) values(p_group_id,uid,left(coalesce(trim(p_body),''),2000),p_message_type,p_media_path,p_mime_type,p_duration_seconds) returning id into mid;
 return jsonb_build_object('id',mid,'created_at',now());
end; $$;
revoke execute on function public.send_vip_group_media_secure(uuid,text,text,text,integer,text) from public,anon;
grant execute on function public.send_vip_group_media_secure(uuid,text,text,text,integer,text) to authenticated;

create or replace function public.get_vip_group_messages(p_group_id uuid)
returns setof public.cp_vip_group_messages
language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if not exists (select 1 from public.profiles p join public.cp_vip_group_rooms r on r.id=p_group_id and r.enabled=true and (r.is_worldwide=true or lower(r.country)=lower(p.country)) where p.id=uid and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())) then raise exception 'VIP group access denied'; end if;
 return query select m.* from public.cp_vip_group_messages m where m.group_id=p_group_id order by m.created_at asc limit 1000;
end; $$;
revoke execute on function public.get_vip_group_messages(uuid) from public,anon;
grant execute on function public.get_vip_group_messages(uuid) to authenticated;
