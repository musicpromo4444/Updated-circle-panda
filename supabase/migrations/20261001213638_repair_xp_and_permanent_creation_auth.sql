-- Repair the XP function boundary and require permanent accounts for group/event creation.
-- The authoritative XP implementation lives in private.award_circle_panda_xp.
-- These public wrappers are intentionally not executable by anon/authenticated clients;
-- existing SECURITY DEFINER actions call them internally.

create or replace function public.award_xp_secure(p_action text,p_reference_id uuid default null,p_award_key text default null)
returns jsonb language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare uid uuid:=auth.uid(); awarded bigint; action text:=lower(trim(coalesce(p_action,''))); award_key text;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 award_key:=coalesce(nullif(trim(p_award_key),''),case when action='daily_login' then action||':'||current_date::text when p_reference_id is not null then action||':'||p_reference_id::text else action||':'||clock_timestamp()::text end);
 awarded:=private.award_circle_panda_xp(uid,action,p_reference_id,award_key);
 return jsonb_build_object('awarded',awarded>0,'xp',awarded,'award_key',award_key);
end;
$function$;

create or replace function public.award_xp_secure(p_action text,p_reference_id uuid,p_legacy_xp integer)
returns jsonb language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare uid uuid:=auth.uid(); awarded bigint; action text:=lower(trim(coalesce(p_action,''))); award_key text;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 award_key:=action||':'||coalesce(p_reference_id::text,clock_timestamp()::text);
 awarded:=private.award_circle_panda_xp(uid,action,p_reference_id,award_key);
 return jsonb_build_object('awarded',awarded>0,'xp',awarded,'award_key',award_key);
end;
$function$;
revoke all on function public.award_xp_secure(text,uuid,text) from public,anon,authenticated;
revoke all on function public.award_xp_secure(text,uuid,integer) from public,anon,authenticated;

create or replace function public.submit_confession_secure(p_content text,p_anonymous boolean default true)
returns jsonb language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare uid uuid:=auth.uid(); cid uuid; v_vip_at timestamptz; xr jsonb;
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Authentication required'; end if;
 if length(trim(p_content))<3 or length(trim(p_content))>2000 then raise exception 'Invalid confession'; end if;
 insert into public.confessions(author_id,content,is_anonymous,is_published) values(uid,trim(p_content),p_anonymous,false)
 returning id,author_vip_at into cid,v_vip_at;
 xr:=public.award_xp_secure('create_confession',cid);
 return jsonb_build_object('id',cid,'status','pending','author_vip_at',v_vip_at,'xp',coalesce((xr->>'xp')::bigint,7));
end;
$function$;

create or replace function public.create_group_secure(p_name text,p_topic text,p_country text default '',p_state_province text default '',p_city text default '',p_area text default '')
returns jsonb language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare uid uuid:=auth.uid(); gid uuid; derived_country text; derived_city text;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Authentication required'; end if;
 if length(trim(coalesce(p_name,'')))<2 or length(trim(p_name))>80 then raise exception 'Group name must be 2-80 characters'; end if;
 if length(coalesce(p_topic,''))>300 then raise exception 'Topic too long'; end if;
 select nullif(trim(country),''),nullif(trim(location),'') into derived_country,derived_city from public.dating_profiles where user_id=uid;
 gid:=gen_random_uuid();
 insert into public.groups(id,name,topic,owner_id,status,country,state_province,city,area) values(gid,trim(p_name),trim(coalesce(p_topic,'')),uid,'locked',coalesce(nullif(trim(p_country),''),derived_country),nullif(trim(p_state_province),''),coalesce(nullif(trim(p_city),''),derived_city),nullif(trim(p_area),''));
 insert into public.group_members(group_id,user_id,role) values(gid,uid,'owner');
 insert into public.group_settings(group_id) values(gid);
 perform public.award_xp_secure('create_group',gid);
 return jsonb_build_object('id',gid,'name',trim(p_name),'topic',trim(coalesce(p_topic,'')),'members',1,'status','locked','country',coalesce(nullif(trim(p_country),''),derived_country),'state_province',nullif(trim(p_state_province),''),'city',coalesce(nullif(trim(p_city),''),derived_city),'area',nullif(trim(p_area),''));
end;
$function$;

create or replace function public.create_event_secure(p_title text,p_description text,p_location text,p_starts_at timestamptz,p_ends_at timestamptz default null,p_category text default 'Meetup',p_entry_fee_bc bigint default 0,p_duration_minutes integer default 120,p_reach_scope text default 'worldwide',p_reach_country text default null,p_reach_state text default null,p_reach_city text default null,p_reach_area text default null,p_entry_fee_amount numeric default 0,p_entry_fee_currency text default 'NGN',p_venue_name text default null,p_address_line text default null,p_country text default null,p_state_province text default null,p_city text default null,p_area text default null,p_latitude numeric default null,p_longitude numeric default null,p_cover_url text default null)
returns jsonb language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare uid uuid:=auth.uid(); eid uuid; v_end timestamptz:=coalesce(p_ends_at,p_starts_at+make_interval(mins=>greatest(15,least(10080,coalesce(p_duration_minutes,120))))); v_money numeric:=greatest(0,coalesce(p_entry_fee_amount,0)); v_currency text:=upper(coalesce(nullif(trim(p_entry_fee_currency),''),'NGN'));
begin
 if uid is null then raise exception 'Unauthorized'; end if;
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Authentication required'; end if;
 if length(trim(coalesce(p_title,'')))<3 or length(trim(p_title))>120 then raise exception 'Event title must be 3-120 characters'; end if;
 if p_starts_at<=now() then raise exception 'Event must start in the future'; end if;
 if v_end<=p_starts_at then raise exception 'Event end must be after its start'; end if;
 if coalesce(p_reach_scope,'worldwide') not in ('worldwide','country','state','city','area') then raise exception 'Invalid event reach scope'; end if;
 if v_currency<>'NGN' then raise exception 'Currently paid event entry supports NGN'; end if;
 if v_money>0 and length(trim(coalesce(p_address_line,p_location,'')))=0 then raise exception 'A paid event must have a location/address'; end if;
 insert into public.events(owner_id,title,description,location,starts_at,ends_at,category,entry_fee_bc,duration_minutes,reach_scope,reach_country,reach_state,reach_city,reach_area,is_published,entry_fee_amount,entry_fee_currency,venue_name,address_line,country,state_province,city,area,latitude,longitude,cover_url)
 values(uid,trim(p_title),coalesce(trim(p_description),''),coalesce(nullif(trim(p_location),''),nullif(trim(p_address_line),''),'Event location'),p_starts_at,v_end,trim(coalesce(p_category,'Meetup')),0,greatest(15,least(10080,coalesce(p_duration_minutes,120))),coalesce(p_reach_scope,'worldwide'),nullif(trim(p_reach_country),''),nullif(trim(p_reach_state),''),nullif(trim(p_reach_city),''),nullif(trim(p_reach_area),''),true,v_money,v_currency,nullif(trim(p_venue_name),''),nullif(trim(p_address_line),''),nullif(trim(p_country),''),nullif(trim(p_state_province),''),nullif(trim(p_city),''),nullif(trim(p_area),''),p_latitude,p_longitude,nullif(trim(p_cover_url),''))
 returning id into eid;
 perform public.award_xp_secure('create_event',eid);
 return jsonb_build_object('id',eid,'xp',6,'entry_fee_amount',v_money,'entry_fee_currency',v_currency);
end;
$function$;
