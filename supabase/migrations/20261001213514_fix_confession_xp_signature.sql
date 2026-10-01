-- Fix the production confession XP call to use the server-authoritative award_xp_secure signature.
create or replace function public.submit_confession_secure(p_content text, p_anonymous boolean default true)
returns jsonb language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare uid uuid:=auth.uid(); cid uuid; v_vip_at timestamptz; xr jsonb;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if length(trim(p_content))<3 or length(trim(p_content))>2000 then raise exception 'Invalid confession'; end if;
 insert into public.confessions(author_id,content,is_anonymous,is_published) values(uid,trim(p_content),p_anonymous,false)
 returning id,author_vip_at into cid,v_vip_at;
 xr:=public.award_xp_secure('create_confession',cid);
 return jsonb_build_object('id',cid,'status','pending','author_vip_at',v_vip_at,'xp',coalesce((xr->>'xp')::bigint,7));
end;
$function$;
