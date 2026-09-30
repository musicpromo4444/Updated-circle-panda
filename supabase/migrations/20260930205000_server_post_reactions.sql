create table if not exists public.cp_post_reactions (
  post_id uuid not null references public.cp_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
alter table public.cp_post_reactions enable row level security;
revoke all on public.cp_post_reactions from anon,authenticated;
create index if not exists cp_post_reactions_post_idx on public.cp_post_reactions(post_id);

create or replace function public.toggle_post_like_secure(p_post_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); liked boolean; total bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.cp_posts where id=p_post_id) then raise exception 'Post not found'; end if;
 delete from public.cp_post_reactions where post_id=p_post_id and user_id=uid;
 if found then liked:=false;
 else insert into public.cp_post_reactions(post_id,user_id) values(p_post_id,uid); liked:=true;
 end if;
 select count(*) into total from public.cp_post_reactions where post_id=p_post_id;
 return jsonb_build_object('liked',liked,'count',total);
end $$;
revoke all on function public.toggle_post_like_secure(uuid) from public,anon;
grant execute on function public.toggle_post_like_secure(uuid) to authenticated;
