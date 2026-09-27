create table if not exists public.crush_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('wcw','mcm')),
  award_count integer not null default 1 check (award_count > 0),
  latest_week date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, kind)
);
alter table public.crush_badges enable row level security;
drop policy if exists "crush badges readable" on public.crush_badges;
create policy "crush badges readable" on public.crush_badges for select to authenticated using (true);

create unique index if not exists crush_winners_week_kind_uidx on public.crush_winners(week_start, kind);

create or replace function public.crush_period_start(p_kind text, p_ref_date date default current_date)
returns date language sql stable as $$ select date_trunc('week', p_ref_date::timestamp)::date; $$;

create or replace function public.get_wcw_mcm_current_week()
returns table (id uuid,user_id uuid,display_name text,kind text,blurb text,emoji text,media_url text,media_type text,week_start date,vote_count bigint,reaction_count bigint,my_vote boolean,my_reaction text)
language sql stable as $$
  select n.id,n.user_id,n.display_name,n.kind,n.blurb,n.emoji,n.media_url,n.media_type,n.week_start,
    count(distinct v.user_id)::bigint,count(distinct r.user_id)::bigint,
    exists(select 1 from public.crush_votes v2 where v2.nominee_id=n.id and v2.user_id=(select auth.uid())),
    (select r2.reaction from public.crush_reactions r2 where r2.nominee_id=n.id and r2.user_id=(select auth.uid()) limit 1)
  from public.crush_nominees n
  left join public.crush_votes v on v.nominee_id=n.id
  left join public.crush_reactions r on r.nominee_id=n.id
  where n.week_start=public.crush_period_start(n.kind,current_date) and n.kind in ('wcw','mcm')
  group by n.id,n.user_id,n.display_name,n.kind,n.blurb,n.emoji,n.media_url,n.media_type,n.week_start,n.created_at
  order by n.kind,vote_count desc,n.created_at asc;
$$;

create or replace function public.submit_crush_media_secure(p_media_url text,p_media_type text,p_caption text default '',p_emoji text default '🐼')
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); gender text; kind text; nid uuid; period_start date; pname text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_media_url is null or length(trim(p_media_url))<10 then raise exception 'Media is required'; end if;
  if p_media_type not in ('image','video') then raise exception 'Unsupported media type'; end if;
  select p.gender,coalesce(nullif(trim(p.display_name),''),'Anonymous Panda') into gender,pname from public.profiles p where p.id=uid;
  if gender is null then raise exception 'Choose your account gender before posting to MCM/WCW'; end if;
  kind:=case when gender='male' then 'mcm' else 'wcw' end;
  period_start:=public.crush_period_start(kind,current_date);
  if p_media_url not like '%'||uid::text||'%' then raise exception 'Invalid Circle Panda media path'; end if;
  if exists(select 1 from public.crush_nominees n where n.user_id=uid and n.kind=kind and n.week_start=period_start) then raise exception 'You already uploaded your MCM/WCW entry this week'; end if;
  insert into public.crush_nominees(user_id,display_name,kind,blurb,emoji,week_start,media_url,media_type)
  values(uid,pname,kind,trim(coalesce(p_caption,'')),coalesce(p_emoji,'🐼'),period_start,trim(p_media_url),p_media_type) returning id into nid;
  return jsonb_build_object('id',nid,'kind',kind,'week_start',period_start);
end;
$$;

create or replace function public.close_crush_week_secure()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_kind text; current_start date:=public.crush_period_start('wcw',current_date); prev_start date:=current_start-7; v_row record; results jsonb:='[]'::jsonb; vip_until timestamptz;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  foreach v_kind in array array['wcw','mcm'] loop
    if not exists(select 1 from public.crush_winners where week_start=current_start and kind=v_kind) then
      select n.id,n.user_id,n.display_name,n.kind,count(v.id)::bigint as votes into v_row
      from public.crush_nominees n left join public.crush_votes v on v.nominee_id=n.id
      where n.week_start=prev_start and n.kind=v_kind
      group by n.id,n.user_id,n.display_name,n.kind,n.created_at order by count(v.id) desc,n.created_at asc limit 1;
      if v_row.id is not null then
        insert into public.crush_winners(week_start,kind,nominee_id,user_id,display_name,vote_count,reward_bc)
        values(current_start,v_kind,v_row.id,v_row.user_id,v_row.display_name,v_row.votes,100)
        on conflict (week_start,kind) do nothing;
        insert into public.bc_accounts(user_id,balance,updated_at) values(v_row.user_id,100,now())
        on conflict(user_id) do update set balance=public.bc_accounts.balance+100,updated_at=now();
        insert into public.bc_ledger(user_id,amount,reason,reference_type,reference_id)
        values(v_row.user_id,100,'WCW/MCM weekly winner reward','crush_winner',v_row.id) on conflict do nothing;
        select greatest(coalesce(vip_expires_at,now()),now())+interval '7 days' into vip_until from public.profiles where id=v_row.user_id;
        update public.profiles set is_vip=true,vip_expires_at=vip_until,updated_at=now() where id=v_row.user_id;
        insert into public.crush_badges(user_id,kind,award_count,latest_week) values(v_row.user_id,v_kind,1,current_start)
        on conflict(user_id,kind) do update set award_count=public.crush_badges.award_count+1,latest_week=excluded.latest_week,updated_at=now();
        insert into public.cp_notifications(user_id,title,body,created_at)
        values(v_row.user_id,case when v_kind='wcw' then 'WCW Champion 👑' else 'MCM Champion 👑' end,'You won this week and received 7 days of VIP plus 100 BC. Your badge count has been updated.',now());
        results:=results||jsonb_build_array(jsonb_build_object('kind',v_kind,'name',v_row.display_name,'votes',v_row.votes,'vip_days',7,'reward_bc',100));
      end if;
    end if;
  end loop;
  return jsonb_build_object('closed',jsonb_array_length(results)>0,'winners',results);
end;
$$;

grant execute on function public.get_wcw_mcm_current_week() to anon,authenticated;
grant execute on function public.submit_crush_media_secure(text,text,text,text) to authenticated;
grant execute on function public.close_crush_week_secure() to authenticated;