create or replace function public.sync_hot_seat_cycle()
returns void language plpgsql security definer set search_path=''
as $$
declare h record; elapsed_seconds bigint; cycle_pos bigint; live_seconds bigint:=10800; break_seconds bigint:=3600; cycle_seconds bigint:=14400; break_start timestamptz; break_end timestamptz;
begin
 for h in select id,started_at,ends_at,is_active,cycle_enabled,pause_until from public.hot_seat_hosts where is_active=true and cycle_enabled=true loop
   if now() < h.started_at then continue; end if;
   if now() >= h.ends_at then update public.hot_seat_hosts set is_active=false,pause_until=null where id=h.id; continue; end if;
   elapsed_seconds:=floor(extract(epoch from (now()-h.started_at)));
   cycle_pos:=mod(greatest(elapsed_seconds,0),cycle_seconds);
   if cycle_pos >= live_seconds then
     break_start:=h.started_at+(floor(greatest(elapsed_seconds,0)/cycle_seconds)*cycle_seconds+live_seconds)*interval '1 second';
     break_end:=break_start+break_seconds*interval '1 second';
     update public.hot_seat_hosts set pause_until=break_end where id=h.id and (pause_until is null or pause_until < break_end);
   elsif h.pause_until is not null and h.pause_until <= now() then
     update public.hot_seat_hosts set pause_until=null where id=h.id;
   end if;
 end loop;
end $$;