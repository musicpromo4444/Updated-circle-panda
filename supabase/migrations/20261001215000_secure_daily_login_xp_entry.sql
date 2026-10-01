-- Fixed server-authoritative daily login XP entry point.
create or replace function public.award_daily_login_xp()
returns jsonb language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare uid uuid:=auth.uid(); awarded bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 awarded:=private.award_circle_panda_xp(uid,'daily_login',null,'daily_login:'||current_date::text);
 return jsonb_build_object('awarded',awarded>0,'xp',awarded);
end;
$function$;
revoke all on function public.award_daily_login_xp() from public,anon;
grant execute on function public.award_daily_login_xp() to authenticated;
