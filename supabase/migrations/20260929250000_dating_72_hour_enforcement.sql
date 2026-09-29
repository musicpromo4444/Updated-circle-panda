-- Circle Panda: Dating 72-hour enforcement + post-unlock billing
-- The free 72-hour window begins at the mutual match time, not at chat creation.

create or replace function public.create_direct_thread(p_other_user_id uuid, p_kind text default 'dm', p_blurb text default '')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  tid uuid;
  dating_ok boolean := false;
  req_ok boolean := false;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_other_user_id is null or p_other_user_id = uid then raise exception 'Invalid recipient'; end if;
  if p_kind not in ('dm','dating') then raise exception 'Invalid thread type'; end if;

  if p_kind='dating' then
    select exists(
      select 1 from public.dating_connections c
      where c.status='matched'
        and c.requester_confirmed=true
        and c.recipient_confirmed=true
        and c.reveal_at is not null
        and c.reveal_at <= now()
        and ((c.requester_id=uid and c.recipient_id=p_other_user_id)
          or (c.requester_id=p_other_user_id and c.recipient_id=uid))
    ) into dating_ok;
    if not dating_ok then raise exception 'Dating chat is locked until both people confirm after 72 hours'; end if;
  else
    select exists(
      select 1 from public.direct_message_requests r
      where r.status='accepted'
        and ((r.sender_id=uid and r.recipient_id=p_other_user_id)
          or (r.sender_id=p_other_user_id and r.recipient_id=uid))
    ) into req_ok;
    if not req_ok then raise exception 'Message request must be accepted first'; end if;
  end if;

  select id into tid from public.cp_threads
  where kind=p_kind
    and ((owner_id=uid and participant_id=p_other_user_id)
      or (owner_id=p_other_user_id and participant_id=uid))
  order by created_at asc limit 1;

  if tid is null then
    insert into public.cp_threads(owner_id,participant_id,other_alias,kind,blurb)
    values(uid,p_other_user_id,'Anonymous Panda',p_kind,left(coalesce(p_blurb,''),200))
    returning id into tid;
  end if;
  return jsonb_build_object('id',tid);
end;
$$;

create or replace function public.send_direct_message(p_thread_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  t public.cp_threads%rowtype;
  clean_body text := trim(coalesce(p_body,''));
  vip boolean := false;
  dating_free boolean := false;
  charge bigint := 1;
  bal bigint;
  msg public.cp_thread_messages%rowtype;
  match_started timestamptz;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if length(clean_body) < 1 or length(clean_body) > 4000 then raise exception 'Message must be 1-4000 characters'; end if;

  select * into t from public.cp_threads
  where id=p_thread_id and (owner_id=uid or participant_id=uid) for update;
  if not found then raise exception 'Chat not found'; end if;

  select coalesce(p.is_vip,false)
    and (p.vip_expires_at is null or p.vip_expires_at > now())
    into vip
  from public.profiles p where p.id=uid;

  if t.kind='dating' then
    select c.matched_at into match_started
    from public.dating_connections c
    where c.status='matched'
      and c.requester_confirmed=true
      and c.recipient_confirmed=true
      and c.reveal_at is not null
      and ((c.requester_id=uid and c.recipient_id=t.participant_id)
        or (c.recipient_id=uid and c.requester_id=t.participant_id))
    order by c.matched_at desc
    limit 1;

    if match_started is null then
      raise exception 'Dating chat is locked until both people confirm after 72 hours';
    end if;
    dating_free := match_started > now() - interval '72 hours';
  end if;

  if vip or dating_free then charge := 0; end if;

  if charge > 0 then
    bal := public.apply_bc_delta(uid,-charge,'Direct message','direct_message',p_thread_id);
  else
    select coalesce(balance,0) into bal from public.bc_accounts where user_id=uid;
  end if;

  insert into public.cp_thread_messages(thread_id,user_id,body)
  values(p_thread_id,uid,clean_body)
  returning * into msg;

  return jsonb_build_object(
    'id',msg.id,'body',msg.body,'created_at',msg.created_at,
    'balance',coalesce(bal,0),'charged_bc',charge,
    'free_reason',case when vip then 'vip' when dating_free then 'dating_72h' else null end
  );
end;
$$;

revoke all on function public.create_direct_thread(uuid,text,text) from public, anon;
grant execute on function public.create_direct_thread(uuid,text,text) to authenticated;
revoke all on function public.send_direct_message(uuid,text) from public, anon;
grant execute on function public.send_direct_message(uuid,text) to authenticated;
