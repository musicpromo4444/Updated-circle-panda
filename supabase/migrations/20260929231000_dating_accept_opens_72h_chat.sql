-- Dating: accepting a pending request immediately opens the mutual 72-hour free Dating Chat.

create or replace function public.respond_dating_match_secure(p_connection_id uuid,p_accept boolean)
returns jsonb language plpgsql security definer set search_path to public, pg_temp as $function$
declare
 uid uuid:=auth.uid();
 c public.dating_connections;
 tid uuid;
 other_id uuid;
 other_name text;
begin
 if uid is null then raise exception 'Authentication required'; end if;

 select * into c
 from public.dating_connections
 where id=p_connection_id and recipient_id=uid and status='pending'
 for update;

 if c.id is null then raise exception 'Match request not found'; end if;

 if not p_accept then
   update public.dating_connections set status='declined' where id=c.id;
   return jsonb_build_object('status','declined');
 end if;

 other_id:=c.requester_id;
 update public.dating_connections
 set status='matched',matched_at=now(),reveal_at=now()+interval '72 hours'
 where id=c.id
 returning * into c;

 select id into tid
 from public.cp_threads
 where kind='dating'
   and ((owner_id=uid and participant_id=other_id) or (owner_id=other_id and participant_id=uid))
 order by created_at asc limit 1;

 if tid is null then
   select name into other_name from public.dating_profiles where user_id=other_id;
   insert into public.cp_threads(owner_id,participant_id,other_alias,kind,blurb)
   values(uid,other_id,coalesce(other_name,'Anonymous Panda'),'dating','Dating match · 72-hour free chat')
   returning id into tid;
 end if;

 return jsonb_build_object(
   'status','matched',
   'connection_id',c.id,
   'thread_id',tid,
   'reveal_at',c.reveal_at
 );
end $function$;

revoke execute on function public.respond_dating_match_secure(uuid,boolean) from anon, public;
grant execute on function public.respond_dating_match_secure(uuid,boolean) to authenticated;