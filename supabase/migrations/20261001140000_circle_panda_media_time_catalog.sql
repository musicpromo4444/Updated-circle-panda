create table if not exists public.circle_panda_media_items (
  id uuid primary key default gen_random_uuid(),
  media_type text not null check (media_type in ('music','audio','video')),
  source text not null check (source in ('spotify','audiomack','circle_panda_upload','direct_sponsor')),
  provider_item_type text not null default 'single' check (provider_item_type in ('single','playlist','ep','album','podcast','episode','audiobook','video')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  artist text,
  description text,
  external_id text,
  media_url text,
  thumbnail_url text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint circle_panda_media_source_url_check check (source in ('spotify','audiomack') or media_url is not null)
);

create index if not exists circle_panda_media_items_type_idx on public.circle_panda_media_items(media_type, is_published, sort_order);
alter table public.circle_panda_media_items enable row level security;

drop policy if exists "public can view published circle panda media" on public.circle_panda_media_items;
create policy "public can view published circle panda media" on public.circle_panda_media_items for select to anon, authenticated using (is_published = true);

create or replace function public.get_circle_panda_media_catalog(p_media_type text)
returns setof public.circle_panda_media_items
language sql security invoker set search_path = public
as $$ select * from public.circle_panda_media_items where is_published = true and media_type = p_media_type order by sort_order asc, created_at desc $$;

revoke all on function public.get_circle_panda_media_catalog(text) from public;
grant execute on function public.get_circle_panda_media_catalog(text) to anon, authenticated;

create or replace function public.admin_list_circle_panda_media()
returns setof public.circle_panda_media_items
language plpgsql security definer set search_path = public, pg_temp
as $$ begin
  if not private.is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  return query select * from public.circle_panda_media_items order by media_type, sort_order, created_at desc;
end; $$;

create or replace function public.admin_upsert_circle_panda_media(
  p_id uuid,p_media_type text,p_source text,p_provider_item_type text,p_title text,p_artist text,p_description text,
  p_external_id text,p_media_url text,p_thumbnail_url text,p_duration_seconds integer,p_sort_order integer,
  p_is_published boolean,p_metadata jsonb
)
returns public.circle_panda_media_items
language plpgsql security definer set search_path = public, pg_temp
as $$ declare v_row public.circle_panda_media_items; begin
  if not private.is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  if p_media_type not in ('music','audio','video') then raise exception 'Invalid media type'; end if;
  if p_source not in ('spotify','audiomack','circle_panda_upload','direct_sponsor') then raise exception 'Invalid media source'; end if;
  if p_provider_item_type not in ('single','playlist','ep','album','podcast','episode','audiobook','video') then raise exception 'Invalid content type'; end if;
  if p_source in ('circle_panda_upload','direct_sponsor') and nullif(trim(p_media_url),'') is null then raise exception 'A media URL is required for this source'; end if;
  if p_id is null then
    insert into public.circle_panda_media_items
      (media_type,source,provider_item_type,title,artist,description,external_id,media_url,thumbnail_url,duration_seconds,sort_order,is_published,metadata,updated_at)
    values
      (p_media_type,p_source,p_provider_item_type,trim(p_title),nullif(trim(p_artist),''),nullif(trim(p_description),''),nullif(trim(p_external_id),''),nullif(trim(p_media_url),''),nullif(trim(p_thumbnail_url),''),greatest(0,p_duration_seconds),p_sort_order,p_is_published,coalesce(p_metadata,'{}'::jsonb),now())
    returning * into v_row;
  else
    update public.circle_panda_media_items set media_type=p_media_type,source=p_source,provider_item_type=p_provider_item_type,
      title=trim(p_title),artist=nullif(trim(p_artist),''),description=nullif(trim(p_description),''),external_id=nullif(trim(p_external_id),''),
      media_url=nullif(trim(p_media_url),''),thumbnail_url=nullif(trim(p_thumbnail_url),''),duration_seconds=greatest(0,p_duration_seconds),
      sort_order=p_sort_order,is_published=p_is_published,metadata=coalesce(p_metadata,'{}'::jsonb),updated_at=now() where id=p_id returning * into v_row;
    if v_row.id is null then raise exception 'Media item not found'; end if;
  end if;
  return v_row;
end; $$;

create or replace function public.admin_delete_circle_panda_media(p_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$ begin if not private.is_admin(auth.uid()) then raise exception 'Not authorized'; end if; delete from public.circle_panda_media_items where id=p_id; end; $$;

revoke all on function public.admin_list_circle_panda_media() from public;
revoke all on function public.admin_upsert_circle_panda_media(uuid,text,text,text,text,text,text,text,text,text,integer,integer,boolean,jsonb) from public;
revoke all on function public.admin_delete_circle_panda_media(uuid) from public;
grant execute on function public.admin_list_circle_panda_media() to authenticated;
grant execute on function public.admin_upsert_circle_panda_media(uuid,text,text,text,text,text,text,text,text,text,integer,integer,boolean,jsonb) to authenticated;
grant execute on function public.admin_delete_circle_panda_media(uuid) to authenticated;

insert into public.universal_ad_placements (placement_key,label,default_format,enabled,frequency_cap_seconds,targeting) values
('music_time_top','Music Time — Top Banner','banner',true,0,'{}'::jsonb),
('music_time_bottom','Music Time — Bottom Banner','banner',true,0,'{}'::jsonb),
('audio_time_top','Audio Time — Top Banner','banner',true,0,'{}'::jsonb),
('audio_time_bottom','Audio Time — Bottom Banner','banner',true,0,'{}'::jsonb),
('video_preroll','Video — Pre-roll','sponsor',true,0,'{}'::jsonb),
('video_postroll','Video — Post-roll','sponsor',true,0,'{}'::jsonb)
on conflict (placement_key) do update set label=excluded.label,default_format=excluded.default_format,updated_at=now();

comment on table public.circle_panda_media_items is 'Circle Panda admin-controlled music, audio and video catalog. Media playback never grants XP or BC.';