create table if not exists public.hot_seat_provider_settings (
 id boolean primary key default true,
 youtube_enabled boolean not null default true,
 youtube_api_key text not null default '',
 aws_enabled boolean not null default false,
 aws_region text not null default '',
 aws_channel_arn text not null default '',
 aws_playback_url text not null default '',
 aws_access_key_id text not null default '',
 zegocloud_enabled boolean not null default false,
 zegocloud_app_id text not null default '',
 zegocloud_server_url text not null default '',
 push_enabled boolean not null default false,
 push_project_id text not null default '',
 push_client_email text not null default '',
 updated_at timestamptz not null default now(),
 updated_by uuid
);
alter table public.hot_seat_provider_settings enable row level security;
revoke all on public.hot_seat_provider_settings from anon, authenticated;
grant select on public.hot_seat_provider_settings to authenticated;
drop policy if exists "hotseat provider admin read" on public.hot_seat_provider_settings;
create policy "hotseat provider admin read" on public.hot_seat_provider_settings for select to authenticated using (private.is_admin(auth.uid()));
-- Provider secrets are stored in Supabase Vault by the admin RPC, never returned to the browser.
