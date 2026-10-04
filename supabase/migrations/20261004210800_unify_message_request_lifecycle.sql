-- Keep normal and Dating requests on one message-request lifecycle.
-- Dating is identified on the Messages request card, not by the notification title.

create or replace function public.request_dating_match_secure(p_recipient_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  uid uuid := auth.uid();
  rid uuid;
  existing_status text;
  existing_thread uuid;
begin
  if uid is null or p_recipient_id is null or p_recipient_id = uid then raise exception 'Invalid match'; end if;
  if not exists(select 1 from public.dating_profiles where user_id=uid and enabled) then raise exception 'Register for Dating first'; end if;
  if not exists(select 1 from public.dating_profiles where user_id=p_recipient_id and enabled) then raise exception 'Dating profile unavailable'; end if;
  if exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=p_recipient_id) or (blocker_id=p_recipient_id and blocked_id=uid)) then raise exception 'This user is unavailable'; end if;

  select r.status,r.thread_id into existing_status,existing_thread
  from public.direct_message_requests r
  where r.sender_id=uid and r.recipient_id=p_recipient_id and r.kind='dating' and r.status in ('pending','accepted')
  order by r.created_at desc limit 1;

  if existing_status='accepted' then return jsonb_build_object('status','matched','request_id',null,'thread_id',existing_thread); end if;
  if existing_status='pending' then return jsonb_build_object('status','pending','request_id',null); end if;

  insert into public.direct_message_requests(sender_id,recipient_id,kind,message)
  values(uid,p_recipient_id,'dating','I would like to connect with you through Circle Panda Dating.')
  returning id into rid;

  insert into public.cp_notifications(user_id,title,body,kind,metadata)
  values(p_recipient_id,'New message request 💌','Someone sent you a message request. Open Messages to review it.','message_request',jsonb_build_object('request_id',rid,'route','/messages'));

  return jsonb_build_object('status','pending','request_id',rid);
end
$function$;

create or replace function public.respond_direct_message_request_secure(p_request_id uuid,p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  uid uuid:=auth.uid();
  r public.direct_message_requests;
  tid uuid;
  msg_id uuid;
  cid uuid;
  other_name text;
  reveal_at timestamptz;
begin
  select * into r from public.direct_message_requests where id=p_request_id and recipient_id=uid for update;
  if r.id is null or r.status<>'pending' then raise exception 'Request not found'; end if;

  if not p_accept then
    update public.direct_message_requests set status='declined',responded_at=now() where id=r.id;
    insert into public.cp_notifications(user_id,title,body,kind,metadata)
    values(r.sender_id,'Message request declined','Your message request was declined.','message_request_declined',jsonb_build_object('request_id',r.id,'route','/messages'));
    return jsonb_build_object('status','declined');
  end if;

  if r.kind='dating' then
    select c.id,c.reveal_at into cid,reveal_at
    from public.dating_connections c
    where ((c.requester_id=r.sender_id and c.recipient_id=uid) or (c.requester_id=uid and c.recipient_id=r.sender_id))
      and c.status='matched'
    order by c.matched_at desc nulls last limit 1;

    if cid is null then
      reveal_at:=now()+interval '72 hours';
      insert into public.dating_connections(requester_id,recipient_id,status,matched_at,reveal_at)
      values(r.sender_id,uid,'matched',now(),reveal_at)
      returning id into cid;
    end if;

    select id into tid from public.cp_threads
    where kind='dating'
      and ((owner_id=uid and participant_id=r.sender_id) or (owner_id=r.sender_id and participant_id=uid))
    order by created_at asc limit 1;

    if tid is null then
      select name into other_name from public.dating_profiles where user_id=r.sender_id;
      insert into public.cp_threads(owner_id,participant_id,other_alias,kind,blurb)
      values(uid,r.sender_id,coalesce(other_name,'Anonymous Panda'),'dating','Dating match · 72-hour free chat')
      returning id into tid;
    end if;

    update public.direct_message_requests set status='accepted',thread_id=tid,responded_at=now() where id=r.id;
    insert into public.cp_notifications(user_id,title,body,kind,metadata)
    values(r.sender_id,'Message request accepted 💬','Your message request was accepted. Your Dating Chat is now open.','message_request_accepted',jsonb_build_object('request_id',r.id,'thread_id',tid,'route','/messages'));
    return jsonb_build_object('status','accepted','thread_id',tid,'connection_id',cid,'reveal_at',reveal_at);
  end if;

  select id into tid from public.cp_threads
  where kind='dm'
    and ((owner_id=uid and participant_id=r.sender_id) or (owner_id=r.sender_id and participant_id=uid))
  order by created_at asc limit 1;

  if tid is null then
    insert into public.cp_threads(owner_id,participant_id,other_alias,kind,blurb)
    values(uid,r.sender_id,'Anonymous Panda','dm','Message request accepted')
    returning id into tid;
  end if;

  if length(trim(coalesce(r.message,'')))>0 then
    insert into public.cp_thread_messages(thread_id,user_id,body)
    values(tid,r.sender_id,trim(r.message))
    returning id into msg_id;
  end if;

  update public.direct_message_requests set status='accepted',thread_id=tid,responded_at=now() where id=r.id;
  insert into public.cp_notifications(user_id,title,body,kind,metadata)
  values(r.sender_id,'Message request accepted 💬','Your message request was accepted. You can now reply.','message_request_accepted',jsonb_build_object('request_id',r.id,'thread_id',tid,'route','/messages'));
  return jsonb_build_object('status','accepted','thread_id',tid,'message_id',msg_id);
end
$function$;