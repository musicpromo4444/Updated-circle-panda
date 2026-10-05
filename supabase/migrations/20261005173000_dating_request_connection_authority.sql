create or replace function public.request_dating_match_secure(p_recipient_id uuid)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare uid uuid := auth.uid(); rid uuid; cid uuid; existing_status text; existing_thread uuid;
begin
 if uid is null or p_recipient_id is null or p_recipient_id=uid then raise exception 'Invalid match'; end if;
 if not exists(select 1 from public.dating_profiles where user_id=uid and enabled) then raise exception 'Register for Dating first'; end if;
 if not exists(select 1 from public.dating_profiles where user_id=p_recipient_id and enabled) then raise exception 'Dating profile unavailable'; end if;
 if exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=p_recipient_id) or (blocker_id=p_recipient_id and blocked_id=uid)) then raise exception 'This user is unavailable'; end if;
 select c.id,c.status into cid,existing_status from public.dating_connections c where c.requester_id=uid and c.recipient_id=p_recipient_id order by c.requested_at desc limit 1;
 if existing_status='matched' then
   select t.id into existing_thread from public.cp_threads t where t.kind='dating' and ((t.owner_id=uid and t.participant_id=p_recipient_id) or (t.owner_id=p_recipient_id and t.participant_id=uid)) order by t.created_at asc limit 1;
   return jsonb_build_object('status','matched','connection_id',cid,'thread_id',existing_thread);
 end if;
 if existing_status='pending' then
   select r.id,r.thread_id into rid,existing_thread from public.direct_message_requests r where r.sender_id=uid and r.recipient_id=p_recipient_id and r.kind='dating' and r.status='pending' order by r.created_at desc limit 1;
   return jsonb_build_object('status','pending','request_id',rid,'connection_id',cid);
 end if;
 insert into public.dating_connections(requester_id,recipient_id,status,requester_confirmed,recipient_confirmed,requested_at)
 values(uid,p_recipient_id,'pending',false,false,now()) returning id into cid;
 insert into public.direct_message_requests(sender_id,recipient_id,kind,message)
 values(uid,p_recipient_id,'dating','I would like to connect with you through Circle Panda Dating.') returning id into rid;
 insert into public.cp_notifications(user_id,title,body,kind,metadata)
 values(p_recipient_id,'New dating message request 💌','Someone sent you a Dating message request. Open Messages to review it.','message_request',jsonb_build_object('request_id',rid,'connection_id',cid,'route','/messages','kind','dating'));
 return jsonb_build_object('status','pending','request_id',rid,'connection_id',cid);
end $function$;