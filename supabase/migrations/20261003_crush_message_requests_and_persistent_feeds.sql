-- Persist MCM/WCW comments as actionable message requests and link notifications.
alter table public.cp_notifications add column if not exists metadata jsonb not null default '{}'::jsonb;

create or replace function public.add_crush_comment_secure(
  p_nominee_id uuid,p_body text,p_attachment_url text default null,p_attachment_type text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); recipient uuid; cid uuid; request_id uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if length(trim(coalesce(p_body,'')))=0 and p_attachment_url is null then raise exception 'Write a message or attach a file'; end if;
 if length(p_body)>2000 then raise exception 'Comment is too long'; end if;
 select user_id into recipient from public.crush_nominees where id=p_nominee_id;
 if recipient is null then raise exception 'Crush post unavailable'; end if;
 if recipient=uid then raise exception 'You cannot send a message request to yourself'; end if;
 if p_attachment_url is not null and p_attachment_url not like '%'||uid::text||'%' then raise exception 'Invalid attachment'; end if;
 if exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=recipient) or (blocker_id=recipient and blocked_id=uid)) then raise exception 'This user is unavailable'; end if;
 insert into public.crush_comments(nominee_id,user_id,body,attachment_url,attachment_type) values(p_nominee_id,uid,trim(coalesce(p_body,'')),p_attachment_url,p_attachment_type) returning id into cid;
 insert into public.direct_message_requests(sender_id,recipient_id,kind,message) values(uid,recipient,'crush',left(trim(coalesce(p_body,'')),2000)) returning id into request_id;
 insert into public.cp_notifications(user_id,title,body,kind,metadata) values(recipient,'New Crush message request 💌','Someone sent you a message request from your MCM/WCW post.','crush_message_request',jsonb_build_object('request_id',request_id,'nominee_id',p_nominee_id,'route','/messages'));
 return jsonb_build_object('id',cid,'request_id',request_id,'created_at',now());
end; $$;
revoke all on function public.add_crush_comment_secure(uuid,text,text,text) from public;
grant execute on function public.add_crush_comment_secure(uuid,text,text,text) to authenticated;

create or replace function public.respond_direct_message_request_secure(p_request_id uuid,p_accept boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); r public.direct_message_requests; tid uuid; msg_id uuid;
begin
 select * into r from public.direct_message_requests where id=p_request_id and recipient_id=uid for update;
 if r.id is null or r.status<>'pending' then raise exception 'Request not found'; end if;
 if not p_accept then update public.direct_message_requests set status='declined',responded_at=now() where id=r.id; return jsonb_build_object('status','declined'); end if;
 select id into tid from public.cp_threads where kind='dm' and ((owner_id=uid and participant_id=r.sender_id) or (owner_id=r.sender_id and participant_id=uid)) limit 1;
 if tid is null then insert into public.cp_threads(owner_id,participant_id,other_alias,kind,blurb) values(uid,r.sender_id,'Anonymous Panda','dm',case when r.kind='crush' then 'MCM/WCW message request accepted' else 'Message request accepted' end) returning id into tid; end if;
 if length(trim(coalesce(r.message,'')))>0 then insert into public.cp_thread_messages(thread_id,user_id,body) values(tid,r.sender_id,trim(r.message)) returning id into msg_id; end if;
 update public.direct_message_requests set status='accepted',thread_id=tid,responded_at=now() where id=r.id;
 insert into public.cp_notifications(user_id,title,body,kind,metadata) values(r.sender_id,'Message request accepted 💬','Your message request was accepted. You can now reply.','message_request_accepted',jsonb_build_object('thread_id',tid,'route','/messages'));
 return jsonb_build_object('status','accepted','thread_id',tid,'message_id',msg_id);
end; $$;
revoke all on function public.respond_direct_message_request_secure(uuid,boolean) from public;
grant execute on function public.respond_direct_message_request_secure(uuid,boolean) to authenticated;

drop function public.get_my_notifications(integer);
create function public.get_my_notifications(p_limit integer default 100)
returns table(id uuid,title text,body text,kind text,metadata jsonb,read_at timestamptz,created_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
 select n.id,n.title,n.body,n.kind,n.metadata,n.read_at,n.created_at
 from public.cp_notifications n where n.user_id=(select auth.uid())
 order by n.created_at desc limit greatest(1,least(coalesce(p_limit,100),100));
$$;
revoke all on function public.get_my_notifications(integer) from public;
grant execute on function public.get_my_notifications(integer) to authenticated;