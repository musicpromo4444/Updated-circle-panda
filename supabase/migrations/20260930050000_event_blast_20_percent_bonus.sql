-- Event Blast: correct 20% bonus notification reach and delivery tracking
alter table public.event_blasts add column if not exists bonus_percent integer not null default 20;
alter table public.event_blasts add column if not exists notification_sent integer not null default 0;
alter table public.event_blasts add column if not exists notification_target integer not null default 0;

create table if not exists public.event_blast_deliveries (
  id uuid primary key default gen_random_uuid(),
  blast_id uuid not null references public.event_blasts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid references public.cp_notifications(id) on delete set null,
  delivered_at timestamptz not null default now(),
  unique(blast_id,user_id)
);

alter table public.event_blast_deliveries enable row level security;
revoke all on public.event_blast_deliveries from anon, authenticated;

-- The activation RPCs create the blast, charge the selected price, and send in-app
-- Event Boost notifications to up to 120% of the purchased unique reach.
