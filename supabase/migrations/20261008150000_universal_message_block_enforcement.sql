-- Fix universal messaging block enforcement.
-- A block must prevent new requests, request acceptance, and messages in both directions.

create or replace function public.start_dm_request(
  p_recipient_id uuid,
  p_body text default null,
  p_media_path text default null,
  p_media_type text default null,
  p_context_type text default null,
  p_context_id uuid default null
) returns uuid
language plpgsql
set search_path = public
as $function$
declare
  v_uid uuid := auth.uid();
  v_a uuid; v_b uuid; v_thread uuid; v_request uuid;
  v_dating_request uuid; v_reverse uuid; v_match uuid; v_source_label text;
  v_age_a smallint; v_age_b smallint;
begin
  if v_uid is null or v_uid = p_recipient_id or p_recipient_id is null then raise exception 'INVALID_RECIPIENT'; end if;

  if exists (
    select 1 from public.user_blocks
    where (blocker_id=v_uid and blocked_id=p_recipient_id)
       or (blocker_id=p_recipient_id and blocked_id=v_uid)
  ) then raise exception 'USER_BLOCKED'; end if;

  if p_context_type is not null and p_context_type not in ('direct','event','profile','group','dating','mcm','wcw') then raise exception 'INVALID_CONTEXT_TYPE'; end if;

  if p_context_type='dating' then
    select age into v_age_a from public.profiles where id=v_uid;
    select age into v_age_b from public.profiles where id=p_recipient_id;
    if coalesce(v_age_a,0)<18 then raise exception 'DATING_18_PLUS'; end if;
    if coalesce(v_age_b,0)<18 then raise exception 'RECIPIENT_NOT_AVAILABLE'; end if;
    if not exists(select 1 from public.dating_profiles where user_id=v_uid and dating_enabled=true) then raise exception 'DATING_NOT_ENABLED'; end if;
    if not exists(select 1 from public.dating_profiles where user_id=p_recipient_id and dating_enabled=true) then raise exception 'RECIPIENT_NOT_AVAILABLE'; end if;
    if exists(select 1 from public.dating_matches where (user_a=v_uid and user_b=p_recipient_id) or (user_a=p_recipient_id and user_b=v_uid)) then raise exception 'ALREADY_MATCHED'; end if;
  elsif p_context_type='event' then
    if p_context_id is null or not exists(select 1 from public.events where id=p_context_id and creator_id=p_recipient_id) then raise exception 'EVENT_CONTEXT_INVALID'; end if;
  elsif p_context_type in ('mcm','wcw') then
    if p_context_id is null or not exists(select 1 from public.crush_cycles where id=p_context_id and kind=p_context_type) then raise exception 'CRUSH_CONTEXT_INVALID'; end if;
  elsif p_context_type in ('profile','group') and p_context_id is null then
    raise exception 'CONTEXT_ID_REQUIRED';
  end if;

  v_source_label:=case p_context_type when 'dating' then 'Dating' when 'group' then 'Group' when 'event' then 'Events' when 'mcm' then 'Man Crush Monday' when 'wcw' then 'Woman Crush Monday' when 'profile' then 'Profile' else 'Direct message' end;
  v_a:=least(v_uid,p_recipient_id); v_b:=greatest(v_uid,p_recipient_id);

  insert into public.dm_threads(user_a,user_b) values(v_a,v_b)
  on conflict(user_a,user_b) do update set updated_at=now() returning id into v_thread;

  if exists(select 1 from public.dm_requests where thread_id=v_thread and status='accepted') then raise exception 'DM_ALREADY_ACCEPTED'; end if;

  if p_context_type='dating' then
    select id into v_reverse from public.dating_requests
    where sender_id=p_recipient_id and recipient_id=v_uid and status='pending'
    order by created_at desc limit 1 for update;

    if v_reverse is not null then
      update public.dating_requests set status='accepted',responded_at=now() where id=v_reverse;
      insert into public.dating_matches(user_a,user_b,matched_at,free_until)
      values(v_a,v_b,now(),now()+interval '72 hours') returning id into v_match;
      insert into public.dm_requests(thread_id,sender_id,recipient_id,status,responded_at,context_type,context_id,source_label)
      values(v_thread,p_recipient_id,v_uid,'accepted',now(),'dating',v_reverse,'Dating')
      on conflict(thread_id,sender_id) do update set status='accepted',responded_at=now(),context_type='dating',context_id=excluded.context_id,source_label='Dating'
      returning id into v_request;
      insert into public.notifications(user_id,type,title,body,data)
      values(v_uid,'dating_match','It’s a match','Your dating request was accepted.',jsonb_build_object('match_id',v_match,'user_id',p_recipient_id,'source_type','dating','source_label','Dating')),
             (p_recipient_id,'dating_match','It’s a match','You matched with someone.',jsonb_build_object('match_id',v_match,'user_id',v_uid,'source_type','dating','source_label','Dating'));
      return v_request;
    end if;

    insert into public.dating_requests(sender_id,recipient_id,status) values(v_uid,p_recipient_id,'pending') returning id into v_dating_request;
    insert into public.dm_requests(thread_id,sender_id,recipient_id,context_type,context_id,source_label)
    values(v_thread,v_uid,p_recipient_id,'dating',v_dating_request,'Dating')
    on conflict(thread_id,sender_id) do update set status='pending',responded_at=null,context_type='dating',context_id=excluded.context_id,source_label='Dating'
    returning id into v_request;
  else
    insert into public.dm_requests(thread_id,sender_id,recipient_id,context_type,context_id,source_label)
    values(v_thread,v_uid,p_recipient_id,coalesce(p_context_type,'direct'),p_context_id,v_source_label)
    on conflict(thread_id,sender_id) do update set status='pending',responded_at=null,context_type=excluded.context_type,context_id=excluded.context_id,source_label=excluded.source_label
    returning id into v_request;
  end if;

  if p_body is not null or p_media_path is not null then
    insert into public.dm_messages(thread_id,sender_id,body,media_path,media_type) values(v_thread,v_uid,p_body,p_media_path,p_media_type);
  end if;

  insert into public.notifications(user_id,type,title,body,data)
  values(p_recipient_id,case when p_context_type='event' then 'event_message_request' else 'dm_request' end,'Message request',
    case when p_context_type='dating' then 'You received a new Dating request.' else 'You received a new message request.' end,
    jsonb_build_object('request_id',v_request,'thread_id',v_thread,'sender_id',v_uid,'context_type',coalesce(p_context_type,'direct'),'context_id',case when p_context_type='dating' then v_dating_request else p_context_id end,'source_label',v_source_label));
  return v_request;
exception
  when unique_violation then
    select id into v_request from public.dm_requests where thread_id=v_thread and sender_id=v_uid and status='pending';
    if v_request is not null then return v_request; end if;
    raise;
end
$function$;

create or replace function public.respond_dm_request(p_request_id uuid,p_accept boolean)
returns uuid language plpgsql set search_path=public as $function$
declare v_uid uuid:=auth.uid(); v_thread uuid; v_sender uuid; v_context text; v_context_id uuid; v_match uuid;
begin
  select thread_id,sender_id,context_type,context_id into v_thread,v_sender,v_context,v_context_id
  from public.dm_requests where id=p_request_id and recipient_id=v_uid and status='pending' for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if exists(select 1 from public.user_blocks where (blocker_id=v_uid and blocked_id=v_sender) or (blocker_id=v_sender and blocked_id=v_uid)) then
    update public.dm_requests set status='declined',responded_at=now() where id=p_request_id;
    raise exception 'USER_BLOCKED';
  end if;

  if p_accept and v_context='dating' then
    if not exists(select 1 from public.dating_requests where id=v_context_id and sender_id=v_sender and recipient_id=v_uid and status='pending') then raise exception 'DATING_REQUEST_NOT_AVAILABLE'; end if;
    if exists(select 1 from public.dating_matches where (user_a=least(v_sender,v_uid) and user_b=greatest(v_sender,v_uid)) or (user_a=least(v_uid,v_sender) and user_b=greatest(v_uid,v_sender))) then raise exception 'ALREADY_MATCHED'; end if;
    update public.dating_requests set status='accepted',responded_at=now() where id=v_context_id;
    insert into public.dating_matches(user_a,user_b,matched_at,free_until) values(least(v_sender,v_uid),greatest(v_sender,v_uid),now(),now()+interval '72 hours') returning id into v_match;
  elsif not p_accept and v_context='dating' then
    update public.dating_requests set status='declined',responded_at=now() where id=v_context_id and status='pending';
  end if;

  update public.dm_requests set status=case when p_accept then 'accepted' else 'declined' end,responded_at=now() where id=p_request_id;
  if p_accept then
    update public.dm_threads set status='active',updated_at=now() where id=v_thread;
    insert into public.notifications(user_id,type,title,body,data)
    values(v_sender,case when v_context='dating' then 'dating_match' else 'dm_request_accepted' end,case when v_context='dating' then 'It’s a match' else 'Message request accepted' end,
      case when v_context='dating' then 'Your Dating request was accepted. Your 72-hour free chat has started.' else 'Your message request was accepted.' end,
      jsonb_build_object('request_id',p_request_id,'thread_id',v_thread,'match_id',v_match,'source_type',v_context,'source_label',case when v_context='dating' then 'Dating' else 'Direct message' end));
  else
    insert into public.notifications(user_id,type,title,body,data)
    values(v_sender,'dm_request_declined',case when v_context='dating' then 'Dating request declined' else 'Message request declined' end,
      case when v_context='dating' then 'Your Dating request was declined.' else 'Your message request was declined.' end,
      jsonb_build_object('request_id',p_request_id,'thread_id',v_thread,'source_type',v_context,'source_label',case when v_context='dating' then 'Dating' else 'Direct message' end));
  end if;
  return v_thread;
end
$function$;

create or replace function public.send_dm_message(
  p_thread_id uuid,p_body text default null,p_media_path text default null,p_media_type text default null,p_idempotency_key text default null
) returns uuid language plpgsql set search_path=public,pg_temp as $function$
declare v_uid uuid:=auth.uid(); v_recipient uuid; v_message uuid; v_existing uuid; v_source_label text; v_context text; v_match uuid; v_free_until timestamptz;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_media_path is not null and not exists(select 1 from public.media_assets where owner_id=v_uid and path=p_media_path and media_type=coalesce(p_media_type,media_type)) then raise exception 'MEDIA_NOT_OWNED'; end if;
  if p_idempotency_key is not null then select id into v_existing from public.dm_messages where sender_id=v_uid and idempotency_key=p_idempotency_key; if v_existing is not null then return v_existing; end if; end if;
  select case when user_a=v_uid then user_b else user_a end into v_recipient from public.dm_threads where id=p_thread_id and (user_a=v_uid or user_b=v_uid) and status='active';
  if not found then raise exception 'DM_NOT_ACTIVE'; end if;
  if exists(select 1 from public.user_blocks where (blocker_id=v_uid and blocked_id=v_recipient) or (blocker_id=v_recipient and blocked_id=v_uid)) then raise exception 'USER_BLOCKED'; end if;
  select dr.context_type,coalesce(dr.source_label,'Direct message') into v_context,v_source_label from public.dm_requests dr where dr.thread_id=p_thread_id and dr.status='accepted' order by dr.created_at desc limit 1;
  if v_context='dating' then
    select id,free_until into v_match,v_free_until from public.dating_matches where (user_a=v_uid and user_b=v_recipient) or (user_a=v_recipient and user_b=v_uid) order by matched_at desc limit 1;
    if v_match is null then raise exception 'DATING_MATCH_NOT_FOUND'; end if;
    if now()>=v_free_until then perform public.spend_bc(1,'dating_message','dating_match',v_match,p_idempotency_key); end if;
  else perform public.spend_bc(1,'private_message','dm_thread',p_thread_id,p_idempotency_key); end if;
  insert into public.dm_messages(thread_id,sender_id,body,media_path,media_type,idempotency_key) values(p_thread_id,v_uid,p_body,p_media_path,p_media_type,p_idempotency_key) returning id into v_message;
  update public.dm_threads set updated_at=now() where id=p_thread_id;
  insert into public.notifications(user_id,type,title,body,data) values(v_recipient,'dm_message','New message','You received a new direct message.',jsonb_build_object('thread_id',p_thread_id,'message_id',v_message,'sender_id',v_uid,'source_type',v_context,'source_label',v_source_label));
  perform public.award_xp('private_message',null,'dm:'||v_message::text);
  return v_message;
end
$function$;

create or replace function public.request_context_message_secure(p_recipient_id uuid,p_message text default null,p_context_type text default 'direct',p_context_id uuid default null)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $function$
declare v_request uuid; v_uid uuid:=auth.uid(); v_context_id uuid:=p_context_id;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_recipient_id is null or p_recipient_id=v_uid then raise exception 'Sorry, you can''t message yourself'; end if;
  if exists(select 1 from public.user_blocks where (blocker_id=v_uid and blocked_id=p_recipient_id) or (blocker_id=p_recipient_id and blocked_id=v_uid)) then raise exception 'USER_BLOCKED'; end if;
  if p_context_type in ('mcm','wcw') and v_context_id is null then
    select id into v_context_id from public.crush_cycles where kind=p_context_type and status in ('open','published') order by starts_at desc limit 1;
  end if;
  v_request:=public.start_dm_request(p_recipient_id,p_message,null,null,p_context_type,v_context_id);
  return (select jsonb_build_object('id',id,'status',status,'thread_id',thread_id) from public.dm_requests where id=v_request);
end
$function$;

create or replace function public.request_direct_message_secure(p_recipient_id uuid,p_message text default null)
returns jsonb language plpgsql set search_path=public as $function$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_id:=public.start_dm_request(p_recipient_id,p_message,null,null);
  return (select jsonb_build_object('id',id,'status',status) from public.dm_requests where id=v_id);
end
$function$;
