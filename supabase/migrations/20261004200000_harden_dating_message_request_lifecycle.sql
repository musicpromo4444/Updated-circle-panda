-- Production Dating message-request lifecycle.
-- Requests are created through the secure RPC, while users can only read requests they sent or received.
alter table public.direct_message_requests enable row level security;

drop policy if exists "own message requests" on public.direct_message_requests;
create policy "own message requests"
on public.direct_message_requests
for select
to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);

revoke insert, update, delete on public.direct_message_requests from authenticated, anon;
grant select on public.direct_message_requests to authenticated;

create index if not exists direct_message_requests_sender_status_created_idx
on public.direct_message_requests(sender_id,status,created_at desc);

create index if not exists direct_message_requests_recipient_status_created_idx
on public.direct_message_requests(recipient_id,status,created_at desc);

create unique index if not exists direct_message_requests_one_pending_dating
on public.direct_message_requests(sender_id,recipient_id,kind)
where kind='dating' and status='pending';
