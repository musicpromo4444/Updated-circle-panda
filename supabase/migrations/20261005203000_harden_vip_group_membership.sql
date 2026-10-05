-- VIP group membership is authenticated-only.
-- Country-scoped groups enforce country_restriction when configured.
-- VIP group provisioning is admin-only.
create or replace function public.ensure_vip_groups()
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  country_id uuid;
  worldwide_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.is_admin(v_uid) then raise exception 'ADMIN_REQUIRED'; end if;
  select country_group_id, worldwide_group_id into country_id, worldwide_id
  from public.vip_group_config where id=true for update;
  if country_id is null then
    insert into public.groups(name,about,limitations,is_vip,vip_scope)
    values('VIP — Country','Exclusive VIP country circle','VIP members only',true,'country')
    returning id into country_id;
  end if;
  if worldwide_id is null then
    insert into public.groups(name,about,limitations,is_vip,vip_scope)
    values('VIP — Worldwide','Exclusive worldwide VIP circle','VIP members only',true,'worldwide')
    returning id into worldwide_id;
  end if;
  update public.vip_group_config set country_group_id=country_id,worldwide_group_id=worldwide_id,active=true where id=true;
  return jsonb_build_object('country_group_id',country_id,'worldwide_group_id',worldwide_id);
end;
$$;

create or replace function public.join_vip_group(p_group_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_scope text;
  v_group_country text;
  v_user_country text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select vip_scope,country_restriction into v_scope,v_group_country
  from public.groups where id=p_group_id and is_vip=true;
  if not found then raise exception 'VIP_GROUP_REQUIRED'; end if;
  if v_scope='country' and coalesce(v_group_country,'')<>'' then
    select country into v_user_country from public.profiles where id=v_uid;
    if lower(coalesce(v_user_country,''))<>lower(v_group_country) then
      raise exception 'VIP_COUNTRY_MISMATCH';
    end if;
  elsif v_scope not in ('country','worldwide') then
    raise exception 'INVALID_VIP_SCOPE';
  end if;
  insert into public.group_members(group_id,user_id,left_at)
  values(p_group_id,v_uid,null)
  on conflict(group_id,user_id) do update set left_at=null;
end;
$$;

create or replace function public.leave_vip_group(p_group_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.group_members set left_at=now()
  where group_id=p_group_id and user_id=v_uid and left_at is null
    and exists(select 1 from public.groups where id=p_group_id and is_vip=true);
end;
$$;

revoke execute on function public.ensure_vip_groups() from anon;
revoke execute on function public.join_vip_group(uuid) from anon;
revoke execute on function public.leave_vip_group(uuid) from anon;
grant execute on function public.ensure_vip_groups() to authenticated;
grant execute on function public.join_vip_group(uuid) to authenticated;
grant execute on function public.leave_vip_group(uuid) to authenticated;
