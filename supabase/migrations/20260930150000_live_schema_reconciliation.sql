-- Circle Panda live-schema reconciliation repairs
-- Keeps the production database compatible with the current repository migrations
-- when an older ad_campaigns shape already exists.

create table if not exists public.circle_partners (
  id uuid primary key default gen_random_uuid(),
  partner_code text not null unique,
  partner_name text not null,
  contact_name text,
  contact_email text,
  notes text,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ad_campaigns add column if not exists campaign_code text;
alter table public.ad_campaigns add column if not exists partner_id uuid;
alter table public.ad_campaigns add column if not exists created_at timestamptz not null default now();
alter table public.ad_campaigns add column if not exists updated_at timestamptz not null default now();

update public.ad_campaigns
set campaign_code = coalesce(nullif(campaign_code,''),'LEGACY-'||left(id::text,8))
where campaign_code is null or campaign_code='';

alter table public.ad_campaigns alter column campaign_code set not null;

create unique index if not exists ad_campaigns_campaign_code_uidx
  on public.ad_campaigns(campaign_code);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='ad_campaigns_partner_id_fkey'
  ) then
    alter table public.ad_campaigns
      add constraint ad_campaigns_partner_id_fkey
      foreign key(partner_id) references public.circle_partners(id)
      on delete set null;
  end if;
end $$;

alter table public.circle_partners enable row level security;
alter table public.ad_campaigns enable row level security;
revoke all on public.circle_partners, public.ad_campaigns from anon, authenticated;

-- Admin-only Hot Seat controls. The functions themselves enforce Admin access.
grant execute on function public.admin_hot_seat_break_activity_upsert(
  uuid,integer,text,text,text,boolean,integer
) to authenticated;

grant execute on function public.start_hot_seat_water_break_session(
  integer,integer
) to authenticated;
