alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists state_province text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists area text;
create index if not exists profiles_location_idx on public.profiles(country,state_province,city,area);

create or replace function public.ensure_user_account() returns trigger language plpgsql security definer set search_path=public as $function$
begin
  insert into public.profiles(id, display_name, country, state_province, city, area)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(coalesce(new.email,''),'@',1), 'Anonymous Panda'),
    nullif(new.raw_user_meta_data->>'country',''),
    nullif(new.raw_user_meta_data->>'state_province',''),
    nullif(new.raw_user_meta_data->>'city',''),
    nullif(new.raw_user_meta_data->>'area','')
  )
  on conflict (id) do update set
    display_name=excluded.display_name,
    country=coalesce(excluded.country, public.profiles.country),
    state_province=coalesce(excluded.state_province, public.profiles.state_province),
    city=coalesce(excluded.city, public.profiles.city),
    area=coalesce(excluded.area, public.profiles.area),
    updated_at=now();
  insert into public.user_controls(user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.bc_accounts(user_id) values (new.id) on conflict (user_id) do nothing;
  if lower(coalesce(new.email,''))='reply.stagepro@gmail.com' then
    insert into public.app_admins(user_id) values (new.id) on conflict (user_id) do nothing;
  end if;
  return new;
end;
$function$;
