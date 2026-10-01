-- check_admin_request is registered as PostgREST db_pre_request.
-- It therefore must be executable by the unauthenticated Data API role too.
-- The function itself only applies administrator checks to /rpc/admin_* paths;
-- allowing anon to execute the pre-request hook prevents every public API call
-- from failing with "permission denied for function check_admin_request".
revoke execute on function public.check_admin_request() from public;
grant execute on function public.check_admin_request() to anon, authenticated;
