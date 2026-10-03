-- Keep group discovery visible even when a user has no dating profile.
create or replace function public.get_group_summaries(
  p_country text default '', p_state_province text default '', p_city text default '', p_area text default ''
) returns table(
  id uuid,name text,topic text,owner_id uuid,created_at timestamptz,activated_at timestamptz,
  expires_at timestamptz,status text,member_count bigint,member_role text,join_pending boolean,
  country text,state_province text,city text,area text
) language sql stable security definer set search_path=public,pg_temp as $$
  with me as (
    select
      coalesce((select dp.country from public.dating_profiles dp where dp.user_id=(select auth.uid()) limit 1),'') as country,
      coalesce((select dp.location from public.dating_profiles dp where dp.user_id=(select auth.uid()) limit 1),'') as city
  )
  select
    g.id,g.name,g.topic,g.owner_id,g.created_at,g.activated_at,g.expires_at,g.status,
    (select count(*) from public.group_members m where m.group_id=g.id and m.left_at is null),
    (select m.role from public.group_members m where m.group_id=g.id and m.user_id=(select auth.uid()) and m.left_at is null limit 1),
    exists(select 1 from public.group_join_requests jr where jr.group_id=g.id and jr.user_id=(select auth.uid()) and jr.status='pending'),
    g.country,g.state_province,g.city,g.area
  from public.groups g cross join me
  where (nullif(trim(p_country),'') is null or lower(coalesce(g.country,'')) like '%'||lower(trim(p_country))||'%')
    and (nullif(trim(p_state_province),'') is null or lower(coalesce(g.state_province,'')) like '%'||lower(trim(p_state_province))||'%')
    and (nullif(trim(p_city),'') is null or lower(coalesce(g.city,'')) like '%'||lower(trim(p_city))||'%')
    and (nullif(trim(p_area),'') is null or lower(coalesce(g.area,'')) like '%'||lower(trim(p_area))||'%')
  order by
    case when nullif(trim(me.city),'') is not null and lower(coalesce(g.city,''))=lower(trim(me.city)) then 0
         when nullif(trim(me.country),'') is not null and lower(coalesce(g.country,''))=lower(trim(me.country)) then 1
         else 2 end,
    g.created_at desc
  limit 100
$$;
grant execute on function public.get_group_summaries(text,text,text,text) to authenticated;