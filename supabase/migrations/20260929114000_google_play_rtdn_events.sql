create table if not exists public.google_play_rtdn_events (
  message_id text primary key,
  event_time timestamptz,
  received_at timestamptz not null default now()
);
alter table public.google_play_rtdn_events enable row level security;
revoke all on public.google_play_rtdn_events from anon,authenticated;
