-- Persist the daily activity entry hardening in source control.
create or replace function public.get_today_seven_day_activity()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid := auth.uid(); day_no smallint := extract(isodow from current_date)::smallint; s public.seven_day_activity_schedule%rowtype; c public.seven_day_activity_configs%rowtype; a public.seven_day_activity_attempts%rowtype; left_count integer := 0;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into s from public.seven_day_activity_schedule where day_number=day_no;
 if not found or not s.enabled or s.activity_slug is null then return jsonb_build_object('day_number',day_no,'available',false,'activity',null); end if;
 select * into c from public.seven_day_activity_configs where slug=s.activity_slug and is_enabled=true;
 if not found then return jsonb_build_object('day_number',day_no,'available',false,'activity',null); end if;
 select * into a from public.seven_day_activity_attempts where user_id=uid and activity_slug=c.slug and activity_date=current_date;
 left_count:=greatest(0,c.free_attempts+coalesce(a.extra_attempts,0)-coalesce(a.attempts_used,0));
 return jsonb_build_object('day_number',day_no,'available',true,'activity',jsonb_build_object('slug',c.slug,'title',c.title,'description',c.description,'free_attempts',c.free_attempts,'timer_seconds',c.timer_seconds,'attempts_left',left_count,'completed',coalesce(a.attempts_used,0)>0 and coalesce(a.last_result->>'result','') in ('completed','revealed','solved','failed')));
end; $$;
revoke execute on function public.get_today_seven_day_activity() from public,anon;
grant execute on function public.get_today_seven_day_activity() to authenticated;