-- Only show the group sponsor flow when the admin's Normal Groups placement is enabled
-- and a live group sponsor creative exists.
create or replace function public.should_show_group_reward_ad(p_group_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); last_seen timestamptz; placement_on boolean; sponsor_exists boolean;
begin
 if uid is null then return false; end if;
 if not exists(select 1 from public.group_members gm join public.groups g on g.id=gm.group_id where gm.group_id=p_group_id and gm.user_id=uid and gm.left_at is null and g.activated_at is not null and coalesce(g.expires_at,now()+interval '1 second')>now()) then return false; end if;
 select coalesce(enabled,false) into placement_on from public.universal_ad_placements where placement_key='normal_groups' limit 1;
 if not coalesce(placement_on,false) then return false; end if;
 select exists(select 1 from public.ad_creatives where placement='group_message_rewarded' and status='active') into sponsor_exists;
 if not sponsor_exists then return false; end if;
 select last_shown_at into last_seen from public.cp_group_reward_ad_views where group_id=p_group_id and user_id=uid;
 return last_seen is null or last_seen <= now()-interval '24 hours';
end $$;