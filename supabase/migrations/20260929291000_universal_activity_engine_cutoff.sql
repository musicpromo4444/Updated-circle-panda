create or replace function public.cp_finalize_due_winner_cycles()
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare r record; n integer:=0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  for r in
    select id from public.cp_activity_winner_cycles
    where status in ('scheduled','open') and ends_at <= now()
    order by ends_at
    for update skip locked
  loop
    begin
      perform public.cp_finalize_winner_cycle(r.id);
      n:=n+1;
    exception when others then
      -- One malformed cycle must not prevent other due cycles from closing.
      null;
    end;
  end loop;
  return n;
end;
$$;
revoke all on function public.cp_finalize_due_winner_cycles() from public,anon;
grant execute on function public.cp_finalize_due_winner_cycles() to authenticated;

create or replace function public.cp_get_winner_cycle(p_activity_key text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare c public.cp_activity_winner_cycles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform public.cp_finalize_due_winner_cycles();

  select * into c
  from public.cp_activity_winner_cycles
  where activity_key=p_activity_key
    and status in ('scheduled','open')
    and starts_at <= now() and ends_at > now()
  order by starts_at desc limit 1;

  if c.id is null then return null; end if;
  if c.status='scheduled' then
    update public.cp_activity_winner_cycles set status='open',updated_at=now() where id=c.id;
  end if;
  return to_jsonb(c);
end;
$$;
revoke all on function public.cp_get_winner_cycle(text) from public,anon;
grant execute on function public.cp_get_winner_cycle(text) to authenticated;
