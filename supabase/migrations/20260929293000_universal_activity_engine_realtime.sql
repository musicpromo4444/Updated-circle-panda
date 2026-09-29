do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='cp_activity_winner_cycles'
  ) then
    alter publication supabase_realtime add table public.cp_activity_winner_cycles;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='cp_activity_winner_announcements'
  ) then
    alter publication supabase_realtime add table public.cp_activity_winner_announcements;
  end if;
end $$;
