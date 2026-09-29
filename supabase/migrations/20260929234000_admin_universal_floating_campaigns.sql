create table if not exists public.cp_floating_page_catalog (
  page_key text primary key,
  label text not null,
  route_path text not null,
  sort_order integer not null default 100,
  enabled boolean not null default true
);

insert into public.cp_floating_page_catalog(page_key,label,route_path,sort_order) values
('home','Home','/',10),('messages','Messages','/messages',20),('dating','Dating','/dating',30),('events','Events','/events',40),
('groups','Groups','/groups',50),('confessions','Secret Confessions','/confessions',60),('activities','Activities','/activities',70),
('hot-seat','Hot Seat','/hot-seat',80),('live','Live','/live',90),('music-time','Music Time','/music-time',100),
('sweepstakes','Sweepstakes','/sweepstakes',110),('store','Store','/store',120),('profile','Profile','/profile',130),
('leaders','Leaders','/leaders',140),('vip','VIP Lounge','/vip',150),('notifications','Notifications','/notifications',160),
('wcw-mcm','WCW & MCM','/wcw-mcm',170),('settings','Settings','/settings',180)
on conflict(page_key) do update set label=excluded.label,route_path=excluded.route_path,sort_order=excluded.sort_order,enabled=true;

alter table public.cp_floating_page_catalog enable row level security;
revoke all on table public.cp_floating_page_catalog from anon, authenticated;

create table if not exists public.cp_floating_campaigns (
  id uuid primary key default gen_random_uuid(), name text not null, sponsor_name text, enabled boolean not null default false,
  page_keys text[] not null default '{}', creative_type text not null default 'animated', creative_url text,
  fallback_icon text not null default '🔥', label text not null default 'SPONSORED',
  action_type text not null default 'external_url', action_target text, action_title text, action_body text,
  priority integer not null default 100, max_impressions bigint, max_clicks bigint, max_unique_users bigint,
  frequency_cap_seconds integer not null default 0, starts_at timestamptz, ends_at timestamptz,
  targeting jsonb not null default '{}'::jsonb, created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (creative_type in ('icon','image','gif','lottie','video')),
  check (action_type in ('external_url','internal_route','sponsor_modal','ad_placement','rewarded_ad','playable','offerwall')),
  check (char_length(name) between 1 and 100), check (char_length(label) between 1 and 40), check (fallback_icon <> ''),
  check (max_impressions is null or max_impressions >= 1), check (max_clicks is null or max_clicks >= 1),
  check (max_unique_users is null or max_unique_users >= 1), check (frequency_cap_seconds >= 0)
);
create index if not exists cp_floating_campaigns_enabled_idx on public.cp_floating_campaigns(enabled,priority);
create index if not exists cp_floating_campaigns_dates_idx on public.cp_floating_campaigns(starts_at,ends_at);
alter table public.cp_floating_campaigns enable row level security;
revoke all on table public.cp_floating_campaigns from anon, authenticated;

create table if not exists public.cp_floating_campaign_events (
  id bigint generated always as identity primary key, campaign_id uuid not null references public.cp_floating_campaigns(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, event_type text not null check (event_type in ('impression','click')),
  created_at timestamptz not null default now()
);
create index if not exists cp_floating_events_campaign_idx on public.cp_floating_campaign_events(campaign_id,event_type,created_at);
create index if not exists cp_floating_events_user_idx on public.cp_floating_campaign_events(campaign_id,user_id,event_type,created_at);
alter table public.cp_floating_campaign_events enable row level security;
revoke all on table public.cp_floating_campaign_events from anon, authenticated;

create or replace function public.admin_get_floating_campaign_config()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid := auth.uid();
begin
  if not private.admin_can('ads.manage',uid) then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'pages',coalesce((select jsonb_agg(to_jsonb(p) order by p.sort_order) from public.cp_floating_page_catalog p where p.enabled),'[]'::jsonb),
    'campaigns',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object(
      'impressions',(select count(*) from public.cp_floating_campaign_events e where e.campaign_id=c.id and e.event_type='impression'),
      'clicks',(select count(*) from public.cp_floating_campaign_events e where e.campaign_id=c.id and e.event_type='click'),
      'unique_users',(select count(distinct e.user_id) from public.cp_floating_campaign_events e where e.campaign_id=c.id and e.user_id is not null)
    ) order by c.priority,c.created_at desc) from public.cp_floating_campaigns c),'[]'::jsonb)
  );
end; $$;

create or replace function public.admin_upsert_floating_campaign(
 p_id uuid,p_name text,p_sponsor_name text,p_enabled boolean,p_page_keys text[],p_creative_type text,p_creative_url text,
 p_fallback_icon text,p_label text,p_action_type text,p_action_target text,p_action_title text,p_action_body text,p_priority integer,
 p_max_impressions bigint,p_max_clicks bigint,p_max_unique_users bigint,p_frequency_cap_seconds integer,p_starts_at timestamptz,
 p_ends_at timestamptz,p_targeting jsonb)
returns public.cp_floating_campaigns language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); result public.cp_floating_campaigns; clean_pages text[];
begin
 if not private.admin_can('ads.manage',uid) then raise exception 'Not authorized'; end if;
 if coalesce(array_length(p_page_keys,1),0)=0 then raise exception 'Choose at least one page'; end if;
 if exists(select 1 from unnest(p_page_keys) k where not exists(select 1 from public.cp_floating_page_catalog p where p.page_key=k and p.enabled)) then raise exception 'Invalid page selection'; end if;
 if p_action_type='external_url' and coalesce(p_action_target,'') !~* '^https?://' then raise exception 'External links must use http or https'; end if;
 if p_action_type='internal_route' and coalesce(p_action_target,'') not like '/%' then raise exception 'Internal destination must be an app route'; end if;
 if p_creative_type<>'icon' and coalesce(p_creative_url,'') !~* '^https?://' then raise exception 'Animated/media creative must use a valid http or https URL'; end if;
 select array_agg(distinct k order by k) into clean_pages from unnest(p_page_keys) k;
 if p_id is null then
   insert into public.cp_floating_campaigns(name,sponsor_name,enabled,page_keys,creative_type,creative_url,fallback_icon,label,action_type,action_target,action_title,action_body,priority,max_impressions,max_clicks,max_unique_users,frequency_cap_seconds,starts_at,ends_at,targeting,created_by,updated_by)
   values(trim(p_name),nullif(trim(p_sponsor_name),''),coalesce(p_enabled,false),clean_pages,p_creative_type,nullif(trim(p_creative_url),''),left(coalesce(trim(p_fallback_icon),'🔥'),8),trim(p_label),p_action_type,nullif(trim(p_action_target),''),nullif(trim(p_action_title),''),nullif(trim(p_action_body),''),coalesce(p_priority,100),p_max_impressions,p_max_clicks,p_max_unique_users,coalesce(p_frequency_cap_seconds,0),p_starts_at,p_ends_at,coalesce(p_targeting,'{}'::jsonb),uid,uid)
   returning * into result;
 else
   update public.cp_floating_campaigns set name=trim(p_name),sponsor_name=nullif(trim(p_sponsor_name),''),enabled=coalesce(p_enabled,false),page_keys=clean_pages,creative_type=p_creative_type,creative_url=nullif(trim(p_creative_url),''),fallback_icon=left(coalesce(trim(p_fallback_icon),'🔥'),8),label=trim(p_label),action_type=p_action_type,action_target=nullif(trim(p_action_target),''),action_title=nullif(trim(p_action_title),''),action_body=nullif(trim(p_action_body),''),priority=coalesce(p_priority,100),max_impressions=p_max_impressions,max_clicks=p_max_clicks,max_unique_users=p_max_unique_users,frequency_cap_seconds=coalesce(p_frequency_cap_seconds,0),starts_at=p_starts_at,ends_at=p_ends_at,targeting=coalesce(p_targeting,'{}'::jsonb),updated_by=uid,updated_at=now()
   where id=p_id returning * into result;
   if result.id is null then raise exception 'Campaign not found'; end if;
 end if;
 return result;
end; $$;

create or replace function public.admin_delete_floating_campaign(p_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$ begin
 if not private.admin_can('ads.manage',auth.uid()) then raise exception 'Not authorized'; end if;
 delete from public.cp_floating_campaigns where id=p_id; return found;
end; $$;

create or replace function public.get_floating_campaign_runtime(p_page_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); chosen public.cp_floating_campaigns;
begin
 select c.* into chosen from public.cp_floating_campaigns c
 where c.enabled and p_page_key=any(c.page_keys) and (c.starts_at is null or c.starts_at<=now()) and (c.ends_at is null or c.ends_at>now())
 and (c.max_impressions is null or (select count(*) from public.cp_floating_campaign_events e where e.campaign_id=c.id and e.event_type='impression')<c.max_impressions)
 and (c.max_clicks is null or (select count(*) from public.cp_floating_campaign_events e where e.campaign_id=c.id and e.event_type='click')<c.max_clicks)
 and (c.max_unique_users is null or (select count(distinct e.user_id) from public.cp_floating_campaign_events e where e.campaign_id=c.id and e.user_id is not null)<c.max_unique_users)
 and (c.frequency_cap_seconds=0 or uid is null or not exists(select 1 from public.cp_floating_campaign_events e where e.campaign_id=c.id and e.user_id=uid and e.event_type='impression' and e.created_at>now()-make_interval(secs=>c.frequency_cap_seconds)))
 order by c.priority,c.created_at desc limit 1;
 if chosen.id is null then return null; end if;
 return jsonb_build_object('id',chosen.id,'name',chosen.name,'sponsor_name',chosen.sponsor_name,'creative_type',chosen.creative_type,'creative_url',chosen.creative_url,'fallback_icon',chosen.fallback_icon,'label',chosen.label,'action_type',chosen.action_type,'action_target',chosen.action_target,'action_title',chosen.action_title,'action_body',chosen.action_body);
end; $$;

create or replace function public.record_floating_campaign_event(p_campaign_id uuid,p_event_type text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); c public.cp_floating_campaigns;
begin
 if p_event_type not in ('impression','click') then raise exception 'Invalid event'; end if;
 select * into c from public.cp_floating_campaigns where id=p_campaign_id for update;
 if c.id is null or not c.enabled then return false; end if;
 if c.starts_at is not null and c.starts_at>now() then return false; end if;
 if c.ends_at is not null and c.ends_at<=now() then return false; end if;
 if c.max_impressions is not null and (select count(*) from public.cp_floating_campaign_events where campaign_id=c.id and event_type='impression')>=c.max_impressions and p_event_type='impression' then return false; end if;
 if c.max_clicks is not null and (select count(*) from public.cp_floating_campaign_events where campaign_id=c.id and event_type='click')>=c.max_clicks and p_event_type='click' then return false; end if;
 if c.max_unique_users is not null and uid is not null and not exists(select 1 from public.cp_floating_campaign_events e where e.campaign_id=c.id and e.user_id=uid) and (select count(distinct user_id) from public.cp_floating_campaign_events where campaign_id=c.id and user_id is not null)>=c.max_unique_users then return false; end if;
 if p_event_type='impression' and c.frequency_cap_seconds>0 and uid is not null and exists(select 1 from public.cp_floating_campaign_events e where e.campaign_id=c.id and e.user_id=uid and e.event_type='impression' and e.created_at>now()-make_interval(secs=>c.frequency_cap_seconds)) then return false; end if;
 insert into public.cp_floating_campaign_events(campaign_id,user_id,event_type) values(c.id,uid,p_event_type); return true;
end; $$;

revoke execute on function public.admin_get_floating_campaign_config() from public,anon,authenticated;
revoke execute on function public.admin_upsert_floating_campaign(uuid,text,text,boolean,text[],text,text,text,text,text,text,text,text,integer,bigint,bigint,bigint,integer,timestamptz,timestamptz,jsonb) from public,anon,authenticated;
revoke execute on function public.admin_delete_floating_campaign(uuid) from public,anon,authenticated;
revoke execute on function public.get_floating_campaign_runtime(text) from public,anon,authenticated;
revoke execute on function public.record_floating_campaign_event(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_get_floating_campaign_config() to authenticated;
grant execute on function public.admin_upsert_floating_campaign(uuid,text,text,boolean,text[],text,text,text,text,text,text,text,text,integer,bigint,bigint,bigint,integer,timestamptz,timestamptz,jsonb) to authenticated;
grant execute on function public.admin_delete_floating_campaign(uuid) to authenticated;
grant execute on function public.get_floating_campaign_runtime(text) to authenticated;
grant execute on function public.record_floating_campaign_event(uuid,text) to authenticated;

insert into public.admin_rpc_permission_map(function_name,permission_key) values
('admin_get_floating_campaign_config','ads.manage'),('admin_upsert_floating_campaign','ads.manage'),('admin_delete_floating_campaign','ads.manage')
on conflict(function_name) do update set permission_key=excluded.permission_key;
