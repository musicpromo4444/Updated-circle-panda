create or replace function public.auto_close_crush_week()
returns jsonb language plpgsql security definer set search_path=public as $$
begin return public.close_crush_week_secure(); end; $$;
grant execute on function public.auto_close_crush_week() to service_role;