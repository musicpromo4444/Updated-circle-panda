create table if not exists public.cp_vip_group_call_config (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  voice_enabled boolean not null default true,
  video_enabled boolean not null default true,
  popup_after_hours integer not null default 0 check (popup_after_hours between 0 and 168),
  repeat_every_hours integer not null default 24 check (repeat_every_hours between 1 and 168),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.cp_vip_group_call_config enable row level security;
revoke all on public.cp_vip_group_call_config from anon, authenticated, public;

insert into public.cp_vip_group_call_config (id, enabled, voice_enabled, video_enabled, popup_after_hours, repeat_every_hours) values (1, true, true, true, 0, 24)
on conflict (id) do nothing;

create or replace function public.get_vip_group_call_config()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $
  select jsonb_build_object(
    'enabled', c.enabled,
    'voice_enabled', c.voice_enabled,
    'video_enabled', c.video_enabled,
    'popup_after_hours', c.popup_after_hours,
    'repeat_every_hours', c.repeat_every_hours
  )
  from public.cp_vip_group_call_config c
  where c.id = 1
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_vip = true
        and (p.vip_expires_at is null or p.vip_expires_at > now())
    );
$$;
revoke all on function public.get_vip_group_call_config() from public, anon;
grant execute on function public.get_vip_group_call_config() to authenticated;

create or replace function public.admin_get_vip_group_call_config()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare r jsonb;
begin
  if not exists (select 1 from public.app_admins a where a.user_id = auth.uid())
     and not exists (
       select 1 from public.admin_roles ar
       where ar.user_id = auth.uid() and ar.active = true
         and ar.role_kind in ('owner','super_admin','admin')
     ) then
    raise exception 'Admin access required';
  end if;
  select jsonb_build_object(
    'enabled', c.enabled,
    'voice_enabled', c.voice_enabled,
    'video_enabled', c.video_enabled,
    'popup_after_hours', c.popup_after_hours,
    'repeat_every_hours', c.repeat_every_hours,
    'updated_at', c.updated_at
  ) into r
  from public.cp_vip_group_call_config c where c.id=1;
  return coalesce(r,'{}'::jsonb);
end;
$$;
revoke all on function public.admin_get_vip_group_call_config() from public, anon;
grant execute on function public.admin_get_vip_group_call_config() to authenticated;

create or replace function public.admin_save_vip_group_call_config(
  p_enabled boolean,
  p_voice_enabled boolean,
  p_video_enabled boolean,
  p_popup_after_hours integer,
  p_repeat_every_hours integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare r jsonb;
begin
  if not exists (select 1 from public.app_admins a where a.user_id = auth.uid())
     and not exists (
       select 1 from public.admin_roles ar
       where ar.user_id = auth.uid() and ar.active = true
         and ar.role_kind in ('owner','super_admin','admin')
     ) then
    raise exception 'Admin access required';
  end if;
  if p_repeat_every_hours < 1 or p_repeat_every_hours > 168 then
    raise exception 'Repeat interval must be 1-168 hours';
  end if;
  if p_popup_after_hours < 0 or p_popup_after_hours > 168 then
    raise exception 'Popup delay must be 0-168 hours';
  end if;
  if not p_voice_enabled and not p_video_enabled then p_enabled := false; end if;

  update public.cp_vip_group_call_config
  set enabled=p_enabled,
      voice_enabled=p_voice_enabled,
      video_enabled=p_video_enabled,
      popup_after_hours=p_popup_after_hours,
      repeat_every_hours=p_repeat_every_hours,
      updated_at=now(),
      updated_by=auth.uid()
  where id=1
  returning jsonb_build_object(
    'enabled', enabled,
    'voice_enabled', voice_enabled,
    'video_enabled', video_enabled,
    'popup_after_hours', popup_after_hours,
    'repeat_every_hours', repeat_every_hours,
    'updated_at', updated_at
  ) into r;
  return r;
end;
$$;
revoke all on function public.admin_save_vip_group_call_config(boolean,boolean,boolean,integer,integer) from public, anon;
grant execute on function public.admin_save_vip_group_call_config(boolean,boolean,boolean,integer,integer) to authenticated;
