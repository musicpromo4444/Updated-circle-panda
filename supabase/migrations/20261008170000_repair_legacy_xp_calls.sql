-- Repair legacy XP calls that still passed a removed third argument.
-- Canonical public.award_xp accepts (p_action, p_idempotency_key).
do $$
declare r record; d text; nd text;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prokind='f'
      and p.proname in ('create_group','create_post','join_group','review_group_join_request','send_dm_message')
  loop
    d := pg_get_functiondef(r.oid);
    nd := d;
    nd := replace(nd, 'public.award_xp(''create_group'',null,''group_create:''||v_id::text)', 'public.award_xp(''create_group'',''group_create:''||v_id::text)');
    nd := replace(nd, 'public.award_xp(''create_post'',null,''post:''||v_id::text)', 'public.award_xp(''create_post'',''post:''||v_id::text)');
    nd := replace(nd, 'public.award_xp(''join_group'',null,''group:''||p_group_id::text||'':user:''||v_uid::text)', 'public.award_xp(''join_group'',''group:''||p_group_id::text||'':user:''||v_uid::text)');
    nd := replace(nd, 'public.award_xp(''join_group'',null,''group:''||r.group_id::text||'':user:''||r.user_id::text)', 'public.award_xp(''join_group'',''group:''||r.group_id::text||'':user:''||r.user_id::text)');
    nd := replace(nd, 'public.award_xp(''private_message'',null,''dm:''||v_message::text)', 'public.award_xp(''private_message'',''dm:''||v_message::text)');
    if nd <> d then execute nd; end if;
  end loop;
end $$;