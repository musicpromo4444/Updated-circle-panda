-- Profile DOB/location and layered Panda identity fixes.
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists address_line text;
alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check check (age is null or age between 18 and 120);

create or replace function public.ensure_my_circle_panda_profile()
returns public.profiles language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); result public.profiles; dob date; computed_age integer;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  begin dob:=nullif(trim((select u.raw_user_meta_data->>'date_of_birth' from auth.users u where u.id=uid)),'')::date; exception when others then dob:=null; end;
  if dob is not null then
    computed_age:=extract(year from age(current_date,dob))::integer;
    if computed_age<18 or computed_age>120 then dob:=null; computed_age:=null; end if;
  end if;
  insert into public.profiles(id,display_name,avatar_url,gender,country,state_province,city,area,address_line,date_of_birth,age,updated_at)
  select u.id,coalesce(nullif(trim(u.raw_user_meta_data->>'name'),''),'Anonymous Panda'),
    coalesce(nullif(trim(u.raw_user_meta_data->>'avatar_style'),''),'🐼'),
    nullif(trim(u.raw_user_meta_data->>'gender'),''),nullif(trim(u.raw_user_meta_data->>'country'),''),
    nullif(trim(u.raw_user_meta_data->>'state_province'),''),nullif(trim(u.raw_user_meta_data->>'city'),''),
    nullif(trim(u.raw_user_meta_data->>'area'),''),nullif(trim(u.raw_user_meta_data->>'address_line'),''),dob,computed_age,now()
  from auth.users u where u.id=uid
  on conflict(id) do update set
    display_name=case when public.profiles.display_name is null or public.profiles.display_name in ('','Anonymous Panda') then excluded.display_name else public.profiles.display_name end,
    avatar_url=case when public.profiles.avatar_url is null or public.profiles.avatar_url='' then excluded.avatar_url else public.profiles.avatar_url end,
    gender=coalesce(public.profiles.gender,excluded.gender),country=coalesce(public.profiles.country,excluded.country),
    state_province=coalesce(public.profiles.state_province,excluded.state_province),city=coalesce(public.profiles.city,excluded.city),
    area=coalesce(public.profiles.area,excluded.area),address_line=coalesce(public.profiles.address_line,excluded.address_line),date_of_birth=coalesce(public.profiles.date_of_birth,excluded.date_of_birth),
    age=coalesce(public.profiles.age,excluded.age),updated_at=now()
  returning * into result;
  return result;
end $$;

drop function if exists public.update_profile_completion_secure(text,text,text,text,text,integer);
drop function if exists public.update_profile_completion_secure(text,text,text,text,text,date);
create or replace function public.update_profile_completion_secure(
  p_country text default null,p_state_province text default null,p_city text default null,p_area text default null,
  p_address_line text default null,p_date_of_birth date default null
) returns public.profiles language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); result public.profiles; existing_dob date; derived_age integer;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_date_of_birth is not null then
    derived_age:=extract(year from age(current_date,p_date_of_birth))::integer;
    if derived_age<18 or derived_age>120 then raise exception 'Date of birth must make the account 18 to 120 years old'; end if;
  end if;
  select date_of_birth into existing_dob from public.profiles where id=uid for update;
  if existing_dob is not null and p_date_of_birth is not null and existing_dob<>p_date_of_birth then raise exception 'Date of birth is locked and cannot be changed'; end if;
  update public.profiles set country=nullif(trim(coalesce(p_country,'')),''),
    state_province=nullif(trim(coalesce(p_state_province,'')),''),
    city=nullif(trim(coalesce(p_city,'')),''),
    area=nullif(trim(coalesce(p_area,'')),''),
    address_line=nullif(trim(coalesce(p_address_line,'')),''),
    date_of_birth=coalesce(date_of_birth,p_date_of_birth),age=coalesce(age,derived_age),updated_at=now()
  where id=uid returning * into result;
  if result.id is null then raise exception 'Profile not found'; end if;
  return result;
end $$;
revoke all on function public.update_profile_completion_secure(text,text,text,text,text,date) from public,anon;
grant execute on function public.update_profile_completion_secure(text,text,text,text,text,date) to authenticated;
revoke all on function public.ensure_my_circle_panda_profile() from public,anon;
grant execute on function public.ensure_my_circle_panda_profile() to authenticated;
