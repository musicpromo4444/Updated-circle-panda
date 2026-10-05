-- Circle Panda: shareable marketing Play Pages + one-time new-member onboarding.
create table if not exists public.member_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  welcome_bc_claimed_at timestamptz,
  intro_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.member_onboarding enable row level security;
drop policy if exists "member_onboarding_owner" on public.member_onboarding;
drop policy if exists "member_onboarding_owner_write" on public.member_onboarding;
drop policy if exists "member_onboarding_owner_update" on public.member_onboarding;
create policy "member_onboarding_owner" on public.member_onboarding for select to authenticated using (user_id=auth.uid());
create policy "member_onboarding_owner_write" on public.member_onboarding for insert to authenticated with check (user_id=auth.uid());
create policy "member_onboarding_owner_update" on public.member_onboarding for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

create table if not exists public.profile_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  address_line text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profile_locations enable row level security;
drop policy if exists "profile_locations_owner" on public.profile_locations;
create policy "profile_locations_owner" on public.profile_locations for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

create table if not exists public.play_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  creative_url text,
  creative_type text not null default 'icon' check (creative_type in ('icon','image','gif','video')),
  fallback_icon text not null default '🎁',
  target_route text not null default '/activities',
  target_param text,
  target_label text not null default 'Challenge',
  reward_text text not null default '',
  requires_auth boolean not null default true,
  is_published boolean not null default false,
  starts_at timestamptz,
  closes_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.play_campaigns enable row level security;
drop policy if exists "play_campaigns_public_read" on public.play_campaigns;
drop policy if exists "play_campaigns_admin_all" on public.play_campaigns;
create policy "play_campaigns_public_read" on public.play_campaigns for select to anon,authenticated using (is_published and (starts_at is null or starts_at<=now()) and (closes_at is null or closes_at>now()));
create policy "play_campaigns_admin_all" on public.play_campaigns for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

create table if not exists public.play_campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.play_campaigns(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('view','start','signup','complete','share','result')),
  created_at timestamptz not null default now()
);
create index if not exists play_campaign_events_campaign_idx on public.play_campaign_events(campaign_id,created_at desc);
alter table public.play_campaign_events enable row level security;
drop policy if exists "play_campaign_events_insert" on public.play_campaign_events;
create policy "play_campaign_events_insert" on public.play_campaign_events for insert to anon,authenticated with check (event_type in ('view','start','signup','complete','share','result'));

create or replace function private.claim_new_member_onboarding() returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_claimed boolean:=false; v_balance bigint;
begin
 if v_uid is null or exists(select 1 from auth.users where id=v_uid and is_anonymous) then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.member_onboarding(user_id) values(v_uid) on conflict(user_id) do nothing;
 if not exists(select 1 from public.member_onboarding where user_id=v_uid and welcome_bc_claimed_at is not null) then
   insert into public.wallets(user_id,balance) values(v_uid,0) on conflict(user_id) do nothing;
   insert into public.wallet_ledger(user_id,amount,reason,reference_type,reference_id,idempotency_key) values(v_uid,200,'new_member_welcome','member_onboarding',v_uid,'new_member_welcome:'||v_uid::text) on conflict(user_id,idempotency_key) do nothing;
   if found then update public.wallets set balance=balance+200,updated_at=now() where user_id=v_uid returning balance into v_balance; v_claimed:=true; end if;
   update public.member_onboarding set welcome_bc_claimed_at=coalesce(welcome_bc_claimed_at,now()),updated_at=now() where user_id=v_uid;
 else select balance into v_balance from public.wallets where user_id=v_uid; end if;
 return jsonb_build_object('is_new_member',v_claimed,'welcome_bc',case when v_claimed then 200 else 0 end,'balance',coalesce(v_balance,0));
end $$;
revoke all on function private.claim_new_member_onboarding() from public,anon,authenticated;
grant execute on function private.claim_new_member_onboarding() to authenticated;

create or replace function public.claim_new_member_onboarding() returns jsonb language sql security invoker set search_path=public as $$ select private.claim_new_member_onboarding(); $$;
create or replace function public.mark_member_intro_seen() returns void language plpgsql security invoker set search_path=public as $$ begin if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if; insert into public.member_onboarding(user_id,intro_seen_at) values(auth.uid(),now()) on conflict(user_id) do update set intro_seen_at=now(),updated_at=now(); end $$;
create or replace function public.complete_signup_profile(p_display_name text,p_country text,p_state text,p_area text,p_address_line text default null) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null or exists(select 1 from auth.users where id=v_uid and is_anonymous) then raise exception 'AUTH_REQUIRED'; end if;
 if nullif(trim(p_country),'') is null or nullif(trim(p_state),'') is null or nullif(trim(p_area),'') is null then raise exception 'LOCATION_REQUIRED'; end if;
 update public.profiles set display_name=coalesce(nullif(trim(p_display_name),''),display_name),country=trim(p_country),state=trim(p_state),area=trim(p_area),updated_at=now() where id=v_uid;
 insert into public.profile_locations(user_id,address_line) values(v_uid,nullif(trim(p_address_line),'')) on conflict(user_id) do update set address_line=excluded.address_line,updated_at=now();
 return jsonb_build_object('saved',true);
end $$;

create or replace function public.get_play_campaign(p_slug text) returns jsonb language sql security invoker set search_path=public as $$ select to_jsonb(c) from public.play_campaigns c where c.slug=trim(p_slug) and c.is_published and (c.starts_at is null or c.starts_at<=now()) and (c.closes_at is null or c.closes_at>now()) limit 1; $$;
create or replace function public.record_play_campaign_event(p_campaign_id uuid,p_event_type text) returns void language plpgsql security invoker set search_path=public as $$ begin if p_event_type not in ('view','start','signup','complete','share','result') then raise exception 'INVALID_EVENT'; end if; insert into public.play_campaign_events(campaign_id,user_id,event_type) values(p_campaign_id,auth.uid(),p_event_type); end $$;

create or replace function public.admin_list_play_campaigns() returns setof public.play_campaigns language sql security invoker set search_path=public as $$ select * from public.play_campaigns order by created_at desc; $$;
create or replace function public.admin_upsert_play_campaign(p_id uuid,p_slug text,p_title text,p_description text,p_creative_url text,p_creative_type text,p_fallback_icon text,p_target_route text,p_target_param text,p_target_label text,p_reward_text text,p_is_published boolean,p_starts_at timestamptz,p_closes_at timestamptz) returns public.play_campaigns language plpgsql security invoker set search_path=public as $$
declare v public.play_campaigns;
begin
 if not private.is_admin(auth.uid()) then raise exception 'ADMIN_REQUIRED'; end if;
 if p_id is null then insert into public.play_campaigns(slug,title,description,creative_url,creative_type,fallback_icon,target_route,target_param,target_label,reward_text,is_published,starts_at,closes_at,created_by) values(trim(p_slug),trim(p_title),coalesce(p_description,''),nullif(trim(p_creative_url),''),p_creative_type,coalesce(nullif(trim(p_fallback_icon),''),'🎁'),trim(p_target_route),nullif(trim(p_target_param),''),coalesce(nullif(trim(p_target_label),''),'Challenge'),coalesce(p_reward_text,''),p_is_published,p_starts_at,p_closes_at,auth.uid()) returning * into v;
 else update public.play_campaigns set slug=trim(p_slug),title=trim(p_title),description=coalesce(p_description,''),creative_url=nullif(trim(p_creative_url),''),creative_type=p_creative_type,fallback_icon=coalesce(nullif(trim(p_fallback_icon),''),'🎁'),target_route=trim(p_target_route),target_param=nullif(trim(p_target_param),''),target_label=coalesce(nullif(trim(p_target_label),''),'Challenge'),reward_text=coalesce(p_reward_text,''),is_published=p_is_published,starts_at=p_starts_at,closes_at=p_closes_at,updated_at=now() where id=p_id returning * into v; end if; return v;
end $$;
create or replace function public.admin_delete_play_campaign(p_id uuid) returns void language plpgsql security invoker set search_path=public as $$ begin if not private.is_admin(auth.uid()) then raise exception 'ADMIN_REQUIRED'; end if; delete from public.play_campaigns where id=p_id; end $$;
revoke all on function public.admin_delete_play_campaign(uuid) from anon;
revoke all on function public.admin_list_play_campaigns() from anon;
revoke all on function public.admin_upsert_play_campaign(uuid,text,text,text,text,text,text,text,text,text,text,boolean,timestamptz,timestamptz) from anon;
grant execute on function public.admin_delete_play_campaign(uuid) to authenticated;
grant execute on function public.admin_list_play_campaigns() to authenticated;
grant execute on function public.admin_upsert_play_campaign(uuid,text,text,text,text,text,text,text,text,text,text,boolean,timestamptz,timestamptz) to authenticated;
