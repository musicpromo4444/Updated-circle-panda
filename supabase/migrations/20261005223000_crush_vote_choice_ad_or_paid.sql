create or replace function private.cast_crush_vote_internal(p_nominee_id uuid,p_mode text default 'auto') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_nom public.crush_nominees%rowtype; v_cycle uuid; v_free_used integer; v_credit_session uuid; v_source text; v_charged integer:=0;
begin
 if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
 select * into v_nom from public.crush_nominees where id=p_nominee_id; if not found then raise exception 'NOMINEE_NOT_FOUND'; end if;
 v_cycle:=v_nom.cycle_id; if not exists(select 1 from public.crush_cycles where id=v_cycle and status='open' and now() between starts_at and ends_at) then raise exception 'CYCLE_CLOSED'; end if;
 if exists(select 1 from public.crush_votes where cycle_id=v_cycle and voter_id=v_uid and nominee_id=p_nominee_id) then raise exception 'ALREADY_VOTED_FOR_NOMINEE'; end if;
 select count(*)::int into v_free_used from public.crush_votes where cycle_id=v_cycle and voter_id=v_uid and vote_source='free';
 if p_mode='paid' then perform public.spend_bc(1,'crush_vote','crush_nominee',p_nominee_id,null); v_source:='paid'; v_charged:=1;
 elsif p_mode='ad' then select id into v_credit_session from public.crush_vote_ad_sessions where user_id=v_uid and status='completed' and credits_remaining>0 and expires_at>now() order by completed_at asc limit 1 for update; if v_credit_session is null then raise exception 'NO_AD_VOTE_CREDIT'; end if; update public.crush_vote_ad_sessions set credits_remaining=credits_remaining-1 where id=v_credit_session; v_source:='ad';
 else
   if v_free_used<3 then v_source:='free'; else
     select id into v_credit_session from public.crush_vote_ad_sessions where user_id=v_uid and status='completed' and credits_remaining>0 and expires_at>now() order by completed_at asc limit 1 for update;
     if v_credit_session is not null then update public.crush_vote_ad_sessions set credits_remaining=credits_remaining-1 where id=v_credit_session; v_source:='ad';
     else raise exception 'FREE_VOTES_EXHAUSTED'; end if;
   end if;
 end if;
 insert into public.crush_votes(cycle_id,voter_id,nominee_id,vote_source) values(v_cycle,v_uid,p_nominee_id,v_source);
 if v_source='free' then perform public.award_xp('wcw_vote',null,'crush_vote:'||v_cycle::text||':'||v_uid::text||':'||p_nominee_id::text); end if;
 return jsonb_build_object('nominee_id',p_nominee_id,'vote_source',v_source,'charged_bc',v_charged,'free_votes_used',case when v_source='free' then v_free_used+1 else v_free_used end,'ad_vote_credits_used',case when v_source='ad' then 1 else 0 end);
end $$;
create or replace function private.cast_crush_vote_secure(p_nominee_id uuid) returns jsonb language sql security definer set search_path=public,pg_temp as $$ select private.cast_crush_vote_internal($1,'auto') $$;
create or replace function private.cast_crush_vote_paid_secure(p_nominee_id uuid) returns jsonb language sql security definer set search_path=public,pg_temp as $$ select private.cast_crush_vote_internal($1,'paid') $$;
create or replace function public.cast_crush_vote_secure(p_nominee_id uuid) returns jsonb language sql security invoker set search_path=public,pg_temp as $$ select private.cast_crush_vote_secure($1) $$;
create or replace function public.cast_crush_vote_paid_secure(p_nominee_id uuid) returns jsonb language sql security invoker set search_path=public,pg_temp as $$ select private.cast_crush_vote_paid_secure($1) $$;
revoke all on function private.cast_crush_vote_internal(uuid,text),private.cast_crush_vote_secure(uuid),private.cast_crush_vote_paid_secure(uuid) from public,anon;
grant execute on function private.cast_crush_vote_internal(uuid,text),private.cast_crush_vote_secure(uuid),private.cast_crush_vote_paid_secure(uuid) to authenticated;
revoke all on function public.cast_crush_vote_secure(uuid),public.cast_crush_vote_paid_secure(uuid) from public,anon;
grant execute on function public.cast_crush_vote_secure(uuid),public.cast_crush_vote_paid_secure(uuid) to authenticated;