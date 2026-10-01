-- Allow authenticated admin RPC callers to pass through the central admin request guard.
-- The function still enforces owner/delegated permission checks internally.
grant execute on function public.check_admin_request() to authenticated;
revoke execute on function public.check_admin_request() from anon, public;
