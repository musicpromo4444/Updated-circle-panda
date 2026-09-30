-- Anonymous profile-secret posting does not need SECURITY DEFINER.
drop function if exists public.submit_profile_secret(uuid,text);
create function public.submit_profile_secret(p_target_user_id uuid,p_content text)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_id uuid; v_author uuid:=auth.uid();
begin
 if p_target_user_id is null then raise exception 'Target profile is required'; end if;
 if p_content is null or length(btrim(p_content))<3 or length(btrim(p_content))>1000 then raise exception 'Secret must be between 3 and 1000 characters'; end if;
 if not exists(select 1 from public.profiles where id=p_target_user_id) then raise exception 'Profile not found'; end if;
 insert into public.profile_secrets(target_user_id,author_user_id,content,is_published)
 values(p_target_user_id,v_author,btrim(p_content),true) returning id into v_id;
 return v_id;
end $$;
revoke execute on function public.submit_profile_secret(uuid,text) from public,anon,authenticated;
grant execute on function public.submit_profile_secret(uuid,text) to anon,authenticated;
drop policy if exists profile_secrets_anonymous_insert on public.profile_secrets;
create policy profile_secrets_anonymous_insert on public.profile_secrets
for insert to anon with check (author_user_id is null);
