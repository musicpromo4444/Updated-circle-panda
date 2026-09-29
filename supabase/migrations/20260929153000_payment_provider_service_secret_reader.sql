create or replace function public.service_get_payment_secret(p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v text;
begin
  if current_user <> 'service_role' then
    raise exception 'Service role required';
  end if;
  select decrypted_secret into v
  from vault.decrypted_secrets
  where name = p_name
  limit 1;
  return v;
end;
$$;

revoke execute on function public.service_get_payment_secret(text) from public, anon, authenticated;
grant execute on function public.service_get_payment_secret(text) to service_role;