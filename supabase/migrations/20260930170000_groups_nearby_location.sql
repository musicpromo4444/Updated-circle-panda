-- Groups: store private creator coordinates and support nearby-first discovery.
alter table public.groups add column if not exists latitude double precision;
alter table public.groups add column if not exists longitude double precision;
create index if not exists groups_geo_lat_lng_idx on public.groups(latitude, longitude);

create or replace function public.create_group_secure(p_name text,p_topic text,p_latitude double precision default null,p_longitude double precision default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); gid uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if length(trim(coalesce(p_name,'')))<2 or length(trim(p_name))>80 then raise exception 'Group name must be 2-80 characters'; end if;
 if length(coalesce(p_topic,''))>300 then raise exception 'Topic too long'; end if;
 if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then raise exception 'Invalid latitude'; end if;
 if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then raise exception 'Invalid longitude'; end if;
 gid:=gen_random_uuid();
 insert into public.groups(id,name,topic,owner_id,status,latitude,longitude) values(gid,trim(p_name),trim(coalesce(p_topic,'')),uid,'locked',p_latitude,p_longitude);
 insert into public.group_members(group_id,user_id,role) values(gid,uid,'owner');
 insert into public.group_settings(group_id) values(gid);
 return jsonb_build_object('id',gid,'name',trim(p_name),'topic',trim(coalesce(p_topic,'')),'members',1,'status','locked','latitude',p_latitude,'longitude',p_longitude);
end $$;

create or replace function public.get_group_summaries_nearby(p_latitude double precision default null,p_longitude double precision default null)
returns table(id uuid,name text,topic text,owner_id uuid,created_at timestamptz,activated_at timestamptz,expires_at timestamptz,status text,member_count bigint,member_role text,join_pending boolean,latitude double precision,longitude double precision,distance_km double precision)
language sql stable security definer set search_path=public,pg_temp as $$
 select g.id,g.name,g.topic,g.owner_id,g.created_at,g.activated_at,g.expires_at,g.status,
 (select count(*) from public.group_members m where m.group_id=g.id and m.left_at is null),
 (select m.role from public.group_members m where m.group_id=g.id and m.user_id=auth.uid() and m.left_at is null limit 1),
 exists(select 1 from public.group_join_requests jr where jr.group_id=g.id and jr.user_id=auth.uid() and jr.status='pending'),
 g.latitude,g.longitude,
 case when p_latitude is not null and p_longitude is not null and g.latitude is not null and g.longitude is not null then
 6371*2*asin(sqrt(power(sin(radians(g.latitude-p_latitude)/2),2)+cos(radians(p_latitude))*cos(radians(g.latitude))*power(sin(radians(g.longitude-p_longitude)/2),2)))
 else null end
 from public.groups g
 order by
 case when p_latitude is not null and p_longitude is not null and g.latitude is not null and g.longitude is not null then 0 else 1 end,
 case when p_latitude is not null and p_longitude is not null and g.latitude is not null and g.longitude is not null then
 6371*2*asin(sqrt(power(sin(radians(g.latitude-p_latitude)/2),2)+cos(radians(p_latitude))*cos(radians(g.latitude))*power(sin(radians(g.longitude-p_longitude)/2),2)))
 else null end nulls last,
 g.created_at desc limit 100;
$$;
grant execute on function public.get_group_summaries_nearby(double precision,double precision) to authenticated;
grant execute on function public.create_group_secure(text,text,double precision,double precision) to authenticated;