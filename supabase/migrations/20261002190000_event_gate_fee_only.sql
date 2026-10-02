-- Gate fee is informational only. Event RSVP never charges Circle Panda BC/cash.
create or replace function public.toggle_event_rsvp_secure(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  uid uuid := auth.uid();
  event_owner uuid;
  event_title text;
  event_start timestamptz;
  already_joined boolean;
begin
  if uid is null then raise exception 'Unauthorized'; end if;
  select e.owner_id,e.title,e.starts_at into event_owner,event_title,event_start
  from public.events e where e.id=p_event_id and e.is_published=true for update;
  if event_owner is null then raise exception 'Event not found or unavailable'; end if;
  if event_start is not null and event_start <= now() then raise exception 'This event has already started'; end if;
  select exists(select 1 from public.event_attendees where event_id=p_event_id and user_id=uid) into already_joined;
  if already_joined then
    delete from public.event_attendees where event_id=p_event_id and user_id=uid;
    return jsonb_build_object('joined',false);
  end if;
  insert into public.event_attendees(event_id,user_id) values(p_event_id,uid);
  return jsonb_build_object('joined',true);
end; $$;
revoke all on function public.toggle_event_rsvp_secure(uuid) from public;
grant execute on function public.toggle_event_rsvp_secure(uuid) to authenticated;