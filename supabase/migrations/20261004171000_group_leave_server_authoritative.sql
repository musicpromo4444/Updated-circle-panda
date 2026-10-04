-- Group membership is server-authoritative. Leaving marks the membership inactive exactly once.
create or replace function public.leave_group_secure(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  uid uuid:=auth.uid();
  owner uuid;
  was_member boolean;
  remaining bigint;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select owner_id into owner from public.groups where id=p_group_id;
  if owner is null then raise exception 'Group not found'; end if;
  if owner=uid then raise exception 'Group owners cannot leave. Transfer ownership or delete the group first.'; end if;

  select exists(
    select 1 from public.group_members
    where group_id=p_group_id and user_id=uid and left_at is null
  ) into was_member;

  if was_member then
    update public.group_members
      set left_at=now()
      where group_id=p_group_id and user_id=uid and left_at is null;
  end if;

  select count(*) into remaining
  from public.group_members
  where group_id=p_group_id and left_at is null;

  return jsonb_build_object('left',was_member,'member_count',remaining);
end
$function$;

revoke all on function public.leave_group_secure(uuid) from public;
grant execute on function public.leave_group_secure(uuid) to authenticated;