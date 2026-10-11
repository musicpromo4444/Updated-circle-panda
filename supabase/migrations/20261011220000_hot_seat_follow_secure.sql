-- Secure follow/unfollow action for the current Hot Seat host.
create or replace function public.toggle_hot_seat_follow_secure(p_host_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if exists (
    select 1 from auth.users u
    where u.id = v_uid and coalesce(u.is_anonymous, false)
  ) then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_host_id is null or not exists (
    select 1 from public.hot_seat_hosts h where h.id = p_host_id
  ) then
    raise exception 'HOST_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.hot_seat_follows f
    where f.host_id = p_host_id and f.user_id = v_uid
  ) then
    delete from public.hot_seat_follows
    where host_id = p_host_id and user_id = v_uid;
    return false;
  end if;

  insert into public.hot_seat_follows(host_id, user_id)
  values (p_host_id, v_uid)
  on conflict (host_id, user_id) do nothing;

  return true;
end;
$function$;

revoke all on function public.toggle_hot_seat_follow_secure(uuid) from public;
grant execute on function public.toggle_hot_seat_follow_secure(uuid) to authenticated;
