create or replace function public.claim_group_media_view_once(p_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public','pg_temp'
as $function$
declare
  uid uuid:=auth.uid();
  inserted_count integer;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  if not exists (
    select 1
    from public.cp_group_messages m
    join public.group_members gm
      on gm.group_id=m.group_id and gm.user_id=uid and gm.left_at is null
    where m.id=p_message_id
  ) then
    raise exception 'You are not a member of this group';
  end if;

  if not exists (
    select 1 from public.cp_group_messages
    where id=p_message_id
      and coalesce(view_once,true)=true
      and message_type in ('image','video')
  ) then
    return true;
  end if;

  insert into public.cp_group_media_views(message_id,user_id,viewed_at)
  values(p_message_id,uid,now())
  on conflict(message_id,user_id) do nothing;

  get diagnostics inserted_count=row_count;
  return inserted_count>0;
end;
$function$;

revoke all on function public.claim_group_media_view_once(uuid) from public,anon;
grant execute on function public.claim_group_media_view_once(uuid) to authenticated;
