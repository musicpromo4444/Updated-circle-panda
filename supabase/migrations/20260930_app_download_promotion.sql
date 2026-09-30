-- Circle Panda Android app download promotion
alter table public.app_settings
  add column if not exists download_popup_enabled boolean not null default true,
  add column if not exists download_popup_title text not null default 'Download Circle Panda',
  add column if not exists download_popup_message text not null default 'Get the full Circle Panda Android experience. Download the app and install it on your phone.',
  add column if not exists download_popup_reward text not null default 'Get 500 BC',
  add column if not exists download_popup_cta text not null default 'Download & Install',
  add column if not exists download_popup_cooldown_hours integer not null default 24,
  add column if not exists download_popup_mobile_only boolean not null default true,
  add column if not exists download_popup_version text not null default '';

-- The existing admin control-center RPC now persists these fields.
