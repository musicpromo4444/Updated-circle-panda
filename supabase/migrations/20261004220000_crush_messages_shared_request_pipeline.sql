-- MCM/WCW messaging uses the same direct_message_requests pipeline without exposing nominee user IDs.
create or replace function public.request_crush_message_secure(p_nominee_id uuid,p_message text default ''::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare uid uuid:=auth.uid(); recipient uuid; rid uuid; request_text text;
begin
  if uid is null then raise exception 'You must be signed in'; end if;
  select n.user_id into recipient from public.crush_nominees n where n.id=p_nominee_id;
  if recipient is null then raise exception 'This Crush profile is unavailable'; end if;
  if recipient=uid then raise exception 'You cannot message yourself'; end if;
  if exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=recipient) or (blocker_id=recipient and blocked_id=uid)) then raise exception 'This user is unavailable'; end if;
  request_text:=left(trim(coalesce(p_message,'')),1000);
  if request_text='' then request_text:='I sent you a message request from MCM/WCW. If you accept, we can start talking. If you decline, this request will disappear.'; end if;
  select id into rid from public.direct_message_requests where sender_id=uid and recipient_id=recipient and kind='dm' and status='pending' order by created_at desc limit 1;
  if rid is null then
    insert into public.direct_message_requests(sender_id,recipient_id,kind,message) values(uid,recipient,'dm',request_text) returning id into rid;
  else
    update public.direct_message_requests set message=request_text,created_at=now() where id=rid;
  end if;
  insert into public.cp_notifications(user_id,title,body,kind,metadata)
  values(recipient,'New message request 💌','Someone sent you a message request.','message_request',jsonb_build_object('request_id',rid,'route','/messages'));
  return jsonb_build_object('id',rid,'status','pending');
end
$function$;
revoke execute on function public.request_crush_message_secure(uuid,text) from public, anon;
grant execute on function public.request_crush_message_secure(uuid,text) to authenticated;
