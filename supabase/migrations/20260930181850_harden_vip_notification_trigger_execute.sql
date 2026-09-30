-- Trigger-only function must not be directly executable by signed-in clients.
revoke execute on function public.notify_vip_claim_available() from authenticated;
