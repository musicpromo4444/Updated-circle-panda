-- Isolate Hot Seat interactions by live session and enforce the production lifecycle.
alter table public.hot_seat_likes add column if not exists host_id uuid;
alter table public.hot_seat_follows add column if not exists host_id uuid;
alter table public.hot_seat_chat add column if not exists host_id uuid;

do $$
begin
  if not exists (select 1 from public.hot_seat_likes where host_id is null)
     and not exists (select 1 from pg_constraint where conname='hot_seat_likes_host_id_fkey') then
    alter table public.hot_seat_likes add constraint hot_seat_likes_host_id_fkey
      foreign key (host_id) references public.hot_seat_hosts(id) on delete cascade;
  end if;
  if not exists (select 1 from public.hot_seat_follows where host_id is null)
     and not exists (select 1 from pg_constraint where conname='hot_seat_follows_host_id_fkey') then
    alter table public.hot_seat_follows add constraint hot_seat_follows_host_id_fkey
      foreign key (host_id) references public.hot_seat_hosts(id) on delete cascade;
  end if;
  if not exists (select 1 from public.hot_seat_chat where host_id is null)
     and not exists (select 1 from pg_constraint where conname='hot_seat_chat_host_id_fkey') then
    alter table public.hot_seat_chat add constraint hot_seat_chat_host_id_fkey
      foreign key (host_id) references public.hot_seat_hosts(id) on delete cascade;
  end if;
end $$;

alter table public.hot_seat_likes alter column host_id set not null;
alter table public.hot_seat_follows alter column host_id set not null;
alter table public.hot_seat_chat alter column host_id set not null;

create unique index if not exists hot_seat_likes_host_user_uidx on public.hot_seat_likes(host_id,user_id);
create unique index if not exists hot_seat_follows_host_user_uidx on public.hot_seat_follows(host_id,user_id);
create index if not exists hot_seat_chat_host_created_idx on public.hot_seat_chat(host_id,created_at desc);

drop function if exists public.admin_hot_seat_start(text,text,text,text,integer,text,text,timestamptz);

create or replace function public.admin_hot_seat_start(
  p_alias text, p_media_url text, p_media_kind text default 'video',
  p_provider text default 'youtube', p_max_hosts integer default 5,
  p_topic text default null, p_location text default null,
  p_start_at timestamptz default now(), p_duration_hours integer default 24
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); r public.hot_seat_hosts%rowtype;
begin
  if not public.is_admin(uid) then raise exception 'Admin access required'; end if;
  if nullif(trim(p_alias),'') is null then raise exception 'Host name is required'; end if;
  if nullif(trim(p_media_url),'') is null then raise exception 'Live media URL is required'; end if;
  if p_provider not in ('youtube','aws','zegocloud') then raise exception 'Invalid provider'; end if;
  if p_max_hosts not in (1,2,5,10,20) then raise exception 'Invalid host count'; end if;
  if p_duration_hours < 4 or p_duration_hours > 168 then raise exception 'Invalid session duration'; end if;
  update public.hot_seat_hosts set is_active=false, pause_until=null where is_active=true;
  insert into public.hot_seat_hosts(alias,media_url,media_kind,started_at,ends_at,is_active,stream_provider,max_hosts,topic,location,cycle_enabled,session_duration_hours)
  values(trim(p_alias),trim(p_media_url),coalesce(nullif(trim(p_media_kind),''),'video'),p_start_at,p_start_at + make_interval(hours=>p_duration_hours),true,p_provider,p_max_hosts,nullif(trim(p_topic),''),nullif(trim(p_location),''),true,p_duration_hours)
  returning * into r;
  insert into public.admin_audit_log(admin_user_id,action,metadata)
  values(uid,'HOT_SEAT_START',jsonb_build_object('host_id',r.id,'provider',p_provider,'max_hosts',p_max_hosts,'start_at',p_start_at,'duration_hours',p_duration_hours));
  return to_jsonb(r);
end $$;

create or replace function public.answer_hot_seat_question_secure(p_question_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare aid uuid; qhost uuid; uid uuid:=auth.uid();
begin
  if uid is null or not public.is_admin(uid) then raise exception 'Host/admin access required'; end if;
  if length(trim(p_body))=0 or length(trim(p_body))>1000 then raise exception 'Answer must be 1-1000 characters'; end if;
  select host_id into qhost from public.hot_seat_questions where id=p_question_id;
  if qhost is null or not exists(select 1 from public.hot_seat_hosts where id=qhost and is_active=true and ends_at>now()) then raise exception 'Question is not attached to a live Hot Seat'; end if;
  insert into public.hot_seat_answers(question_id,kind,body) values(p_question_id,'text',trim(p_body)) returning id into aid;
  update public.hot_seat_hosts set answered_count=answered_count+1 where id=qhost;
  return aid;
end $$;

create or replace function public.toggle_hot_seat_like(p_host_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); exists_like boolean;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if not exists(select 1 from public.hot_seat_hosts where id=p_host_id and is_active=true and ends_at>now()) then raise exception 'Hot Seat is not live'; end if;
  select exists(select 1 from public.hot_seat_likes where user_id=uid and host_id=p_host_id) into exists_like;
  if exists_like then delete from public.hot_seat_likes where user_id=uid and host_id=p_host_id;
  else insert into public.hot_seat_likes(user_id,host_id) values(uid,p_host_id); end if;
  return jsonb_build_object('liked',not exists_like,'count',(select count(*) from public.hot_seat_likes where host_id=p_host_id));
end $$;

create or replace function public.send_hot_seat_chat_secure(p_host_id uuid, p_body text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); mid uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if length(trim(p_body))=0 or length(trim(p_body))>500 then raise exception 'Message must be 1-500 characters'; end if;
  if not exists(select 1 from public.hot_seat_hosts where id=p_host_id and is_active=true and ends_at>now()) then raise exception 'Hot Seat is not live'; end if;
  insert into public.hot_seat_chat(host_id,user_id,alias,body,is_gift) values(p_host_id,uid,'Anonymous Panda',trim(p_body),false) returning id into mid;
  return jsonb_build_object('id',mid);
end $$;

create or replace function public.send_hot_seat_gift(p_host_id uuid,p_gift_id text,p_gift_name text,p_gift_emoji text,p_cost_bc bigint)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); gid uuid; bal bigint; gift record; host_share bigint;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into gift from public.hot_seat_gift_catalog where gift_id=p_gift_id and enabled=true;
  if gift.gift_id is null then raise exception 'Gift is not available'; end if;
  if not exists(select 1 from public.hot_seat_hosts where id=p_host_id and is_active=true and ends_at>now()) then raise exception 'Hot Seat is not live'; end if;
  select balance into bal from public.bc_accounts where user_id=uid for update;
  if coalesce(bal,0)<gift.cost_bc then raise exception 'Not enough Panda Coins'; end if;
  update public.bc_accounts set balance=balance-gift.cost_bc,updated_at=now() where user_id=uid;
  insert into public.hot_seat_gifts(user_id,host_id,gift_id,gift_name,gift_emoji,cost_bc) values(uid,p_host_id,gift.gift_id,gift.name,gift.emoji,gift.cost_bc) returning id into gid;
  insert into public.bc_ledger(user_id,amount,reason,reference_type,reference_id) values(uid,-gift.cost_bc,'Hot Seat gift','hot_seat_gift',gid);
  host_share:=floor(gift.cost_bc*0.20);
  insert into public.hot_seat_host_earnings(host_id,source_type,source_id,gross_bc,host_share_bc) values(p_host_id,'gift',gid,gift.cost_bc,host_share);
  insert into public.hot_seat_chat(host_id,user_id,alias,body,is_gift) values(p_host_id,uid,'Anonymous Panda','Sent '||gift.emoji||' '||gift.name||'!',true);
  return jsonb_build_object('gift_id',gid,'balance',bal-gift.cost_bc,'cost_bc',gift.cost_bc,'host_share_bc',host_share);
end $$;

revoke all on function public.admin_hot_seat_start(text,text,text,text,integer,text,text,timestamptz,integer) from public,anon;
grant execute on function public.admin_hot_seat_start(text,text,text,text,integer,text,text,timestamptz,integer) to authenticated;
revoke all on function public.toggle_hot_seat_like(uuid) from public,anon;
grant execute on function public.toggle_hot_seat_like(uuid) to authenticated;
revoke all on function public.send_hot_seat_chat_secure(uuid,text) from public,anon;
grant execute on function public.send_hot_seat_chat_secure(uuid,text) to authenticated;
revoke all on function public.send_hot_seat_gift(uuid,text,text,text,bigint) from public,anon;
grant execute on function public.send_hot_seat_gift(uuid,text,text,text,bigint) to authenticated;
revoke all on function public.answer_hot_seat_question_secure(uuid,text) from public,anon;
grant execute on function public.answer_hot_seat_question_secure(uuid,text) to authenticated;
drop function if exists public.toggle_hot_seat_like();
drop function if exists public.send_hot_seat_chat_secure(text);
