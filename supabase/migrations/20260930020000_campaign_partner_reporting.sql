-- Circle Panda campaign + Circle Partner reporting
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

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_code text not null unique,
  campaign_name text not null,
  advertiser_name text not null,
  partner_id uuid references public.circle_partners(id) on delete set null,
  pricing_model text not null default 'impressions' check (pricing_model in ('impressions','clicks','completions','fixed','mixed')),
  budget numeric(14,2) not null default 0 check (budget >= 0),
  currency text not null default 'USD',
  target_countries text[] not null default '{}',
  start_at timestamptz,
  end_at timestamptz,
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ad_creatives add column if not exists campaign_id uuid references public.ad_campaigns(id) on delete set null;
alter table public.ad_events add column if not exists campaign_id uuid references public.ad_campaigns(id) on delete set null;
alter table public.ad_events add column if not exists country_code text;
alter table public.ad_events add column if not exists value numeric(14,4) not null default 0;

create index if not exists ad_campaigns_status_idx on public.ad_campaigns(status, start_at, end_at);
create index if not exists ad_campaigns_partner_idx on public.ad_campaigns(partner_id, created_at desc);
create index if not exists ad_creatives_campaign_idx on public.ad_creatives(campaign_id, status);
create index if not exists ad_events_campaign_idx on public.ad_events(campaign_id, created_at desc);
create index if not exists ad_events_campaign_country_idx on public.ad_events(campaign_id, country_code, event_type);

alter table public.circle_partners enable row level security;
alter table public.ad_campaigns enable row level security;

revoke all on public.circle_partners, public.ad_campaigns from anon, authenticated;

create or replace function public.admin_save_circle_partner(
  p_id uuid,
  p_partner_code text,
  p_partner_name text,
  p_contact_name text default null,
  p_contact_email text default null,
  p_notes text default null,
  p_status text default 'active'
) returns public.circle_partners
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v public.circle_partners;
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  if p_status not in ('active','paused','archived') then raise exception 'Invalid partner status'; end if;
  if p_id is null then
    insert into public.circle_partners(partner_code,partner_name,contact_name,contact_email,notes,status)
    values(trim(p_partner_code),trim(p_partner_name),nullif(trim(p_contact_name),''),nullif(trim(p_contact_email),''),nullif(trim(p_notes),''),p_status)
    returning * into v;
  else
    update public.circle_partners set
      partner_code=trim(p_partner_code), partner_name=trim(p_partner_name),
      contact_name=nullif(trim(p_contact_name),''), contact_email=nullif(trim(p_contact_email),''),
      notes=nullif(trim(p_notes),''), status=p_status, updated_at=now()
    where id=p_id returning * into v;
  end if;
  return v;
end $$;

create or replace function public.admin_save_ad_campaign(
  p_id uuid,
  p_campaign_code text,
  p_campaign_name text,
  p_advertiser_name text,
  p_partner_id uuid default null,
  p_pricing_model text default 'impressions',
  p_budget numeric default 0,
  p_currency text default 'USD',
  p_target_countries text[] default '{}',
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_status text default 'draft'
) returns public.ad_campaigns
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v public.ad_campaigns;
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  if p_pricing_model not in ('impressions','clicks','completions','fixed','mixed') then raise exception 'Invalid pricing model'; end if;
  if p_status not in ('draft','active','paused','completed') then raise exception 'Invalid campaign status'; end if;
  if p_id is null then
    insert into public.ad_campaigns(campaign_code,campaign_name,advertiser_name,partner_id,pricing_model,budget,currency,target_countries,start_at,end_at,status)
    values(trim(p_campaign_code),trim(p_campaign_name),trim(p_advertiser_name),p_partner_id,p_pricing_model,greatest(0,p_budget),upper(trim(p_currency)),coalesce(p_target_countries,'{}'),p_start_at,p_end_at,p_status)
    returning * into v;
  else
    update public.ad_campaigns set
      campaign_code=trim(p_campaign_code), campaign_name=trim(p_campaign_name),
      advertiser_name=trim(p_advertiser_name), partner_id=p_partner_id, pricing_model=p_pricing_model,
      budget=greatest(0,p_budget), currency=upper(trim(p_currency)), target_countries=coalesce(p_target_countries,'{}'),
      start_at=p_start_at, end_at=p_end_at, status=p_status, updated_at=now()
    where id=p_id returning * into v;
  end if;
  return v;
end $$;

create or replace function public.admin_get_campaign_reporting()
returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  return jsonb_build_object(
    'campaigns', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
        select c.*, p.partner_name,
          coalesce((select count(*) from public.ad_creatives ac where ac.campaign_id=c.id),0)::int as creative_count,
          coalesce((select count(*) from public.ad_events ae where ae.campaign_id=c.id and ae.event_type='impression'),0)::bigint as impressions,
          coalesce((select count(*) from public.ad_events ae where ae.campaign_id=c.id and ae.event_type='click'),0)::bigint as clicks,
          coalesce((select count(*) from public.ad_events ae where ae.campaign_id=c.id and ae.event_type='complete'),0)::bigint as completions,
          coalesce((select count(*) from public.ad_events ae where ae.campaign_id=c.id and ae.event_type='skipped'),0)::bigint as skips,
          coalesce((select sum(ae.value) from public.ad_events ae where ae.campaign_id=c.id),0)::numeric as tracked_value
        from public.ad_campaigns c left join public.circle_partners p on p.id=c.partner_id
      ) x
    ),'[]'::jsonb),
    'partners', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.partner_name) from (
        select p.*,
          count(distinct c.id)::int as campaign_count,
          coalesce(sum((select count(*) from public.ad_events ae where ae.campaign_id=c.id and ae.event_type='impression')),0)::bigint as impressions,
          coalesce(sum((select count(*) from public.ad_events ae where ae.campaign_id=c.id and ae.event_type='click')),0)::bigint as clicks,
          coalesce(sum((select count(*) from public.ad_events ae where ae.campaign_id=c.id and ae.event_type='complete')),0)::bigint as completions,
          coalesce(sum((select sum(ae.value) from public.ad_events ae where ae.campaign_id=c.id)),0)::numeric as tracked_value
        from public.circle_partners p left join public.ad_campaigns c on c.partner_id=p.id
        group by p.id
      ) x
    ),'[]'::jsonb)
  );
end $$;

create or replace function public.admin_get_campaign_country_report(p_campaign_id uuid)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.impressions desc)
    from (
      select coalesce(nullif(upper(ae.country_code),''),'UN') as country_code,
        count(*) filter (where ae.event_type='impression')::bigint as impressions,
        count(*) filter (where ae.event_type='click')::bigint as clicks,
        count(*) filter (where ae.event_type='complete')::bigint as completions,
        count(*) filter (where ae.event_type='skipped')::bigint as skips,
        coalesce(sum(ae.value),0)::numeric as tracked_value
      from public.ad_events ae
      where ae.campaign_id=p_campaign_id
      group by 1
    ) x
  ),'[]'::jsonb);
end $$;

create or replace function public.admin_attach_creative_to_campaign(p_creative_id uuid, p_campaign_id uuid)
returns boolean
language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  update public.ad_creatives set campaign_id=p_campaign_id, updated_at=now() where id=p_creative_id;
  return found;
end $$;

revoke all on function public.admin_save_circle_partner(uuid,text,text,text,text,text,text) from public;
revoke all on function public.admin_save_ad_campaign(uuid,text,text,text,uuid,text,numeric,text,text[],timestamptz,timestamptz,text) from public;
revoke all on function public.admin_get_campaign_reporting() from public;
revoke all on function public.admin_get_campaign_country_report(uuid) from public;
revoke all on function public.admin_attach_creative_to_campaign(uuid,uuid) from public;
grant execute on function public.admin_save_circle_partner(uuid,text,text,text,text,text,text) to authenticated;
grant execute on function public.admin_save_ad_campaign(uuid,text,text,text,uuid,text,numeric,text,text[],timestamptz,timestamptz,text) to authenticated;
grant execute on function public.admin_get_campaign_reporting() to authenticated;
grant execute on function public.admin_get_campaign_country_report(uuid) to authenticated;
grant execute on function public.admin_attach_creative_to_campaign(uuid,uuid) to authenticated;

create or replace function public.record_ad_event_secure(
  p_ad_id uuid,
  p_event_type text,
  p_format text,
  p_placement text default null
) returns boolean
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_uid uuid:=auth.uid(); v_campaign uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_event_type not in ('impression','click','skipped','complete') then raise exception 'Invalid ad event'; end if;
  select campaign_id into v_campaign from public.ad_creatives where id=p_ad_id and status='active';
  if not found then return false; end if;
  insert into public.ad_events(ad_id,user_id,campaign_id,event_type,format,placement)
  values(p_ad_id,v_uid,v_campaign,p_event_type,p_format,p_placement);
  return true;
end $$;

revoke all on function public.record_ad_event_secure(uuid,text,text,text) from public,anon;
grant execute on function public.record_ad_event_secure(uuid,text,text,text) to authenticated;

create or replace function public.record_ad_event_secure(
  p_ad_id uuid,
  p_event_type text,
  p_format text,
  p_placement text,
  p_country_code text,
  p_value numeric default 0
) returns boolean
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_uid uuid:=auth.uid(); v_campaign uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_event_type not in ('impression','click','skipped','complete') then raise exception 'Invalid ad event'; end if;
  select campaign_id into v_campaign from public.ad_creatives where id=p_ad_id and status='active';
  if not found then return false; end if;
  insert into public.ad_events(ad_id,user_id,campaign_id,event_type,format,placement,country_code,value)
  values(p_ad_id,v_uid,v_campaign,p_event_type,p_format,p_placement,nullif(upper(trim(p_country_code)),''),greatest(0,coalesce(p_value,0)));
  return true;
end $$;

revoke all on function public.record_ad_event_secure(uuid,text,text,text,text,numeric) from public,anon;
grant execute on function public.record_ad_event_secure(uuid,text,text,text,text,numeric) to authenticated;
