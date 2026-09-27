
alter table public.hot_seat_hosts
  add column if not exists cycle_enabled boolean not null default true,
  add column if not exists pause_until timestamptz,
  add column if not exists session_duration_hours integer not null default 24;
alter table public.hot_seat_hosts drop constraint if exists hot_seat_hosts_duration_check;
alter table public.hot_seat_hosts add constraint hot_seat_hosts_duration_check check (session_duration_hours between 4 and 168);

create table if not exists public.hot_seat_host_earnings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hot_seat_hosts(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  gross_bc bigint not null check (gross_bc > 0),
  host_share_bc bigint not null check (host_share_bc >= 0),
  status text not null default 'available' check (status in ('available','paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.hot_seat_host_earnings enable row level security;
revoke all on public.hot_seat_host_earnings from anon,authenticated;
grant select on public.hot_seat_host_earnings to authenticated;

create or replace function public.admin_hot_seat_start(
 p_alias text,p_media_url text,p_media_kind text default 'video',p_provider text default 'youtube',
 p_max_hosts integer default 5,p_topic text default null,p_location text default null,
 p_start_at timestamptz default now(),p_duration_hours integer default 24)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); r public.hot_seat_hosts%rowtype;
begin
 if not private.is_admin(uid) then raise exception 'Admin access required'; end if;
 if p_provider not in ('youtube','aws','zegocloud') then raise exception 'Invalid provider'; end if;
 if p_max_hosts not in (1,2,5,10,20) then raise exception 'Invalid host count'; end if;
 if p_duration_hours < 4 or p_duration_hours > 168 then raise exception 'Invalid session duration'; end if;
 update public.hot_seat_hosts set is_active=false where is_active=true;
 insert into public.hot_seat_hosts(alias,media_url,media_kind,started_at,ends_at,is_active,stream_provider,max_hosts,topic,location,cycle_enabled,session_duration_hours)
 values(p_alias,p_media_url,p_media_kind,p_start_at,p_start_at + make_interval(hours=>p_duration_hours),true,p_provider,p_max_hosts,p_topic,p_location,true,p_duration_hours) returning * into r;
 insert into public.admin_audit_log(admin_user_id,action,metadata) values(uid,'HOT_SEAT_START',jsonb_build_object('host_id',r.id,'provider',p_provider,'max_hosts',p_max_hosts,'start_at',p_start_at,'duration_hours',p_duration_hours));
 return to_jsonb(r);
end $$;

create or replace function public.admin_hot_seat_pause(p_host_id uuid,p_minutes integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); r public.hot_seat_hosts%rowtype;
begin
 if not private.is_admin(uid) then raise exception 'Admin access required'; end if;
 if p_minutes < 1 or p_minutes > 15 then raise exception 'Pause must be 1-15 minutes'; end if;
 update public.hot_seat_hosts set pause_until=now()+make_interval(mins=>p_minutes) where id=p_host_id and is_active=true returning * into r;
 if not found then raise exception 'Active Hot Seat host not found'; end if;
 insert into public.admin_audit_log(admin_user_id,action,metadata) values(uid,'HOT_SEAT_PAUSE',jsonb_build_object('host_id',p_host_id,'minutes',p_minutes));
 return to_jsonb(r);
end $$;

create or replace function public.admin_hot_seat_resume(p_host_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); r public.hot_seat_hosts%rowtype;
begin
 if not private.is_admin(uid) then raise exception 'Admin access required'; end if;
 update public.hot_seat_hosts set pause_until=null where id=p_host_id and is_active=true returning * into r;
 if not found then raise exception 'Active Hot Seat host not found'; end if;
 insert into public.admin_audit_log(admin_user_id,action,metadata) values(uid,'HOT_SEAT_RESUME',jsonb_build_object('host_id',p_host_id));
 return to_jsonb(r);
end $$;

create or replace function public.send_hot_seat_gift(p_host_id uuid,p_gift_id text,p_gift_name text,p_gift_emoji text,p_cost_bc bigint)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $$
declare uid uuid:=auth.uid(); gid uuid; bal bigint; gift record; host_share bigint;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 select * into gift from hot_seat_gift_catalog where gift_id=p_gift_id and enabled=true;
 if gift.gift_id is null then raise exception 'Gift is not available'; end if;
 if not exists(select 1 from hot_seat_hosts where id=p_host_id and is_active=true and ends_at>now()) then raise exception 'Hot Seat is not live'; end if;
 select balance into bal from bc_accounts where user_id=uid for update;
 if coalesce(bal,0)<gift.cost_bc then raise exception 'Not enough Panda Coins'; end if;
 update bc_accounts set balance=balance-gift.cost_bc,updated_at=now() where user_id=uid;
 insert into hot_seat_gifts(user_id,host_id,gift_id,gift_name,gift_emoji,cost_bc) values(uid,p_host_id,gift.gift_id,gift.name,gift.emoji,gift.cost_bc) returning id into gid;
 insert into bc_ledger(user_id,amount,reason,reference_type,reference_id) values(uid,-gift.cost_bc,'Hot Seat gift','hot_seat_gift',gid);
 host_share:=floor(gift.cost_bc*0.20);
 insert into hot_seat_host_earnings(host_id,source_type,source_id,gross_bc,host_share_bc) values(p_host_id,'gift',gid,gift.cost_bc,host_share);
 insert into hot_seat_chat(user_id,alias,body,is_gift) values(uid,'Anonymous Panda','Sent '||gift.emoji||' '||gift.name||'!',true);
 return jsonb_build_object('gift_id',gid,'balance',bal-gift.cost_bc,'cost_bc',gift.cost_bc,'host_share_bc',host_share);
end $$;

revoke execute on function public.admin_hot_seat_start(text,text,text,text,integer,text,text,timestamptz,integer) from public,anon;
revoke execute on function public.admin_hot_seat_pause(uuid,integer) from public,anon;
revoke execute on function public.admin_hot_seat_resume(uuid) from public,anon;
revoke execute on function public.send_hot_seat_gift(uuid,text,text,text,bigint) from public,anon;
grant execute on function public.admin_hot_seat_start(text,text,text,text,integer,text,text,timestamptz,integer) to authenticated;
grant execute on function public.admin_hot_seat_pause(uuid,integer) to authenticated;
grant execute on function public.admin_hot_seat_resume(uuid) to authenticated;
grant execute on function public.send_hot_seat_gift(uuid,text,text,text,bigint) to authenticated;
