revoke all on function public.check_admin_request() from public,anon,authenticated;
grant execute on function public.check_admin_request() to authenticator;
revoke all on public.admin_permission_catalog from anon,authenticated;
alter table public.admin_permission_catalog enable row level security;
notify pgrst,'reload config';