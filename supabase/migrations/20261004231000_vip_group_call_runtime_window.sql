create table if not exists public.cp_vip_group_call_views (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_shown_at timestamptz not null default now()
);
alter table public.cp_vip_group_call_views enable row level security;
revoke all on public.cp_vip_group_call_views from public, anon, authenticated;

create or replace function public.get_vip_group_call_runtime()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare c public.cp_vip_group_call_config; v_last timestamptz; v_show boolean;
begin
  if auth.uid() is null then return jsonb_build_object('show',false); end if;
  if not exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_vip=true and (p.vip_expires_at is null or p.vip_expires_at>now())) then
    return jsonb_build_object('show',false);
  end if;
  select * into c from public.cp_vip_group_call_config where id=1;
  if c.id is null or not c.enabled or (not c.voice_enabled and not c.video_enabled) then return jsonb_build_object('show',false); end if;
  select last_shown_at into v_last from public.cp_vip_group_call_views where user_id=auth.uid();
  v_show := (
    (v_last is null and c.popup_after_hours = 0)
    or (v_last is null and c.popup_after_hours > 0 and now() >= c.updated_at + make_interval(hours => c.popup_after_hours))
    or (v_last is not null and now() >= v_last + make_interval(hours => c.repeat_every_hours))
  );
  if v_show then
    insert into public.cp_vip_group_call_views(user_id,last_shown_at) values(auth.uid(),now())
    on conflict (user_id) do update set last_shown_at=excluded.last_shown_at;
  end if;
  return jsonb_build_object('show',v_show,'voice_enabled',c.voice_enabled,'video_enabled',c.video_enabled,'repeat_every_hours',c.repeat_every_hours);
end;
$$;
revoke all on function public.get_vip_group_call_runtime() from public, anon;
grant execute on function public.get_vip_group_call_runtime() to authenticated;
