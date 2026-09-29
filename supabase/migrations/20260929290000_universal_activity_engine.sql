-- Circle Panda universal activity engine
-- Previous winner -> activity -> server cutoff -> automatic rewards -> winner announcement.
-- No demo winners or seed users are created.

create table if not exists public.cp_activity_winner_cycles (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'global',
  activity_id uuid null,
  activity_key text not null,
  title text not null,
  prize text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','open','closed','cancelled')),
  winner_mode text not null default 'weighted' check (winner_mode in ('weighted','random','manual')),
  xp_weight numeric not null default 0.5,
  activity_weight numeric not null default 0.5,
  manual_winner_id uuid null,
  max_attempts integer not null default 1 check (max_attempts between 1 and 100),
  entry_limit integer null check (entry_limit is null or entry_limit > 0),
  eligibility jsonb not null default '{}'::jsonb,
  completion_reward_bc bigint not null default 0 check (completion_reward_bc >= 0),
  completion_reward_xp bigint not null default 0 check (completion_reward_xp >= 0),
  winner_reward_bc bigint not null default 0 check (winner_reward_bc >= 0),
  winner_reward_xp bigint not null default 0 check (winner_reward_xp >= 0),
  winner_badge text null,
  previous_winner_id uuid null,
  previous_winner_name text null,
  previous_winner_avatar text null,
  previous_winner_prize text null,
  previous_winner_score numeric null,
  winner_id uuid null,
  winner_name text null,
  winner_score numeric null,
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cp_activity_cycle_time check (ends_at > starts_at)
);

create index if not exists cp_activity_winner_cycles_key_time_idx
  on public.cp_activity_winner_cycles(activity_key, starts_at desc, ends_at desc);

create table if not exists public.cp_activity_winner_entries (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cp_activity_winner_cycles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_no integer not null,
  score numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  completion_rewarded boolean not null default false,
  created_at timestamptz not null default now(),
  unique(cycle_id,user_id,attempt_no)
);

create index if not exists cp_activity_winner_entries_cycle_idx
  on public.cp_activity_winner_entries(cycle_id, created_at desc);
create index if not exists cp_activity_winner_entries_user_idx
  on public.cp_activity_winner_entries(user_id, cycle_id);

create table if not exists public.cp_activity_winner_announcements (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null unique references public.cp_activity_winner_cycles(id) on delete cascade,
  activity_title text not null,
  winner_name text not null,
  winner_avatar text null,
  prize text not null,
  score numeric null,
  message text not null,
  visible_until timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists cp_activity_winner_announcements_visible_idx
  on public.cp_activity_winner_announcements(visible_until desc, created_at desc);

alter table public.cp_activity_winner_cycles enable row level security;
alter table public.cp_activity_winner_entries enable row level security;
alter table public.cp_activity_winner_announcements enable row level security;

drop policy if exists "winner cycles authenticated read" on public.cp_activity_winner_cycles;
create policy "winner cycles authenticated read"
  on public.cp_activity_winner_cycles for select
  to authenticated
  using (true);

drop policy if exists "winner entries own read" on public.cp_activity_winner_entries;
create policy "winner entries own read"
  on public.cp_activity_winner_entries for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "winner announcements authenticated read" on public.cp_activity_winner_announcements;
create policy "winner announcements authenticated read"
  on public.cp_activity_winner_announcements for select
  to authenticated
  using (true);

revoke all on public.cp_activity_winner_cycles from anon, public;
revoke all on public.cp_activity_winner_entries from anon, public;
revoke all on public.cp_activity_winner_announcements from anon, public;
grant select on public.cp_activity_winner_cycles to authenticated;
grant select on public.cp_activity_winner_entries to authenticated;
grant select on public.cp_activity_winner_announcements to authenticated;

create or replace function public.cp_start_winner_cycle(
  p_scope text,
  p_activity_id uuid default null,
  p_activity_key text default 'global',
  p_title text default 'Circle Panda Activity',
  p_prize text default 'Circle Panda Prize',
  p_starts_at timestamptz default now(),
  p_ends_at timestamptz default now() + interval '1 hour',
  p_winner_mode text default 'weighted',
  p_xp_weight numeric default 0.5,
  p_activity_weight numeric default 0.5,
  p_manual_winner_id uuid default null,
  p_max_attempts integer default 1,
  p_entry_limit integer default null,
  p_eligibility jsonb default '{}'::jsonb,
  p_completion_reward_bc bigint default 0,
  p_completion_reward_xp bigint default 0,
  p_winner_reward_bc bigint default 0,
  p_winner_reward_xp bigint default 0,
  p_winner_badge text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  previous record;
  cid uuid;
begin
  if uid is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if trim(coalesce(p_activity_key,'')) = '' or trim(coalesce(p_title,'')) = '' or trim(coalesce(p_prize,'')) = '' then
    raise exception 'Activity key, title and prize are required';
  end if;
  if p_ends_at <= p_starts_at then raise exception 'End time must be after start time'; end if;
  if p_winner_mode not in ('weighted','random','manual') then raise exception 'Invalid winner mode'; end if;
  if p_winner_mode = 'manual' and p_manual_winner_id is null then raise exception 'Manual winner is required'; end if;
  if p_max_attempts < 1 or p_max_attempts > 100 then raise exception 'Invalid attempt limit'; end if;
  if p_entry_limit is not null and p_entry_limit < 1 then raise exception 'Invalid entry limit'; end if;

  select a.winner_id, a.winner_name, a.winner_avatar, a.prize, a.score
    into previous
  from public.cp_activity_winner_announcements a
  order by a.created_at desc
  limit 1;

  insert into public.cp_activity_winner_cycles(
    scope,activity_id,activity_key,title,prize,starts_at,ends_at,status,
    winner_mode,xp_weight,activity_weight,manual_winner_id,max_attempts,entry_limit,
    eligibility,completion_reward_bc,completion_reward_xp,winner_reward_bc,winner_reward_xp,winner_badge,
    previous_winner_id,previous_winner_name,previous_winner_avatar,previous_winner_prize,previous_winner_score
  )
  values(
    coalesce(nullif(trim(p_scope),''),'global'),p_activity_id,trim(p_activity_key),trim(p_title),trim(p_prize),
    p_starts_at,p_ends_at,case when p_starts_at <= now() then 'open' else 'scheduled' end,
    p_winner_mode,greatest(0,p_xp_weight),greatest(0,p_activity_weight),p_manual_winner_id,p_max_attempts,p_entry_limit,
    coalesce(p_eligibility,'{}'::jsonb),greatest(0,p_completion_reward_bc),greatest(0,p_completion_reward_xp),
    greatest(0,p_winner_reward_bc),greatest(0,p_winner_reward_xp),nullif(trim(coalesce(p_winner_badge,'')),''),
    previous.winner_id,previous.winner_name,nullif(previous.winner_avatar,''),previous.prize,previous.score
  ) returning id into cid;

  return cid;
end;
$$;

create or replace function public.cp_submit_winner_activity(
  p_cycle_id uuid,
  p_score numeric default 0,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  c public.cp_activity_winner_cycles;
  attempts integer;
  total_entries integer;
  eid uuid;
  reward_bc bigint := 0;
  reward_xp bigint := 0;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select * into c from public.cp_activity_winner_cycles where id=p_cycle_id for update;
  if not found then raise exception 'Activity cycle not found'; end if;

  if c.status in ('closed','cancelled') or now() >= c.ends_at then
    perform public.cp_finalize_winner_cycle(p_cycle_id);
    raise exception 'This activity is closed';
  end if;
  if now() < c.starts_at then raise exception 'This activity has not started'; end if;

  select count(*) into attempts from public.cp_activity_winner_entries
  where cycle_id=p_cycle_id and user_id=uid;
  if attempts >= c.max_attempts then raise exception 'Attempt limit reached'; end if;

  if c.entry_limit is not null then
    select count(*) into total_entries from public.cp_activity_winner_entries where cycle_id=p_cycle_id;
    if total_entries >= c.entry_limit then raise exception 'Entry limit reached'; end if;
  end if;

  insert into public.cp_activity_winner_entries(cycle_id,user_id,attempt_no,score,metadata)
  values(p_cycle_id,uid,attempts+1,greatest(0,coalesce(p_score,0)),coalesce(p_metadata,'{}'::jsonb))
  returning id into eid;

  if attempts = 0 then
    reward_bc := c.completion_reward_bc;
    reward_xp := c.completion_reward_xp;
    update public.cp_activity_winner_entries set completion_rewarded=true where id=eid;
    if reward_bc > 0 then
      update public.bc_accounts set balance=balance+reward_bc, updated_at=now() where user_id=uid;
      insert into public.bc_ledger(user_id,amount,reason,reference_type,reference_id)
      values(uid,reward_bc,'Universal activity completion','universal_activity',eid);
    end if;
    if reward_xp > 0 then
      insert into public.user_xp(user_id,xp,updated_at)
      values(uid,reward_xp,now())
      on conflict(user_id) do update set xp=public.user_xp.xp+excluded.xp,updated_at=now();
    end if;
  end if;

  return jsonb_build_object('entry_id',eid,'attempt',attempts+1,'completion_reward_bc',reward_bc,'completion_reward_xp',reward_xp);
end;
$$;

create or replace function public.cp_finalize_winner_cycle(p_cycle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c public.cp_activity_winner_cycles;
  chosen uuid;
  chosen_name text;
  chosen_avatar text;
  chosen_score numeric;
  total_weight numeric;
  pick numeric;
  running numeric := 0;
  r record;
  winner_bc bigint := 0;
  winner_xp bigint := 0;
  aid uuid;
begin
  select * into c from public.cp_activity_winner_cycles where id=p_cycle_id for update;
  if not found then raise exception 'Activity cycle not found'; end if;
  if c.status='closed' then
    select id into aid from public.cp_activity_winner_announcements where cycle_id=p_cycle_id limit 1;
    return jsonb_build_object('closed',true,'announcement_id',aid);
  end if;
  if now() < c.ends_at and c.status <> 'closed' then
    raise exception 'Activity is still open';
  end if;

  if c.winner_mode='manual' then
    chosen := c.manual_winner_id;
    if chosen is not null then
      select display_name into chosen_name from public.profiles where id=chosen;
    end if;
  else
    select sum(1 + greatest(0,coalesce(e.score,0))*greatest(0,c.activity_weight) +
               greatest(0,coalesce(x.xp,0))*greatest(0,c.xp_weight))
      into total_weight
    from (select distinct user_id from public.cp_activity_winner_entries where cycle_id=p_cycle_id) u
    join public.cp_activity_winner_entries e on e.cycle_id=p_cycle_id and e.user_id=u.user_id
    left join public.user_xp x on x.user_id=u.user_id;

    if coalesce(total_weight,0) <= 0 then
      chosen := null;
    else
      pick := random()*total_weight;
      for r in
        select u.user_id, coalesce(p.display_name,'Anonymous Panda') display_name,
               coalesce(p.avatar_url,'') avatar_url,
               sum(1 + greatest(0,coalesce(e.score,0))*greatest(0,c.activity_weight) +
                   greatest(0,coalesce(x.xp,0))*greatest(0,c.xp_weight)) weight,
               max(e.score) score
        from (select distinct user_id from public.cp_activity_winner_entries where cycle_id=p_cycle_id) u
        join public.cp_activity_winner_entries e on e.cycle_id=p_cycle_id and e.user_id=u.user_id
        left join public.user_xp x on x.user_id=u.user_id
        left join public.profiles p on p.id=u.user_id
        group by u.user_id,p.display_name,p.avatar_url
        order by u.user_id
      loop
        running := running + r.weight;
        if running >= pick then
          chosen := r.user_id; chosen_name := r.display_name; chosen_avatar := r.avatar_url; chosen_score := r.score; exit;
        end if;
      end loop;
    end if;
  end if;

  if chosen is not null and chosen_name is null then
    select display_name, avatar_url into chosen_name, chosen_avatar from public.profiles where id=chosen;
  end if;
  if chosen is not null and chosen_score is null then
    select max(score) into chosen_score from public.cp_activity_winner_entries where cycle_id=p_cycle_id and user_id=chosen;
  end if;

  update public.cp_activity_winner_cycles
    set status='closed',closed_at=now(),winner_id=chosen,winner_name=chosen_name,winner_score=chosen_score,updated_at=now()
  where id=p_cycle_id;

  if chosen is not null then
    winner_bc := c.winner_reward_bc;
    winner_xp := c.winner_reward_xp;
    if winner_bc > 0 then
      update public.bc_accounts set balance=balance+winner_bc,updated_at=now() where user_id=chosen;
      insert into public.bc_ledger(user_id,amount,reason,reference_type,reference_id)
      values(chosen,winner_bc,'Universal activity winner reward','universal_activity_winner',p_cycle_id);
    end if;
    if winner_xp > 0 then
      insert into public.user_xp(user_id,xp,updated_at)
      values(chosen,winner_xp,now())
      on conflict(user_id) do update set xp=public.user_xp.xp+excluded.xp,updated_at=now();
    end if;

    insert into public.cp_activity_winner_announcements(
      cycle_id,activity_title,winner_name,winner_avatar,prize,score,message,visible_until
    ) values(
      p_cycle_id,c.title,coalesce(chosen_name,'Anonymous Panda'),nullif(chosen_avatar,''),
      c.prize,chosen_score,
      coalesce(chosen_name,'Anonymous Panda')||' won '||c.prize||'.',
      now()+interval '20 seconds'
    )
    on conflict(cycle_id) do nothing;
  end if;

  return jsonb_build_object('closed',true,'winner_id',chosen,'winner_name',chosen_name,'winner_score',chosen_score);
end;
$$;

revoke all on function public.cp_start_winner_cycle(text,uuid,text,text,text,timestamptz,timestamptz,text,numeric,numeric,uuid,integer,integer,jsonb,bigint,bigint,bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.cp_start_winner_cycle(text,uuid,text,text,text,timestamptz,timestamptz,text,numeric,numeric,uuid,integer,integer,jsonb,bigint,bigint,bigint,bigint,text) to authenticated;

revoke all on function public.cp_submit_winner_activity(uuid,numeric,jsonb) from public,anon;
grant execute on function public.cp_submit_winner_activity(uuid,numeric,jsonb) to authenticated;

revoke all on function public.cp_finalize_winner_cycle(uuid) from public,anon;
grant execute on function public.cp_finalize_winner_cycle(uuid) to authenticated;

-- Keep statuses accurate whenever a cycle is read/submitted after its cutoff.
create or replace function public.cp_get_winner_cycle(p_activity_key text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare c public.cp_activity_winner_cycles; result jsonb;
begin
  select * into c
  from public.cp_activity_winner_cycles
  where activity_key=p_activity_key and status in ('scheduled','open')
    and starts_at <= now() and ends_at > now()
  order by starts_at desc limit 1;
  if c.id is null then return null; end if;
  if c.status='scheduled' then
    update public.cp_activity_winner_cycles set status='open',updated_at=now() where id=c.id;
  end if;
  return to_jsonb(c);
end;
$$;

revoke all on function public.cp_get_winner_cycle(text) from public,anon;
grant execute on function public.cp_get_winner_cycle(text) to authenticated;
