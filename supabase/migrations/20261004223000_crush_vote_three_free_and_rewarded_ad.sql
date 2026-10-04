-- Crush voting: 3 free votes per user per MCM/WCW day, then 1 BC or 3 votes from a completed rewarded ad.
create table if not exists public.crush_vote_ad_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.crush_vote_ad_credits enable row level security;
create policy if not exists "Users can read own crush vote credits" on public.crush_vote_ad_credits for select to authenticated using ((select auth.uid())=user_id);

-- The functions below are installed/updated in the production database by the corresponding deployment migration.
