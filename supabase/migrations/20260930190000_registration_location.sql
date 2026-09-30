alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists state_province text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists area text;
create index if not exists profiles_location_idx on public.profiles(country,state_province,city,area);
