create table if not exists public.cp_group_user_reports (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists cp_group_user_reports_group_idx on public.cp_group_user_reports(group_id, created_at desc);
create index if not exists cp_group_user_reports_target_idx on public.cp_group_user_reports(target_user_id, created_at desc);

alter table public.cp_group_user_reports enable row level security;
revoke all on table public.cp_group_user_reports from anon, authenticated;

create or replace function public.get_group_member_profiles_secure(p_group_id uuid)
returns table(user_id uuid, display_name text, avatar_url text)
language plpgsql security definer set search_path = public, pg_temp
as $function$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=uid and gm.left_at is null) then
    raise exception 'You are not a member of this group';
  end if;
  return query
    select p.id, coalesce(p.display_name,'Anonymous Panda'), coalesce(p.avatar_url,'🐼')
    from public.group_members gm join public.profiles p on p.id=gm.user_id
    where gm.group_id=p_group_id and gm.left_at is null;
end;
$function$;

create or replace function public.report_group_user_secure(p_group_id uuid,p_target_user_id uuid,p_reason text,p_details text default null)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $function$
declare uid uuid := auth.uid(); report_id uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_target_user_id is null or p_target_user_id=uid then raise exception 'Invalid report target'; end if;
  if not exists (select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=uid and gm.left_at is null) then raise exception 'You are not a member of this group'; end if;
  if not exists (select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=p_target_user_id and gm.left_at is null) then raise exception 'That user is not an active member of this group'; end if;
  insert into public.cp_group_user_reports(group_id,reporter_user_id,target_user_id,reason,details)
  values(p_group_id,uid,p_target_user_id,left(trim(coalesce(p_reason,'Other')),120),nullif(left(trim(coalesce(p_details,'')),1000),''))
  returning id into report_id;
  return report_id;
end;
$function$;

revoke all on function public.get_group_member_profiles_secure(uuid) from public;
grant execute on function public.get_group_member_profiles_secure(uuid) to authenticated;
revoke all on function public.report_group_user_secure(uuid,uuid,text,text) from public;
grant execute on function public.report_group_user_secure(uuid,uuid,text,text) to authenticated;