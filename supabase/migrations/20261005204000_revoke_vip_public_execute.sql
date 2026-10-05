-- Remove inherited PUBLIC execution from VIP and crush-ad entrypoints.
revoke execute on function public.create_vip_call(uuid) from public;
revoke execute on function public.start_vip_call(uuid) from public;
revoke execute on function public.join_vip_call(uuid) from public;
revoke execute on function public.end_vip_call(uuid) from public;
revoke execute on function public.vip_start_call(uuid) from public;
revoke execute on function public.vip_join_call(uuid) from public;
revoke execute on function public.vip_call_state(uuid) from public;
revoke execute on function public.ensure_vip_groups() from public;
revoke execute on function public.join_vip_group(uuid) from public;
revoke execute on function public.leave_vip_group(uuid) from public;
revoke execute on function public.start_crush_vote_ad_secure(uuid) from public;

grant execute on function public.create_vip_call(uuid) to authenticated;
grant execute on function public.start_vip_call(uuid) to authenticated;
grant execute on function public.join_vip_call(uuid) to authenticated;
grant execute on function public.end_vip_call(uuid) to authenticated;
grant execute on function public.vip_start_call(uuid) to authenticated;
grant execute on function public.vip_join_call(uuid) to authenticated;
grant execute on function public.vip_call_state(uuid) to authenticated;
grant execute on function public.ensure_vip_groups() to authenticated;
grant execute on function public.join_vip_group(uuid) to authenticated;
grant execute on function public.leave_vip_group(uuid) to authenticated;
grant execute on function public.start_crush_vote_ad_secure(uuid) to authenticated;
