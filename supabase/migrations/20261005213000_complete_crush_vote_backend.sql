alter table public.crush_vote_ad_sessions add column if not exists credits_remaining integer not null default 0;
alter table public.crush_vote_ad_sessions add column if not exists expires_at timestamptz;
alter table public.crush_votes add column if not exists vote_source text not null default 'free' check(vote_source in ('free','ad','paid'));
create unique index if not exists crush_votes_unique_voter_nominee on public.crush_votes(cycle_id,voter_id,nominee_id);

create or replace function public.start_crush_vote_ad_secure() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_id uuid;
begin if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
insert into public.crush_vote_ad_sessions(user_id,nominee_id,status,started_at,expires_at) values(v_uid,(select id from public.crush_nominees order by created_at desc limit 1),'started',now(),now()+interval '10 minutes') returning id into v_id;
return jsonb_build_object('session_id',v_id,'expires_at',now()+interval '10 minutes'); end $$;

create or replace function public.complete_crush_vote_ad_secure(p_session_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_status text; v_exp timestamptz;
begin select status,expires_at into v_status,v_exp from public.crush_vote_ad_sessions where id=p_session_id and user_id=v_uid for update;
if not found then raise exception 'AD_SESSION_NOT_FOUND'; end if; if v_status<>'started' then raise exception 'AD_SESSION_ALREADY_COMPLETED'; end if; if v_exp<now() then update public.crush_vote_ad_sessions set status='expired' where id=p_session_id; raise exception 'AD_SESSION_EXPIRED'; end if;
update public.crush_vote_ad_sessions set status='completed',credits_remaining=3,completed_at=now() where id=p_session_id; return jsonb_build_object('session_id',p_session_id,'free_votes_added',3); end $$;

create or replace function public.cast_crush_vote_secure(p_nominee_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_nom public.crush_nominees%rowtype; v_cycle uuid; v_free_used integer; v_credit_session uuid; v_source text:='free'; v_charged integer:=0;
begin if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if; select * into v_nom from public.crush_nominees where id=p_nominee_id; if not found then raise exception 'NOMINEE_NOT_FOUND'; end if;
v_cycle:=v_nom.cycle_id; if not exists(select 1 from public.crush_cycles where id=v_cycle and status='open' and now() between starts_at and ends_at) then raise exception 'CYCLE_CLOSED'; end if;
if exists(select 1 from public.crush_votes where cycle_id=v_cycle and voter_id=v_uid and nominee_id=p_nominee_id) then raise exception 'ALREADY_VOTED_FOR_NOMINEE'; end if;
select count(*)::int into v_free_used from public.crush_votes where cycle_id=v_cycle and voter_id=v_uid and vote_source='free';
if v_free_used<3 then v_source:='free'; else select id into v_credit_session from public.crush_vote_ad_sessions where user_id=v_uid and status='completed' and credits_remaining>0 and expires_at>now() order by completed_at asc limit 1 for update;
if v_credit_session is not null then update public.crush_vote_ad_sessions set credits_remaining=credits_remaining-1 where id=v_credit_session; v_source:='ad'; else perform public.spend_bc(1,'crush_vote','crush_nominee',p_nominee_id,null); v_source:='paid'; v_charged:=1; end if; end if;
insert into public.crush_votes(cycle_id,voter_id,nominee_id,vote_source) values(v_cycle,v_uid,p_nominee_id,v_source);
if v_source='free' then perform public.award_xp('wcw_vote',null,'crush_vote:'||v_cycle::text||':'||v_uid::text||':'||p_nominee_id::text); end if;
return jsonb_build_object('nominee_id',p_nominee_id,'vote_source',v_source,'charged_bc',v_charged,'free_votes_used',case when v_source='free' then v_free_used+1 else v_free_used end,'ad_vote_credits_used',case when v_source='ad' then 1 else 0 end);
end $$;

create or replace function public.vote_crush(p_cycle_id uuid,p_nominee_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin if not exists(select 1 from public.crush_nominees where id=p_nominee_id and cycle_id=p_cycle_id) then raise exception 'NOMINEE_NOT_IN_CYCLE'; end if; perform public.cast_crush_vote_secure(p_nominee_id); end $$;

create or replace function public.add_crush_comment_secure(p_nominee_id uuid,p_body text,p_attachment_url text default null,p_attachment_type text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_id uuid; begin if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if; if length(trim(coalesce(p_body,'')))=0 then raise exception 'COMMENT_REQUIRED'; end if;
if not exists(select 1 from public.crush_nominees where id=p_nominee_id) then raise exception 'NOMINEE_NOT_FOUND'; end if;
insert into public.crush_comments(nominee_id,user_id,body) values(p_nominee_id,v_uid,trim(p_body)) returning id into v_id; return v_id; end $$;

create or replace function public.report_crush_secure(p_nominee_id uuid,p_reason text,p_details text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; begin if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
insert into public.crush_reports(nominee_id,reporter_id,reason) values(p_nominee_id,auth.uid(),trim(p_reason)||case when p_details is null or trim(p_details)='' then '' else ' — '||trim(p_details) end) returning id into v_id; return v_id; end $$;