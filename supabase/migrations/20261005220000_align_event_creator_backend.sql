-- Align the Event backend with the creator UI.
alter table public.events
 add column if not exists category text, add column if not exists place text, add column if not exists entry_fee_bc integer not null default 0,
 add column if not exists entry_fee_amount numeric(14,2) not null default 0, add column if not exists entry_fee_currency text not null default 'NGN',
 add column if not exists venue_name text, add column if not exists address_line text, add column if not exists state_province text, add column if not exists city text, add column if not exists area text,
 add column if not exists latitude double precision, add column if not exists longitude double precision, add column if not exists cover_url text,
 add column if not exists reach_scope text not null default 'worldwide', add column if not exists reach_country text, add column if not exists reach_state text,
 add column if not exists reach_city text, add column if not exists reach_area text, add column if not exists duration_minutes integer, add column if not exists is_published boolean not null default true;

create or replace function private.create_event_secure(
 p_title text,p_description text,p_location text,p_starts_at timestamptz,p_ends_at timestamptz,p_category text default null,p_entry_fee_bc integer default 0,p_duration_minutes integer default 120,p_reach_scope text default 'worldwide',
 p_reach_country text default null,p_reach_state text default null,p_reach_city text default null,p_reach_area text default null,p_entry_fee_amount numeric default 0,p_entry_fee_currency text default 'NGN',p_venue_name text default null,p_address_line text default null,
 p_country text default null,p_state_province text default null,p_city text default null,p_area text default null,p_latitude double precision default null,p_longitude double precision default null,p_cover_url text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_id uuid; v_ends timestamptz;
begin if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if; if length(trim(coalesce(p_title,'')))<2 then raise exception 'EVENT_TITLE_REQUIRED'; end if; if p_starts_at is null then raise exception 'EVENT_START_REQUIRED'; end if;
v_ends:=coalesce(p_ends_at,p_starts_at+make_interval(mins=>greatest(15,least(coalesce(p_duration_minutes,120),10080)))); if v_ends<=p_starts_at then raise exception 'EVENT_END_INVALID'; end if;
if p_reach_scope not in ('worldwide','country','state','city','area') then raise exception 'INVALID_REACH_SCOPE'; end if;
insert into public.events(creator_id,title,description,starts_at,ends_at,country,category,place,entry_fee_bc,entry_fee_amount,entry_fee_currency,venue_name,address_line,state_province,city,area,latitude,longitude,cover_url,reach_scope,reach_country,reach_state,reach_city,reach_area,duration_minutes,is_published)
values(v_uid,trim(p_title),coalesce(trim(p_description),''),p_starts_at,v_ends,p_country,p_category,p_location,greatest(0,p_entry_fee_bc),greatest(0,p_entry_fee_amount),coalesce(p_entry_fee_currency,'NGN'),p_venue_name,p_address_line,p_state_province,p_city,p_area,p_latitude,p_longitude,p_cover_url,p_reach_scope,p_reach_country,p_reach_state,p_reach_city,p_reach_area,greatest(15,least(coalesce(p_duration_minutes,120),10080)),true) returning id into v_id;
perform public.award_xp('create_event',null,'event_create:'||v_id::text); return jsonb_build_object('id',v_id,'creator_id',v_uid); end $$;

create or replace function public.create_event_secure(
 p_title text,p_description text,p_location text,p_starts_at timestamptz,p_ends_at timestamptz,p_category text default null,p_entry_fee_bc integer default 0,p_duration_minutes integer default 120,p_reach_scope text default 'worldwide',
 p_reach_country text default null,p_reach_state text default null,p_reach_city text default null,p_reach_area text default null,p_entry_fee_amount numeric default 0,p_entry_fee_currency text default 'NGN',p_venue_name text default null,p_address_line text default null,
 p_country text default null,p_state_province text default null,p_city text default null,p_area text default null,p_latitude double precision default null,p_longitude double precision default null,p_cover_url text default null)
returns jsonb language sql security invoker set search_path=public,pg_temp as $$ select private.create_event_secure($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) $$;
revoke all on function public.create_event_secure(text,text,text,timestamptz,timestamptz,text,integer,integer,text,text,text,text,text,numeric,text,text,text,text,text,text,text,double precision,double precision,text) from public,anon;
grant execute on function public.create_event_secure(text,text,text,timestamptz,timestamptz,text,integer,integer,text,text,text,text,text,numeric,text,text,text,text,text,text,text,double precision,double precision,text) to authenticated;