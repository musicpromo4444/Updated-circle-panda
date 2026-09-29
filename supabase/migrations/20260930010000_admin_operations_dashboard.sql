create or replace function public.admin_get_operations_dashboard()
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if not (private.admin_is_owner(uid) or private.admin_can('analytics.view',uid) or private.admin_can('finance.billing',uid) or private.admin_can('content.manage',uid) or private.admin_can('hotseat.manage',uid)) then raise exception 'Admin dashboard permission required'; end if;
 return jsonb_build_object(
  'store', case when private.admin_is_owner(uid) or private.admin_can('finance.billing',uid) then coalesce((select jsonb_agg(to_jsonb(s) order by s.price_ngn,s.name) from public.store_catalog s),'[]'::jsonb) else '[]'::jsonb end,
  'sweepstakes', case when private.admin_is_owner(uid) or private.admin_can('activities.manage',uid) then coalesce((select jsonb_agg(to_jsonb(s) order by s.updated_at desc) from public.sweepstakes_config s),'[]'::jsonb) else '[]'::jsonb end,
  'finance', case when private.admin_is_owner(uid) or private.admin_can('analytics.view',uid) or private.admin_can('finance.billing',uid) then jsonb_build_object('successful',coalesce((select count(*) from public.payment_transactions where status='success'),0),'pending',coalesce((select count(*) from public.payment_transactions where status='pending'),0),'failed',coalesce((select count(*) from public.payment_transactions where status='failed'),0),'gross_minor',coalesce((select sum(amount) from public.payment_transactions where status='success'),0)) else '{}'::jsonb end,
  'content', case when private.admin_is_owner(uid) or private.admin_can('content.manage',uid) then jsonb_build_object('confessions_pending',coalesce((select count(*) from public.confessions where not is_published),0),'confessions_published',coalesce((select count(*) from public.confessions where is_published),0),'events',coalesce((select count(*) from public.events),0),'groups',coalesce((select count(*) from public.groups),0)) else '{}'::jsonb end,
  'hotseat', case when private.admin_is_owner(uid) or private.admin_can('hotseat.manage',uid) then jsonb_build_object('scheduled_streams',coalesce((select count(*) from public.live_streams where status in ('scheduled','live')),0),'hosts',coalesce((select count(*) from public.hot_seat_hosts),0),'break_content',coalesce((select count(*) from public.hot_seat_break_content where enabled),0),'polls',coalesce((select count(*) from public.hot_seat_break_polls where enabled),0)) else '{}'::jsonb end
 );
end $$;

create or replace function public.admin_update_store_product(p_id text,p_price_usd numeric,p_price_ngn numeric,p_coins bigint,p_vip_days integer,p_enabled boolean,p_is_popular boolean,p_is_best_value boolean,p_is_highlighted boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; row public.store_catalog;
begin uid:=auth.uid(); if not (private.admin_is_owner(uid) or private.admin_can('finance.billing',uid)) then raise exception 'Billing permission required'; end if; if p_price_usd<0 or p_price_ngn<0 or p_coins<0 or p_vip_days<0 then raise exception 'Values cannot be negative'; end if;
 update public.store_catalog set price_usd=p_price_usd,price_ngn=p_price_ngn,coins=p_coins,vip_days=p_vip_days,enabled=p_enabled,is_popular=p_is_popular,is_best_value=p_is_best_value,is_highlighted=p_is_highlighted,updated_at=now() where id=p_id returning * into row; if not found then raise exception 'Store product not found'; end if;
 insert into public.admin_audit_log(admin_user_id,action,metadata) values(uid,'STORE_PRODUCT_UPDATED',jsonb_build_object('product_id',p_id)); return to_jsonb(row); end $$;

create or replace function public.admin_update_sweepstakes_config(p_id uuid,p_ticket_price_bc bigint,p_prize_name text,p_prize_description text,p_closes_at timestamptz,p_is_active boolean,p_winner_mode text,p_qualification_enabled boolean,p_qualification_config jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; row public.sweepstakes_config;
begin uid:=auth.uid(); if not (private.admin_is_owner(uid) or private.admin_can('activities.manage',uid)) then raise exception 'Activities permission required'; end if; if p_ticket_price_bc<0 then raise exception 'Ticket price cannot be negative'; end if; if p_winner_mode not in ('random','manual','weighted') then raise exception 'Invalid winner mode'; end if;
 update public.sweepstakes_config set ticket_price_bc=p_ticket_price_bc,prize_name=left(p_prize_name,200),prize_description=left(coalesce(p_prize_description,''),2000),closes_at=p_closes_at,is_active=p_is_active,winner_mode=p_winner_mode,qualification_enabled=p_qualification_enabled,qualification_config=coalesce(p_qualification_config,'{}'::jsonb),updated_at=now() where id=p_id returning * into row; if not found then raise exception 'Sweepstake configuration not found'; end if;
 insert into public.admin_audit_log(admin_user_id,action,metadata) values(uid,'SWEEPSTAKES_CONFIG_UPDATED',jsonb_build_object('id',p_id)); return to_jsonb(row); end $$;

create or replace function public.admin_moderate_confession(p_id uuid,p_published boolean) returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid; begin uid:=auth.uid(); if not (private.admin_is_owner(uid) or private.admin_can('content.manage',uid)) then raise exception 'Content permission required'; end if; update public.confessions set is_published=p_published,updated_at=now() where id=p_id; if not found then raise exception 'Confession not found'; end if; insert into public.admin_audit_log(admin_user_id,action,metadata) values(uid,'CONFESSION_MODERATED',jsonb_build_object('id',p_id,'published',p_published)); return true; end $$;

create or replace function public.admin_set_hotseat_presence(p_enabled boolean,p_title text,p_message text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; row public.hot_seat_presence_settings; begin uid:=auth.uid(); if not (private.admin_is_owner(uid) or private.admin_can('hotseat.manage',uid)) then raise exception 'Hot Seat permission required'; end if; update public.hot_seat_presence_settings set enabled=p_enabled,title=left(p_title,120),message=left(p_message,500),updated_at=now() where id=true returning * into row; if not found then insert into public.hot_seat_presence_settings(id,enabled,title,message) values(true,p_enabled,left(p_title,120),left(p_message,500)) returning * into row; end if; insert into public.admin_audit_log(admin_user_id,action,metadata) values(uid,'HOTSEAT_PRESENCE_UPDATED',jsonb_build_object('enabled',p_enabled)); return to_jsonb(row); end $$;

revoke all on function public.admin_get_operations_dashboard() from public,anon,authenticated;
revoke all on function public.admin_update_store_product(text,numeric,numeric,bigint,integer,boolean,boolean,boolean,boolean) from public,anon,authenticated;
revoke all on function public.admin_update_sweepstakes_config(uuid,bigint,text,text,timestamptz,boolean,text,boolean,jsonb) from public,anon,authenticated;
revoke all on function public.admin_moderate_confession(uuid,boolean) from public,anon,authenticated;
revoke all on function public.admin_set_hotseat_presence(boolean,text,text) from public,anon,authenticated;
grant execute on function public.admin_get_operations_dashboard() to authenticated;
grant execute on function public.admin_update_store_product(text,numeric,numeric,bigint,integer,boolean,boolean,boolean,boolean) to authenticated;
grant execute on function public.admin_update_sweepstakes_config(uuid,bigint,text,text,timestamptz,boolean,text,boolean,jsonb) to authenticated;
grant execute on function public.admin_moderate_confession(uuid,boolean) to authenticated;
grant execute on function public.admin_set_hotseat_presence(boolean,text,text) to authenticated;
insert into public.admin_rpc_permission_map(function_name,permission_key) values ('admin_get_operations_dashboard','analytics.view'),('admin_update_store_product','finance.billing'),('admin_update_sweepstakes_config','activities.manage'),('admin_moderate_confession','content.manage'),('admin_set_hotseat_presence','hotseat.manage') on conflict(function_name) do update set permission_key=excluded.permission_key;
notify pgrst,'reload config';