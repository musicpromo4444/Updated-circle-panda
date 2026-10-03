-- Circle Panda production fixes: cross-account group discovery and public WCW/MCM media.
-- Applied directly to the production Supabase database during the 2026-10-03 fix.

create policy "group_members_authenticated_read"
on public.group_members
for select
to authenticated
using (true);

update storage.buckets
set public = true
where id = 'circle-panda-crush';
