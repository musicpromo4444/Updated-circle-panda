-- Restrict Circle Panda admin configuration to administrators only.
drop policy if exists "crush admin config read" on public.crush_admin_config;
create policy "crush admin config read" on public.crush_admin_config
for select to authenticated
using ((select private.is_admin((select auth.uid()))));
