-- Harden SECURITY DEFINER execution inherited through PUBLIC and anon.

-- Remove inherited PUBLIC/anon execution from SECURITY DEFINER functions.
-- Functions that already had authenticated execution retain it; the public
-- universal ad runtime configuration remains intentionally callable publicly.

do $$
declare
  r record;
begin
  for r in
    select p.oid,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname <> 'get_universal_ad_runtime_config'
  loop
    execute format('revoke execute on function %s from public', r.oid::regprocedure);
    execute format('revoke execute on function %s from anon', r.oid::regprocedure);
    if r.auth_exec then
      execute format('grant execute on function %s to authenticated', r.oid::regprocedure);
    end if;
  end loop;
end $$;

