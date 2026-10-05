-- VIP call operations are authenticated-only.
revoke execute on function public.create_vip_call(uuid) from anon;
revoke execute on function public.start_vip_call(uuid) from anon;
revoke execute on function public.join_vip_call(uuid) from anon;
revoke execute on function public.end_vip_call(uuid) from anon;
revoke execute on function public.vip_start_call(uuid) from anon;
revoke execute on function public.vip_join_call(uuid) from anon;
revoke execute on function public.vip_call_state(uuid) from anon;

grant execute on function public.create_vip_call(uuid) to authenticated;
grant execute on function public.start_vip_call(uuid) to authenticated;
grant execute on function public.join_vip_call(uuid) to authenticated;
grant execute on function public.end_vip_call(uuid) to authenticated;
grant execute on function public.vip_start_call(uuid) to authenticated;
grant execute on function public.vip_join_call(uuid) to authenticated;
grant execute on function public.vip_call_state(uuid) to authenticated;
