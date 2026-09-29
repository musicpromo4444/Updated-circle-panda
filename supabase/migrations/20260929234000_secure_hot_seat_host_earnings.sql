alter table public.hot_seat_host_earnings enable row level security;
drop policy if exists "hotseat earnings admin read" on public.hot_seat_host_earnings;
create policy "hotseat earnings admin read"
on public.hot_seat_host_earnings for select to authenticated
using (private.is_admin(auth.uid()));