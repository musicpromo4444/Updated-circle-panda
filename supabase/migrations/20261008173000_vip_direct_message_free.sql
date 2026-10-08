-- Keep normal direct messages at 1 BC, but make messages sent by an active VIP free.
-- Dating keeps its separate 72-hour free window.
do $$
declare d text; nd text; oid oid;
begin
  select p.oid into oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind='f' and p.proname='send_dm_message';
  d := pg_get_functiondef(oid); nd := d;
  nd := replace(nd, 'v_uid uuid:=auth.uid(); v_recipient uuid; v_message uuid;', 'v_uid uuid:=auth.uid(); v_recipient uuid; v_sender_vip boolean:=false; v_message uuid;');
  nd := replace(nd, 'select case when user_a=v_uid then user_b else user_a end into v_recipient from public.dm_threads where id=p_thread_id and (user_a=v_uid or user_b=v_uid) and status=''active'';',
                'select case when t.user_a=v_uid then t.user_b else t.user_a end, coalesce(p.is_vip,false) into v_recipient,v_sender_vip from public.dm_threads t join public.profiles p on p.id=v_uid where t.id=p_thread_id and (t.user_a=v_uid or t.user_b=v_uid) and t.status=''active'';');
  nd := replace(nd, 'else perform public.spend_bc(1,''private_message'',''dm_thread'',p_thread_id,p_idempotency_key); end if;',
                'else if not v_sender_vip then perform public.spend_bc(1,''private_message'',''dm_thread'',p_thread_id,p_idempotency_key); end if; end if;');
  if nd <> d then execute nd; end if;
end $$;