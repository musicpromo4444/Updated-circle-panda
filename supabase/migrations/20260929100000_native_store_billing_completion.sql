-- Circle Panda native store billing completion.
alter table public.payment_transactions
  add column if not exists provider text,
  add column if not exists provider_transaction_id text,
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb,
  add column if not exists provider_currency text,
  add column if not exists provider_amount_minor bigint;

create unique index if not exists payment_transactions_provider_tx_unique
  on public.payment_transactions(provider, provider_transaction_id)
  where provider is not null and provider_transaction_id is not null;

create table if not exists public.native_store_transactions (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('google_play','apple_iap')),
  provider_transaction_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.store_catalog(id),
  item_type text not null check (item_type in ('coin_package','vip_subscription')),
  environment text,
  status text not null default 'verified' check (status in ('verified','revoked','refunded','pending')),
  provider_currency text,
  provider_amount_minor bigint,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_transaction_id)
);

create index if not exists native_store_transactions_user_idx on public.native_store_transactions(user_id);
create index if not exists native_store_transactions_item_idx on public.native_store_transactions(item_id);

alter table public.native_store_transactions enable row level security;
revoke all on public.native_store_transactions from anon, authenticated;
grant select on public.native_store_transactions to authenticated;

drop policy if exists "Users can read their own native store transactions" on public.native_store_transactions;
create policy "Users can read their own native store transactions"
on public.native_store_transactions for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.fulfill_native_store_purchase_verified(
  p_user_id uuid,p_reference text,p_provider text,p_provider_transaction_id text,p_item_id text,p_item_type text,
  p_provider_currency text default null,p_provider_amount_minor bigint default null,p_quantity integer default 1,
  p_expires_at timestamptz default null,p_environment text default null,p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare item public.store_catalog%rowtype; existing public.payment_transactions%rowtype; native_existing public.native_store_transactions%rowtype;
new_balance bigint; current_expiry timestamptz; final_expiry timestamptz; payment_id uuid; coin_amount bigint;
begin
if p_user_id is null or p_reference is null or length(trim(p_reference))<8 then raise exception 'Invalid purchase identity'; end if;
if p_provider not in ('google_play','apple_iap') then raise exception 'Invalid native provider'; end if;
if p_provider_transaction_id is null or length(trim(p_provider_transaction_id))<3 then raise exception 'Invalid provider transaction'; end if;
if p_item_type not in ('coin_package','vip_subscription') then raise exception 'Invalid store item type'; end if;
if coalesce(p_quantity,0)<1 or p_quantity>100 then raise exception 'Invalid purchase quantity'; end if;
select * into item from public.store_catalog where id=p_item_id and item_type=p_item_type and enabled=true for share;
if not found then raise exception 'Store item is not available'; end if;
if p_provider='google_play' and nullif(item.android_product_id,'') is distinct from p_metadata->>'product_id' then raise exception 'Google Play product mismatch'; end if;
if p_provider='apple_iap' and nullif(item.ios_product_id,'') is distinct from p_metadata->>'product_id' then raise exception 'Apple product mismatch'; end if;
select * into native_existing from public.native_store_transactions where provider=p_provider and provider_transaction_id=p_provider_transaction_id for update;
if found then select balance into new_balance from public.bc_accounts where user_id=p_user_id; return jsonb_build_object('ok',true,'already_verified',true,'balance',coalesce(new_balance,0),'expires_at',native_existing.expires_at); end if;
select * into existing from public.payment_transactions where reference=p_reference for update;
if found and (existing.user_id<>p_user_id or existing.item_id<>p_item_id or existing.item_type<>p_item_type) then raise exception 'Payment reference mismatch'; end if;
insert into public.native_store_transactions(provider,provider_transaction_id,user_id,item_id,item_type,environment,status,provider_currency,provider_amount_minor,expires_at,metadata)
values(p_provider,p_provider_transaction_id,p_user_id,p_item_id,p_item_type,p_environment,'verified',p_provider_currency,p_provider_amount_minor,p_expires_at,coalesce(p_metadata,'{}'::jsonb));
insert into public.payment_transactions(reference,user_id,item_id,item_type,amount,currency,status,verified_at,metadata,provider,provider_transaction_id,provider_metadata,provider_currency,provider_amount_minor)
values(p_reference,p_user_id,p_item_id,p_item_type,coalesce(p_provider_amount_minor,0),coalesce(p_provider_currency,'NATIVE'),'verified',now(),coalesce(p_metadata,'{}'::jsonb),p_provider,p_provider_transaction_id,coalesce(p_metadata,'{}'::jsonb),p_provider_currency,p_provider_amount_minor)
returning id into payment_id;
if p_item_type='coin_package' then
coin_amount:=item.coins*p_quantity;
insert into public.bc_accounts(user_id,balance,updated_at) values(p_user_id,coin_amount,now()) on conflict(user_id) do update set balance=public.bc_accounts.balance+excluded.balance,updated_at=now();
select balance into new_balance from public.bc_accounts where user_id=p_user_id;
insert into public.bc_ledger(user_id,amount,reason,reference_type,reference_id) values(p_user_id,coin_amount,'Native store purchase: '||item.name,'payment',payment_id);
insert into public.cp_notifications(user_id,title,body,kind,metadata) values(p_user_id,'Panda Coins added 🪙','+'||coin_amount::text||' BC from '||item.name||' is now in your wallet.','store_purchase',jsonb_build_object('item_id',item.id,'reference',p_reference,'provider',p_provider,'coins',coin_amount));
else
if p_expires_at is null or p_expires_at<=now() then raise exception 'Native subscription is not active'; end if;
select vip_expires_at into current_expiry from public.profiles where id=p_user_id for update;
final_expiry:=greatest(coalesce(current_expiry,now()),p_expires_at);
update public.profiles set is_vip=true,vip_expires_at=final_expiry,updated_at=now() where id=p_user_id;
insert into public.user_app_state(user_id,state,updated_at) values(p_user_id,jsonb_build_object('isVip',true,'vipExpiresAt',extract(epoch from final_expiry)*1000),now()) on conflict(user_id) do update set state=public.user_app_state.state||excluded.state,updated_at=now();
insert into public.cp_notifications(user_id,title,body,kind,metadata) values(p_user_id,'VIP Pass activated 👑',item.name||' is active until '||to_char(final_expiry,'Mon DD, YYYY'),'reward',jsonb_build_object('item_id',item.id,'reference',p_reference,'provider',p_provider,'vip_expires_at',final_expiry));
select balance into new_balance from public.bc_accounts where user_id=p_user_id;
end if;
return jsonb_build_object('ok',true,'already_verified',false,'balance',coalesce(new_balance,0),'vip_expires_at',final_expiry);
exception when unique_violation then select balance into new_balance from public.bc_accounts where user_id=p_user_id; return jsonb_build_object('ok',true,'already_verified',true,'balance',coalesce(new_balance,0));
end; $$;

create or replace function public.sync_native_subscription_expiry(p_user_id uuid,p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare current_expiry timestamptz; final_expiry timestamptz;
begin
if p_user_id is null or p_expires_at is null then raise exception 'Invalid subscription sync'; end if;
select vip_expires_at into current_expiry from public.profiles where id=p_user_id for update;
final_expiry:=greatest(coalesce(current_expiry,now()),p_expires_at);
update public.profiles set is_vip=(final_expiry>now()),vip_expires_at=final_expiry,updated_at=now() where id=p_user_id;
insert into public.user_app_state(user_id,state,updated_at) values(p_user_id,jsonb_build_object('isVip',final_expiry>now(),'vipExpiresAt',extract(epoch from final_expiry)*1000),now())
on conflict(user_id) do update set state=public.user_app_state.state||excluded.state,updated_at=now();
return jsonb_build_object('ok',true,'vip_expires_at',final_expiry);
end; $$;

revoke all on function public.fulfill_native_store_purchase_verified(uuid,text,text,text,text,text,text,bigint,integer,timestamptz,text,jsonb) from public,anon,authenticated;
grant execute on function public.fulfill_native_store_purchase_verified(uuid,text,text,text,text,text,text,bigint,integer,timestamptz,text,jsonb) to service_role;
revoke all on function public.sync_native_subscription_expiry(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.sync_native_subscription_expiry(uuid,timestamptz) to service_role;
