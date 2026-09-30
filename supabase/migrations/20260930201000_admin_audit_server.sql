create or replace function public.admin_record_audit(
  p_action text,
  p_details text,
  p_target_user uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  insert into public.admin_audit_log(admin_user_id, action, target_user_id, metadata)
  values (
    auth.uid(),
    left(coalesce(p_action, 'ADMIN_ACTION'), 120),
    p_target_user,
    jsonb_build_object('details', left(coalesce(p_details, ''), 2000))
  );
end;
$$;

revoke execute on function public.admin_record_audit(text,text,uuid) from public, anon;
grant execute on function public.admin_record_audit(text,text,uuid) to authenticated;
