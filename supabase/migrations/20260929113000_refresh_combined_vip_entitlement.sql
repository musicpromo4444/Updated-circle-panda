create or replace function public.refresh_user_vip_entitlement(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare best_expiry timestamptz;
begin
select max(expiry_at) into best_expiry from (
  select (pt.verified_at + make_interval(days=>sc.vip_days)) as expiry_at
  from public.payment_transactions pt
  join public.store_catalog sc on sc.id=pt.item_id and sc.item_type='vip_subscription'
  where pt.user_id=p_user_id and pt.item_type='vip_subscription' and pt.status='verified' and pt.verified_at is not null
  union all
  select nst.expires_at
  from public.native_store_transactions nst
  where nst.user_id=p_user_id and nst.item_type='vip_subscription' and nst.status='verified' and nst.expires_at is not null
) q;
update public.profiles set is_vip=(best_expiry is not null and best_expiry>now()),vip_expires_at=best_expiry,updated_at=now() where id=p_user_id;
insert into public.user_app_state(user_id,state,updated_at) values(p_user_id,jsonb_build_object('isVip',(best_expiry is not null and best_expiry>now()),'vipExpiresAt',case when best_expiry is null then null else extract(epoch from best_expiry)*1000 end),now())
on conflict(user_id) do update set state=public.user_app_state.state||excluded.state,updated_at=now();
return jsonb_build_object('ok',true,'is_vip',(best_expiry is not null and best_expiry>now()),'vip_expires_at',best_expiry);
end; $$;

create or replace function public.sync_native_subscription_expiry(p_user_id uuid,p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
if p_user_id is null or p_expires_at is null then raise exception 'Invalid subscription sync'; end if;
perform public.refresh_user_vip_entitlement(p_user_id);
return jsonb_build_object('ok',true,'synced_to',p_expires_at);
end; $$;

revoke all on function public.refresh_user_vip_entitlement(uuid) from public,anon,authenticated;
grant execute on function public.refresh_user_vip_entitlement(uuid) to service_role;
revoke all on function public.sync_native_subscription_expiry(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.sync_native_subscription_expiry(uuid,timestamptz) to service_role;