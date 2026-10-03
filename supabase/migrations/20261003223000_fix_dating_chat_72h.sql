-- Circle Panda: restore the intended 72-hour Dating Chat flow.
-- A mutual match can open Dating Chat immediately; messages are free during the
-- first 72 hours. After 72 hours, both Pandas must explicitly continue before
-- chat can continue and normal 1 BC/message billing resumes.

create or replace function public.create_direct_thread(
  p_other_user_id uuid,
  p_kind text default 'dm',
  p_blurb text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  uid uuid := auth.uid();
  tid uuid;
  dating_ok boolean := false;
  req_ok boolean := false;
  match_reveal_at timestamptz;
  both_confirmed boolean := false;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_other_user_id is null or p_other_user_id = uid then raise exception 'Invalid recipient'; end if;
  if p_kind not in ('dm','dating') then raise exception 'Invalid thread type'; end if;

  if p_kind = 'dating' then
    select c.reveal_at,
           coalesce(c.requester_confirmed, false) and coalesce(c.recipient_confirmed, false)
      into match_reveal_at, both_confirmed
    from public.dating_connections c
    where c.status = 'matched'
      and ((c.requester_id = uid and c.recipient_id = p_other_user_id)
        or (c.requester_id = p_other_user_id and c.recipient_id = uid))
    order by c.matched_at desc nulls last
    limit 1;

    if match_reveal_at is null then
      raise exception 'Dating chat is locked';
    end if;

    -- The first 72 hours are an active free Dating Chat window.
    -- Once that window ends, both people must have continued.
    if now() >= match_reveal_at and not both_confirmed then
      raise exception 'Dating chat is locked until both people confirm after 72 hours';
    end if;
  else
    select exists(
      select 1
      from public.direct_message_requests r
      where r.status = 'accepted'
        and ((r.sender_id = uid and r.recipient_id = p_other_user_id)
          or (r.sender_id = p_other_user_id and r.recipient_id = uid))
    ) into req_ok;

    if not req_ok then
      raise exception 'Message request must be accepted first';
    end if;
  end if;

  select id into tid
  from public.cp_threads
  where kind = p_kind
    and ((owner_id = uid and participant_id = p_other_user_id)
      or (owner_id = p_other_user_id and participant_id = uid))
  order by created_at asc
  limit 1;

  if tid is null then
    insert into public.cp_threads(owner_id, participant_id, other_alias, kind, blurb)
    values(uid, p_other_user_id, 'Anonymous Panda', p_kind, left(coalesce(p_blurb, ''), 200))
    returning id into tid;
  end if;

  if p_kind = 'dating' then
    perform public.award_xp_secure('dating_match_chat', tid);
  end if;

  return jsonb_build_object('id', tid);
end;
$function$;

revoke all on function public.create_direct_thread(uuid,text,text) from public;
grant execute on function public.create_direct_thread(uuid,text,text) to authenticated;