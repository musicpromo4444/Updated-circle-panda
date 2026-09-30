alter table public.groups
  add column if not exists country text,
  add column if not exists state_province text,
  add column if not exists city text,
  add column if not exists area text;

create index if not exists groups_location_idx on public.groups (country, state_province, city, area);

update public.groups g
set country = nullif(trim(dp.country),''),
    city = nullif(trim(dp.location),'')
from public.dating_profiles dp
where dp.user_id=g.owner_id
  and (g.country is null or g.city is null);

drop function if exists public.create_group_secure(text,text);
create or replace function public.create_group_secure(
  p_name text, p_topic text, p_country text default '', p_state_province text default '',
  p_city text default '', p_area text default ''
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); gid uuid; derived_country text; derived_city text;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if length(trim(coalesce(p_name,'')))<2 or length(trim(p_name))>80 then raise exception 'Group name must be 2-80 characters'; end if;
 if length(coalesce(p_topic,''))>300 then raise exception 'Topic too long'; end if;
 select nullif(trim(country),''),nullif(trim(location),'') into derived_country,derived_city from public.dating_profiles where user_id=uid;
 gid:=gen_random_uuid();
 insert into public.groups(id,name,topic,owner_id,status,country,state_province,city,area)
 values(gid,trim(p_name),trim(coalesce(p_topic,'')),uid,'locked',
   coalesce(nullif(trim(p_country),''),derived_country),nullif(trim(p_state_province),''),
   coalesce(nullif(trim(p_city),''),derived_city),nullif(trim(p_area),''));
 insert into public.group_members(group_id,user_id,role) values(gid,uid,'owner');
 insert into public.group_settings(group_id) values(gid);
 return jsonb_build_object('id',gid,'name',trim(p_name),'topic',trim(coalesce(p_topic,'')),'members',1,'status','locked',
   'country',coalesce(nullif(trim(p_country),''),derived_country),'state_province',nullif(trim(p_state_province),''),
   'city',coalesce(nullif(trim(p_city),''),derived_city),'area',nullif(trim(p_area),''));
end $$;
revoke all on function public.create_group_secure(text,text,text,text,text,text) from public;
grant execute on function public.create_group_secure(text,text,text,text,text,text) to authenticated;

drop function if exists public.get_group_summaries();
create or replace function public.get_group_summaries(
 p_country text default '',p_state_province text default '',p_city text default '',p_area text default ''
) returns table(id uuid,name text,topic text,owner_id uuid,created_at timestamptz,activated_at timestamptz,expires_at timestamptz,status text,
 member_count bigint,member_role text,join_pending boolean,country text,state_province text,city text,area text)
language sql stable security definer set search_path=public,pg_temp as $$
with me as (select coalesce(dp.country,'') country,coalesce(dp.location,'') city from public.dating_profiles dp where dp.user_id=(select auth.uid()))
select g.id,g.name,g.topic,g.owner_id,g.created_at,g.activated_at,g.expires_at,g.status,
 (select count(*) from public.group_members m where m.group_id=g.id and m.left_at is null),
 (select m.role from public.group_members m where m.group_id=g.id and m.user_id=(select auth.uid()) and m.left_at is null limit 1),
 exists(select 1 from public.group_join_requests jr where jr.group_id=g.id and jr.user_id=(select auth.uid()) and jr.status='pending'),
 g.country,g.state_province,g.city,g.area
from public.groups g,me
where (nullif(trim(p_country),'') is null or lower(coalesce(g.country,'')) like '%'||lower(trim(p_country))||'%')
and (nullif(trim(p_state_province),'') is null or lower(coalesce(g.state_province,'')) like '%'||lower(trim(p_state_province))||'%')
and (nullif(trim(p_city),'') is null or lower(coalesce(g.city,'')) like '%'||lower(trim(p_city))||'%')
and (nullif(trim(p_area),'') is null or lower(coalesce(g.area,'')) like '%'||lower(trim(p_area))||'%')
order by case when nullif(trim(me.city),'') is not null and lower(coalesce(g.city,''))=lower(trim(me.city)) then 0
 when nullif(trim(me.country),'') is not null and lower(coalesce(g.country,''))=lower(trim(me.country)) then 1 else 2 end,g.created_at desc limit 100;
$$;
revoke all on function public.get_group_summaries(text,text,text,text) from public;
grant execute on function public.get_group_summaries(text,text,text,text) to authenticated;