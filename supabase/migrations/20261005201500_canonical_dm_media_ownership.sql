create or replace function public.send_dm_message(
  p_thread_id uuid,p_body text default null,p_media_path text default null,p_media_type text default null,p_idempotency_key text default null
)
returns uuid language plpgsql set search_path=public,pg_temp as $function$
declare v_uid uuid:=auth.uid(); v_recipient uuid; v_message uuid; v_existing uuid; v_source_label text; v_context text; v_match uuid; v_free_until timestamptz;
begin
 if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
 if p_media_path is not null and not exists(select 1 from public.media_assets where owner_id=v_uid and path=p_media_path and media_type=coalesce(p_media_type,media_type)) then raise exception 'MEDIA_NOT_OWNED'; end if;
 if p_idempotency_key is not null then select id into v_existing from public.dm_messages where sender_id=v_uid and idempotency_key=p_idempotency_key; if v_existing is not null then return v_existing; end if; end if;
 select case when user_a=v_uid then user_b else user_a end into v_recipient from public.dm_threads where id=p_thread_id and (user_a=v_uid or user_b=v_uid) and status='active';
 if not found then raise exception 'DM_NOT_ACTIVE'; end if;
 select dr.context_type,coalesce(dr.source_label,'Direct message') into v_context,v_source_label from public.dm_requests dr where dr.thread_id=p_thread_id and dr.status='accepted' order by dr.created_at desc limit 1;
 if v_context='dating' then
   select id,free_until into v_match,v_free_until from public.dating_matches where (user_a=v_uid and user_b=v_recipient) or (user_a=v_recipient and user_b=v_uid) order by matched_at desc limit 1;
   if v_match is null then raise exception 'DATING_MATCH_NOT_FOUND'; end if;
   if now() >= v_free_until then perform public.spend_bc(1,'dating_message','dating_match',v_match,p_idempotency_key); end if;
 else perform public.spend_bc(1,'private_message','dm_thread',p_thread_id,p_idempotency_key); end if;
 insert into public.dm_messages(thread_id,sender_id,body,media_path,media_type,idempotency_key) values(p_thread_id,v_uid,p_body,p_media_path,p_media_type,p_idempotency_key) returning id into v_message;
 update public.dm_threads set updated_at=now() where id=p_thread_id;
 insert into public.notifications(user_id,type,title,body,data) values(v_recipient,'dm_message','New message','You received a new direct message.',jsonb_build_object('thread_id',p_thread_id,'message_id',v_message,'sender_id',v_uid,'source_type',v_context,'source_label',v_source_label));
 perform public.award_xp('private_message',null,'dm:'||v_message::text);
 return v_message;
end $function$;

create or replace function private.delete_dm_message(p_message_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $function$
declare v_uid uuid; v_sender uuid; v_path text; v_bucket text;
begin
 v_uid:=auth.uid(); if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
 select sender_id,media_path into v_sender,v_path from public.dm_messages where id=p_message_id;
 if not found then raise exception 'MESSAGE_NOT_FOUND'; end if;
 if v_sender<>v_uid then raise exception 'NOT_MESSAGE_OWNER'; end if;
 if v_path is not null then select bucket into v_bucket from public.media_assets where owner_id=v_uid and path=v_path limit 1; delete from public.media_assets where owner_id=v_uid and path=v_path; end if;
 delete from public.notifications where data->>'message_id'=p_message_id::text;
 delete from public.dm_messages where id=p_message_id;
 return jsonb_build_object('deleted',true,'message_id',p_message_id,'media_path',v_path,'media_bucket',v_bucket);
end $function$;