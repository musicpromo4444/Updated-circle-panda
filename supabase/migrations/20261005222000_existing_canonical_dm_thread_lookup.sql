create or replace function public.get_existing_dm_thread(p_other_user_id uuid)
returns uuid language sql security invoker set search_path=public,pg_temp as $$ select id from public.dm_threads where ((user_a=auth.uid() and user_b=p_other_user_id) or (user_a=p_other_user_id and user_b=auth.uid())) and status='active' limit 1 $$;
revoke all on function public.get_existing_dm_thread(uuid) from public,anon;
grant execute on function public.get_existing_dm_thread(uuid) to authenticated;