create table if not exists public.native_store_account_bindings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_obfuscated_account_id text unique,
  apple_app_account_token uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.native_store_account_bindings enable row level security;
revoke all on public.native_store_account_bindings from anon,authenticated;
grant select on public.native_store_account_bindings to authenticated;
drop policy if exists "Users can read their own native store account binding" on public.native_store_account_bindings;
create policy "Users can read their own native store account binding" on public.native_store_account_bindings
for select to authenticated using ((select auth.uid())=user_id);
