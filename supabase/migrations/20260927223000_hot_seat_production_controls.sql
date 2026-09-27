alter table public.hot_seat_hosts
  add column if not exists stream_provider text not null default 'youtube',
  add column if not exists max_hosts integer not null default 5,
  add column if not exists topic text,
  add column if not exists location text,
  add column if not exists reputation integer not null default 0,
  add column if not exists viewer_count integer not null default 0,
  add column if not exists answered_count integer not null default 0;

alter table public.hot_seat_hosts drop constraint if exists hot_seat_hosts_stream_provider_check;
alter table public.hot_seat_hosts add constraint hot_seat_hosts_stream_provider_check check (stream_provider in ('youtube','aws','zegocloud'));
alter table public.hot_seat_hosts drop constraint if exists hot_seat_hosts_max_hosts_check;
alter table public.hot_seat_hosts add constraint hot_seat_hosts_max_hosts_check check (max_hosts in (1,2,5,10,20));

create or replace function public.admin_hot_seat_start(p_alias text,p_media_url text,p_media_kind text default 'video',p_provider text default 'youtube',p_max_hosts integer default 5,p_topic text default null,p_location text default null,p_start_at timestamptz default now())
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); r public.hot_seat_hosts%rowtype;
begin
 if not private.is_admin(uid) then raise exception 'Admin access required'; end if;
 if p_provider not in ('youtube','aws','zegocloud') then raise exception 'Invalid provider'; end if;
 if p_max_hosts not in (1,2,5,10,20) then raise exception 'Invalid host count'; end if;
 update public.hot_seat_hosts set is_active=false where is_active=true;
 insert into public.hot_seat_hosts(alias,media_url,media_kind,started_at,ends_at,is_active,stream_provider,max_hosts,topic,location)
 values(p_alias,p_media_url,p_media_kind,p_start_at,p_start_at + interval '3 hours',true,p_provider,p_max_hosts,p_topic,p_location) returning * into r;
 insert into public.admin_audit_log(admin_user_id,action,metadata) values(uid,'HOT_SEAT_START',jsonb_build_object('host_id',r.id,'provider',p_provider,'max_hosts',p_max_hosts,'start_at',p_start_at));
 return to_jsonb(r);
end $$;

create or replace function public.admin_hot_seat_end(p_host_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); r public.hot_seat_hosts%rowtype;
begin
 if not private.is_admin(uid) then raise exception 'Admin access required'; end if;
 update public.hot_seat_hosts set is_active=false where id=p_host_id returning * into r;
 if not found then raise exception 'Hot Seat host not found'; end if;
 insert into public.admin_audit_log(admin_user_id,action,metadata) values(uid,'HOT_SEAT_END',jsonb_build_object('host_id',p_host_id));
 return to_jsonb(r);
end $$;

revoke execute on function public.admin_hot_seat_start(text,text,text,text,integer,text,text,timestamptz) from public,anon;
revoke execute on function public.admin_hot_seat_end(uuid) from public,anon;
grant execute on function public.admin_hot_seat_start(text,text,text,text,integer,text,text,timestamptz) to authenticated;
grant execute on function public.admin_hot_seat_end(uuid) to authenticated;