create table if not exists public.payment_provider_settings (
  id smallint primary key default 1 check (id = 1),
  google_enabled boolean not null default false,
  google_package_name text not null default '',
  google_service_account_email text not null default '',
  google_rtdn_topic text not null default '',
  apple_enabled boolean not null default false,
  apple_bundle_id text not null default '',
  apple_team_id text not null default '',
  apple_issuer_id text not null default '',
  apple_key_id text not null default '',
  paystack_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.payment_provider_settings enable row level security;
revoke all on public.payment_provider_settings from anon, authenticated;
grant select on public.payment_provider_settings to authenticated;

drop policy if exists "admins can read payment provider settings" on public.payment_provider_settings;
create policy "admins can read payment provider settings" on public.payment_provider_settings
for select to authenticated using (public.is_admin());

insert into public.payment_provider_settings (id) values (1) on conflict (id) do nothing;

create or replace function public.admin_get_payment_provider_settings()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.payment_provider_settings;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into r from public.payment_provider_settings where id = 1;
  return jsonb_build_object(
    'google_enabled',r.google_enabled,'google_package_name',r.google_package_name,
    'google_service_account_email',r.google_service_account_email,'google_rtdn_topic',r.google_rtdn_topic,
    'google_service_account_configured',exists(select 1 from vault.secrets where name='circle_panda_google_play_service_account'),
    'google_rtdn_secret_configured',exists(select 1 from vault.secrets where name='circle_panda_google_play_rtdn_secret'),
    'apple_enabled',r.apple_enabled,'apple_bundle_id',r.apple_bundle_id,'apple_team_id',r.apple_team_id,
    'apple_issuer_id',r.apple_issuer_id,'apple_key_id',r.apple_key_id,
    'apple_iap_private_key_configured',exists(select 1 from vault.secrets where name='circle_panda_apple_iap_private_key'),
    'paystack_enabled',r.paystack_enabled,'updated_at',r.updated_at);
end; $$;

revoke execute on function public.admin_get_payment_provider_settings() from public, anon;
grant execute on function public.admin_get_payment_provider_settings() to authenticated;

create or replace function public.admin_save_payment_provider_settings(
  p_google_enabled boolean,p_google_package_name text,p_google_service_account_email text,p_google_rtdn_topic text,
  p_google_service_account_json text default null,p_google_rtdn_secret text default null,
  p_apple_enabled boolean default false,p_apple_bundle_id text default '',p_apple_team_id text default '',
  p_apple_issuer_id text default '',p_apple_key_id text default '',p_apple_iap_private_key text default null,
  p_paystack_enabled boolean default true)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare secret_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  insert into public.payment_provider_settings(id,google_enabled,google_package_name,google_service_account_email,google_rtdn_topic,
    apple_enabled,apple_bundle_id,apple_team_id,apple_issuer_id,apple_key_id,paystack_enabled,updated_at,updated_by)
  values(1,coalesce(p_google_enabled,false),trim(coalesce(p_google_package_name,'')),trim(coalesce(p_google_service_account_email,'')),
    trim(coalesce(p_google_rtdn_topic,'')),coalesce(p_apple_enabled,false),trim(coalesce(p_apple_bundle_id,'')),
    trim(coalesce(p_apple_team_id,'')),trim(coalesce(p_apple_issuer_id,'')),trim(coalesce(p_apple_key_id,'')),
    coalesce(p_paystack_enabled,true),now(),auth.uid())
  on conflict(id) do update set google_enabled=excluded.google_enabled,google_package_name=excluded.google_package_name,
    google_service_account_email=excluded.google_service_account_email,google_rtdn_topic=excluded.google_rtdn_topic,
    apple_enabled=excluded.apple_enabled,apple_bundle_id=excluded.apple_bundle_id,apple_team_id=excluded.apple_team_id,
    apple_issuer_id=excluded.apple_issuer_id,apple_key_id=excluded.apple_key_id,paystack_enabled=excluded.paystack_enabled,
    updated_at=now(),updated_by=auth.uid();

  if nullif(trim(coalesce(p_google_service_account_json,'')),'') is not null then
    select id into secret_id from vault.secrets where name='circle_panda_google_play_service_account' limit 1;
    if secret_id is null then perform vault.create_secret(trim(p_google_service_account_json),'circle_panda_google_play_service_account','Circle Panda Google Play service account JSON');
    else perform vault.update_secret(secret_id,trim(p_google_service_account_json),'circle_panda_google_play_service_account','Circle Panda Google Play service account JSON'); end if;
  end if;

  if nullif(trim(coalesce(p_google_rtdn_secret,'')),'') is not null then
    select id into secret_id from vault.secrets where name='circle_panda_google_play_rtdn_secret' limit 1;
    if secret_id is null then perform vault.create_secret(trim(p_google_rtdn_secret),'circle_panda_google_play_rtdn_secret','Circle Panda Google Play RTDN webhook secret');
    else perform vault.update_secret(secret_id,trim(p_google_rtdn_secret),'circle_panda_google_play_rtdn_secret','Circle Panda Google Play RTDN webhook secret'); end if;
  end if;

  if nullif(trim(coalesce(p_apple_iap_private_key,'')),'') is not null then
    select id into secret_id from vault.secrets where name='circle_panda_apple_iap_private_key' limit 1;
    if secret_id is null then perform vault.create_secret(trim(p_apple_iap_private_key),'circle_panda_apple_iap_private_key','Circle Panda Apple App Store Server API private key');
    else perform vault.update_secret(secret_id,trim(p_apple_iap_private_key),'circle_panda_apple_iap_private_key','Circle Panda Apple App Store Server API private key'); end if;
  end if;
  return public.admin_get_payment_provider_settings();
end; $$;

revoke execute on function public.admin_save_payment_provider_settings(boolean,text,text,text,text,text,boolean,text,text,text,text,text,boolean) from public, anon;
grant execute on function public.admin_save_payment_provider_settings(boolean,text,text,text,text,text,boolean,text,text,text,text,text,boolean) to authenticated;

create or replace function public.admin_get_store_catalog()
returns setof public.store_catalog language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return query select s.* from public.store_catalog s order by s.id;
end; $$;
revoke execute on function public.admin_get_store_catalog() from public, anon;
grant execute on function public.admin_get_store_catalog() to authenticated;

create or replace function public.admin_update_store_product_ids(p_id text,p_android_product_id text,p_ios_product_id text)
returns public.store_catalog language plpgsql security definer set search_path = '' as $$
declare r public.store_catalog;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.store_catalog set android_product_id=nullif(trim(coalesce(p_android_product_id,'')), ''),
    ios_product_id=nullif(trim(coalesce(p_ios_product_id,'')), ''),updated_at=now()
    where id=p_id returning * into r;
  if r.id is null then raise exception 'Store product not found'; end if;
  return r;
end; $$;
revoke execute on function public.admin_update_store_product_ids(text,text,text) from public, anon;
grant execute on function public.admin_update_store_product_ids(text,text,text) to authenticated;