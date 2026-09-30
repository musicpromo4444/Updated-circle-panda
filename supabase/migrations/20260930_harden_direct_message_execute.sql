-- Production messaging execution hardening
revoke all on function public.send_direct_message(uuid,text) from public;
grant execute on function public.send_direct_message(uuid,text) to authenticated;
