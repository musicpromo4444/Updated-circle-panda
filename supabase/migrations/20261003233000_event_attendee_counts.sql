-- Circle Panda: expose aggregate event attendance without exposing attendee identities.
create or replace function public.get_event_attendee_counts(p_event_ids uuid[])
returns table(event_id uuid, attendee_count bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select ea.event_id, count(*)::bigint
  from public.event_attendees ea
  where ea.event_id = any(coalesce(p_event_ids, '{}'::uuid[]))
  group by ea.event_id
$$;

revoke all on function public.get_event_attendee_counts(uuid[]) from public;
grant execute on function public.get_event_attendee_counts(uuid[]) to authenticated;

create or replace function public.toggle_event_rsvp_secure(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  uid uuid := auth.uid();
  event_owner uuid;
  event_title text;
  event_start timestamptz;
  already_joined boolean;
  attendee_total bigint;
begin
  if uid is null then raise exception 'Unauthorized'; end if;

  select e.owner_id,e.title,e.starts_at
    into event_owner,event_title,event_start
  from public.events e
  where e.id=p_event_id and e.is_published=true
  for update;

  if event_owner is null then raise exception 'Event not found or unavailable'; end if;
  if event_start is not null and event_start <= now() then raise exception 'This event has already started'; end if;

  select exists(
    select 1 from public.event_attendees
    where event_id=p_event_id and user_id=uid
  ) into already_joined;

  if already_joined then
    delete from public.event_attendees where event_id=p_event_id and user_id=uid;
  else
    insert into public.event_attendees(event_id,user_id) values(p_event_id,uid);
  end if;

  select count(*) into attendee_total
  from public.event_attendees
  where event_id=p_event_id;

  return jsonb_build_object(
    'joined', not already_joined,
    'attendee_count', attendee_total
  );
end;
$function$;

revoke all on function public.toggle_event_rsvp_secure(uuid) from public;
grant execute on function public.toggle_event_rsvp_secure(uuid) to authenticated;
