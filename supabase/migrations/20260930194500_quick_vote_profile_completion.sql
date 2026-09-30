create or replace function public.complete_quick_profile(
  p_country text,
  p_state_province text default null,
  p_city text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.profiles
  set country = nullif(trim(p_country), ''),
      state_province = nullif(trim(p_state_province), ''),
      city = nullif(trim(p_city), ''),
      updated_at = now()
  where id = auth.uid();
  if not found then raise exception 'Profile not found'; end if;
end;
$$;
revoke all on function public.complete_quick_profile(text,text,text) from public;
grant execute on function public.complete_quick_profile(text,text,text) to authenticated;
