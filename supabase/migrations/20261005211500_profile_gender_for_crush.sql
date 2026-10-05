alter table public.profiles add column if not exists gender text check (gender in ('male','female'));
create or replace function public.get_my_profile_gender()
returns text language sql security definer set search_path=public,pg_temp as $$ select gender from public.profiles where id=auth.uid() $$;
create or replace function public.set_profile_gender_secure(p_gender text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
 if p_gender not in ('male','female') then raise exception 'INVALID_GENDER'; end if;
 update public.profiles set gender=p_gender,updated_at=now() where id=auth.uid();
 if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
 return p_gender;
end $$;