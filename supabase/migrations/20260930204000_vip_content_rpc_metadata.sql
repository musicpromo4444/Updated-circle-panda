-- Return VIP publish metadata from content creation RPCs.
create or replace function public.create_post_secure(p_body text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_uid uuid:=auth.uid(); v_vip_at timestamptz;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 if length(trim(coalesce(p_body,''))) < 1 or length(trim(p_body)) > 5000 then raise exception 'Post must be 1-5000 characters'; end if;
 v_id:=gen_random_uuid();
 insert into public.cp_posts(id,author_id,body,created_at) values(v_id,v_uid,trim(p_body),now()) returning author_vip_at into v_vip_at;
 insert into public.bc_accounts(user_id,balance,updated_at) values(v_uid,2,now()) on conflict(user_id) do update set balance=bc_accounts.balance+2,updated_at=now();
 insert into public.bc_ledger(user_id,amount,reason,reference_type,reference_id) values(v_uid,2,'Post reward','post',v_id);
 insert into public.user_xp(user_id,xp,updated_at) values(v_uid,15,now()) on conflict(user_id) do update set xp=user_xp.xp+15,updated_at=now();
 return jsonb_build_object('id',v_id,'created_at',now(),'reward_bc',2,'xp',15,'author_vip_at',v_vip_at);
end $$;

create or replace function public.submit_confession_secure(p_content text, p_anonymous boolean default true)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); cid uuid; v_vip_at timestamptz;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if length(trim(p_content))<3 or length(trim(p_content))>2000 then raise exception 'Invalid confession'; end if;
 insert into public.confessions(author_id,content,is_anonymous,is_published) values(uid,trim(p_content),p_anonymous,false) returning id,author_vip_at into cid,v_vip_at;
 return jsonb_build_object('id',cid,'status','pending','author_vip_at',v_vip_at);
end $$;
