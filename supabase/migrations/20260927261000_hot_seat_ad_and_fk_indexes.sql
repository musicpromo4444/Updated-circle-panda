-- Production performance indexes for recently added foreign keys
create index if not exists crush_shares_user_id_idx on public.crush_shares(user_id);
create index if not exists direct_message_requests_thread_id_idx on public.direct_message_requests(thread_id);
create index if not exists event_blasts_plan_id_idx on public.event_blasts(plan_id);
create index if not exists hot_seat_host_earnings_host_id_idx on public.hot_seat_host_earnings(host_id);
create index if not exists user_blocks_blocked_id_idx on public.user_blocks(blocked_id);
