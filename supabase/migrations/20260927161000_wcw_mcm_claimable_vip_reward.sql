alter table public.crush_winners add column if not exists vip_claimed_at timestamptz;

create or replace function public.close_crush_week_secure()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_kind text; current_start date:=public.crush_period_start('wcw',current_date); prev_start date:=current_start-7; v_row record; results jsonb:='[]'::jsonb;
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
        insert into public.crush_badges(user_id,kind,award_count,latest_week)
        values(v_row.user_id,v_kind,1,current_start)
        on conflict(user_id,kind) do update set award_count=public.crush_badges.award_count+1,latest_week=excluded.latest_week,updated_at=now();
        insert into public.cp_notifications(user_id,title,body,created_at)
        values(v_row.user_id,case when v_kind='wcw' then 'WCW Champion 👑' else 'MCM Champion 👑' end,'You won this week. Claim your free 7-day VIP reward from WCW/MCM.',now());
        results:=results||jsonb_build_array(jsonb_build_object('kind',v_kind,'name',v_row.display_name,'votes',v_row.votes,'vip_days',7,'reward_bc',100));
      end if;
    end if;
  end loop;
  return jsonb_build_object('closed',jsonb_array_length(results)>0,'winners',results);
end;
$$;

create or replace function public.claim_crush_vip_secure(p_kind text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); w public.crush_winners%rowtype; until_at timestamptz;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_kind not in ('wcw','mcm') then raise exception 'Invalid winner type'; end if;
  select * into w from public.crush_winners where kind=p_kind and user_id=uid and week_start=public.crush_period_start(p_kind,current_date) order by created_at desc limit 1 for update;
  if w.id is null then raise exception 'You do not have an active weekly winner reward'; end if;
  if w.vip_claimed_at is not null then raise exception 'Your weekly VIP has already been claimed'; end if;
  until_at:=greatest(coalesce((select vip_expires_at from public.profiles where id=uid),now()),now())+interval '7 days';
  update public.profiles set is_vip=true,vip_expires_at=until_at,updated_at=now() where id=uid;
  update public.crush_winners set vip_claimed_at=now() where id=w.id;
  insert into public.cp_notifications(user_id,title,body,created_at) values(uid,'VIP claimed 👑','Your free 7-day VIP reward is now active.',now());
  return jsonb_build_object('ok',true,'vip_expires_at',until_at);
end;
$$;
grant execute on function public.claim_crush_vip_secure(text) to authenticated;