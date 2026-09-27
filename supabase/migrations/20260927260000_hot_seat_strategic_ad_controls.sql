-- Circle Panda Hot Seat strategic ad controls
alter table public.ad_placement_config
  add column if not exists hot_seat_comments_ads_enabled boolean not null default true,
  add column if not exists hot_seat_questions_ads_enabled boolean not null default true,
  add column if not exists hot_seat_water_break_ads_enabled boolean not null default false;

create or replace function public.admin_set_hot_seat_ad_settings(
  p_comments boolean,
  p_questions boolean,
  p_water_break boolean
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  update public.ad_placement_config
  set hot_seat_comments_ads_enabled = p_comments,
      hot_seat_questions_ads_enabled = p_questions,
      hot_seat_water_break_ads_enabled = p_water_break,
      updated_at = now()
  where id = true;

  return (select to_jsonb(c) from public.ad_placement_config c where id = true);
end;
$$;

revoke all on function public.admin_set_hot_seat_ad_settings(boolean, boolean, boolean) from public, anon;
grant execute on function public.admin_set_hot_seat_ad_settings(boolean, boolean, boolean) to authenticated;
