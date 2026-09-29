-- Dating profile privacy: discovery uses the secure RPC; direct table reads are owner-only.

drop policy if exists "dating_read" on public.dating_profiles;
create policy "dating_read" on public.dating_profiles
for select to authenticated
using ((select auth.uid()) = user_id);
