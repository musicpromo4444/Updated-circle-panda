-- Persist the sender-side message request card with the exact text sent.
-- Declined requests are filtered from the sender's Messages view.

create or replace function public.request_direct_message_secure(p_recipient_id uuid,p_message text default ''::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  uid uuid:=auth.uid();
  rid uuid;
  request_text text;
begin
  if uid is null or p_recipient_id is null or p_recipient_id=uid then raise exception 'Invalid recipient'; end if;
  if exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=p_recipient_id) or (blocker_id=p_recipient_id and blocked_id=uid)) then raise exception 'This user is unavailable'; end if;

  request_text:=left(trim(coalesce(p_message,'')),1000);
  if request_text='' then
    request_text:='I sent you a message request. If you accept, we can start talking. If you decline, this request will disappear.';
  end if;

  select id into rid
  from public.direct_message_requests
  where sender_id=uid and recipient_id=p_recipient_id and kind='dm' and status='pending'
  order by created_at desc limit 1;

  if rid is null then
    insert into public.direct_message_requests(sender_id,recipient_id,kind,message)
    values(uid,p_recipient_id,'dm',request_text)
    returning id into rid;
  else
    update public.direct_message_requests set message=request_text,created_at=now() where id=rid;
  end if;

  insert into public.cp_notifications(user_id,title,body,kind,metadata)
  values(p_recipient_id,'New message request 💌','Someone sent you a message request.','message_request',jsonb_build_object('request_id',rid,'route','/messages'));

  return jsonb_build_object('id',rid,'status','pending');
end
$function$;