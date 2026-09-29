create or replace function public.hot_seat_is_live_phase(p_host_id uuid)
returns boolean language sql stable security definer set search_path=public,private as $$
  select exists (select 1 from public.hot_seat_hosts h where h.id=p_host_id and h.is_active=true and h.started_at<=now() and h.ends_at>now()
    and (h.pause_until is null or h.pause_until<=now())
    and (extract(epoch from (now()-h.started_at))::bigint % 14400) < 10800);
$$;

-- Secure Hot Seat interactions against water-break/scheduled/paused states.
create or replace function public.send_hot_seat_chat_secure(p_host_id uuid,p_body text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare uid uuid:=auth.uid(); mid uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if length(trim(p_body))=0 or length(trim(p_body))>500 then raise exception 'Message must be 1-500 characters'; end if;
 if not public.hot_seat_is_live_phase(p_host_id) then raise exception 'Hot Seat is not in a live phase'; end if;
 insert into public.hot_seat_chat(host_id,user_id,alias,body,is_gift) values(p_host_id,uid,'Anonymous Panda',trim(p_body),false) returning id into mid;
 return jsonb_build_object('id',mid);
end $$;

create or replace function public.ask_hot_seat_question_secure(p_host_id uuid,p_body text,p_priority boolean default false)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare uid uuid:=auth.uid(); qid uuid; bal bigint; cost bigint:=case when p_priority then 25 else 0 end;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if length(trim(p_body))=0 or length(p_body)>280 then raise exception 'Question must be 1-280 characters'; end if;
 if not public.hot_seat_is_live_phase(p_host_id) then raise exception 'Hot Seat is not in a live phase'; end if;
 if cost>0 then
  select balance into bal from public.bc_accounts where user_id=uid for update;
  if coalesce(bal,0)<cost then raise exception 'Not enough Panda Coins'; end if;
  update public.bc_accounts set balance=balance-cost,updated_at=now() where user_id=uid;
 end if;
 insert into public.hot_seat_questions(host_id,body,is_priority,asker_alias) values(p_host_id,trim(p_body),p_priority,'Anonymous Panda') returning id into qid;
 if cost>0 then insert into public.bc_ledger(user_id,amount,reason,reference_type,reference_id) values(uid,-cost,'Hot Seat priority question','hot_seat_question',qid); end if;
 return jsonb_build_object('id',qid,'balance',case when cost>0 then bal-cost else null end);
end $$;

create or replace function public.toggle_hot_seat_like(p_host_id uuid)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare uid uuid:=auth.uid(); exists_like boolean;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if not public.hot_seat_is_live_phase(p_host_id) then raise exception 'Hot Seat is not in a live phase'; end if;
 select exists(select 1 from public.hot_seat_likes where user_id=uid and host_id=p_host_id) into exists_like;
 if exists_like then delete from public.hot_seat_likes where user_id=uid and host_id=p_host_id;
 else insert into public.hot_seat_likes(user_id,host_id) values(uid,p_host_id); end if;
 return jsonb_build_object('liked',not exists_like,'count',(select count(*) from public.hot_seat_likes where host_id=p_host_id));
end $$;

create or replace function public.send_hot_seat_gift(p_host_id uuid,p_gift_id text,p_gift_name text,p_gift_emoji text,p_cost_bc bigint)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare uid uuid:=auth.uid(); gid uuid; bal bigint; gift record; host_share bigint;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if not public.hot_seat_is_live_phase(p_host_id) then raise exception 'Hot Seat is not in a live phase'; end if;
 select * into gift from public.hot_seat_gift_catalog where gift_id=p_gift_id and enabled=true;
 if gift.gift_id is null then raise exception 'Gift is not available'; end if;
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