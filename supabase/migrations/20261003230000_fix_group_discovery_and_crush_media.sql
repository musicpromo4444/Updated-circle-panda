-- Circle Panda production fixes: cross-account group discovery and public WCW/MCM media.
-- The production database was already updated directly; this migration keeps the fix
-- reproducible for a fresh database or future migration run.

drop policy if exists "group_members_authenticated_read" on public.group_members;
create policy "group_members_authenticated_read"
on public.group_members
for select
to authenticated
using (true);

update storage.buckets
set public = true
where id = 'circle-panda-crush';
