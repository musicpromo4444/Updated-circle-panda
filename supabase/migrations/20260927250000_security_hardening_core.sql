-- Circle Panda security hardening
-- Revoke inherited PUBLIC execute on privileged SECURITY DEFINER RPCs.
-- Keep only authenticated access where the app calls these directly.

alter function public.crush_period_start() set search_path = public, pg_temp;
alter function public.crush_period_start(text, date) set search_path = public, pg_temp;
alter function public.get_wcw_mcm_current_week() set search_path = public, pg_temp;

revoke execute on function public.auto_close_crush_week() from public;
revoke execute on function public.claim_crush_vip_secure(text) from public;
revoke execute on function public.create_direct_thread(uuid,text,text) from public;
revoke execute on function public.send_direct_message(uuid,text) from public;

grant execute on function public.auto_close_crush_week() to service_role;
grant execute on function public.claim_crush_vip_secure(text) to authenticated;
grant execute on function public.create_direct_thread(uuid,text,text) to authenticated;
grant execute on function public.send_direct_message(uuid,text) to authenticated;