alter table public.store_catalog
  add column if not exists paystack_product_code text,
  add column if not exists android_product_id text,
  add column if not exists ios_product_id text;

create index if not exists store_catalog_android_product_id_idx
  on public.store_catalog (android_product_id)
  where android_product_id is not null;

create index if not exists store_catalog_ios_product_id_idx
  on public.store_catalog (ios_product_id)
  where ios_product_id is not null;

create index if not exists store_catalog_paystack_product_code_idx
  on public.store_catalog (paystack_product_code)
  where paystack_product_code is not null;
