-- VIP private calling and group-call quota
create table if not exists public.cp_vip_call_sessions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.cp_threads(id) on delete cascade,
  caller_id uuid not null references auth.users(id) on delete cascade,
  callee_id uuid not null references auth.users(id) on delete cascade,
  call_type text not null check (call_type in ('voice','video')),
  status text not null default 'ringing' check (status in ('ringing','active','ended','declined','missed')),
  offer jsonb, answer jsonb, started_at timestamptz, ended_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.cp_vip_call_candidates (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.cp_vip_call_sessions(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  candidate jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists public.cp_vip_group_call_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null default current_date,
  voice_seconds integer not null default 0 check (voice_seconds >= 0),
  video_seconds integer not null default 0 check (video_seconds >= 0),
  primary key (user_id, usage_day)
);
alter table public.cp_vip_call_sessions enable row level security;
alter table public.cp_vip_call_candidates enable row level security;
alter table public.cp_vip_group_call_usage enable row level security;
revoke all on public.cp_vip_call_sessions,public.cp_vip_call_candidates,public.cp_vip_group_call_usage from anon,authenticated;

create or replace function public.start_vip_private_call(p_thread_id uuid,p_call_type text)
returns public.cp_vip_call_sessions language plpgsql security definer set search_path=public as $$
declare r public.cp_vip_call_sessions;
begin
 if auth.uid() is null or p_call_type not in ('voice','video') then raise exception 'Invalid call'; end if;
 if not exists(select 1 from public.cp_threads t join public.profiles a on a.id=t.owner_id join public.profiles b on b.id=t.participant_id where t.id=p_thread_id and (auth.uid()=t.owner_id or auth.uid()=t.participant_id) and a.is_vip=true and (a.vip_expires_at is null or a.vip_expires_at>now()) and b.is_vip=true and (b.vip_expires_at is null or b.vip_expires_at>now())) then raise exception 'Private calls require an active VIP-to-VIP chat'; end if;
 insert into public.cp_vip_call_sessions(thread_id,caller_id,callee_id,call_type)
 select p_thread_id,auth.uid(),case when t.owner_id=auth.uid() then t.participant_id else t.owner_id end,p_call_type from public.cp_threads t where t.id=p_thread_id returning * into r;
 return r;
end $$;
create or replace function public.get_my_incoming_vip_calls()
returns setof public.cp_vip_call_sessions language sql security definer set search_path=public as $$
 select s.* from public.cp_vip_call_sessions s join public.cp_threads t on t.id=s.thread_id
 where s.callee_id=auth.uid() and s.status='ringing' and s.created_at>now()-interval '2 minutes'
 order by s.created_at desc;
$$;
create or replace function public.get_vip_call(p_call_id uuid) returns public.cp_vip_call_sessions language sql security definer set search_path=public as $$
 select s.* from public.cp_vip_call_sessions s where s.id=p_call_id and (s.caller_id=auth.uid() or s.callee_id=auth.uid());
$$;
create or replace function public.set_vip_call_offer(p_call_id uuid,p_offer jsonb) returns public.cp_vip_call_sessions language plpgsql security definer set search_path=public as $$ declare r public.cp_vip_call_sessions; begin update public.cp_vip_call_sessions set offer=p_offer,status='active',started_at=coalesce(started_at,now()) where id=p_call_id and caller_id=auth.uid() returning * into r; if r.id is null then raise exception 'Call not found'; end if; return r; end $$;
create or replace function public.set_vip_call_answer(p_call_id uuid,p_answer jsonb) returns public.cp_vip_call_sessions language plpgsql security definer set search_path=public as $$ declare r public.cp_vip_call_sessions; begin update public.cp_vip_call_sessions set answer=p_answer,status='active',started_at=coalesce(started_at,now()) where id=p_call_id and callee_id=auth.uid() returning * into r; if r.id is null then raise exception 'Call not found'; end if; return r; end $$;
create or replace function public.add_vip_call_candidate(p_call_id uuid,p_candidate jsonb) returns void language plpgsql security definer set search_path=public as $$ begin if not exists(select 1 from public.cp_vip_call_sessions where id=p_call_id and (caller_id=auth.uid() or callee_id=auth.uid())) then raise exception 'Call not found'; end if; insert into public.cp_vip_call_candidates(call_id,sender_id,candidate) values(p_call_id,auth.uid(),p_candidate); end $$;
create or replace function public.get_vip_call_candidates(p_call_id uuid) returns table(sender_id uuid,candidate jsonb,created_at timestamptz) language sql security definer set search_path=public as $$ select c.sender_id,c.candidate,c.created_at from public.cp_vip_call_candidates c join public.cp_vip_call_sessions s on s.id=c.call_id where c.call_id=p_call_id and (s.caller_id=auth.uid() or s.callee_id=auth.uid()) order by c.id $$;
create or replace function public.end_vip_private_call(p_call_id uuid,p_status text default 'ended') returns public.cp_vip_call_sessions language plpgsql security definer set search_path=public as $$ declare r public.cp_vip_call_sessions; begin update public.cp_vip_call_sessions set status=p_status,ended_at=now() where id=p_call_id and (caller_id=auth.uid() or callee_id=auth.uid()) returning * into r; if r.id is null then raise exception 'Call not found'; end if; return r; end $$;
create or replace function public.consume_vip_group_call_time(p_call_type text,p_seconds integer) returns table(allowed boolean,remaining_seconds integer) language plpgsql security definer set search_path=public as $$
declare v_used integer; v_limit integer:=1800;
begin
 if p_call_type not in ('voice','video') or p_seconds<0 or p_seconds>1800 then raise exception 'Invalid call usage'; end if;
 if not exists(select 1 from public.profiles where id=auth.uid() and is_vip=true and (vip_expires_at is null or vip_expires_at>now())) then raise exception 'Active VIP required'; end if;
 insert into public.cp_vip_group_call_usage(user_id,usage_day) values(auth.uid(),current_date) on conflict do nothing;
 if p_call_type='voice' then select voice_seconds into v_used from public.cp_vip_group_call_usage where user_id=auth.uid() and usage_day=current_date for update; if v_used+p_seconds>v_limit then return query select false,greatest(0,v_limit-v_used); end if; update public.cp_vip_group_call_usage set voice_seconds=voice_seconds+p_seconds where user_id=auth.uid() and usage_day=current_date;
 else select video_seconds into v_used from public.cp_vip_group_call_usage where user_id=auth.uid() and usage_day=current_date for update; if v_used+p_seconds>v_limit then return query select false,greatest(0,v_limit-v_used); end if; update public.cp_vip_group_call_usage set video_seconds=video_seconds+p_seconds where user_id=auth.uid() and usage_day=current_date;
 end if;
 return query select true,greatest(0,v_limit-v_used-p_seconds);
end $$;
grant execute on function public.start_vip_private_call(uuid,text),public.get_my_incoming_vip_calls(),public.get_vip_call(uuid),public.set_vip_call_offer(uuid,jsonb),public.set_vip_call_answer(uuid,jsonb),public.add_vip_call_candidate(uuid,jsonb),public.get_vip_call_candidates(uuid),public.end_vip_private_call(uuid,text),public.consume_vip_group_call_time(text,integer) to authenticated;

revoke execute on function public.start_vip_private_call(uuid,text),public.get_my_incoming_vip_calls(),public.get_vip_call(uuid),public.set_vip_call_offer(uuid,jsonb),public.set_vip_call_answer(uuid,jsonb),public.add_vip_call_candidate(uuid,jsonb),public.get_vip_call_candidates(uuid),public.end_vip_private_call(uuid,text),public.consume_vip_group_call_time(text,integer) from anon;
create policy "deny_vip_call_sessions_api" on public.cp_vip_call_sessions for all to authenticated using(false) with check(false);
create policy "deny_vip_call_candidates_api" on public.cp_vip_call_candidates for all to authenticated using(false) with check(false);
create policy "deny_vip_group_call_usage_api" on public.cp_vip_group_call_usage for all to authenticated using(false) with check(false);
