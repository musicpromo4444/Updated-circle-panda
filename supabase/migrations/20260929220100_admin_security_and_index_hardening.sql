do $$
declare r record;
begin
 for r in select p.proname,pg_get_function_identity_arguments(p.oid) args
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef and (p.proname like 'admin_%' or p.proname in ('cp_start_winner_cycle','cp_submit_winner_activity','cp_finalize_winner_cycle')) loop
   execute format('revoke execute on function public.%I(%s) from public',r.proname,r.args);
   execute format('grant execute on function public.%I(%s) to authenticated',r.proname,r.args);
 end loop;
end $$;
drop index if exists public.crush_badges_user_kind_unique;
drop index if exists public.crush_winners_week_kind_unique;
