-- Circle Panda Sweepstakes prize-card and contest-entry configuration
-- Keeps the contest activity selection separate from the prize catalog.
-- All admin mutations are guarded by cp_is_admin(); public prize reads are authenticated-only.

alter table public.sweepstake_prizes
  add column if not exists description text not null default '',
  add column if not exists entry_instructions text not null default '',
  add column if not exists button_label text not null default 'Enter Contest',
  add column if not exists action_type text not null default 'activity',
  add column if not exists action_url text not null default '',
  add column if not exists entry_requirement text not null default '',
  add column if not exists starts_at timestamptz,
  add column if not exists closes_at timestamptz,
  add column if not exists display_order integer not null default 0;

create index if not exists sweepstake_prizes_display_order_idx
  on public.sweepstake_prizes(display_order, id);

create table if not exists public.sweepstakes_page_config (
  id integer primary key default 1 check (id=1),
  card_limit integer not null default 5 check (card_limit between 3 and 5),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.sweepstakes_page_config(id,card_limit)
values(1,5)
on conflict(id) do nothing;

alter table public.sweepstakes_page_config enable row level security;
revoke all on public.sweepstakes_page_config from anon, authenticated;
grant select on public.sweepstakes_page_config to authenticated;

drop policy if exists "sweepstakes page config read" on public.sweepstakes_page_config;
create policy "sweepstakes page config read"
  on public.sweepstakes_page_config for select to authenticated
  using (true);

drop policy if exists "sweep prizes enabled read" on public.sweepstake_prizes;
create policy "sweep prizes enabled read"
  on public.sweepstake_prizes for select to authenticated
  using (
    enabled = true
    and (starts_at is null or starts_at <= now())
    and (closes_at is null or closes_at > now())
  );

create or replace function public.admin_update_sweepstakes_page_config(p_card_limit integer)
returns public.sweepstakes_page_config
language plpgsql
security definer
set search_path=''
as $$
declare r public.sweepstakes_page_config;
begin
  if not public.cp_is_admin() then raise exception 'Admin access required'; end if;
  if p_card_limit < 3 or p_card_limit > 5 then raise exception 'Prize card count must be between 3 and 5'; end if;
  update public.sweepstakes_page_config
    set card_limit=p_card_limit, updated_at=now(), updated_by=(select auth.uid())
    where id=1
    returning * into r;
  return r;
end;
$$;
revoke all on function public.admin_update_sweepstakes_page_config(integer) from public;
grant execute on function public.admin_update_sweepstakes_page_config(integer) to authenticated;

create or replace function public.get_sweepstakes_page_config()
returns public.sweepstakes_page_config
language sql
security invoker
stable
as $$
  select * from public.sweepstakes_page_config where id=1;
$$;
revoke all on function public.get_sweepstakes_page_config() from public;
grant execute on function public.get_sweepstakes_page_config() to authenticated;

create or replace function public.admin_upsert_sweepstake_prize(
  p_id text,
  p_name text,
  p_label text,
  p_description text,
  p_entry_instructions text,
  p_button_label text,
  p_action_type text,
  p_action_url text,
  p_entry_requirement text,
  p_ticket_price_bc bigint,
  p_consolation_price numeric,
  p_image_url text,
  p_emoji text,
  p_jackpot boolean,
  p_enabled boolean,
  p_starts_at timestamptz,
  p_closes_at timestamptz,
  p_display_order integer
)
returns public.sweepstake_prizes
language plpgsql
security definer
set search_path=''
as $$
declare r public.sweepstake_prizes;
begin
  if not public.cp_is_admin() then raise exception 'Admin access required'; end if;
  if nullif(trim(p_id),'') is null then raise exception 'Prize ID is required'; end if;
  if length(trim(p_name)) < 1 then raise exception 'Prize name is required'; end if;
  if p_ticket_price_bc <= 0 then raise exception 'Entry BC must be greater than zero'; end if;
  if p_action_type not in ('activity','link','instructions','none') then raise exception 'Invalid prize action'; end if;
  if p_starts_at is not null and p_closes_at is not null and p_closes_at <= p_starts_at then raise exception 'Closing time must be after start time'; end if;

  insert into public.sweepstake_prizes(
    id,name,label,description,entry_instructions,button_label,action_type,action_url,
    entry_requirement,ticket_price_bc,consolation_price,image_url,emoji,jackpot,enabled,
    starts_at,closes_at,display_order,updated_at
  )
  values(
    trim(p_id),trim(p_name),trim(coalesce(p_label,'')),trim(coalesce(p_description,'')),
    trim(coalesce(p_entry_instructions,'')),coalesce(nullif(trim(p_button_label),''),'Enter Contest'),
    p_action_type,trim(coalesce(p_action_url,'')),trim(coalesce(p_entry_requirement,'')),
    p_ticket_price_bc,greatest(coalesce(p_consolation_price,0),0),trim(coalesce(p_image_url,'')),
    coalesce(nullif(trim(p_emoji),''),'🎁'),p_jackpot,p_enabled,p_starts_at,p_closes_at,
    greatest(p_display_order,0),now()
  )
  on conflict(id) do update set
    name=excluded.name,label=excluded.label,description=excluded.description,
    entry_instructions=excluded.entry_instructions,button_label=excluded.button_label,
    action_type=excluded.action_type,action_url=excluded.action_url,
    entry_requirement=excluded.entry_requirement,ticket_price_bc=excluded.ticket_price_bc,
    consolation_price=excluded.consolation_price,image_url=excluded.image_url,
    emoji=excluded.emoji,jackpot=excluded.jackpot,enabled=excluded.enabled,
    starts_at=excluded.starts_at,closes_at=excluded.closes_at,
    display_order=excluded.display_order,updated_at=now()
  returning * into r;
  return r;
end;
$$;
revoke all on function public.admin_upsert_sweepstake_prize(text,text,text,text,text,text,text,text,text,bigint,numeric,text,text,boolean,boolean,timestamptz,timestamptz,integer) from public;
grant execute on function public.admin_upsert_sweepstake_prize(text,text,text,text,text,text,text,text,text,bigint,numeric,text,text,boolean,boolean,timestamptz,timestamptz,integer) to authenticated;

create or replace function public.admin_delete_sweepstake_prize(p_id text)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.cp_is_admin() then raise exception 'Admin access required'; end if;
  delete from public.sweepstake_prizes where id=p_id;
end;
$$;
revoke all on function public.admin_delete_sweepstake_prize(text) from public;
grant execute on function public.admin_delete_sweepstake_prize(text) to authenticated;

create or replace function public.admin_get_sweepstakes_controls()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.cp_is_admin() then raise exception 'Admin access required'; end if;
  return jsonb_build_object(
    'config',(select row_to_json(c) from public.sweepstakes_page_config c where c.id=1),
    'prizes',(select coalesce(jsonb_agg(to_jsonb(p) order by p.display_order,p.id),'[]'::jsonb) from public.sweepstake_prizes p)
  );
end;
$$;
revoke all on function public.admin_get_sweepstakes_controls() from public;
grant execute on function public.admin_get_sweepstakes_controls() to authenticated;

create or replace function public.get_sweepstakes_prize_cards()
returns jsonb
language sql
security invoker
stable
as $$
  select jsonb_build_object(
    'card_limit', coalesce((select card_limit from public.sweepstakes_page_config where id=1),5),
    'prizes', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.display_order,p.id)
      from (
        select *
        from public.sweepstake_prizes
        where enabled=true
          and (starts_at is null or starts_at <= now())
          and (closes_at is null or closes_at > now())
        order by display_order,id
        limit 5
      ) p
    ),'[]'::jsonb)
  );
$$;
revoke all on function public.get_sweepstakes_prize_cards() from public;
grant execute on function public.get_sweepstakes_prize_cards() to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('circle-panda-sweepstakes','circle-panda-sweepstakes',true,5242880,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "sweepstakes public read" on storage.objects;
create policy "sweepstakes public read" on storage.objects for select to public using (bucket_id='circle-panda-sweepstakes');

drop policy if exists "sweepstakes admin upload" on storage.objects;
create policy "sweepstakes admin upload" on storage.objects for insert to authenticated
with check (bucket_id='circle-panda-sweepstakes' and public.cp_is_admin());

drop policy if exists "sweepstakes admin update" on storage.objects;
create policy "sweepstakes admin update" on storage.objects for update to authenticated
using (bucket_id='circle-panda-sweepstakes' and public.cp_is_admin())
with check (bucket_id='circle-panda-sweepstakes' and public.cp_is_admin());

drop policy if exists "sweepstakes admin delete" on storage.objects;
create policy "sweepstakes admin delete" on storage.objects for delete to authenticated
using (bucket_id='circle-panda-sweepstakes' and public.cp_is_admin());


-- Harden public RPC exposure after creation.
create or replace function public.get_sweepstakes_page_config()
returns public.sweepstakes_page_config
language sql security invoker stable set search_path=''
as $$ select * from public.sweepstakes_page_config where id=1; $$;
revoke execute on function public.get_sweepstakes_page_config() from public;
grant execute on function public.get_sweepstakes_page_config() to authenticated;

create or replace function public.get_sweepstakes_prize_cards()
returns jsonb
language sql security invoker stable set search_path=''
as $$
  select jsonb_build_object(
    'card_limit', coalesce((select card_limit from public.sweepstakes_page_config where id=1),5),
    'prizes', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.display_order,p.id)
      from (
        select * from public.sweepstake_prizes
        where enabled=true
          and (starts_at is null or starts_at <= now())
          and (closes_at is null or closes_at > now())
        order by display_order,id
        limit 5
      ) p
    ),'[]'::jsonb)
  );
$$;
revoke execute on function public.get_sweepstakes_prize_cards() from public;
grant execute on function public.get_sweepstakes_prize_cards() to authenticated;

create or replace function public.get_sweepstakes_activity_config()
returns table(activity_slug text, updated_at timestamptz)
language sql security invoker stable set search_path=''
as $$ select activity_slug, updated_at from public.sweepstakes_activity_config where id=1; $$;
revoke execute on function public.get_sweepstakes_activity_config() from public;
grant execute on function public.get_sweepstakes_activity_config() to authenticated;

revoke execute on function public.admin_set_sweepstakes_activity(text) from public;
grant execute on function public.admin_set_sweepstakes_activity(text) to authenticated;
revoke execute on function public.admin_update_sweepstakes_page_config(integer) from public;
grant execute on function public.admin_update_sweepstakes_page_config(integer) to authenticated;
revoke execute on function public.admin_upsert_sweepstake_prize(text,text,text,text,text,text,text,text,text,bigint,numeric,text,text,boolean,boolean,timestamptz,timestamptz,integer) from public;
grant execute on function public.admin_upsert_sweepstake_prize(text,text,text,text,text,text,text,text,text,bigint,numeric,text,text,boolean,boolean,timestamptz,timestamptz,integer) to authenticated;
revoke execute on function public.admin_delete_sweepstake_prize(text) from public;
grant execute on function public.admin_delete_sweepstake_prize(text) to authenticated;
revoke execute on function public.admin_get_sweepstakes_controls() from public;
grant execute on function public.admin_get_sweepstakes_controls() to authenticated;
