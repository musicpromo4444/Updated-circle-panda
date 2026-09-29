create table if not exists public.hot_seat_break_content (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  content_type text not null check (content_type in ('giveaway','movie','comedy','music','poll','investment')),
  description text,
  media_url text,
  action_url text,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hot_seat_break_content enable row level security;
revoke all on table public.hot_seat_break_content from anon, authenticated;
grant select on table public.hot_seat_break_content to authenticated;

drop policy if exists "hotseat break content enabled read" on public.hot_seat_break_content;
create policy "hotseat break content enabled read"
on public.hot_seat_break_content for select to authenticated using (enabled = true);

create index if not exists hot_seat_break_content_enabled_sort_idx
on public.hot_seat_break_content(enabled, sort_order);

create or replace function public.admin_hot_seat_break_content_upsert(
  p_id uuid default null, p_title text default '', p_content_type text default 'movie',
  p_description text default null, p_media_url text default null, p_action_url text default null,
  p_enabled boolean default true, p_sort_order integer default 0
) returns public.hot_seat_break_content
language plpgsql security definer set search_path = public, private
as $$
declare v_row public.hot_seat_break_content;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  if p_content_type not in ('giveaway','movie','comedy','music','poll','investment') then raise exception 'Invalid break content type'; end if;
  if p_id is null then
    insert into public.hot_seat_break_content(title,content_type,description,media_url,action_url,enabled,sort_order)
    values (trim(p_title),p_content_type,nullif(trim(coalesce(p_description,'')),''),nullif(trim(coalesce(p_media_url,'')),''),nullif(trim(coalesce(p_action_url,'')),''),p_enabled,greatest(0,p_sort_order))
    returning * into v_row;
  else
    update public.hot_seat_break_content set title=trim(p_title),content_type=p_content_type,
      description=nullif(trim(coalesce(p_description,'')),''),media_url=nullif(trim(coalesce(p_media_url,'')),''),
      action_url=nullif(trim(coalesce(p_action_url,'')),''),enabled=p_enabled,sort_order=greatest(0,p_sort_order),updated_at=now()
    where id=p_id returning * into v_row;
    if not found then raise exception 'Break content not found'; end if;
  end if;
  return v_row;
end $$;

create or replace function public.admin_hot_seat_break_content_delete(p_id uuid)
returns boolean language plpgsql security definer set search_path = public, private
as $$ begin
  if not private.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  delete from public.hot_seat_break_content where id=p_id;
  return found;
end $$;

revoke all on function public.admin_hot_seat_break_content_upsert(uuid,text,text,text,text,text,boolean,integer) from public, anon;
grant execute on function public.admin_hot_seat_break_content_upsert(uuid,text,text,text,text,text,boolean,integer) to authenticated;
revoke all on function public.admin_hot_seat_break_content_delete(uuid) from public, anon;
grant execute on function public.admin_hot_seat_break_content_delete(uuid) to authenticated;

insert into public.hot_seat_break_content(title,content_type,description,sort_order)
select * from (values
('Live Giveaway','giveaway','Enter the next Panda Coin + VIP giveaway during the water break.',1),
('Panda Movie Room','movie','A featured movie segment or sponsor premiere.',2),
('Panda Comedy','comedy','Short comedy clips and host highlights.',3),
('Music Time','music','Sponsored music performance or community playlist.',4),
('Break Poll','poll','Vote on the next Hot Seat topic or challenge.',5),
('Panda Market Game','investment','A simulated investment/decision game for the break.',6)
) as v(title,content_type,description,sort_order)
where not exists (select 1 from public.hot_seat_break_content x where x.content_type=v.content_type);