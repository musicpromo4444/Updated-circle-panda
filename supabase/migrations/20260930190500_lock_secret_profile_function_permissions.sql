revoke execute on function public.submit_profile_secret(uuid,text) from public, anon;
grant execute on function public.submit_profile_secret(uuid,text) to authenticated;
revoke execute on function public.ensure_my_circle_panda_profile() from public, anon;
grant execute on function public.ensure_my_circle_panda_profile() to authenticated;
grant execute on function public.get_shared_profile_public(uuid) to anon, authenticated;
