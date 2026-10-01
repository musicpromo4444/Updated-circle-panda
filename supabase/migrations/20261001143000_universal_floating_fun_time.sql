-- Fun Time support for the existing universal lower-left floating campaign.
-- The catalog is stored in targeting.fun_time_catalog so admins can choose
-- any approved Circle Panda destination without creating a second placement system.

alter table public.cp_floating_campaigns drop constraint if exists cp_floating_campaigns_action_type_check;
alter table public.cp_floating_campaigns add constraint cp_floating_campaigns_action_type_check
  check (action_type in ('external_url','internal_route','sponsor_modal','ad_placement','rewarded_ad','playable','offerwall','fun_time'));

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
 if p_action_type='fun_time' then
   if jsonb_typeof(coalesce(p_targeting->'fun_time_catalog','[]'::jsonb)) <> 'array' then raise exception 'Fun Time catalog must be an array'; end if;
   if jsonb_array_length(coalesce(p_targeting->'fun_time_catalog','[]'::jsonb)) = 0 then raise exception 'Choose at least one Fun Time item'; end if;
 end if;
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
 return jsonb_build_object('id',chosen.id,'name',chosen.name,'sponsor_name',chosen.sponsor_name,'creative_type',chosen.creative_type,'creative_url',chosen.creative_url,'fallback_icon',chosen.fallback_icon,'label',chosen.label,'action_type',chosen.action_type,'action_target',chosen.action_target,'action_title',chosen.action_title,'action_body',chosen.action_body,'targeting',chosen.targeting);
end; $$;