create or replace function public.respond_dating_match_secure(p_connection_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare uid uuid:=auth.uid(); c public.dating_connections; tid uuid; other_id uuid; other_name text; request_id uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into c from public.dating_connections where id=p_connection_id and recipient_id=uid and status='pending' for update;
 if c.id is null then raise exception 'Match request not found'; end if;
 select r.id into request_id from public.direct_message_requests r where r.sender_id=c.requester_id and r.recipient_id=c.recipient_id and r.kind='dating' and r.status='pending' order by r.created_at desc limit 1;
 if not p_accept then
   update public.dating_connections set status='declined' where id=c.id;
   if request_id is not null then update public.direct_message_requests set status='declined',responded_at=now() where id=request_id; end if;
   return jsonb_build_object('status','declined','connection_id',c.id,'request_id',request_id);
 end if;
 other_id:=c.requester_id;
 update public.dating_connections set status='matched',matched_at=now(),reveal_at=now()+interval '72 hours',recipient_confirmed=true where id=c.id returning * into c;
 if request_id is not null then update public.direct_message_requests set status='accepted',responded_at=now() where id=request_id; end if;
 select id into tid from public.cp_threads where kind='dating' and ((owner_id=uid and participant_id=other_id) or (owner_id=other_id and participant_id=uid)) order by created_at asc limit 1;
 if tid is null then
   select name into other_name from public.dating_profiles where user_id=other_id;
   insert into public.cp_threads(owner_id,participant_id,other_alias,kind,blurb) values(uid,other_id,coalesce(other_name,'Anonymous Panda'),'dating','Dating match · 72-hour free chat') returning id into tid;
 end if;
 if request_id is not null then update public.direct_message_requests set thread_id=tid where id=request_id; end if;
 return jsonb_build_object('status','matched','connection_id',c.id,'request_id',request_id,'thread_id',tid,'reveal_at',c.reveal_at);
end $function$;