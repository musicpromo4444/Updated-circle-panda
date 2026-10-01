-- Confession interaction backend: five reactions, comments, and secure reaction state.
create table if not exists public.confession_comments (
 id uuid primary key default gen_random_uuid(),
 confession_id uuid not null references public.confessions(id) on delete cascade,
 author_id uuid not null,
 body text not null check (char_length(trim(body)) between 1 and 1000),
 created_at timestamptz not null default now()
);
create index if not exists confession_comments_confession_idx on public.confession_comments(confession_id,created_at);
alter table public.confession_comments enable row level security;
drop policy if exists "confession comments public read" on public.confession_comments;
create policy "confession comments public read" on public.confession_comments for select using (true);
drop policy if exists "confession comments no direct insert" on public.confession_comments;
create policy "confession comments no direct insert" on public.confession_comments for insert with check (false);

create or replace function public.react_to_confession_secure(p_confession_id uuid,p_reaction text)
returns jsonb language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare uid uuid:=auth.uid(); current_reaction text;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Authentication required'; end if;
 if p_reaction not in ('heart','laugh','wow','sad','angry') then raise exception 'Invalid reaction'; end if;
 select reaction into current_reaction from public.confession_reactions where confession_id=p_confession_id and user_id=uid;
 if current_reaction=p_reaction then
   delete from public.confession_reactions where confession_id=p_confession_id and user_id=uid;
   return jsonb_build_object('reaction',null);
 end if;
 insert into public.confession_reactions(confession_id,user_id,reaction) values(p_confession_id,uid,p_reaction)
 on conflict (confession_id,user_id) do update set reaction=excluded.reaction,created_at=now();
 return jsonb_build_object('reaction',p_reaction);
end;
$function$;

create or replace function public.get_confession_reaction_state(p_confession_ids uuid[])
returns table(confession_id uuid,reaction text,heart_count bigint,laugh_count bigint,wow_count bigint,sad_count bigint,angry_count bigint)
language sql security definer set search_path='public','pg_temp'
as $function$
 select c.id,
   (select cr.reaction from public.confession_reactions cr where cr.confession_id=c.id and cr.user_id=auth.uid() limit 1),
   count(*) filter(where r.reaction='heart'),
   count(*) filter(where r.reaction='laugh'),
   count(*) filter(where r.reaction='wow'),
   count(*) filter(where r.reaction='sad'),
   count(*) filter(where r.reaction='angry')
 from unnest(p_confession_ids) c(id)
 left join public.confession_reactions r on r.confession_id=c.id
 group by c.id;
$function$;

create or replace function public.add_confession_comment_secure(p_confession_id uuid,p_body text)
returns jsonb language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare uid uuid:=auth.uid(); cid uuid;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.confessions where id=p_confession_id and is_published=true) then raise exception 'Confession not found'; end if;
 if char_length(trim(coalesce(p_body,'')))<1 or char_length(trim(p_body))>1000 then raise exception 'Comment must be 1-1000 characters'; end if;
 insert into public.confession_comments(confession_id,author_id,body) values(p_confession_id,uid,trim(p_body)) returning id into cid;
 return jsonb_build_object('id',cid);
end;
$function$;

create or replace function public.get_confession_comments(p_confession_id uuid)
returns table(id uuid,author_id uuid,body text,created_at timestamptz)
language sql security definer set search_path='public','pg_temp'
as $function$
 select id,author_id,body,created_at from public.confession_comments where confession_id=p_confession_id order by created_at asc;
$function$;

revoke all on function public.react_to_confession_secure(uuid,text) from public,anon;
grant execute on function public.react_to_confession_secure(uuid,text) to authenticated;
revoke all on function public.get_confession_reaction_state(uuid[]) from public,anon;
grant execute on function public.get_confession_reaction_state(uuid[]) to anon,authenticated;
revoke all on function public.add_confession_comment_secure(uuid,text) from public,anon;
grant execute on function public.add_confession_comment_secure(uuid,text) to authenticated;
revoke all on function public.get_confession_comments(uuid) from public,anon;
grant execute on function public.get_confession_comments(uuid) to anon,authenticated;