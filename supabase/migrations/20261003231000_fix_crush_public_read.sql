-- Circle Panda: WCW/MCM submissions must be readable by public/anonymous visitors.
-- The existing authenticated policy is retained for owner-specific access; this policy
-- makes the public voting/photo viewer work before login as designed.
drop policy if exists "crush_nominees_public_read" on public.crush_nominees;
create policy "crush_nominees_public_read"
on public.crush_nominees
for select
to anon, authenticated
using (true);
