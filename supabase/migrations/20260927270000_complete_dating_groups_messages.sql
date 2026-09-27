-- Circle Panda: complete Dating + message request foundation
alter table public.dating_profiles add column if not exists country text not null default '';
alter table public.dating_profiles add column if not exists gender text not null default '';
alter table public.dating_profiles add column if not exists panda_name_snapshot text not null default '';
alter table public.dating_profiles add column if not exists location_snapshot text not null default '';

create table if not exists public.dating_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in('pending','matched','declined','blocked')),
  requester_confirmed boolean not null default false,
  recipient_confirmed boolean not null default false,
  requested_at timestamptz not null default now(),
  matched_at timestamptz,
  reveal_at timestamptz,
  unique(requester_id,recipient_id)
);
alter table public.dating_connections enable row level security;

create table if not exists public.direct_message_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'dm',
  message text not null default '',
  status text not null default 'pending',
  thread_id uuid references public.cp_threads(id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
alter table public.direct_message_requests enable row level security;

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id,blocked_id)
);
alter table public.user_blocks enable row level security;

-- Secure RPC definitions are deployed in the live project for:
-- register_dating_profile_secure
-- request_dating_match_secure
-- respond_dating_match_secure
-- confirm_dating_match_secure
-- request_direct_message_secure
-- respond_direct_message_request_secure
-- block_user_secure
