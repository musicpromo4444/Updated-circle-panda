-- Group sponsor reward ad: once per user/group every 24 hours, triggered by the first message.
create table if not exists public.cp_group_reward_ad_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid not null references public.ad_creatives(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  reward_bc bigint not null default 3
);
alter table public.cp_group_reward_ad_sessions enable row level security;
revoke all on public.cp_group_reward_ad_sessions from anon, authenticated;
drop policy if exists "group reward sessions own read" on public.cp_group_reward_ad_sessions;
create policy "group reward sessions own read" on public.cp_group_reward_ad_sessions
for select to authenticated using ((select auth.uid())=user_id);

create or replace function public.start_group_reward_ad_secure(p_group_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); ad record; sid uuid; last_seen timestamptz;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.group_members gm join public.groups g on g.id=gm.group_id where gm.group_id=p_group_id and gm.user_id=uid and gm.left_at is null and g.activated_at is not null and coalesce(g.expires_at,now()+interval '1 second')>now()) then raise exception 'You are not an active member of this group'; end if;
 select last_shown_at into last_seen from public.cp_group_reward_ad_views where group_id=p_group_id and user_id=uid for update;
 if last_seen is not null and last_seen > now()-interval '24 hours' then return jsonb_build_object('show',false,'reason','cooldown','next_at',last_seen+interval '24 hours'); end if;
 select * into ad from public.ad_creatives where placement='group_message_rewarded' and status='active' order by updated_at desc limit 1;
 if ad.id is null then return jsonb_build_object('show',false,'reason','no_active_sponsor'); end if;
 insert into public.cp_group_reward_ad_views(group_id,user_id,last_shown_at) values(p_group_id,uid,now())
 on conflict(group_id,user_id) do update set last_shown_at=now();
 insert into public.cp_group_reward_ad_sessions(group_id,user_id,ad_id,reward_bc) values(p_group_id,uid,ad.id,3) returning id into sid;
 return jsonb_build_object('show',true,'session_id',sid,'sponsor',ad.sponsor,'headline',ad.headline,'description',ad.description,'tagline',ad.tagline,'image_url',ad.image_url,'video_url',ad.video_url,'poster_url',ad.poster_url,'destination_url',ad.destination_url,'call_to_action',ad.call_to_action,'duration_seconds',greatest(1,coalesce(ad.duration_seconds,5)),'skip_after_seconds',ad.skip_after_seconds,'format',ad.format);
end $$;

create or replace function public.complete_group_reward_ad_secure(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); s record; ad record; bal bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into s from public.cp_group_reward_ad_sessions where id=p_session_id and user_id=uid for update;
 if s.id is null then raise exception 'Reward session not found'; end if;
 if s.completed_at is not null then select balance into bal from public.bc_accounts where user_id=uid; return jsonb_build_object('rewarded',false,'already_completed',true,'reward_bc',s.reward_bc,'balance',coalesce(bal,0)); end if;
 select * into ad from public.ad_creatives where id=s.ad_id;
 if ad.id is null then raise exception 'Sponsor ad no longer exists'; end if;
 if extract(epoch from (now()-s.started_at)) < greatest(1,coalesce(ad.duration_seconds,5)) then raise exception 'Please watch today''s sponsor message to the end'; end if;
 update public.cp_group_reward_ad_sessions set completed_at=now() where id=s.id;
 perform public.apply_bc_delta(uid,s.reward_bc,'Group sponsor reward','group_reward_ad',s.id);
 select balance into bal from public.bc_accounts where user_id=uid;
 return jsonb_build_object('rewarded',true,'reward_bc',s.reward_bc,'balance',coalesce(bal,0));
end $$;

revoke all on function public.start_group_reward_ad_secure(uuid) from public,anon;
grant execute on function public.start_group_reward_ad_secure(uuid) to authenticated;
revoke all on function public.complete_group_reward_ad_secure(uuid) from public,anon;
grant execute on function public.complete_group_reward_ad_secure(uuid) to authenticated;
