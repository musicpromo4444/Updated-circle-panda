-- Dating: create the 72-hour free chat at mutual match and enforce the billing window server-side.
-- Live schema/functions were verified after applying this change.

create or replace function public.request_dating_match_secure(p_recipient_id uuid)
returns jsonb language plpgsql security definer set search_path to public, pg_temp as $function$
declare uid uuid:=auth.uid(); cid uuid; reverse_id uuid; tid uuid; other_name text;
begin
 if uid is null or p_recipient_id is null or p_recipient_id=uid then raise exception 'Invalid match'; end if;
 if not exists(select 1 from public.dating_profiles where user_id=uid and enabled) then raise exception 'Register for Dating first'; end if;
 if not exists(select 1 from public.dating_profiles where user_id=p_recipient_id and enabled) then raise exception 'Dating profile unavailable'; end if;
 if exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=p_recipient_id) or (blocker_id=p_recipient_id and blocked_id=uid)) then raise exception 'This user is unavailable'; end if;
 select id into reverse_id from public.dating_connections where requester_id=p_recipient_id and recipient_id=uid and status='pending' for update;
 if reverse_id is not null then
   update public.dating_connections set status='matched',matched_at=now(),reveal_at=now()+interval '72 hours' where id=reverse_id;
   select id into tid from public.cp_threads where kind='dating' and ((owner_id=uid and participant_id=p_recipient_id) or (owner_id=p_recipient_id and participant_id=uid)) order by created_at asc limit 1;
   if tid is null then
     select name into other_name from public.dating_profiles where user_id=p_recipient_id;
     insert into public.cp_threads(owner_id,participant_id,other_alias,kind,blurb) values(uid,p_recipient_id,coalesce(other_name,'Anonymous Panda'),'dating','Dating match · 72-hour free chat') returning id into tid;
   end if;
   return jsonb_build_object('status','matched','connection_id',reverse_id,'thread_id',tid,'reveal_at',now()+interval '72 hours');
 end if;
 insert into public.dating_connections(requester_id,recipient_id) values(uid,p_recipient_id) on conflict(requester_id,recipient_id) do update set status='pending',requested_at=now() returning id into cid;
 return jsonb_build_object('status','pending','connection_id',cid);
end $function$;

create or replace function public.send_direct_message(p_thread_id uuid,p_body text)
returns jsonb language plpgsql security definer set search_path to public, pg_temp as $function$
declare uid uuid:=auth.uid(); t public.cp_threads%rowtype; clean_body text:=trim(coalesce(p_body,'')); vip boolean:=false; dating_free boolean:=false; charge bigint:=1; bal bigint; msg public.cp_thread_messages%rowtype; match_started timestamptz; reveal_time timestamptz; both_confirmed boolean:=false;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if length(clean_body)<1 or length(clean_body)>4000 then raise exception 'Message must be 1-4000 characters'; end if;
 select * into t from public.cp_threads where id=p_thread_id and (owner_id=uid or participant_id=uid) for update;
 if not found then raise exception 'Chat not found'; end if;
 select coalesce(p.is_vip,false) and (p.vip_expires_at is null or p.vip_expires_at>now()) into vip from public.profiles p where p.id=uid;
 if t.kind='dating' then
   select c.matched_at,c.reveal_at,(c.requester_confirmed and c.recipient_confirmed) into match_started,reveal_time,both_confirmed
   from public.dating_connections c where c.status='matched' and ((c.requester_id=uid and c.recipient_id=t.participant_id) or (c.recipient_id=uid and c.requester_id=t.participant_id)) order by c.matched_at desc limit 1;
   if match_started is null then raise exception 'Dating chat is locked'; end if;
   if now() < coalesce(reveal_time,match_started+interval '72 hours') then dating_free:=true;
   elsif not both_confirmed then raise exception 'Dating chat is locked until both people confirm after 72 hours'; end if;
 end if;
 if vip or dating_free then charge:=0; end if;
 if charge>0 then bal:=public.apply_bc_delta(uid,-charge,'Direct message','direct_message',p_thread_id); else select coalesce(balance,0) into bal from public.bc_accounts where user_id=uid; end if;
 insert into public.cp_thread_messages(thread_id,user_id,body) values(p_thread_id,uid,clean_body) returning * into msg;
 return jsonb_build_object('id',msg.id,'body',msg.body,'created_at',msg.created_at,'balance',coalesce(bal,0),'charged_bc',charge,'free_reason',case when vip then 'vip' when dating_free then 'dating_72h' else null end);
end; $function$;