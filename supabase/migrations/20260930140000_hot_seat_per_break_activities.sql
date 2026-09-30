-- Circle Panda Hot Seat: per-water-break activities and automatic break scheduling
alter table public.hot_seat_break_content
  add column if not exists activity_slug text,
  add column if not exists water_break_number integer;

alter table public.hot_seat_break_content drop constraint if exists hot_seat_break_content_type_check;
alter table public.hot_seat_break_content
  add constraint hot_seat_break_content_type_check
  check (content_type in ('giveaway','movie','comedy','music','poll','investment','activity','video'));

alter table public.hot_seat_break_content drop constraint if exists hot_seat_break_content_break_number_check;
alter table public.hot_seat_break_content
  add constraint hot_seat_break_content_break_number_check
  check (water_break_number is null or water_break_number between 1 and 24);

create index if not exists hot_seat_break_content_break_idx
  on public.hot_seat_break_content(water_break_number, enabled, sort_order);

create or replace function public.admin_hot_seat_break_activity_upsert(
  p_id uuid default null, p_break_number integer default 1, p_activity_slug text default 'wheel_spin',
  p_title text default '', p_description text default null, p_enabled boolean default true, p_sort_order integer default 0
)
returns public.hot_seat_break_content
language plpgsql security definer set search_path=''
as $$
declare v_row public.hot_seat_break_content;
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  if p_break_number < 1 or p_break_number > 24 then raise exception 'Invalid water break number'; end if;
  if p_activity_slug not in ('wheel_spin','mystery_box','target','guess_sponsor','puzzle','coin_drop','slots','lucky_card','secret_reveal','playable_ad','cup_shuffle') then raise exception 'Invalid activity'; end if;
  if p_id is null then
    insert into public.hot_seat_break_content(title,content_type,description,enabled,sort_order,water_break_number,activity_slug,config)
    values(coalesce(nullif(trim(p_title),''),initcap(replace(p_activity_slug,'_',' '))),'activity',
      nullif(trim(coalesce(p_description,'')),''),p_enabled,greatest(0,p_sort_order),p_break_number,p_activity_slug,
      jsonb_build_object('water_break_number',p_break_number,'activity_slug',p_activity_slug))
    returning * into v_row;
  else
    update public.hot_seat_break_content set title=coalesce(nullif(trim(p_title),''),title),
      content_type='activity',description=nullif(trim(coalesce(p_description,'')),''),
      enabled=p_enabled,sort_order=greatest(0,p_sort_order),water_break_number=p_break_number,
      activity_slug=p_activity_slug,config=jsonb_build_object('water_break_number',p_break_number,'activity_slug',p_activity_slug),
      updated_at=now() where id=p_id returning * into v_row;
    if not found then raise exception 'Break activity not found'; end if;
  end if;
  return v_row;
end $$;

create or replace function public.sync_hot_seat_cycle()
returns void language plpgsql security definer set search_path=''
as $$
declare h record; elapsed_seconds bigint; cycle_pos bigint; cycle_number integer;
live_seconds bigint:=10800; break_seconds bigint:=3600; cycle_seconds bigint:=14400;
break_start timestamptz; break_end timestamptz; v_session uuid; v_count integer; v_duration integer;
r record; idx integer; v_item_start timestamptz;
begin
 for h in select id,started_at,ends_at,is_active,cycle_enabled,pause_until from public.hot_seat_hosts where is_active=true and cycle_enabled=true loop
  if now()<h.started_at then continue; end if;
  if now()>=h.ends_at then update public.hot_seat_hosts set is_active=false,pause_until=null where id=h.id; continue; end if;
  elapsed_seconds:=floor(extract(epoch from(now()-h.started_at)));
  cycle_pos:=mod(greatest(elapsed_seconds,0),cycle_seconds);
  if cycle_pos>=live_seconds then
    cycle_number:=floor(greatest(elapsed_seconds,0)/cycle_seconds)::integer+1;
    break_start:=h.started_at+(floor(greatest(elapsed_seconds,0)/cycle_seconds)*cycle_seconds+live_seconds)*interval '1 second';
    break_end:=break_start+break_seconds*interval '1 second';
    update public.hot_seat_hosts set pause_until=break_end where id=h.id and(pause_until is null or pause_until<break_end);
    if not exists(select 1 from public.hot_seat_water_break_sessions where break_number=cycle_number and starts_at=break_start) then
      select count(*) into v_count from public.hot_seat_break_content where water_break_number=cycle_number and enabled=true;
      if v_count>0 then
        v_duration:=floor(break_seconds::numeric/v_count);
        insert into public.hot_seat_water_break_sessions(break_number,starts_at,ends_at,status,created_by)
        values(cycle_number,break_start,break_end,'scheduled',null) returning id into v_session;
        idx:=0;
        for r in select * from public.hot_seat_break_content where water_break_number=cycle_number and enabled=true order by sort_order,id loop
          idx:=idx+1; v_item_start:=break_start+make_interval(secs=>v_duration*(idx-1));
          insert into public.hot_seat_water_break_items(session_id,content_id,sort_order,starts_at,ends_at,duration_seconds)
          values(v_session,r.id,idx,v_item_start,case when idx=v_count then break_end else break_start+make_interval(secs=>v_duration*idx) end,
            case when idx=v_count then extract(epoch from(break_end-v_item_start))::integer else v_duration end);
        end loop;
      end if;
    end if;
    update public.hot_seat_water_break_sessions set status='live' where break_number=cycle_number and starts_at=break_start and status='scheduled';
  elsif h.pause_until is not null and h.pause_until<=now() then
    update public.hot_seat_hosts set pause_until=null where id=h.id;
  end if;
 end loop;
end $$;

create or replace function public.get_hot_seat_current_break(p_host_id uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
with h as(select started_at,ends_at from public.hot_seat_hosts where id=p_host_id and is_active=true limit 1),
p as(select *,floor(extract(epoch from(now()-started_at))/14400)::integer+1 break_number from h),
rows as(
 select c.* from p join public.hot_seat_break_content c on c.water_break_number=p.break_number and c.enabled=true
 where mod(floor(extract(epoch from(now()-p.started_at)))::bigint,14400)>=10800 and now()<p.ends_at
 order by c.sort_order,c.id)
select coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) from rows
$$;

revoke execute on function public.admin_hot_seat_break_activity_upsert(uuid,integer,text,text,text,boolean,integer) from public,anon,authenticated;
revoke execute on function public.sync_hot_seat_cycle() from public,anon,authenticated;
revoke execute on function public.start_hot_seat_water_break_session(integer,integer) from public,anon,authenticated;
grant execute on function public.get_hot_seat_current_break(uuid) to authenticated;
