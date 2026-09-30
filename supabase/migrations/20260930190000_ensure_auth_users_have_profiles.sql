create or replace function public.handle_new_circle_panda_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles(id,display_name,avatar_url,gender,country,state_province,city,area,updated_at)
  values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),'Anonymous Panda'),
    coalesce(nullif(trim(new.raw_user_meta_data->>'avatar_style'),''),'🐼'),
    nullif(trim(new.raw_user_meta_data->>'gender'),''),
    nullif(trim(new.raw_user_meta_data->>'country'),''),
    nullif(trim(new.raw_user_meta_data->>'state_province'),''),
    nullif(trim(new.raw_user_meta_data->>'city'),''),
    nullif(trim(new.raw_user_meta_data->>'area'),''),
    now())
  on conflict(id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_circle_panda on auth.users;
create trigger on_auth_user_created_circle_panda after insert on auth.users for each row execute function public.handle_new_circle_panda_user();

create or replace function public.ensure_my_circle_panda_profile()
returns public.profiles language plpgsql security definer set search_path = public, pg_temp
as $$
declare uid uuid := auth.uid(); result public.profiles;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  insert into public.profiles(id,display_name,avatar_url,gender,country,state_province,city,area,updated_at)
  select u.id,coalesce(nullif(trim(u.raw_user_meta_data->>'name'),''),'Anonymous Panda'),
    coalesce(nullif(trim(u.raw_user_meta_data->>'avatar_style'),''),'🐼'),
    nullif(trim(u.raw_user_meta_data->>'gender'),''),
    nullif(trim(u.raw_user_meta_data->>'country'),''),
    nullif(trim(u.raw_user_meta_data->>'state_province'),''),
    nullif(trim(u.raw_user_meta_data->>'city'),''),
    nullif(trim(u.raw_user_meta_data->>'area'),''),
    now() from auth.users u where u.id=uid
  on conflict(id) do update set
    display_name=case when public.profiles.display_name is null or public.profiles.display_name in ('','Anonymous Panda') then excluded.display_name else public.profiles.display_name end,
    avatar_url=case when public.profiles.avatar_url is null or public.profiles.avatar_url='' then excluded.avatar_url else public.profiles.avatar_url end,
    gender=coalesce(public.profiles.gender,excluded.gender), country=coalesce(public.profiles.country,excluded.country),
    state_province=coalesce(public.profiles.state_province,excluded.state_province),
    city=coalesce(public.profiles.city,excluded.city), area=coalesce(public.profiles.area,excluded.area), updated_at=now()
  returning * into result;
  return result;
end;
$$;
revoke all on function public.ensure_my_circle_panda_profile() from public;
grant execute on function public.ensure_my_circle_panda_profile() to authenticated;
