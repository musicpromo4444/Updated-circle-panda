-- Final production hardening for the universal activity engine.
-- The server closes due cycles every minute; clients are only presentation/entry surfaces.

create table if not exists public.cp_activity_winner_badges (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cp_activity_winner_cycles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_name text not null,
  awarded_at timestamptz not null default now(),
  unique(cycle_id,user_id,badge_name)
);

alter table public.cp_activity_winner_badges enable row level security;
revoke all on public.cp_activity_winner_badges from anon, public;
grant select on public.cp_activity_winner_badges to authenticated;
drop policy if exists "winner badges own read" on public.cp_activity_winner_badges;
create policy "winner badges own read"
  on public.cp_activity_winner_badges for select
  to authenticated
  using (user_id=auth.uid());

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
  if now() < c.ends_at then raise exception 'Activity is still open'; end if;

  if c.winner_mode='manual' then
    chosen := c.manual_winner_id;
    if chosen is not null then
      select display_name, avatar_url into chosen_name, chosen_avatar from public.profiles where id=chosen;
      if not exists(select 1 from public.cp_activity_winner_entries where cycle_id=p_cycle_id and user_id=chosen) then
        raise exception 'Selected manual winner did not participate';
      end if;
      select max(score) into chosen_score from public.cp_activity_winner_entries where cycle_id=p_cycle_id and user_id=chosen;
    end if;
  elsif c.winner_mode='random' then
    select e.user_id, coalesce(p.display_name,'Anonymous Panda'), p.avatar_url, e.score
      into chosen, chosen_name, chosen_avatar, chosen_score
    from public.cp_activity_winner_entries e
    left join public.profiles p on p.id=e.user_id
    where e.cycle_id=p_cycle_id
    order by random()
    limit 1;
  else
    select sum(1 + greatest(0,coalesce(e.score,0))*greatest(0,c.activity_weight) +
               greatest(0,coalesce(x.xp,0))*greatest(0,c.xp_weight))
      into total_weight
    from (select distinct user_id from public.cp_activity_winner_entries where cycle_id=p_cycle_id) u
    join public.cp_activity_winner_entries e on e.cycle_id=p_cycle_id and e.user_id=u.user_id
    left join public.user_xp x on x.user_id=u.user_id;

    if coalesce(total_weight,0) > 0 then
      pick := random()*total_weight;
      for r in
        select u.user_id, coalesce(p.display_name,'Anonymous Panda') display_name,
               p.avatar_url,
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
    if c.winner_badge is not null then
      insert into public.cp_activity_winner_badges(cycle_id,user_id,badge_name)
      values(p_cycle_id,chosen,c.winner_badge)
      on conflict(cycle_id,user_id,badge_name) do nothing;
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

create or replace function public.cp_finalize_due_winner_cycles_internal()
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare r record; n integer:=0;
begin
  for r in
    select id from public.cp_activity_winner_cycles
    where status in ('scheduled','open') and ends_at <= now()
    order by ends_at
    for update skip locked
  loop
    begin
      perform public.cp_finalize_winner_cycle(r.id);
      n:=n+1;
    exception when others then
      null;
    end;
  end loop;
  return n;
end;
$$;

revoke all on function public.cp_finalize_due_winner_cycles_internal() from public,anon,authenticated;

create extension if not exists pg_cron with schema extensions;

do $$
begin
  perform cron.unschedule('circle-panda-universal-activity-finalizer');
exception when others then
  null;
end $$;

select cron.schedule(
  'circle-panda-universal-activity-finalizer',
  '* * * * *',
  $$select public.cp_finalize_due_winner_cycles_internal();$$
);
