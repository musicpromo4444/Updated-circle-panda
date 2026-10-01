create table if not exists public.circle_panda_media_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_type text not null check (media_type in ('music','audio','video')),
  media_item_id uuid references public.circle_panda_media_items(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists circle_panda_media_sessions_user_idx on public.circle_panda_media_sessions(user_id, started_at desc);
alter table public.circle_panda_media_sessions enable row level security;

drop policy if exists "users can view own media sessions" on public.circle_panda_media_sessions;
create policy "users can view own media sessions" on public.circle_panda_media_sessions for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.start_circle_panda_media_session(p_media_type text,p_media_item_id uuid)
returns uuid language plpgsql security invoker set search_path=public
as $$ declare v_id uuid; begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_media_type not in ('music','audio','video') then raise exception 'Invalid media type'; end if;
  update public.circle_panda_media_sessions set ended_at=now() where user_id=auth.uid() and ended_at is null;
  insert into public.circle_panda_media_sessions(user_id,media_type,media_item_id) values(auth.uid(),p_media_type,p_media_item_id) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.stop_circle_panda_media_session(p_session_id uuid)
returns void language plpgsql security invoker set search_path=public
as $$ begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.circle_panda_media_sessions set ended_at=now()
  where id=p_session_id and user_id=auth.uid() and ended_at is null;
end; $$;

revoke all on function public.start_circle_panda_media_session(text,uuid) from public;
revoke all on function public.stop_circle_panda_media_session(uuid) from public;
grant execute on function public.start_circle_panda_media_session(text,uuid) to authenticated;
grant execute on function public.stop_circle_panda_media_session(uuid) to authenticated;