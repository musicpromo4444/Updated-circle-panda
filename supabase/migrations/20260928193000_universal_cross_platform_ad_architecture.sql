-- Universal cross-platform ad architecture for Web, Android, and iOS.
-- One placement can have multiple provider configurations per platform.
-- Provider credentials/secrets are intentionally not stored in this client-readable catalog.

create table if not exists public.universal_ad_placements (
  id uuid primary key default gen_random_uuid(),
  placement_key text not null unique,
  label text not null,
  default_format text not null default 'banner'
    check (default_format in ('banner','native','interstitial','rewarded','playable','sponsor','offerwall','link')),
  enabled boolean not null default true,
  frequency_cap_seconds integer not null default 0 check (frequency_cap_seconds >= 0),
  targeting jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.universal_ad_provider_configs (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid not null references public.universal_ad_placements(id) on delete cascade,
  platform text not null check (platform in ('web','android','ios')),
  strategy text not null default 'single' check (strategy in ('single','mediation')),
  provider text not null check (provider in ('admob_mediation','admob','adsterra','direct_sponsor','custom_adapter')),
  format text not null check (format in ('banner','native','interstitial','rewarded','playable','sponsor','offerwall','link')),
  provider_label text,
  ad_unit_id text,
  app_id text,
  placement_code text,
  adapter_key text,
  priority integer not null default 100 check (priority >= 0),
  enabled boolean not null default true,
  targeting jsonb not null default '{}'::jsonb,
  schedule_start timestamptz,
  schedule_end timestamptz,
  frequency_cap_seconds integer not null default 0 check (frequency_cap_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (placement_id, platform, provider, ad_unit_id, placement_code)
);

create index if not exists universal_ad_provider_configs_lookup_idx
  on public.universal_ad_provider_configs (placement_id, platform, enabled, priority);

alter table public.universal_ad_placements enable row level security;
alter table public.universal_ad_provider_configs enable row level security;

revoke all on table public.universal_ad_placements from anon, authenticated;
revoke all on table public.universal_ad_provider_configs from anon, authenticated;

create or replace function public.admin_upsert_universal_ad_placement(
  p_id uuid,
  p_placement_key text,
  p_label text,
  p_default_format text,
  p_enabled boolean,
  p_frequency_cap_seconds integer,
  p_targeting jsonb
) returns public.universal_ad_placements
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare v_row public.universal_ad_placements;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  if p_id is null then
    insert into public.universal_ad_placements
      (placement_key,label,default_format,enabled,frequency_cap_seconds,targeting,updated_at)
    values
      (trim(p_placement_key),trim(p_label),p_default_format,p_enabled,greatest(0,p_frequency_cap_seconds),coalesce(p_targeting,'{}'::jsonb),now())
    returning * into v_row;
  else
    update public.universal_ad_placements
      set placement_key=trim(p_placement_key), label=trim(p_label), default_format=p_default_format,
          enabled=p_enabled, frequency_cap_seconds=greatest(0,p_frequency_cap_seconds),
          targeting=coalesce(p_targeting,'{}'::jsonb), updated_at=now()
      where id=p_id
      returning * into v_row;
  end if;
  return v_row;
end $function$;

create or replace function public.admin_upsert_universal_ad_provider(
  p_id uuid,
  p_placement_id uuid,
  p_platform text,
  p_strategy text,
  p_provider text,
  p_format text,
  p_provider_label text,
  p_ad_unit_id text,
  p_app_id text,
  p_placement_code text,
  p_adapter_key text,
  p_priority integer,
  p_enabled boolean,
  p_targeting jsonb,
  p_schedule_start timestamptz,
  p_schedule_end timestamptz,
  p_frequency_cap_seconds integer
) returns public.universal_ad_provider_configs
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare v_row public.universal_ad_provider_configs;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  if p_id is null then
    insert into public.universal_ad_provider_configs
      (placement_id,platform,strategy,provider,format,provider_label,ad_unit_id,app_id,placement_code,adapter_key,priority,enabled,targeting,schedule_start,schedule_end,frequency_cap_seconds,updated_at)
    values
      (p_placement_id,p_platform,p_strategy,p_provider,p_format,nullif(trim(p_provider_label),''),nullif(trim(p_ad_unit_id),''),nullif(trim(p_app_id),''),nullif(trim(p_placement_code),''),nullif(trim(p_adapter_key),''),greatest(0,p_priority),p_enabled,coalesce(p_targeting,'{}'::jsonb),p_schedule_start,p_schedule_end,greatest(0,p_frequency_cap_seconds),now())
    returning * into v_row;
  else
    update public.universal_ad_provider_configs
      set placement_id=p_placement_id, platform=p_platform, strategy=p_strategy, provider=p_provider,
          format=p_format, provider_label=nullif(trim(p_provider_label),''), ad_unit_id=nullif(trim(p_ad_unit_id),''),
          app_id=nullif(trim(p_app_id),''), placement_code=nullif(trim(p_placement_code),''),
          adapter_key=nullif(trim(p_adapter_key),''), priority=greatest(0,p_priority), enabled=p_enabled,
          targeting=coalesce(p_targeting,'{}'::jsonb), schedule_start=p_schedule_start, schedule_end=p_schedule_end,
          frequency_cap_seconds=greatest(0,p_frequency_cap_seconds), updated_at=now()
      where id=p_id
      returning * into v_row;
  end if;
  return v_row;
end $function$;

create or replace function public.admin_delete_universal_ad_provider(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if not private.is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  delete from public.universal_ad_provider_configs where id=p_id;
  return true;
end $function$;

create or replace function public.get_universal_ad_runtime_config()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select jsonb_build_object(
    'placements',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',p.id,'placement_key',p.placement_key,'label',p.label,
          'default_format',p.default_format,'enabled',p.enabled,
          'frequency_cap_seconds',p.frequency_cap_seconds,'targeting',p.targeting,
          'providers',coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id',c.id,'platform',c.platform,'strategy',c.strategy,'provider',c.provider,
                'format',c.format,'provider_label',c.provider_label,'ad_unit_id',c.ad_unit_id,
                'app_id',c.app_id,'placement_code',c.placement_code,'adapter_key',c.adapter_key,
                'priority',c.priority,'enabled',c.enabled,'targeting',c.targeting,
                'schedule_start',c.schedule_start,'schedule_end',c.schedule_end,
                'frequency_cap_seconds',c.frequency_cap_seconds
              ) order by c.priority asc, c.updated_at desc
            )
            from public.universal_ad_provider_configs c
            where c.placement_id=p.id and c.enabled=true
              and (c.schedule_start is null or c.schedule_start <= now())
              and (c.schedule_end is null or c.schedule_end >= now())
          ),'[]'::jsonb)
        ) order by p.placement_key
      ) from public.universal_ad_placements p where p.enabled=true
    ),'[]'::jsonb)
  );
$function$;

revoke all on function public.admin_upsert_universal_ad_placement(uuid,text,text,text,boolean,integer,jsonb) from public;
revoke all on function public.admin_upsert_universal_ad_provider(uuid,uuid,text,text,text,text,text,text,text,text,text,integer,boolean,jsonb,timestamptz,timestamptz,integer) from public;
revoke all on function public.admin_delete_universal_ad_provider(uuid) from public;
revoke all on function public.get_universal_ad_runtime_config() from public;

grant execute on function public.admin_upsert_universal_ad_placement(uuid,text,text,text,boolean,integer,jsonb) to authenticated;
grant execute on function public.admin_upsert_universal_ad_provider(uuid,uuid,text,text,text,text,text,text,text,text,text,integer,boolean,jsonb,timestamptz,timestamptz,integer) to authenticated;
grant execute on function public.admin_delete_universal_ad_provider(uuid) to authenticated;
grant execute on function public.get_universal_ad_runtime_config() to anon, authenticated;

insert into public.universal_ad_placements (placement_key,label,default_format,enabled)
values
 ('home_bottom','Home Bottom Ad','banner',true),
 ('main_feed','Main Feed Ad','banner',true),
 ('messages','Messages Ad','banner',true),
 ('vip_groups','VIP Groups Ad','banner',true),
 ('normal_groups','Normal Groups Ad','banner',true),
 ('hot_seat','Hot Seat Ad','sponsor',true),
 ('secret_confessions','Secret Confessions Ad','banner',true),
 ('dating','Dating Ad','banner',true),
 ('wcw_mcm','WCW & MCM Ad','banner',true),
 ('daily_reward','Daily Reward Ad','banner',true)
on conflict (placement_key) do nothing;
